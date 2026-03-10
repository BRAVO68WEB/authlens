'use client';

import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { getSiteConfigUrl } from '@/lib/loginradius';
import { logInfo, logError } from '@/lib/logging';
import { OperationRunner } from '../operation-runner';
import type { OperationProps, LROperation } from '../operation-runner';

function SiteConfigOperation({ provider, addLog }: OperationProps) {
  return (
    <OperationRunner addLog={addLog}>
      {({ execute, loading, error }) => (
        <div className="space-y-4">
          <Alert variant="info">
            Retrieve site configuration and app information
          </Alert>

          <Button
            onClick={async () => {
              if (!provider.loginradius?.apiKey) {
                toast.error('Please configure LoginRadius API Key');
                return;
              }

              try {
                const url = getSiteConfigUrl(provider.loginradius.apiKey);
                const res = await execute({
                  method: 'GET',
                  url,
                  headers: {},
                });

                if (res.ok) {
                  addLog(logInfo('Site config retrieved successfully'));
                } else {
                  addLog(logError('Get site config failed', res.data as Record<string, unknown>));
                }
              } catch {
                addLog(logError('Get site config request failed'));
              }
            }}
            loading={loading}
            className="w-full"
          >
            <Settings className="w-4 h-4" />
            Get Site Config
          </Button>

          {error && <Alert variant="error" title="Error">{error}</Alert>}
        </div>
      )}
    </OperationRunner>
  );
}

export const siteConfigOperation: LROperation = {
  id: 'siteconfig',
  label: 'Site Config',
  description: 'Retrieve site configuration',
  category: 'config',
  requiresToken: false,
  Component: SiteConfigOperation,
};
