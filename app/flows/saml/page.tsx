'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, TextArea, Select } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { LogViewer } from '@/components/LogViewer';
import {
  buildAuthnRequest,
  buildSAMLRedirectUrl,
  encodeSAMLRequest,
  parseSAMLResponse,
  validateSAMLResponse,
  formatSAMLXML,
} from '@/lib/saml';
import { logInfo, logError } from '@/lib/logging';
import type { LogEntry, SAMLAssertion, SAMLValidationResult } from '@/lib/types';
import { Play, FileText, Check, X } from 'lucide-react';

export default function SAMLFlowPage() {
  const { providers, selectedProviderId } = useStore();
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const [flowType, setFlowType] = useState<'sp' | 'idp'>('sp');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // SP-Initiated flow
  const [authnRequestXML, setAuthnRequestXML] = useState('');
  const [authnRequestId, setAuthnRequestId] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [relayState, setRelayState] = useState('');
  const [nameIdPolicy, setNameIdPolicy] = useState('urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified');

  // Response handling
  const [samlResponse, setSamlResponse] = useState('');
  const [responseDecoded, setResponseDecoded] = useState('');
  const [responseFormatted, setResponseFormatted] = useState('');
  const [validationResult, setValidationResult] = useState<SAMLValidationResult | null>(null);
  const [assertions, setAssertions] = useState<SAMLAssertion[]>([]);

  const addLog = (log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  };

  // Auto-load SAML response from callback if available
  useEffect(() => {
    const storedResponse = sessionStorage.getItem('saml_response');
    const storedRelayState = sessionStorage.getItem('saml_relay_state');
    
    if (storedResponse) {
      setSamlResponse(storedResponse);
      if (storedRelayState) {
        setRelayState(storedRelayState);
      }
      
      // Auto-parse the response
      handleParseSAMLResponse(storedResponse);
      
      // Clear from sessionStorage
      sessionStorage.removeItem('saml_response');
      sessionStorage.removeItem('saml_relay_state');
      
      addLog(logInfo('SAML response loaded from callback'));
    }
  }, []);

  const handleBuildAuthnRequest = async () => {
    if (!selectedProvider?.saml?.ssoUrl || !selectedProvider?.saml?.assertionConsumerServiceUrl) {
      alert('Please configure SAML SSO URL and ACS URL in provider settings');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Building SAML AuthnRequest'));

      const issuer = selectedProvider.saml.entityId || selectedProvider.clientId || 'authlens-sp';
      
      const authnRequest = buildAuthnRequest({
        issuer,
        assertionConsumerServiceUrl: selectedProvider.saml.assertionConsumerServiceUrl,
        destination: selectedProvider.saml.ssoUrl,
        nameIdPolicy,
        relayState: relayState || undefined,
      });

      setAuthnRequestId(authnRequest.id);

      // Log raw XML for debugging
      addLog(logInfo('AuthnRequest XML generated', {
        length: authnRequest.xml.length,
        preview: authnRequest.xml.substring(0, 200) + '...',
      }));

      // Format for display
      const formatted = formatSAMLXML(authnRequest.xml);
      setAuthnRequestXML(formatted);

      // Encode for HTTP-Redirect with proper raw deflate compression
      addLog(logInfo('Encoding AuthnRequest with raw deflate compression (SAML 2.0 compliant)'));
      const { encodeSAMLRequestAsync } = await import('@/lib/saml');
      
      try {
        const encoded = await encodeSAMLRequestAsync(authnRequest.xml);
        
        const url = buildSAMLRedirectUrl({
          ssoUrl: selectedProvider.saml.ssoUrl,
          samlRequest: encoded,
          relayState: authnRequest.relayState,
        });

        setRedirectUrl(url);

        addLog(logInfo('AuthnRequest built successfully', {
          id: authnRequest.id,
          destination: selectedProvider.saml.ssoUrl,
          encoding: 'raw deflate + base64 + urlencoded (SAML 2.0 compliant)',
          requestLength: authnRequest.xml.length,
          encodedLength: encoded.length,
          compression: 'pako (raw deflate)',
        }));
      } catch (encodeError) {
        addLog(logError('Failed to encode AuthnRequest', { 
          error: String(encodeError),
          xml: authnRequest.xml.substring(0, 200) + '...',
        }));
        throw encodeError;
      }
    } catch (error) {
      addLog(logError('Failed to build AuthnRequest', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateSAMLFlow = () => {
    if (!redirectUrl) {
      alert('Please build the AuthnRequest first');
      return;
    }

    addLog(logInfo('Redirecting to IdP for authentication'));
    window.open(redirectUrl, '_blank', 'width=800,height=600');
  };

  const handleParseSAMLResponse = (responseToUse?: string) => {
    const response = responseToUse || samlResponse;
    
    if (!response) {
      alert('Please paste a SAML response');
      return;
    }

    setLoading(true);

    try {
      addLog(logInfo('Parsing SAML response'));

      const parsed = parseSAMLResponse(response);
      setResponseDecoded(parsed.decoded);
      setResponseFormatted(formatSAMLXML(parsed.decoded));

      addLog(logInfo('SAML response parsed successfully'));

      // Validate response
      if (selectedProvider?.saml) {
        const validation = validateSAMLResponse({
          samlResponse: response,
          expectedIssuer: selectedProvider.saml.entityId,
        });

        setValidationResult(validation);
        setAssertions(validation.assertions);

        if (validation.valid) {
          addLog(logInfo('SAML response validated successfully'));
        } else {
          addLog(logError('SAML response validation failed', {
            errors: validation.errors,
          }));
        }
      }
    } catch (error) {
      addLog(logError('Failed to parse SAML response', { error: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProvider) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="warning" title="No Provider Selected">
          Please select or configure a SAML provider first.
        </Alert>
      </div>
    );
  }

  if (selectedProvider.type !== 'saml') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="error" title="Invalid Provider Type">
          Selected provider is not a SAML provider. Please select a SAML provider.
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          SAML Flow Runner
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test SAML 2.0 authentication flows with {selectedProvider.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Flow Configuration">
            <div className="space-y-4">
              <Select
                label="Flow Type"
                value={flowType}
                onChange={(e) => setFlowType(e.target.value as 'sp' | 'idp')}
                options={[
                  { value: 'sp', label: 'SP-Initiated (Recommended)' },
                  { value: 'idp', label: 'IdP-Initiated' },
                ]}
              />

              {flowType === 'sp' && (
                <>
                  <Alert variant="info" title="SP-Initiated Flow">
                    In SP-initiated flow, your application (SP) initiates the authentication request to the Identity Provider (IdP).
                  </Alert>

                  <Select
                    label="NameID Policy"
                    value={nameIdPolicy}
                    onChange={(e) => setNameIdPolicy(e.target.value)}
                    options={[
                      { value: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified', label: 'Unspecified' },
                      { value: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress', label: 'Email Address' },
                      { value: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent', label: 'Persistent' },
                      { value: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient', label: 'Transient' },
                    ]}
                  />

                  <Input
                    label="RelayState (Optional)"
                    value={relayState}
                    onChange={(e) => setRelayState(e.target.value)}
                    placeholder="Optional state parameter"
                    helperText="Application-specific data that will be returned in the response"
                  />

                  <div className="flex gap-2">
                    <Button onClick={handleBuildAuthnRequest} className="flex-1">
                      <FileText className="w-4 h-4" />
                      Build AuthnRequest
                    </Button>
                    {redirectUrl && (
                      <Button onClick={handleInitiateSAMLFlow} variant="secondary">
                        <Play className="w-4 h-4" />
                        Initiate Flow
                      </Button>
                    )}
                  </div>
                </>
              )}

              {flowType === 'idp' && (
                <Alert variant="info" title="IdP-Initiated Flow">
                  In IdP-initiated flow, authentication is started from the Identity Provider&apos;s portal.
                  You&apos;ll need to paste the SAML response you receive below.
                </Alert>
              )}
            </div>
          </Card>

          {authnRequestXML && flowType === 'sp' && (
            <Card title="SAML AuthnRequest">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Request ID</label>
                  <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {authnRequestId}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">XML (Formatted)</label>
                  <CodeBlock code={authnRequestXML} language="xml" maxHeight="300px" />
                </div>
                {redirectUrl && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Redirect URL</label>
                    <CodeBlock code={redirectUrl} language="text" maxHeight="150px" />
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="SAML Response Handler">
            <div className="space-y-4">
              <Alert variant="info">
                After authenticating with the IdP, paste the SAML response (base64 encoded) here to parse and validate it.
              </Alert>
              
              <TextArea
                label="SAML Response (Base64)"
                value={samlResponse}
                onChange={(e) => setSamlResponse(e.target.value)}
                placeholder="Paste the base64-encoded SAML response from the IdP..."
                rows={8}
              />

              <Button onClick={() => handleParseSAMLResponse()} loading={loading} disabled={!samlResponse}>
                <FileText className="w-4 h-4" />
                Parse & Validate Response
              </Button>
            </div>
          </Card>

          {validationResult && (
            <>
              <Card title="Validation Result">
                <div className="space-y-4">
                  <Alert
                    variant={validationResult.valid ? 'success' : 'error'}
                    title={validationResult.valid ? 'Valid SAML Response' : 'Invalid SAML Response'}
                  >
                    {validationResult.valid ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        SAML response is valid
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <X className="w-5 h-5" />
                          SAML response validation failed
                        </div>
                        {validationResult.errors.length > 0 && (
                          <ul className="list-disc list-inside text-sm">
                            {validationResult.errors.map((err: string, i: number) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </Alert>

                  {validationResult.warnings.length > 0 && (
                    <Alert variant="warning" title="Warnings">
                      <ul className="list-disc list-inside text-sm">
                        {validationResult.warnings.map((warning: string, i: number) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {validationResult.issuer && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Issuer:</span>
                        <span className="font-mono">{validationResult.issuer}</span>
                      </div>
                      {validationResult.responseId && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Response ID:</span>
                          <span className="font-mono text-xs">{validationResult.responseId}</span>
                        </div>
                      )}
                      {validationResult.inResponseTo && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">In Response To:</span>
                          <span className="font-mono text-xs">{validationResult.inResponseTo}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {assertions.length > 0 && (
                <Card title="SAML Assertions">
                  {assertions.map((assertion, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Assertion {index + 1}
                      </h4>

                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Subject (NameID):
                          </span>
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono mt-1">
                            {assertion.subject?.nameId}
                          </p>
                        </div>

                        {assertion.conditions && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Conditions:
                            </span>
                            <div className="text-xs space-y-1 mt-2">
                              {assertion.conditions.notBefore && (
                                <p>Not Before: {assertion.conditions.notBefore}</p>
                              )}
                              {assertion.conditions.notOnOrAfter && (
                                <p>Not On Or After: {assertion.conditions.notOnOrAfter}</p>
                              )}
                              {assertion.conditions.audienceRestriction && (
                                <p>Audience: {assertion.conditions.audienceRestriction.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {Object.keys(assertion.attributes).length > 0 && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                              Attributes:
                            </span>
                            <div className="space-y-2">
                              {Object.entries(assertion.attributes).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3">
                                  <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400 min-w-[150px]">
                                    {key}
                                  </span>
                                  <span className="text-xs text-gray-900 dark:text-gray-100 break-all">
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {assertion.authnStatement && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Authentication:
                            </span>
                            <div className="text-xs space-y-1 mt-2">
                              <p>Instant: {assertion.authnStatement.authnInstant}</p>
                              {assertion.authnStatement.sessionIndex && (
                                <p>Session Index: {assertion.authnStatement.sessionIndex}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {responseFormatted && (
                <Card title="SAML Response XML">
                  <CodeBlock code={responseFormatted} language="xml" maxHeight="400px" />
                </Card>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Flow Logs">
            <LogViewer logs={logs} maxHeight="600px" />
          </Card>

          <Card title="SAML Configuration">
            <div className="space-y-2 text-sm">
              {selectedProvider.saml?.entityId && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Entity ID:</span>
                  <p className="text-gray-600 dark:text-gray-400 break-all text-xs">
                    {selectedProvider.saml.entityId}
                  </p>
                </div>
              )}
              {selectedProvider.saml?.ssoUrl && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">SSO URL:</span>
                  <p className="text-gray-600 dark:text-gray-400 break-all text-xs">
                    {selectedProvider.saml.ssoUrl}
                  </p>
                </div>
              )}
              {selectedProvider.saml?.assertionConsumerServiceUrl && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">ACS URL:</span>
                  <p className="text-gray-600 dark:text-gray-400 break-all text-xs">
                    {selectedProvider.saml.assertionConsumerServiceUrl}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
