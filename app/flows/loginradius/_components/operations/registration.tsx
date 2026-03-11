'use client';

import { useState } from 'react';
import { Input, Select } from '@/components/Input';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { buildLoginRadiusApiUrl, fetchLoginRadiusConfig } from '@/lib/loginradius';
import { logInfo, logError } from '@/lib/logging';
import { OperationRunner } from '../operation-runner';
import type { OperationProps, LROperation } from '../operation-runner';

function RegistrationOperation({ provider, setAccessToken, addLog }: OperationProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sottToken, setSottToken] = useState<string | null>(null);
  const [fetchingSott, setFetchingSott] = useState(false);

  const schema = provider.loginradius?.registrationFormSchema || [];

  const fetchSottToken = async (): Promise<string | null> => {
    if (provider.loginradius?.sott) {
      addLog(logInfo('Using long-lived SOTT token from provider config'));
      return provider.loginradius.sott;
    }

    if (!provider.loginradius?.hostedPageUrl) {
      throw new Error('No SOTT token configured and hosted page URL not available');
    }

    setFetchingSott(true);
    try {
      addLog(logInfo('Fetching SOTT token from hosted page'));
      const config = await fetchLoginRadiusConfig(provider.loginradius.hostedPageUrl);
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

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};

    if (schema.length === 0) {
      payload.Email = [{ Type: 'Primary', Value: formData.emailid }];
      payload.Password = formData.password;
      return payload;
    }

    const parentGroups: Record<string, Record<string, string>> = {};

    schema.forEach(field => {
      if (field.Checked && formData[field.name] !== undefined && formData[field.name] !== '') {
        const value = formData[field.name];

        if (field.name === 'emailid') {
          const emailArray = (payload.Email as Array<{ Type: string; Value: string }>) || [];
          emailArray.push({ Type: 'Primary', Value: value });
          payload.Email = emailArray;
        } else if (field.name === 'password') {
          payload.Password = value;
        } else if (field.name === 'phoneid') {
          payload.PhoneId = value;
        } else if (field.name === 'username') {
          payload.UserName = value;
        } else if (field.Parent && field.Parent !== '') {
          if (!parentGroups[field.Parent]) parentGroups[field.Parent] = {};
          parentGroups[field.Parent][field.name] = value;
        } else {
          if (field.name.startsWith('cf_')) {
            payload[field.name] = value;
          } else {
            payload[field.name.charAt(0).toUpperCase() + field.name.slice(1)] = value;
          }
        }
      }
    });

    for (const [parentKey, parentData] of Object.entries(parentGroups)) {
      if (Object.keys(parentData).length > 0) {
        const existing = (payload[parentKey] as Array<Record<string, string>>) || [];
        existing.push(parentData);
        payload[parentKey] = existing;
      }
    }

    return payload;
  };

  return (
    <OperationRunner addLog={addLog}>
      {({ execute, loading, result, error }) => (
        <div className="space-y-4">
          <Alert variant="info">
            {schema.length > 0
              ? `Register a new user with ${schema.filter(f => f.Checked).length} configured fields`
              : 'Register a new user with email and password'}
          </Alert>

          {schema.length === 0 ? (
            <>
              <Input
                label="Email"
                type="email"
                value={formData.emailid || ''}
                onChange={(e) => setFormData({ ...formData, emailid: e.target.value })}
                placeholder="user@example.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </>
          ) : (
            <div className="space-y-4">
              {schema
                .filter(field => field.Checked)
                .map((field) => {
                  const isRequired = field.rules?.includes('required') || false;
                  const value = formData[field.name] || '';

                  if (field.type === 'option' && field.options) {
                    return (
                      <Select
                        key={field.name}
                        label={field.display || field.name}
                        value={value}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        options={field.options.map(opt => ({ value: opt.value, label: opt.text }))}
                        required={isRequired}
                        helperText={field.Parent ? `Parent: ${field.Parent}` : undefined}
                      />
                    );
                  }

                  return (
                    <Input
                      key={field.name}
                      label={field.display || field.name}
                      type={field.type === 'password' ? 'password' : field.name === 'emailid' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={`Enter ${(field.display || field.name).toLowerCase()}`}
                      required={isRequired}
                      helperText={
                        field.Parent
                          ? `Parent: ${field.Parent}${field.rules ? ` | Rules: ${field.rules}` : ''}`
                          : field.rules ? `Rules: ${field.rules}` : undefined
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
              <span className="text-xs font-mono break-all">
                {sottToken.substring(0, 50)}...
              </span>
            </Alert>
          )}

          <Button
            onClick={async () => {
              if (!provider.loginradius?.apiKey || !provider.loginradius?.apiBaseUrl) {
                toast.error('Please configure LoginRadius API Key and Base URL');
                return;
              }

              if (schema.length === 0 && (!formData.emailid || !formData.password)) {
                toast('Please enter email and password', { icon: '⚠️' });
                return;
              }

              if (schema.length > 0) {
                const requiredFields = schema.filter(f => f.rules?.includes('required') && f.Checked);
                const missing = requiredFields.filter(f => !formData[f.name]?.trim());
                if (missing.length > 0) {
                  toast(`Please fill in: ${missing.map(f => f.display || f.name).join(', ')}`, { icon: '⚠️' });
                  return;
                }
              }

              let sott: string | null = null;
              try {
                sott = await fetchSottToken();
              } catch (err) {
                return;
              }

              const url = buildLoginRadiusApiUrl(
                provider.loginradius.apiBaseUrl,
                '/identity/v2/auth/register'
              );

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-LoginRadius-ApiKey': provider.loginradius.apiKey,
              };
              if (sott) headers['X-LoginRadius-Sott'] = sott;

              try {
                const res = await execute({
                  method: 'POST',
                  url,
                  headers,
                  body: JSON.stringify(buildPayload()),
                });

                 if (res.ok) {
                   addLog(logInfo('Registration successful'));
                   toast.success('Registration successful');
                   setFormData({});
                } else {
                  addLog(logError('Registration failed', res.data as Record<string, unknown>));
                }
              } catch {
                addLog(logError('Registration request failed'));
              }
            }}
            loading={loading || fetchingSott}
            className="w-full"
          >
            <UserPlus className="w-4 h-4" />
            Register User
          </Button>

          {error && <Alert variant="error" title="Error">{error}</Alert>}
          {result?.ok && <Alert variant="success">User registered successfully</Alert>}
        </div>
      )}
    </OperationRunner>
  );
}

export const registrationOperation: LROperation = {
  id: 'registration',
  label: 'Registration',
  description: 'Register a new user account',
  category: 'auth',
  requiresToken: false,
  Component: RegistrationOperation,
};
