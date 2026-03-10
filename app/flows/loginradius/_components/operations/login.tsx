'use client';

import { useState } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { buildLoginRadiusApiUrl } from '@/lib/loginradius';
import { logInfo, logError } from '@/lib/logging';
import { OperationRunner } from '../operation-runner';
import type { OperationProps, LROperation } from '../operation-runner';

function LoginOperation({ provider, accessToken, setAccessToken, addLog }: OperationProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <OperationRunner addLog={addLog}>
      {({ execute, loading, result, error }) => (
        <div className="space-y-4">
          <Alert variant="info">
            Authenticate user with email and password
          </Alert>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />

          <Button
            onClick={async () => {
              if (!provider.loginradius?.apiKey || !provider.loginradius?.apiBaseUrl) {
                toast.error('Please configure LoginRadius API Key and Base URL');
                return;
              }
              if (!email || !password) {
                toast.warning('Please enter email and password');
                return;
              }

              try {
                const url = buildLoginRadiusApiUrl(
                  provider.loginradius.apiBaseUrl,
                  '/identity/v2/auth/login'
                );
                const res = await execute({
                  method: 'POST',
                  url,
                  headers: {
                    'Content-Type': 'application/json',
                    'X-LoginRadius-ApiKey': provider.loginradius.apiKey,
                  },
                  body: JSON.stringify({ Email: email, Password: password }),
                });

                if (res.ok) {
                  const data = res.data as Record<string, unknown>;
                  if (data.access_token) {
                    setAccessToken(data.access_token as string);
                  }
                  addLog(logInfo('Login successful'));
                } else {
                  addLog(logError('Login failed', res.data as Record<string, unknown>));
                }
              } catch {
                addLog(logError('Login request failed'));
              }
            }}
            loading={loading}
            disabled={!email || !password}
            className="w-full"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Button>

          {error && (
            <Alert variant="error" title="Error">{error}</Alert>
          )}

          {result?.ok && accessToken && (
            <Alert variant="success" title="Logged In">
              Access token received and stored. Other operations can now use it.
            </Alert>
          )}
        </div>
      )}
    </OperationRunner>
  );
}

export const loginOperation: LROperation = {
  id: 'login',
  label: 'Login',
  description: 'Authenticate with email and password',
  category: 'auth',
  requiresToken: false,
  Component: LoginOperation,
};
