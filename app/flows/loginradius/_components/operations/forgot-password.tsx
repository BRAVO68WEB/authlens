'use client';

import { useState } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { logInfo, logError } from '@/lib/logging';
import { OperationRunner } from '../operation-runner';
import type { OperationProps, LROperation } from '../operation-runner';

function ForgotPasswordOperation({ provider, addLog }: OperationProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  return (
    <OperationRunner addLog={addLog}>
      {({ execute, loading, result, error }) => (
        <div className="space-y-4">
          <Alert variant="info">
            Request a password reset link by providing email or username
          </Alert>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">OR</span>
            </div>
          </div>

          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />

          <Button
            onClick={async () => {
              if (!provider.loginradius?.apiKey) {
                toast.error('Please configure LoginRadius API Key');
                return;
              }
              if (!email && !username) {
                toast.warning('Please enter either Email or Username');
                return;
              }

              const baseUrl = provider.loginradius.apiBaseUrl || 'https://api.loginradius.com';
              const cleanBaseUrl = baseUrl.replace(/\/$/, '');
              const url = new URL(`${cleanBaseUrl}/identity/v2/auth/password`);
              url.searchParams.append('apikey', provider.loginradius.apiKey);

              const payload: Record<string, string> = {};
              if (email) payload.email = email;
              if (username) payload.username = username;

              try {
                const res = await execute({
                  method: 'POST',
                  url: url.toString(),
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  body: JSON.stringify(payload),
                });

                if (res.ok) {
                  addLog(logInfo('Forgot password request sent successfully'));
                } else {
                  addLog(logError('Forgot password failed', res.data as Record<string, unknown>));
                }
              } catch {
                addLog(logError('Forgot password request failed'));
              }
            }}
            loading={loading}
            disabled={!email && !username}
            className="w-full"
          >
            <KeyRound className="w-4 h-4" />
            Send Reset Link
          </Button>

          {error && <Alert variant="error" title="Error">{error}</Alert>}
          {result?.ok && <Alert variant="success">Reset request sent successfully</Alert>}
        </div>
      )}
    </OperationRunner>
  );
}

export const forgotPasswordOperation: LROperation = {
  id: 'forgotpassword',
  label: 'Forgot Password',
  description: 'Request a password reset link',
  category: 'account',
  requiresToken: false,
  Component: ForgotPasswordOperation,
};
