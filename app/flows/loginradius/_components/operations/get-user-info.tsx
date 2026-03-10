'use client';

import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { buildLoginRadiusApiUrl } from '@/lib/loginradius';
import { logInfo, logError } from '@/lib/logging';
import { OperationRunner } from '../operation-runner';
import type { OperationProps, LROperation } from '../operation-runner';

function GetUserInfoOperation({ provider, accessToken, addLog }: OperationProps) {
  return (
    <OperationRunner addLog={addLog}>
      {({ execute, loading, error }) => (
        <div className="space-y-4">
          <Alert variant="info">
            Retrieve user profile information using access token
          </Alert>

          {!accessToken && (
            <Alert variant="warning" title="No Access Token">
              Please login first to get an access token
            </Alert>
          )}

          <Button
            onClick={async () => {
              if (!provider.loginradius?.apiKey || !provider.loginradius?.apiBaseUrl) {
                toast.error('Please configure LoginRadius API Key and Base URL');
                return;
              }
              if (!accessToken) {
                toast.warning('Please login first to get an access token');
                return;
              }

              try {
                const url = buildLoginRadiusApiUrl(
                  provider.loginradius.apiBaseUrl,
                  '/identity/v2/auth/account'
                );
                const res = await execute({
                  method: 'GET',
                  url,
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-LoginRadius-ApiKey': provider.loginradius.apiKey,
                  },
                });

                if (res.ok) {
                  addLog(logInfo('User info retrieved successfully'));
                } else {
                  addLog(logError('Get user info failed', res.data as Record<string, unknown>));
                }
              } catch {
                addLog(logError('Get user info request failed'));
              }
            }}
            loading={loading}
            disabled={!accessToken}
            className="w-full"
          >
            <User className="w-4 h-4" />
            Get User Info
          </Button>

          {error && <Alert variant="error" title="Error">{error}</Alert>}
        </div>
      )}
    </OperationRunner>
  );
}

export const getUserInfoOperation: LROperation = {
  id: 'userinfo',
  label: 'User Info',
  description: 'Retrieve user profile information',
  category: 'user',
  requiresToken: true,
  Component: GetUserInfoOperation,
};
