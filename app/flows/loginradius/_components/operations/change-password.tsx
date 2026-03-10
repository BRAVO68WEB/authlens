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

function ChangePasswordOperation({ provider, accessToken, addLog }: OperationProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  return (
    <OperationRunner addLog={addLog}>
      {({ execute, loading, result, error }) => (
        <div className="space-y-4">
          <Alert variant="info">
            Change the password for the currently logged-in user
          </Alert>

          {!accessToken && (
            <Alert variant="warning" title="No Access Token">
              Please login first to get an access token
            </Alert>
          )}

          <Input
            label="Old Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Enter old password"
            disabled={!accessToken}
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            disabled={!accessToken}
          />

          <Button
            onClick={async () => {
              if (!provider.loginradius?.apiKey) {
                toast.error('Please configure LoginRadius API Key');
                return;
              }
              if (!accessToken) {
                toast.warning('Please login first to get an access token');
                return;
              }
              if (!oldPassword || !newPassword) {
                toast.warning('Please enter both old and new passwords');
                return;
              }

              const baseUrl = provider.loginradius.apiBaseUrl || 'https://api.loginradius.com';
              const cleanBaseUrl = baseUrl.replace(/\/$/, '');
              const url = new URL(`${cleanBaseUrl}/identity/v2/auth/password/change`);
              url.searchParams.append('apikey', provider.loginradius.apiKey);

              try {
                const res = await execute({
                  method: 'PUT',
                  url: url.toString(),
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    OldPassword: oldPassword,
                    NewPassword: newPassword,
                  }),
                });

                if (res.ok) {
                  addLog(logInfo('Password changed successfully'));
                  setOldPassword('');
                  setNewPassword('');
                } else {
                  addLog(logError('Change password failed', res.data as Record<string, unknown>));
                }
              } catch {
                addLog(logError('Change password request failed'));
              }
            }}
            loading={loading}
            disabled={!accessToken || !oldPassword || !newPassword}
            className="w-full"
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </Button>

          {error && <Alert variant="error" title="Error">{error}</Alert>}
          {result?.ok && <Alert variant="success">Password changed successfully</Alert>}
        </div>
      )}
    </OperationRunner>
  );
}

export const changePasswordOperation: LROperation = {
  id: 'changepassword',
  label: 'Change Password',
  description: 'Change the current user password',
  category: 'account',
  requiresToken: true,
  Component: ChangePasswordOperation,
};
