'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextArea, Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { validateJWT, decodeJWT } from '@/lib/jwt';
import { parseJWT } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function JWTValidatorPage() {
  const [token, setToken] = useState('');
  const [jwksUrl, setJwksUrl] = useState('');
  const [decoded, setDecoded] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDecode = () => {
    try {
      const result = parseJWT(token);
      if (result) {
        setDecoded(result);
        setValidation(null);
      } else {
        alert('Invalid JWT format');
      }
    } catch (error) {
      alert('Failed to decode JWT: ' + String(error));
    }
  };

  const handleValidate = async () => {
    if (!jwksUrl) {
      alert('Please provide a JWKS URL for signature validation');
      return;
    }

    setLoading(true);

    try {
      const result = await validateJWT({
        token,
        jwksUrl,
      });

      setValidation(result);
      if (!decoded) {
        setDecoded({ header: result.header, payload: result.payload });
      }
    } catch (error) {
      alert('Validation failed: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          JWT Validator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Decode and validate JSON Web Tokens
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="JWT Token">
            <div className="space-y-4">
              <TextArea
                label="Paste your JWT token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={8}
              />
              <div className="flex gap-2">
                <Button onClick={handleDecode} disabled={!token}>
                  Decode
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Signature Validation">
            <div className="space-y-4">
              <Input
                label="JWKS URL"
                value={jwksUrl}
                onChange={(e) => setJwksUrl(e.target.value)}
                placeholder="https://provider.com/.well-known/jwks.json"
                helperText="Required for signature validation"
              />
              <Button
                onClick={handleValidate}
                disabled={!token || !jwksUrl}
                loading={loading}
              >
                Validate Signature
              </Button>
            </div>
          </Card>

          {validation && (
            <Card title="Validation Results">
              <div className="space-y-4">
                <Alert
                  variant={validation.valid ? 'success' : 'error'}
                  title={validation.valid ? 'Valid JWT' : 'Invalid JWT'}
                >
                  {validation.valid ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Token signature and claims are valid
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5" />
                        Token validation failed
                      </div>
                      {validation.errors.length > 0 && (
                        <ul className="list-disc list-inside space-y-1">
                          {validation.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Alert>

                {validation.warnings.length > 0 && (
                  <Alert variant="warning" title="Warnings">
                    <ul className="list-disc list-inside space-y-1">
                      {validation.warnings.map((warning: string, i: number) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Signature Valid:</span>
                    <span
                      className={
                        validation.signatureValid ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {validation.signatureValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Algorithm:</span>
                    <span>{validation.alg}</span>
                  </div>
                  {validation.kid && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Key ID:</span>
                      <span className="font-mono text-xs">{validation.kid}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {decoded && (
            <>
              <Card title="Header">
                <CodeBlock code={JSON.stringify(decoded.header, null, 2)} language="json" />
              </Card>

              <Card title="Payload">
                <CodeBlock
                  code={JSON.stringify(decoded.payload, null, 2)}
                  language="json"
                />
              </Card>

              {validation && (
                <Card title="Standard Claims">
                  <div className="space-y-3">
                    {Object.entries(validation.standardChecks).map(([key, check]: [string, any]) => (
                      <div key={key} className="flex items-start gap-3">
                        {check.valid ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {key.toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {check.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

