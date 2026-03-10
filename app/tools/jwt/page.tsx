'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextArea, Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { JWTInspector } from '@/components/token/JWTInspector';
import { validateJWT, decodeJWT } from '@/lib/jwt';
import { parseJWT } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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
        toast.error('Invalid JWT format');
      }
    } catch (error) {
      toast.error('Failed to decode JWT: ' + String(error));
    }
  };

  const handleValidate = async () => {
    if (!jwksUrl) {
      toast.warning('Please provide a JWKS URL for signature validation');
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
      toast.error('Validation failed: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground mb-1">
          JWT Validator
        </h1>
        <p className="text-xs text-muted-foreground">
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
                    <span className="text-xs font-medium">Signature Valid:</span>
                    <span
                      className={
                        validation.signatureValid ? 'text-status-success' : 'text-status-error'
                      }
                    >
                      {validation.signatureValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Algorithm:</span>
                    <span>{validation.alg}</span>
                  </div>
                  {validation.kid && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Key ID:</span>
                      <span className="font-mono text-xs">{validation.kid}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {decoded && token && (
            <>
              <JWTInspector token={token} />

              {validation && (
                <Card title="Standard Claims">
                  <div className="space-y-3">
                    {Object.entries(validation.standardChecks).map(([key, check]: [string, any]) => (
                      <div key={key} className="flex items-start gap-3">
                        {check.valid ? (
                          <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {key.toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
