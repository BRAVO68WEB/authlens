'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { CodeBlock } from '@/components/CodeBlock';
import Link from 'next/link';
import { CheckCircle, Home, ArrowRight, AlertCircle } from 'lucide-react';
import { parseSAMLResponse, validateSAMLResponse, formatSAMLXML } from '@/lib/saml';
import { SAMLValidationResult } from '@/lib/types';

function CallbackContent() {
  const searchParams = useSearchParams();
  const [samlResponse, setSamlResponse] = useState('');
  const [relayState, setRelayState] = useState('');
  const [decoded, setDecoded] = useState('');
  const [formatted, setFormatted] = useState('');
  const [validationResult, setValidationResult] = useState<SAMLValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Get SAMLResponse from query params (HTTP-Redirect) or form POST
    const response = searchParams.get('SAMLResponse');
    const relay = searchParams.get('RelayState');

    if (response) {
      setSamlResponse(response);
      setRelayState(relay || '');
      handleParseSAMLResponse(response, relay || '');
    } else {
      // Check if we're receiving a POST (FormData)
      // In a real scenario, this would be handled by a server route
      setError('No SAML response received. Please initiate the flow from the SAML flow page.');
    }
  }, [searchParams]);

  const handleParseSAMLResponse = async (response: string, relay: string) => {
    setProcessing(true);
    try {
      const parsed = parseSAMLResponse(response);
      setDecoded(parsed.decoded);
      setFormatted(formatSAMLXML(parsed.decoded));

      // Validate response
      const validation = validateSAMLResponse({
        samlResponse: response,
      });

      setValidationResult(validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse SAML response');
    } finally {
      setProcessing(false);
    }
  };

  const handleContinueToFlow = () => {
    // Store in sessionStorage for the flow page to pick up
    if (samlResponse) {
      sessionStorage.setItem('saml_response', samlResponse);
      if (relayState) {
        sessionStorage.setItem('saml_relay_state', relayState);
      }
    }
    window.location.href = '/flows/saml';
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground mb-2">
          SAML Assertion Consumer Service (ACS)
        </h1>
        <p className="text-xs text-muted-foreground">
          SAML Response received from Identity Provider
        </p>
      </div>

      {error ? (
        <Alert variant="error" title="Error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </Alert>
      ) : processing ? (
        <Alert variant="info" title="Processing">
          Parsing and validating SAML response...
        </Alert>
      ) : validationResult ? (
        <Alert
          variant={validationResult?.valid ? 'success' : 'warning'}
          title={validationResult?.valid ? 'Valid SAML Response' : 'SAML Response Received'}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {validationResult?.valid
              ? 'SAML response has been validated successfully.'
              : 'SAML response received but validation has warnings. See details below.'}
          </div>
        </Alert>
      ) : (
        <Alert variant="success" title="SAML Response Received">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            SAML response has been received and parsed.
          </div>
        </Alert>
      )}

      {samlResponse && (
        <Card title="SAML Response (Base64 Encoded)" className="mt-6">
          <CodeBlock code={samlResponse} language="text" maxHeight="200px" />
        </Card>
      )}

      {relayState && (
        <Card title="RelayState" className="mt-6">
          <p className="text-sm font-mono bg-muted p-3 rounded">
            {relayState}
          </p>
        </Card>
      )}

      {validationResult && (
        <Card title="Validation Summary" className="mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <span className="font-medium">Status:</span>
              <span className={validationResult.valid ? "text-status-success" : "text-yellow-600"}>
                {validationResult.valid ? "Valid" : "Has Warnings"}
              </span>
            </div>

            {validationResult.issuer && (
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="font-medium">Issuer:</span>
                <span className="font-mono text-sm">{validationResult.issuer}</span>
              </div>
            )}

            {validationResult.assertions && validationResult.assertions.length > 0 && (
              <div className="p-3 bg-muted rounded">
                <span className="font-medium block mb-2">Assertions:</span>
                <span className="text-sm">
                  {validationResult.assertions.length} assertion(s) found
                </span>
              </div>
            )}

            {validationResult.errors && validationResult.errors.length > 0 && (
              <div className="p-3 bg-status-error/10 rounded">
                <span className="font-medium block mb-2 text-status-error">
                  Errors:
                </span>
                <ul className="list-disc list-inside text-sm text-status-error">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <span className="font-medium block mb-2 text-yellow-800 dark:text-yellow-200">
                  Warnings:
                </span>
                <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                  {validationResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {formatted && (
        <Card title="SAML Response XML (Formatted)" className="mt-6">
          <CodeBlock code={formatted} language="xml" maxHeight="400px" />
        </Card>
      )}

      <div className="mt-6 flex gap-4">
        {samlResponse && (
          <Button onClick={handleContinueToFlow}>
            View Full Details in SAML Flow
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        <Link href="/flows/saml">
          <Button variant={error ? 'primary' : 'secondary'}>
            Return to SAML Flow
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </Link>
      </div>

      {samlResponse && !error && (
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Click &quot;View Full Details in SAML Flow&quot; to see assertions,
            attributes, and perform additional validation. The SAML response will be automatically
            loaded into the flow page.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SAMLCallbackPage() {
  return (
    <Suspense fallback={
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Processing SAML response...</p>
          </div>
        </Card>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
