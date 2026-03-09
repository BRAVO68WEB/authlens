'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { LogViewer } from '@/components/LogViewer';
import { buildLoginRadiusApiUrl, getSiteConfigUrl, fetchLoginRadiusConfig } from '@/lib/loginradius';
import { logInfo, logError, logRequest, logResponse } from '@/lib/logging';
import type {
  LogEntry,
  LoginRadiusRegistrationResponse,
  LoginRadiusLoginResponse,
  LoginRadiusUserInfoResponse,
  LoginRadiusSiteConfigResponse,
} from '@/lib/types';
import { Check, UserPlus, LogIn, User, Settings, KeyRound, Mail } from 'lucide-react';

export default function LoginRadiusFlowPage() {
  const { providers, selectedProviderId } = useStore();
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  // Registration
  const [regFormData, setRegFormData] = useState<Record<string, string>>({});
  const [regResponse, setRegResponse] = useState<LoginRadiusRegistrationResponse | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [sottToken, setSottToken] = useState<string | null>(null);
  const [fetchingSott, setFetchingSott] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginResponse, setLoginResponse] = useState<LoginRadiusLoginResponse | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');

  // Get User Info
  const [userInfoResponse, setUserInfoResponse] = useState<LoginRadiusUserInfoResponse | null>(null);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);

  // Site Config
  const [siteConfigResponse, setSiteConfigResponse] = useState<LoginRadiusSiteConfigResponse | null>(null);
  const [siteConfigError, setSiteConfigError] = useState<string | null>(null);

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotResponse, setForgotResponse] = useState<any>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Change Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordResponse, setChangePasswordResponse] = useState<any>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Component Selection
  const [activeComponent, setActiveComponent] = useState('login');

  const componentOptions = [
    { value: 'login', label: 'Login' },
    { value: 'registration', label: 'Registration' },
    { value: 'userinfo', label: 'User Info' },
    { value: 'forgotpassword', label: 'Forgot Password' },
    { value: 'changepassword', label: 'Change Password' },
    { value: 'siteconfig', label: 'Site Config' },
  ];

  const addLog = (log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  };

  // Fetch SOTT token if needed
  const fetchSottToken = async (): Promise<string | null> => {
    // If long-lived SOTT is configured, use it
    if (selectedProvider?.loginradius?.sott) {
      addLog(logInfo('Using long-lived SOTT token from provider config'));
      return selectedProvider.loginradius.sott;
    }

    // Otherwise, fetch from hosted page
    if (!selectedProvider?.loginradius?.hostedPageUrl) {
      throw new Error('No SOTT token configured and hosted page URL not available');
    }

    setFetchingSott(true);
    try {
      addLog(logInfo('Fetching SOTT token from hosted page'));
      const config = await fetchLoginRadiusConfig(selectedProvider.loginradius.hostedPageUrl);
      if (config.sott) {
        setSottToken(config.sott);
        addLog(logInfo('SOTT token fetched successfully'));
        return config.sott;
      }
      throw new Error('SOTT token not found in hosted page');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(logError('Failed to fetch SOTT token', { error: errMsg }));
      throw error;
    } finally {
      setFetchingSott(false);
    }
  };

  const handleRegistration = async () => {
    if (!selectedProvider?.loginradius?.apiKey || !selectedProvider?.loginradius?.apiBaseUrl) {
      alert('Please configure LoginRadius API Key and Base URL');
      return;
    }

    // Validate required fields
    const schema = selectedProvider.loginradius.registrationFormSchema || [];

    // If no schema, validate basic email/password
    if (schema.length === 0) {
      if (!regFormData.emailid || !regFormData.password) {
        alert('Please enter email and password');
        return;
      }
    } else {
      // Validate based on schema
      const requiredFields = schema.filter(f =>
        f.rules?.includes('required') && f.Checked
      );

      const missingFields = requiredFields.filter(f => {
        const value = regFormData[f.name];
        return !value || (typeof value === 'string' && value.trim() === '');
      });

      if (missingFields.length > 0) {
        alert(`Please fill in required fields: ${missingFields.map(f => f.display || f.name).join(', ')}`);
        return;
      }
    }

    setLoading('registration');
    setRegError(null);
    setRegResponse(null);

    try {
      // Fetch SOTT token if needed
      let sott: string | null = null;
      try {
        sott = await fetchSottToken();
      } catch (error) {
        setRegError(`Failed to get SOTT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(null);
        return;
      }

      const url = buildLoginRadiusApiUrl(
        selectedProvider.loginradius.apiBaseUrl,
        '/identity/v2/auth/register'
      );

      // Build payload from form data based on schema
      // Using a more flexible type to allow arrays and nested objects
      const payload: Record<string, unknown> = {};

      // If no schema, use simple email/password structure
      if (schema.length === 0) {
        payload.Email = [
          {
            Type: 'Primary',
            Value: regFormData.emailid,
          },
        ];
        payload.Password = regFormData.password;
      } else {
        // Group fields by parent for nested structures
        const parentGroups: Record<string, Record<string, string>> = {};

        schema.forEach(field => {
          if (field.Checked && regFormData[field.name] !== undefined && regFormData[field.name] !== '') {
            const value = regFormData[field.name];

            // Handle special fields
            if (field.name === 'emailid') {
              const emailArray = (payload.Email as Array<{ Type: string; Value: string }>) || [];
              emailArray.push({
                Type: 'Primary',
                Value: value,
              });
              payload.Email = emailArray;
            } else if (field.name === 'password') {
              payload.Password = value;
            } else if (field.name === 'phoneid') {
              payload.PhoneId = value;
            } else if (field.name === 'username') {
              payload.UserName = value;
            } else if (field.Parent && field.Parent !== '') {
              // Handle nested fields (e.g., Addresses, Interests)
              const parentKey = field.Parent;
              if (!parentGroups[parentKey]) {
                parentGroups[parentKey] = {};
              }
              parentGroups[parentKey][field.name] = value;
            } else {
              // Regular field - map schema field names to API field names
              // Handle custom fields (cf_ prefix)
              if (field.name.startsWith('cf_')) {
                payload[field.name] = value;
              } else {
                const apiFieldName = field.name.charAt(0).toUpperCase() + field.name.slice(1);
                payload[apiFieldName] = value;
              }
            }
          }
        });

        // Add parent groups to payload
        Object.keys(parentGroups).forEach(parentKey => {
          const parentData = parentGroups[parentKey];
          if (Object.keys(parentData).length > 0) {
            // Convert parent key to proper format (e.g., "Addresses" -> array)
            if (parentKey === 'Addresses') {
              const addressesArray = (payload.Addresses as Array<Record<string, string>>) || [];
              addressesArray.push(parentData);
              payload.Addresses = addressesArray;
            } else if (parentKey === 'Interests') {
              const interestsArray = (payload.Interests as Array<Record<string, string>>) || [];
              interestsArray.push(parentData);
              payload.Interests = interestsArray;
            } else {
              // Generic parent handling
              const genericArray = (payload[parentKey] as Array<Record<string, string>>) || [];
              genericArray.push(parentData);
              payload[parentKey] = genericArray;
            }
          }
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-LoginRadius-ApiKey': selectedProvider.loginradius.apiKey,
      };

      if (sott) {
        headers['X-LoginRadius-Sott'] = sott;
      }

      addLog(logRequest({
        method: 'POST',
        url,
        headers,
        body: JSON.stringify(payload),
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      addLog(logResponse({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || '',
        },
        body: JSON.stringify(data),
        timing: {
          start: Date.now(),
          end: Date.now(),
          duration: 0,
        },
      }));

      if (response.ok) {
        setRegResponse(data);
        addLog(logInfo('Registration successful'));
        // Clear form
        setRegFormData({});
      } else {
        setRegError(data.Message || data.ErrorDescription || 'Registration failed');
        addLog(logError('Registration failed', data));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setRegError(errMsg);
      addLog(logError('Registration error', { error: errMsg }));
    } finally {
      setLoading(null);
    }
  };

  const handleLogin = async () => {
    if (!selectedProvider?.loginradius?.apiKey || !selectedProvider?.loginradius?.apiBaseUrl) {
      alert('Please configure LoginRadius API Key and Base URL');
      return;
    }

    if (!loginEmail || !loginPassword) {
      alert('Please enter email and password');
      return;
    }

    setLoading('login');
    setLoginError(null);
    setLoginResponse(null);

    try {
      const url = buildLoginRadiusApiUrl(
        selectedProvider.loginradius.apiBaseUrl,
        '/identity/v2/auth/login'
      );

      const payload = {
        Email: loginEmail,
        Password: loginPassword,
      };

      addLog(logRequest({
        method: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-LoginRadius-ApiKey': selectedProvider.loginradius.apiKey,
        },
        body: JSON.stringify(payload),
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LoginRadius-ApiKey': selectedProvider.loginradius.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      addLog(logResponse({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || '',
        },
        body: JSON.stringify(data),
        timing: {
          start: Date.now(),
          end: Date.now(),
          duration: 0,
        },
      }));

      if (response.ok) {
        setLoginResponse(data);
        if (data.access_token) {
          setAccessToken(data.access_token);
        }
        addLog(logInfo('Login successful'));
      } else {
        setLoginError(data.Message || data.ErrorDescription || 'Login failed');
        addLog(logError('Login failed', data));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setLoginError(errMsg);
      addLog(logError('Login error', { error: errMsg }));
    } finally {
      setLoading(null);
    }
  };

  const handleGetUserInfo = async () => {
    if (!selectedProvider?.loginradius?.apiKey || !selectedProvider?.loginradius?.apiBaseUrl) {
      alert('Please configure LoginRadius API Key and Base URL');
      return;
    }

    if (!accessToken) {
      alert('Please login first to get an access token');
      return;
    }

    setLoading('userinfo');
    setUserInfoError(null);
    setUserInfoResponse(null);

    try {
      const url = buildLoginRadiusApiUrl(
        selectedProvider.loginradius.apiBaseUrl,
        '/identity/v2/auth/account'
      );

      addLog(logRequest({
        method: 'GET',
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-LoginRadius-ApiKey': selectedProvider.loginradius.apiKey,
        },
      }));

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-LoginRadius-ApiKey': selectedProvider.loginradius.apiKey,
        },
      });

      const data = await response.json();

      addLog(logResponse({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || '',
        },
        body: JSON.stringify(data),
        timing: {
          start: Date.now(),
          end: Date.now(),
          duration: 0,
        },
      }));

      if (response.ok) {
        setUserInfoResponse(data);
        addLog(logInfo('User info retrieved successfully'));
      } else {
        setUserInfoError(data.Message || data.ErrorDescription || 'Failed to get user info');
        addLog(logError('Get user info failed', data));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setUserInfoError(errMsg);
      addLog(logError('Get user info error', { error: errMsg }));
    } finally {
      setLoading(null);
    }
  };

  const handleGetSiteConfig = async () => {
    if (!selectedProvider?.loginradius?.apiKey) {
      alert('Please configure LoginRadius API Key');
      return;
    }

    setLoading('siteconfig');
    setSiteConfigError(null);
    setSiteConfigResponse(null);

    try {
      const url = getSiteConfigUrl(selectedProvider.loginradius.apiKey);

      addLog(logRequest({
        method: 'GET',
        url,
        headers: {},
      }));

      const response = await fetch(url, {
        method: 'GET',
      });

      const data = await response.json();

      addLog(logResponse({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || '',
        },
        body: JSON.stringify(data),
        timing: {
          start: Date.now(),
          end: Date.now(),
          duration: 0,
        },
      }));

      if (response.ok) {
        setSiteConfigResponse(data);
        addLog(logInfo('Site config retrieved successfully'));
      } else {
        setSiteConfigError(data.Message || data.ErrorDescription || 'Failed to get site config');
        addLog(logError('Get site config failed', data));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setSiteConfigError(errMsg);
      addLog(logError('Get site config error', { error: errMsg }));
    } finally {
      setLoading(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!selectedProvider?.loginradius?.apiKey) {
      alert('Please configure LoginRadius API Key');
      return;
    }

    if (!forgotEmail && !forgotUsername) {
      alert('Please enter either Email or Username');
      return;
    }

    setLoading('forgotpassword');
    setForgotError(null);
    setForgotResponse(null);

    try {
      const baseUrl = selectedProvider.loginradius.apiBaseUrl || 'https://api.loginradius.com';
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');

      // Construct URL with only apikey in query string
      const url = new URL(`${cleanBaseUrl}/identity/v2/auth/password`);
      url.searchParams.append('apikey', selectedProvider.loginradius.apiKey);
      const fullUrl = url.toString();

      // Email and Username go in the body
      const payload: Record<string, string> = {};
      if (forgotEmail) payload.email = forgotEmail;
      if (forgotUsername) payload.username = forgotUsername;

      addLog(logRequest({
        method: 'POST',
        url: fullUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      }));

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      addLog(logResponse({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || '',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        timing: {
          start: Date.now(),
          end: Date.now(),
          duration: 0,
        },
      }));

      if (response.ok) {
        setForgotResponse(data);
        addLog(logInfo('Forgot password request sent successfully'));
      } else {
        setForgotError(data.Message || data.ErrorDescription || 'Forgot password request failed');
        addLog(logError('Forgot password failed', data));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setForgotError(errMsg);
      addLog(logError('Forgot password error', { error: errMsg }));
    } finally {
      setLoading(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedProvider?.loginradius?.apiKey) {
      alert('Please configure LoginRadius API Key');
      return;
    }

    if (!accessToken) {
      alert('Please login first to get an access token');
      return;
    }

    if (!oldPassword || !newPassword) {
      alert('Please enter both old and new passwords');
      return;
    }

    setLoading('changepassword');
    setChangePasswordError(null);
    setChangePasswordResponse(null);

    try {
      const baseUrl = selectedProvider.loginradius.apiBaseUrl || 'https://api.loginradius.com';
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');

      const url = new URL(`${cleanBaseUrl}/identity/v2/auth/password/change`);
      url.searchParams.append('apikey', selectedProvider.loginradius.apiKey);
      const fullUrl = url.toString();

      const payload = {
        OldPassword: oldPassword,
        NewPassword: newPassword,
      };

      addLog(logRequest({
        method: 'PUT',
        url: fullUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }));

      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      addLog(logResponse({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || '',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        timing: {
          start: Date.now(),
          end: Date.now(),
          duration: 0,
        },
      }));

      if (response.ok) {
        setChangePasswordResponse(data);
        addLog(logInfo('Password changed successfully'));
        setOldPassword('');
        setNewPassword('');
      } else {
        setChangePasswordError(data.Message || data.ErrorDescription || 'Failed to change password');
        addLog(logError('Change password failed', data));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setChangePasswordError(errMsg);
      addLog(logError('Change password error', { error: errMsg }));
    } finally {
      setLoading(null);
    }
  };

  if (!selectedProvider) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="warning" title="No Provider Selected">
          Please select or configure a LoginRadius provider first.
        </Alert>
      </div>
    );
  }

  if (selectedProvider.type !== 'loginradius') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="error" title="Invalid Provider Type">
          Selected provider is not a LoginRadius provider. Please select a LoginRadius provider.
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            LoginRadius CIAM API Flow
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            For UserInfo and Change Password APIs, you need to login.
            Test LoginRadius authentication APIs with {selectedProvider.name}
          </p>
        </div>
        <div className="w-full md:w-64">
          <Select
            label="Select API Operation"
            value={activeComponent}
            onChange={(e) => setActiveComponent(e.target.value)}
            options={componentOptions}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Registration Card */}
        {activeComponent === 'registration' && (
          <Card title="Registration">
            <div className="space-y-4">
              <Alert variant="info">
                {selectedProvider.loginradius?.registrationFormSchema
                  ? `Register a new user with ${selectedProvider.loginradius.registrationFormSchema.length} configured fields`
                  : 'Register a new user with email and password'}
              </Alert>

              {!selectedProvider.loginradius?.registrationFormSchema ? (
                // Fallback to simple email/password if no schema
                <>
                  <Input
                    label="Email"
                    type="email"
                    value={regFormData.emailid || ''}
                    onChange={(e) => setRegFormData({ ...regFormData, emailid: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={regFormData.password || ''}
                    onChange={(e) => setRegFormData({ ...regFormData, password: e.target.value })}
                    placeholder="Enter password"
                    required
                  />
                </>
              ) : (
                // Dynamic form based on schema
                <div className="space-y-4">
                  {selectedProvider.loginradius.registrationFormSchema
                    .filter(field => field.Checked)
                    .map((field) => {
                      const isRequired = field.rules?.includes('required') || false;
                      const value = regFormData[field.name] || '';

                      if (field.type === 'password') {
                        return (
                          <Input
                            key={field.name}
                            label={field.display || field.name}
                            type="password"
                            value={value}
                            onChange={(e) => setRegFormData({ ...regFormData, [field.name]: e.target.value })}
                            placeholder={`Enter ${field.display || field.name.toLowerCase()}`}
                            required={isRequired}
                            helperText={field.rules ? `Rules: ${field.rules}` : undefined}
                          />
                        );
                      }

                      if (field.type === 'option' && field.options) {
                        return (
                          <Select
                            key={field.name}
                            label={field.display || field.name}
                            value={value}
                            onChange={(e) => setRegFormData({ ...regFormData, [field.name]: e.target.value })}
                            options={field.options.map(opt => ({ value: opt.value, label: opt.text }))}
                            required={isRequired}
                            helperText={field.Parent ? `Parent: ${field.Parent}` : undefined}
                          />
                        );
                      }

                      // type string 
                      if (field.type === 'string') {
                        return (
                          <Input
                            key={field.name}
                            label={field.display || field.name}
                            type="text"
                            value={value}
                            onChange={(e) => setRegFormData({ ...regFormData, [field.name]: e.target.value })}
                            required={isRequired}
                            helperText={field.rules ? `Rules: ${field.rules}` : undefined}
                          />
                        );
                      } else if (field.type === 'number') {
                        return (
                          <Input
                            key={field.name}
                            label={field.display || field.name}
                            type="number"
                            value={value}
                            onChange={(e) => setRegFormData({ ...regFormData, [field.name]: e.target.value })}
                            required={isRequired}
                            helperText={field.rules ? `Rules: ${field.rules}` : undefined}
                          />
                        );
                      }

                      // Default to text input
                      return (
                        <Input
                          key={field.name}
                          label={field.display || field.name}
                          type={field.name === 'emailid' ? 'email' : 'text'}
                          value={value}
                          onChange={(e) => setRegFormData({ ...regFormData, [field.name]: e.target.value })}
                          placeholder={`Enter ${field.display || field.name.toLowerCase()}`}
                          required={isRequired}
                          helperText={
                            field.Parent
                              ? `Parent: ${field.Parent}${field.rules ? ` | Rules: ${field.rules}` : ''}`
                              : field.rules
                          }
                        />
                      );
                    })}
                </div>
              )}

              {fetchingSott && (
                <Alert variant="info" title="Fetching SOTT Token">
                  Retrieving SOTT token from hosted page...
                </Alert>
              )}

              {sottToken && (
                <Alert variant="success" title="SOTT Token Ready">
                  <div className="text-xs font-mono break-all">
                    {sottToken.substring(0, 50)}...
                  </div>
                </Alert>
              )}

              <Button
                onClick={handleRegistration}
                loading={loading === 'registration' || fetchingSott}
                className="w-full"
              >
                <UserPlus className="w-4 h-4" />
                Register User
              </Button>

              {regError && (
                <Alert variant="error" title="Error">
                  {regError}
                </Alert>
              )}

              {regResponse && (
                <div>
                  <Alert variant="success" title="Success">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      User registered successfully
                    </div>
                  </Alert>
                  <div className="mt-4">
                    <CodeBlock
                      code={JSON.stringify(regResponse, null, 2)}
                      language="json"
                      maxHeight="300px"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Login Card */}
        {activeComponent === 'login' && (
          <Card title="Login">
            <div className="space-y-4">
              <Alert variant="info">
                Authenticate user with email and password
              </Alert>

              <Input
                label="Email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="user@example.com"
              />

              <Input
                label="Password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
              />

              <Button
                onClick={handleLogin}
                loading={loading === 'login'}
                disabled={!loginEmail || !loginPassword}
                className="w-full"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Button>

              {loginError && (
                <Alert variant="error" title="Error">
                  {loginError}
                </Alert>
              )}

              {loginResponse && (
                <div>
                  <Alert variant="success" title="Success">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Login successful
                      {accessToken && (
                        <span className="text-xs ml-2">(Access Token received)</span>
                      )}
                    </div>
                  </Alert>
                  {accessToken && (
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all">
                      Token: {accessToken.substring(0, 50)}...
                    </div>
                  )}
                  <div className="mt-4">
                    <CodeBlock
                      code={JSON.stringify(loginResponse, null, 2)}
                      language="json"
                      maxHeight="300px"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Get User Info Card */}
        {activeComponent === 'userinfo' && (
          <Card title="Get User Info">
            <div className="space-y-4">
              <Alert variant="info">
                Retrieve user profile information using access token
              </Alert>

              {!accessToken && (
                <Alert variant="warning" title="No Access Token">
                  Please login first to get an access token
                </Alert>
              )}

              <Button
                onClick={handleGetUserInfo}
                loading={loading === 'userinfo'}
                disabled={!accessToken}
                className="w-full"
              >
                <User className="w-4 h-4" />
                Get User Info
              </Button>

              {userInfoError && (
                <Alert variant="error" title="Error">
                  {userInfoError}
                </Alert>
              )}

              {userInfoResponse && (
                <div>
                  <Alert variant="success" title="Success">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      User info retrieved successfully
                    </div>
                  </Alert>
                  <div className="mt-4">
                    <CodeBlock
                      code={JSON.stringify(userInfoResponse, null, 2)}
                      language="json"
                      maxHeight="300px"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Get Site Config Card */}
        {activeComponent === 'siteconfig' && (
          <Card title="Get Site Config">
            <div className="space-y-4">
              <Alert variant="info">
                Retrieve site configuration and app information
              </Alert>

              <Button
                onClick={handleGetSiteConfig}
                loading={loading === 'siteconfig'}
                className="w-full"
              >
                <Settings className="w-4 h-4" />
                Get Site Config
              </Button>

              {siteConfigError && (
                <Alert variant="error" title="Error">
                  {siteConfigError}
                </Alert>
              )}

              {siteConfigResponse && (
                <div>
                  <Alert variant="success" title="Success">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Site config retrieved successfully
                    </div>
                  </Alert>
                  <div className="mt-4">
                    <CodeBlock
                      code={JSON.stringify(siteConfigResponse, null, 2)}
                      language="json"
                      maxHeight="300px"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Forgot Password Card */}
        {activeComponent === 'forgotpassword' && (
          <Card title="Forgot Password">
            <div className="space-y-4">
              <Alert variant="info">
                Request a password reset link by providing email or username
              </Alert>

              <Input
                label="Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="user@example.com"
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">OR</span>
                </div>
              </div>

              <Input
                label="Username"
                type="text"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                placeholder="Enter username"
              />

              <Button
                onClick={handleForgotPassword}
                loading={loading === 'forgotpassword'}
                disabled={!forgotEmail && !forgotUsername}
                className="w-full"
              >
                <KeyRound className="w-4 h-4" />
                Send Reset Link
              </Button>

              {forgotError && (
                <Alert variant="error" title="Error">
                  {forgotError}
                </Alert>
              )}

              {forgotResponse && (
                <div>
                  <Alert variant="success" title="Success">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Reset request sent successfully
                    </div>
                  </Alert>
                  <div className="mt-4">
                    <CodeBlock
                      code={JSON.stringify(forgotResponse, null, 2)}
                      language="json"
                      maxHeight="300px"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Change Password Card */}
        {activeComponent === 'changepassword' && (
          <Card title="Change Password">
            <div className="space-y-4">
              <Alert variant="info">
                Change the password for the currently logged-in user
              </Alert>

              {!accessToken && (
                <Alert variant="warning" title="No Access Token">
                  Please login first to get an access token
                </Alert>
              )}

              <Input
                label="Old Password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter old password"
                disabled={!accessToken}
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={!accessToken}
              />

              <Button
                onClick={handleChangePassword}
                loading={loading === 'changepassword'}
                disabled={!accessToken || !oldPassword || !newPassword}
                className="w-full"
              >
                <KeyRound className="w-4 h-4" />
                Change Password
              </Button>

              {changePasswordError && (
                <Alert variant="error" title="Error">
                  {changePasswordError}
                </Alert>
              )}

              {changePasswordResponse && (
                <div>
                  <Alert variant="success" title="Success">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Password changed successfully
                    </div>
                  </Alert>
                  <div className="mt-4">
                    <CodeBlock
                      code={JSON.stringify(changePasswordResponse, null, 2)}
                      language="json"
                      maxHeight="300px"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <Card title="Flow Logs">
          <LogViewer logs={logs} maxHeight="400px" />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="LoginRadius Configuration">
          <div className="space-y-2 text-sm">
            {selectedProvider.loginradius?.apiKey && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">API Key:</span>
                <p className="text-gray-600 dark:text-gray-400 break-all text-xs">
                  {selectedProvider.loginradius.apiKey}
                </p>
              </div>
            )}
            {selectedProvider.loginradius?.apiBaseUrl && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">API Base URL:</span>
                <p className="text-gray-600 dark:text-gray-400 break-all text-xs">
                  {selectedProvider.loginradius.apiBaseUrl}
                </p>
              </div>
            )}
            {selectedProvider.loginradius?.tenantName && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tenant Name:</span>
                <p className="text-gray-600 dark:text-gray-400 break-all text-xs">
                  {selectedProvider.loginradius.tenantName}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

