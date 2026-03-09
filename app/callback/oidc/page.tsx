'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { CodeBlock } from '@/components/CodeBlock';
import Link from 'next/link';
import { CheckCircle, Home, ArrowRight } from 'lucide-react';
import { getPromptErrorExplanation } from '@/lib/prompt';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messageSent, setMessageSent] = useState(false);

  // Derive params from searchParams without using state
  const params = useMemo(() => {
    const paramsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });
    return paramsObj;
  }, [searchParams]);

  // Derive error from params
  const error = useMemo(() => {
    return params.error ? (params.error_description || params.error) : null;
  }, [params]);

  const handleContinue = () => {
    // Send message to parent window (opener) when user clicks button
    if (window.opener) {
      try {
        window.opener.postMessage(
          {
            type: 'oidc_callback',
            code: params.code,
            state: params.state,
            error: params.error,
            error_description: params.error_description,
          },
          window.location.origin
        );
        setMessageSent(true);

        // Close the window after message is sent
        setTimeout(() => {
          window.close();
          // If window doesn't close (some browsers block it), redirect
          if (!window.closed) {
            router.push('/flows/oidc');
          }
        }, 500);
      } catch (err) {
        console.error('Failed to send message to opener:', err);
        // Fallback: just redirect
        router.push('/flows/oidc');
      }
    } else {
      // No opener, just redirect
      router.push('/flows/oidc');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          OIDC Callback
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Authorization callback received
        </p>
      </div>

      {error ? (
        <Alert variant="error" title="Authorization Error">
          <div className="space-y-2">
            <p className="font-medium font-mono text-sm">{params.error}</p>
            {params.error_description && (
              <p>{params.error_description}</p>
            )}
            {params.error && getPromptErrorExplanation(params.error) && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                <p className="font-medium mb-1">💡 What does this mean?</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {getPromptErrorExplanation(params.error)}
                </p>
              </div>
            )}
          </div>
        </Alert>
      ) : (
        <Alert variant="success" title="Callback Received">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Authorization callback was successfully received. Review the parameters below and click &quot;Next Step&quot; to continue.
          </div>
        </Alert>
      )}

      <Card title="Callback Parameters" className="mt-6">
        <CodeBlock code={JSON.stringify(params, null, 2)} language="json" />
      </Card>

      <div className="mt-6 flex gap-4">
        {!error && params.code && (
          <Button onClick={handleContinue} disabled={messageSent}>
            {messageSent ? 'Redirecting...' : (
              <>
                Next Step - Continue to Token Exchange
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
        <Link href="/flows/oidc">
          <Button variant={error ? 'primary' : 'secondary'}>
            Return to OIDC Flow
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </Link>
      </div>

      {!error && params.code && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>💡 Tip:</strong> Click &quot;Next Step&quot; to automatically send this authorization code
            to the OIDC flow page for token exchange. The window will close automatically after sending.
          </p>
        </div>
      )}
    </div>
  );
}

export default function OIDCCallbackPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading callback data...</p>
          </div>
        </Card>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
