'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select, TextArea } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { LogViewer } from '@/components/LogViewer';
import {
  buildOAuth2AuthorizationUrl,
  exchangeAuthorizationCode,
  requestPasswordGrant,
  requestClientCredentials,
  startDeviceAuthorization,
  pollDeviceToken,
  introspectToken,
  revokeToken,
  refreshToken,
} from '@/lib/oauth2';
import { generateRandomString, generateCodeVerifier, generateCodeChallenge, parseJWT } from '@/lib/utils';
import { logInfo, logError } from '@/lib/logging';
import type { LogEntry } from '@/lib/types';
import { Play, RefreshCw, Key, Monitor, Copy, Trash2, Eye, ExternalLink } from 'lucide-react';

type GrantType = 'authorization_code' | 'implicit' | 'password' | 'client_credentials' | 'device_code';

export default function OAuth2FlowPage() {
  const { providers, selectedProviderId } = useStore();
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const [grantType, setGrantType] = useState<GrantType>('authorization_code');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Authorization Code flow
  const [authUrl, setAuthUrl] = useState('');
  const [state, setState] = useState('');
  const [codeVerifier, setCodeVerifier] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [usePKCE, setUsePKCE] = useState(true);
  const [redirectUri, setRedirectUri] = useState(selectedProvider?.redirectUris[0] || '');
  const [localClientId, setLocalClientId] = useState(selectedProvider?.clientId || '');
  const [localClientSecret, setLocalClientSecret] = useState(selectedProvider?.clientSecret || '');
  const [localTokenEndpoint, setLocalTokenEndpoint] = useState(selectedProvider?.endpoints.tokenUrl || '');

  // Password grant
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [audience, setAudience] = useState('');
  const [resource, setResource] = useState('');

  // Device code flow
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [verificationUriComplete, setVerificationUriComplete] = useState('');
  const [interval, setInterval] = useState(5);
  const [polling, setPolling] = useState(false);

  // Common
  const [scope, setScope] = useState('profile email');
  const [prompt, setPrompt] = useState('');
  const [tokens, setTokens] = useState<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  }>({});
  const [tokenClaims, setTokenClaims] = useState<any>(null);
  const [introspectionResult, setIntrospectionResult] = useState<any>(null);

  const addLog = (log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  };

  // Listen for callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth2_callback') {
        const { code, state: receivedState } = event.data;

        if (code && receivedState === state) {
          setAuthCode(code);
          addLog(logInfo('Authorization code received from callback'));
        } else if (receivedState !== state) {
          addLog(logError('State mismatch - possible CSRF attack'));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state]);

  useEffect(() => {
    if (selectedProvider?.redirectUris[0]) {
      setRedirectUri(selectedProvider.redirectUris[0]);
    }
  }, [selectedProvider?.id]);

  const handleAuthorizationCode = async () => {
    if (!selectedProvider?.endpoints.authorizationUrl) {
      alert('Provider is missing authorization URL');
      return;
    }

    setLoading(true);
    setLogs([]);
    setTokens({});

    try {
      addLog(logInfo('Starting OAuth 2.0 authorization code flow'));

      const newState = generateRandomString();
      setState(newState);

      let challenge: string | undefined;
      let verifier: string | undefined;

      if (usePKCE) {
        verifier = generateCodeVerifier();
        challenge = await generateCodeChallenge(verifier);
        setCodeVerifier(verifier);
        addLog(logInfo('PKCE enabled - code challenge generated'));
      }

      const url = buildOAuth2AuthorizationUrl({
        authorizationEndpoint: selectedProvider.endpoints.authorizationUrl,
        clientId: selectedProvider.clientId!,
        redirectUri: selectedProvider.redirectUris[0],
        scope,
        state: newState,
        responseType: 'code',
        prompt: prompt || undefined,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
      });

      setAuthUrl(url);
      addLog(logInfo('Authorization URL generated', { url, prompt: prompt || '(not set)' }));

      window.open(url, '_blank', 'width=600,height=800');
    } catch (error) {
      addLog(logError('Failed to start flow', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async (code?: string) => {
    const codeToExchange = code || authCode;

    if (!selectedProvider?.endpoints.tokenUrl || !codeToExchange) {
      alert('Missing token URL or authorization code');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Exchanging authorization code for tokens'));

      const tokenResponse = await exchangeAuthorizationCode({
        tokenEndpoint: selectedProvider.endpoints.tokenUrl,
        code: codeToExchange,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
        redirectUri: selectedProvider.redirectUris[0],
        codeVerifier: usePKCE ? codeVerifier : undefined,
      });

      setTokens(tokenResponse);
      addLog(logInfo('Tokens received successfully'));

      // Try to decode token if JWT
      const parsed = parseJWT(tokenResponse.access_token);
      if (parsed) {
        setTokenClaims(parsed.payload);
        addLog(logInfo('Access token decoded (JWT format)'));
      }
    } catch (error) {
      addLog(logError('Token exchange failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordGrant = async () => {
    if (!selectedProvider?.endpoints.tokenUrl) {
      alert('Provider is missing token URL');
      return;
    }

    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }

    setLoading(true);
    setLogs([]);
    setTokens({});

    try {
      addLog(logInfo('Requesting tokens using password grant'));

      const tokenResponse = await requestPasswordGrant({
        tokenEndpoint: selectedProvider.endpoints.tokenUrl,
        username,
        password,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
        scope,
      });

      setTokens(tokenResponse);
      addLog(logInfo('Tokens received successfully'));

      const parsed = parseJWT(tokenResponse.access_token);
      if (parsed) setTokenClaims(parsed.payload);
    } catch (error) {
      addLog(logError('Password grant failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleClientCredentials = async () => {
    if (!selectedProvider?.endpoints.tokenUrl) {
      alert('Provider is missing token URL');
      return;
    }

    if (!selectedProvider.clientSecret) {
      alert('Client credentials grant requires a client secret');
      return;
    }

    setLoading(true);
    setLogs([]);
    setTokens({});

    try {
      addLog(logInfo('Requesting tokens using client credentials grant'));

      const tokenResponse = await requestClientCredentials({
        tokenEndpoint: selectedProvider.endpoints.tokenUrl,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
        scope,
      });

      setTokens(tokenResponse);
      addLog(logInfo('Tokens received successfully'));

      const parsed = parseJWT(tokenResponse.access_token);
      if (parsed) setTokenClaims(parsed.payload);
    } catch (error) {
      addLog(logError('Client credentials grant failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleStartDeviceCode = async () => {
    if (!selectedProvider?.endpoints.deviceCodeUrl) {
      alert('Provider does not support device code flow');
      return;
    }

    setLoading(true);
    setLogs([]);
    setTokens({});

    try {
      addLog(logInfo('Starting device authorization flow'));

      const result = await startDeviceAuthorization({
        deviceAuthorizationEndpoint: selectedProvider.endpoints.deviceCodeUrl,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
        scope,
      });

      setDeviceCode(result.device_code);
      setUserCode(result.user_code);
      setVerificationUri(result.verification_uri);
      setVerificationUriComplete(result.verification_uri_complete || '');
      setInterval(result.interval || 5);

      addLog(logInfo('Device code received', {
        user_code: result.user_code,
        verification_uri: result.verification_uri,
      }));

      // Start polling
      setPolling(true);
    } catch (error) {
      addLog(logError('Device authorization failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  // Poll for device code token
  useEffect(() => {
    if (!polling || !deviceCode || !selectedProvider?.endpoints.tokenUrl) return;

    let isActive = true;
    const currentInterval = interval * 1000;

    const poll = async () => {
      if (!isActive) return;

      try {
        const result = await pollDeviceToken({
          tokenEndpoint: selectedProvider.endpoints.tokenUrl!,
          deviceCode,
          clientId: selectedProvider.clientId!,
          clientSecret: selectedProvider.clientSecret,
        });

        if (!isActive) return;

        if (result.status === 'complete') {
          setTokens(result.tokens!);
          setPolling(false);
          addLog(logInfo('Device authorization completed - tokens received'));

          const parsed = parseJWT(result.tokens!.access_token);
          if (parsed) setTokenClaims(parsed.payload);
        } else if (result.status === 'slow_down') {
          addLog(logInfo('Slowing down polling', { interval: (result.interval || interval) }));
        } else if (result.status === 'expired' || result.status === 'denied') {
          setPolling(false);
          addLog(logError(`Device authorization ${result.status}`, { error: result.error }));
        } else {
          addLog(logInfo('Waiting for user authorization...'));
        }
      } catch (error) {
        if (isActive) {
          addLog(logError('Polling error', { error: String(error) }));
        }
      }
    };

    poll(); // Initial poll

    const pollInterval = window.setInterval(poll, currentInterval);

    return () => {
      isActive = false;
      window.clearInterval(pollInterval);
    };
  }, [polling, deviceCode, interval, selectedProvider]);

  const handleRefreshToken = async () => {
    if (!selectedProvider?.endpoints.tokenUrl || !tokens.refresh_token) {
      alert('Missing token URL or refresh token');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Refreshing access token'));

      const tokenResponse = await refreshToken({
        tokenEndpoint: selectedProvider.endpoints.tokenUrl,
        refreshToken: tokens.refresh_token,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
        scope,
      });

      setTokens(tokenResponse);
      addLog(logInfo('New tokens received'));

      const parsed = parseJWT(tokenResponse.access_token);
      if (parsed) setTokenClaims(parsed.payload);
    } catch (error) {
      addLog(logError('Token refresh failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleIntrospect = async () => {
    if (!selectedProvider?.endpoints.introspectionUrl || !tokens.access_token) {
      alert('Missing introspection URL or access token');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Introspecting token'));

      const result = await introspectToken({
        introspectionEndpoint: selectedProvider.endpoints.introspectionUrl,
        token: tokens.access_token,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
      });

      setIntrospectionResult(result);
      addLog(logInfo('Token introspection result', result));
    } catch (error) {
      addLog(logError('Token introspection failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedProvider?.endpoints.revocationUrl || !tokens.access_token) {
      alert('Missing revocation URL or access token');
      return;
    }

    if (!confirm('Are you sure you want to revoke this token?')) return;

    setLoading(true);

    try {
      addLog(logInfo('Revoking token'));

      await revokeToken({
        revocationEndpoint: selectedProvider.endpoints.revocationUrl,
        token: tokens.access_token,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
      });

      addLog(logInfo('Token revoked successfully'));
      setTokens({});
      setTokenClaims(null);
      setIntrospectionResult(null);
    } catch (error) {
      addLog(logError('Token revocation failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProvider) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="warning" title="No Provider Selected">
          Please select or configure an OAuth 2.0 provider first.
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            OAuth 2.0 Flow Runner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test OAuth 2.0 authentication flows with {selectedProvider.name}
          </p>
        </div>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => window.open('https://www.loginradius.com/docs/single-sign-on/federated-sso/oauth-2.0/overview/', '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
          View Documentation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Flow Configuration">
            <div className="space-y-4">
              <Select
                label="Grant Type"
                value={grantType}
                onChange={(e) => setGrantType(e.target.value as GrantType)}
                options={[
                  { value: 'authorization_code', label: 'Authorization Code' },
                  { value: 'implicit', label: 'Implicit (deprecated)' },
                  { value: 'password', label: 'Password Credentials (legacy)' },
                  { value: 'client_credentials', label: 'Client Credentials' },
                  { value: 'device_code', label: 'Device Code' },
                ]}
              />

              {grantType !== 'client_credentials' && (
                <Input
                  label="Scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="profile email"
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Redirect URI
                </label>
                <p className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm font-mono break-all">
                  {redirectUri || 'Not configured'}
                </p>
              </div>

              {/* Authorization Code Flow */}
              {grantType === 'authorization_code' && (
                <>
                  {/* Prompt Parameter */}
                  <Select
                    label="Prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    options={[
                      { value: '', label: '(not set)' },
                      { value: 'none', label: 'none — No UI, error if login/consent needed' },
                      { value: 'login', label: 'login — Force reauthentication' },
                      { value: 'consent', label: 'consent — Force consent screen' },
                      { value: 'login consent', label: 'login consent — Force both' },
                    ]}
                  />
                  {prompt === 'none' && (
                    <Alert variant="warning">
                      <strong>prompt=none</strong>: The IdP will return an error if the
                      user is not already authenticated or consent is not pre-configured.
                    </Alert>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pkce"
                      checked={usePKCE}
                      onChange={(e) => setUsePKCE(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="pkce" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Use PKCE (Recommended)
                    </label>
                  </div>
                  <Button onClick={handleAuthorizationCode} loading={loading} className="w-full">
                    <Play className="w-4 h-4" />
                    Start Authorization Code Flow
                  </Button>
                </>
              )}

              {/* Password Grant */}
              {grantType === 'password' && (
                <>
                  <Alert variant="warning" title="Legacy Grant Type">
                    The password credentials grant is deprecated and should only be used for testing legacy systems.
                  </Alert>
                  <Input
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                  />
                  <Button onClick={handlePasswordGrant} loading={loading} className="w-full">
                    <Key className="w-4 h-4" />
                    Request Tokens
                  </Button>
                </>
              )}

              {/* Client Credentials */}
              {grantType === 'client_credentials' && (
                <>
                  <Alert variant="info">
                    This grant type is used for machine-to-machine authentication.
                    Requires a client secret.
                  </Alert>
                  <Button onClick={handleClientCredentials} loading={loading} className="w-full">
                    <Key className="w-4 h-4" />
                    Request Token
                  </Button>
                </>
              )}

              {/* Device Code */}
              {grantType === 'device_code' && (
                <>
                  <Button onClick={handleStartDeviceCode} loading={loading} className="w-full">
                    <Monitor className="w-4 h-4" />
                    Start Device Code Flow
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Authorization URL */}
          {authUrl && grantType === 'authorization_code' && (
            <Card title="Authorization URL">
              <CodeBlock code={authUrl} maxHeight="120px" />
              {!tokens.access_token && (
                <div className="mt-4 space-y-4">
                  <Input
                    label="Authorization Code"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste code here or wait for automatic capture"
                  />
                  <Button onClick={() => handleExchangeCode()} disabled={!authCode} loading={loading}>
                    <RefreshCw className="w-4 h-4" />
                    Exchange Code
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Device Code Display */}
          {userCode && grantType === 'device_code' && (
            <Card title="Device Authorization">
              <div className="space-y-4">
                <Alert variant="info" title="User Action Required">
                  Visit the URL below and enter the user code to authorize this device.
                </Alert>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">User Code</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {userCode}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Verification URL</label>
                  <div className="flex gap-2">
                    <Input value={verificationUri} readOnly />
                    <Button
                      size="sm"
                      onClick={() => window.open(verificationUri, '_blank')}
                    >
                      Open
                    </Button>
                  </div>
                </div>
                {polling && (
                  <Alert variant="info">
                    Polling for authorization... (every {interval} seconds)
                  </Alert>
                )}
                {polling && (
                  <Button variant="danger" onClick={() => setPolling(false)}>
                    Cancel Polling
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Tokens Display */}
          {tokens.access_token && (
            <Card title="Access Token">
              <div className="space-y-4">
                <CodeBlock code={tokens.access_token} maxHeight="120px" />
                {tokens.expires_in && (
                  <p className="text-sm text-gray-600">Expires in: {tokens.expires_in} seconds</p>
                )}

                {tokenClaims && (
                  <div>
                    <h4 className="font-semibold mb-2">Token Claims</h4>
                    <div className="space-y-2">
                      {Object.entries(tokenClaims).map(([key, value]) => (
                        <div key={key} className="flex gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="font-mono text-sm font-medium min-w-[100px]">{key}</span>
                          <span className="text-sm break-all">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tokens.refresh_token && (
                  <div>
                    <h4 className="font-semibold mb-2">Refresh Token</h4>
                    <CodeBlock code={tokens.refresh_token} maxHeight="100px" />
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {tokens.refresh_token && (
                    <Button onClick={handleRefreshToken} loading={loading} size="sm">
                      <RefreshCw className="w-4 h-4" />
                      Refresh Token
                    </Button>
                  )}
                  {selectedProvider.endpoints.introspectionUrl && (
                    <Button onClick={handleIntrospect} loading={loading} size="sm" variant="secondary">
                      <Eye className="w-4 h-4" />
                      Introspect
                    </Button>
                  )}
                  {selectedProvider.endpoints.revocationUrl && (
                    <Button onClick={handleRevoke} loading={loading} size="sm" variant="danger">
                      <Trash2 className="w-4 h-4" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {introspectionResult && (
            <Card title="Introspection Result">
              <CodeBlock code={JSON.stringify(introspectionResult, null, 2)} language="json" />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Flow Logs">
            <LogViewer logs={logs} maxHeight="600px" />
          </Card>
        </div>
      </div>
    </div>
  );
}
