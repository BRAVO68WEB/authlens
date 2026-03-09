'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { LogViewer } from '@/components/LogViewer';
import { buildAuthorizationUrl, exchangeCode, fetchUserInfo, introspectToken, revokeToken } from '@/lib/oidc';
import { validateJWT } from '@/lib/jwt';
import { logInfo, logError } from '@/lib/logging';
import type { LogEntry, OIDCResponseType } from '@/lib/types';
import { Play, Copy, ExternalLink, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { copyToClipboard, parseJWT } from '@/lib/utils';

export default function OIDCFlowPage() {
  const { providers, selectedProviderId } = useStore();
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const [flowType, setFlowType] = useState<'code' | 'implicit' | 'hybrid'>('code');
  const [responseType, setResponseType] = useState<OIDCResponseType>('code');
  const [usePKCE, setUsePKCE] = useState(true);
  const [scope, setScope] = useState('openid profile email');
  const [redirectUri, setRedirectUri] = useState(selectedProvider?.redirectUris[0] || '');
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [authUrl, setAuthUrl] = useState('');
  const [state, setState] = useState('');
  const [nonce, setNonce] = useState('');
  const [codeVerifier, setCodeVerifier] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [tokens, setTokens] = useState<{
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  }>({});
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null);
  const [idTokenValidation, setIdTokenValidation] = useState<any>(null);
  const [accessTokenValidation, setAccessTokenValidation] = useState<any>(null);
  const [idTokenClaims, setIdTokenClaims] = useState<any>(null);
  const [accessTokenClaims, setAccessTokenClaims] = useState<any>(null);
  const [introspectionResult, setIntrospectionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'claims' | 'userinfo' | 'introspect'>('tokens');

  const addLog = (log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  };

  // Sync redirectUri when provider changes
  useEffect(() => {
    if (selectedProvider?.redirectUris[0]) {
      setRedirectUri(selectedProvider.redirectUris[0]);
    }
  }, [selectedProvider?.id]);

  // Listen for callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oidc_callback') {
        const { code, state: receivedState, error } = event.data;

        if (error) {
          addLog(logError('Authorization failed', { error }));
          return;
        }

        if (code && receivedState === state) {
          setAuthCode(code);
          addLog(logInfo('Authorization code received from callback', { code: '***' }));
        } else if (receivedState !== state) {
          addLog(logError('State mismatch - possible CSRF attack'));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state]);

  const handleStartFlow = async () => {
    if (!selectedProvider) {
      alert('Please select a provider first');
      return;
    }

    if (!selectedProvider.endpoints.authorizationUrl) {
      alert('Provider is missing authorization URL');
      return;
    }

    setLoading(true);
    setLogs([]);
    setTokens({});
    setUserInfo(null);
    setIdTokenValidation(null);
    setAccessTokenValidation(null);
    setIdTokenClaims(null);
    setAccessTokenClaims(null);
    setIntrospectionResult(null);

    try {
      addLog(logInfo('Starting OIDC authorization flow', { flowType, responseType }));

      const result = await buildAuthorizationUrl({
        authorizationEndpoint: selectedProvider.endpoints.authorizationUrl,
        clientId: selectedProvider.clientId!,
        redirectUri,
        scope,
        responseType,
        usePKCE: usePKCE && responseType.includes('code'),
        prompt: prompt || undefined,
      });

      setAuthUrl(result.url);
      setState(result.state);
      setNonce(result.nonce || '');
      setCodeVerifier(result.codeVerifier || '');

      addLog(
        logInfo('Authorization URL generated', {
          url: result.url,
          state: result.state,
          pkce: usePKCE,
          prompt: prompt || '(not set)',
        })
      );

      // Open in new window with callback listener
      const popup = window.open(result.url, '_blank', 'width=600,height=800');

      // Poll for popup closure
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopup);
          addLog(logInfo('Authentication window closed'));
        }
      }, 1000);

    } catch (error) {
      addLog(logError('Failed to start flow', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async (code?: string) => {
    const codeToExchange = code || authCode;

    if (!selectedProvider || !codeToExchange) {
      alert('Please enter the authorization code');
      return;
    }

    if (!selectedProvider.endpoints.tokenUrl) {
      alert('Provider is missing token URL');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Exchanging authorization code for tokens'));

      const tokenResponse = await exchangeCode({
        tokenEndpoint: selectedProvider.endpoints.tokenUrl,
        code: codeToExchange,
        clientId: selectedProvider.clientId!,
        clientSecret: selectedProvider.clientSecret,
        redirectUri,
        codeVerifier: usePKCE ? codeVerifier : undefined,
      });

      setTokens(tokenResponse);

      addLog(
        logInfo('Tokens received successfully', {
          has_access_token: !!tokenResponse.access_token,
          has_id_token: !!tokenResponse.id_token,
          has_refresh_token: !!tokenResponse.refresh_token,
          expires_in: tokenResponse.expires_in,
        })
      );

      // Decode and validate ID token
      if (tokenResponse.id_token) {
        const idParsed = parseJWT(tokenResponse.id_token);
        if (idParsed && idParsed.payload) {
          setIdTokenClaims(idParsed.payload);
          addLog(logInfo('ID token decoded', { claims: Object.keys(idParsed.payload as object) }));
        }

        if (selectedProvider.endpoints.jwksUrl) {
          try {
            const validation = await validateJWT({
              token: tokenResponse.id_token,
              jwksUrl: selectedProvider.endpoints.jwksUrl,
              audience: selectedProvider.clientId,
              clockSkew: selectedProvider.advanced.clockSkew || 0,
            });

            setIdTokenValidation(validation);

            if (validation.valid) {
              addLog(logInfo('ID token validated successfully'));
            } else {
              addLog(
                logError('ID token validation failed', {
                  errors: validation.errors,
                })
              );
            }
          } catch (error) {
            addLog(logError('Failed to validate ID token', { error: String(error) }));
          }
        }
      }

      // Decode access token if it's a JWT
      if (tokenResponse.access_token) {
        const accessParsed = parseJWT(tokenResponse.access_token);
        if (accessParsed && accessParsed.payload) {
          setAccessTokenClaims(accessParsed.payload);
          addLog(logInfo('Access token decoded (JWT format)', { claims: Object.keys(accessParsed.payload as object) }));

          // Validate access token if it's a JWT
          if (selectedProvider.endpoints.jwksUrl) {
            try {
              const validation = await validateJWT({
                token: tokenResponse.access_token,
                jwksUrl: selectedProvider.endpoints.jwksUrl,
                clockSkew: selectedProvider.advanced.clockSkew || 0,
              });

              setAccessTokenValidation(validation);

              if (validation.valid) {
                addLog(logInfo('Access token validated successfully'));
              } else {
                addLog(logError('Access token validation failed', { errors: validation.errors }));
              }
            } catch (error) {
              addLog(logError('Failed to validate access token', { error: String(error) }));
            }
          }
        } else {
          addLog(logInfo('Access token is opaque (not JWT format)'));
        }
      }

      // Switch to claims tab
      setActiveTab('claims');
    } catch (error) {
      addLog(logError('Token exchange failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUserInfo = async () => {
    if (!selectedProvider || !tokens.access_token) {
      alert('Please obtain an access token first');
      return;
    }

    if (!selectedProvider.endpoints.userinfoUrl) {
      alert('Provider is missing userinfo URL');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Fetching user info'));

      const info = await fetchUserInfo(
        selectedProvider.endpoints.userinfoUrl,
        tokens.access_token
      );

      setUserInfo(info);
      addLog(logInfo('User info received', info));
      setActiveTab('userinfo');
    } catch (error) {
      addLog(logError('Failed to fetch user info', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleIntrospect = async () => {
    if (!selectedProvider || !tokens.access_token) {
      alert('Please obtain an access token first');
      return;
    }

    if (!selectedProvider.endpoints.introspectionUrl) {
      alert('Provider does not support token introspection');
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
      setActiveTab('introspect');
    } catch (error) {
      addLog(logError('Token introspection failed', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedProvider || !tokens.access_token) {
      alert('Please obtain an access token first');
      return;
    }

    if (!selectedProvider.endpoints.revocationUrl) {
      alert('Provider does not support token revocation');
      return;
    }

    if (!confirm('Are you sure you want to revoke this token?')) {
      return;
    }

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
      setUserInfo(null);
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
          Please select or configure a provider first from the providers page.
        </Alert>
      </div>
    );
  }

  if (selectedProvider.type !== 'oidc') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="error" title="Invalid Provider Type">
          Selected provider is not an OIDC provider. Please select an OIDC provider.
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            OIDC Flow Runner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test OpenID Connect authentication flows with {selectedProvider.name}
          </p>
        </div>
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => window.open('https://www.loginradius.com/docs/single-sign-on/federated-sso/openid-connect/overview/', '_blank')}
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
                label="Flow Type"
                value={flowType}
                onChange={(e) => {
                  const type = e.target.value as typeof flowType;
                  setFlowType(type);
                  if (type === 'code') setResponseType('code');
                  else if (type === 'implicit') setResponseType('id_token token');
                  else setResponseType('code id_token');
                }}
                options={[
                  { value: 'code', label: 'Authorization Code' },
                  { value: 'implicit', label: 'Implicit' },
                  { value: 'hybrid', label: 'Hybrid' },
                ]}
              />

              <Select
                label="Response Type"
                value={responseType}
                onChange={(e) => setResponseType(e.target.value as OIDCResponseType)}
                options={[
                  { value: 'code', label: 'code' },
                  { value: 'id_token', label: 'id_token' },
                  { value: 'token', label: 'token' },
                  { value: 'id_token token', label: 'id_token token' },
                  { value: 'code id_token', label: 'code id_token' },
                  { value: 'code token', label: 'code token' },
                  { value: 'code id_token token', label: 'code id_token token' },
                ]}
              />

              <Input
                label="Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="openid profile email"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Redirect URI
                </label>
                <p className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm font-mono break-all">
                  {redirectUri || 'Not configured'}
                </p>
              </div>

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
                  <strong>prompt=none</strong>: The IdP will return an error
                  if the user is not already authenticated or consent is not
                  pre-configured.
                </Alert>
              )}

              {responseType.includes('code') && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pkce"
                    checked={usePKCE}
                    onChange={(e) => setUsePKCE(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="pkce"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Use PKCE (Proof Key for Code Exchange)
                  </label>
                </div>
              )}

              <Button onClick={handleStartFlow} loading={loading} className="w-full">
                <Play className="w-4 h-4" />
                Start Authorization Flow
              </Button>
            </div>
          </Card>

          {authUrl && (
            <Card title="Authorization URL">
              <div className="space-y-4">
                <CodeBlock code={authUrl} language="text" maxHeight="150px" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(authUrl)}
                  >
                    <Copy className="w-4 h-4" />
                    Copy URL
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(authUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {responseType.includes('code') && authUrl && !tokens.access_token && (
            <Card title="Token Exchange">
              <div className="space-y-4">
                <Alert variant="info">
                  After authentication, the authorization code will be automatically captured.
                  Or paste it manually below.
                </Alert>
                <Input
                  label="Authorization Code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste the authorization code from callback"
                />
                <Button
                  onClick={() => handleExchangeCode()}
                  loading={loading}
                  disabled={!authCode}
                >
                  <RefreshCw className="w-4 h-4" />
                  Exchange Code for Tokens
                </Button>
              </div>
            </Card>
          )}

          {tokens.access_token && (
            <Card title="Token Details">
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveTab('tokens')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tokens'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    Tokens
                  </button>
                  <button
                    onClick={() => setActiveTab('claims')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'claims'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    Claims
                  </button>
                  <button
                    onClick={() => setActiveTab('userinfo')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'userinfo'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    UserInfo
                  </button>
                  {selectedProvider.endpoints.introspectionUrl && (
                    <button
                      onClick={() => setActiveTab('introspect')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'introspect'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                      Introspection
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                {activeTab === 'tokens' && (
                  <div className="space-y-4">
                    {tokens.access_token && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Access Token {tokens.token_type && `(${tokens.token_type})`}
                        </label>
                        <CodeBlock code={tokens.access_token} maxHeight="120px" />
                        {tokens.expires_in && (
                          <p className="text-xs text-gray-500 mt-1">
                            Expires in: {tokens.expires_in} seconds
                          </p>
                        )}
                      </div>
                    )}
                    {tokens.id_token && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ID Token
                        </label>
                        <CodeBlock code={tokens.id_token} maxHeight="120px" />
                        {idTokenValidation && (
                          <div className="mt-2">
                            <Alert
                              variant={idTokenValidation.valid ? 'success' : 'error'}
                              title={
                                idTokenValidation.valid
                                  ? 'Valid ID Token'
                                  : 'Invalid ID Token'
                              }
                            >
                              {idTokenValidation.errors.length > 0 ? (
                                <ul className="list-disc list-inside text-sm">
                                  {idTokenValidation.errors.map((err: string, i: number) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              ) : (
                                'ID token signature and claims are valid'
                              )}
                            </Alert>
                          </div>
                        )}
                      </div>
                    )}
                    {tokens.refresh_token && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Refresh Token
                        </label>
                        <CodeBlock code={tokens.refresh_token} maxHeight="120px" />
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      {selectedProvider.endpoints.userinfoUrl && (
                        <Button onClick={handleFetchUserInfo} loading={loading} size="sm">
                          <Eye className="w-4 h-4" />
                          Fetch UserInfo
                        </Button>
                      )}
                      {selectedProvider.endpoints.introspectionUrl && (
                        <Button onClick={handleIntrospect} loading={loading} size="sm" variant="secondary">
                          <Eye className="w-4 h-4" />
                          Introspect Token
                        </Button>
                      )}
                      {selectedProvider.endpoints.revocationUrl && (
                        <Button onClick={handleRevoke} loading={loading} size="sm" variant="danger">
                          <Trash2 className="w-4 h-4" />
                          Revoke Token
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'claims' && (
                  <div className="space-y-6">
                    {idTokenClaims && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          ID Token Claims
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(idTokenClaims).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 min-w-[120px]">
                                {key}
                              </span>
                              <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {accessTokenClaims && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Access Token Claims (JWT)
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(accessTokenClaims).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="font-mono text-sm font-medium text-green-600 dark:text-green-400 min-w-[120px]">
                                {key}
                              </span>
                              <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!idTokenClaims && !accessTokenClaims && (
                      <Alert variant="info">
                        No JWT claims available. Tokens may be opaque or not yet retrieved.
                      </Alert>
                    )}
                  </div>
                )}

                {activeTab === 'userinfo' && (
                  <div>
                    {userInfo ? (
                      <CodeBlock code={JSON.stringify(userInfo, null, 2)} language="json" />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">UserInfo not yet fetched</p>
                        <Button onClick={handleFetchUserInfo} loading={loading}>
                          Fetch UserInfo
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'introspect' && (
                  <div>
                    {introspectionResult ? (
                      <CodeBlock code={JSON.stringify(introspectionResult, null, 2)} language="json" />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">Token not yet introspected</p>
                        <Button onClick={handleIntrospect} loading={loading}>
                          Introspect Token
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Flow Logs">
            <LogViewer logs={logs} maxHeight="600px" />
          </Card>

          {state && (
            <Card title="Session Info">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    State:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 break-all font-mono text-xs">
                    {state}
                  </p>
                </div>
                {nonce && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Nonce:
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 break-all font-mono text-xs">
                      {nonce}
                    </p>
                  </div>
                )}
                {codeVerifier && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Code Verifier (PKCE):
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 break-all font-mono text-xs">
                      {codeVerifier}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
