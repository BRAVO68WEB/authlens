'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { LogViewer } from '@/components/LogViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OPERATIONS } from './_components/operations';
import type { LogEntry } from '@/lib/types';
import { Copy, X, Check, Shield } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

export default function LoginRadiusFlowPage() {
  const { providers, selectedProviderId } = useStore();
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(OPERATIONS[0].id);
  const [copied, setCopied] = useState(false);

  const addLog = useCallback((log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  }, []);

  if (!selectedProvider) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Alert variant="warning" title="No Provider Selected">
          Please select or configure a LoginRadius provider first.
        </Alert>
      </div>
    );
  }

  if (selectedProvider.type !== 'loginradius') {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Alert variant="error" title="Invalid Provider Type">
          Selected provider is not a LoginRadius provider. Please select a LoginRadius provider.
        </Alert>
      </div>
    );
  }

  const handleCopyToken = async () => {
    if (!accessToken) return;
    const success = await copyToClipboard(accessToken);
    if (success) {
      setCopied(true);
      toast.success('Token copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-bold text-foreground">
            LoginRadius CIAM API
          </h1>
          <Badge variant="outline" className="text-[10px] text-violet-400 border-violet-400/30">
            {selectedProvider.name}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Test LoginRadius authentication APIs. Login first to use token-based operations.
        </p>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2">
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <ScrollArea className="w-full">
                <TabsList variant="line" className="w-full justify-start flex-wrap">
                  {OPERATIONS.map(op => (
                    <TabsTrigger key={op.id} value={op.id} className="text-xs">
                      {op.label}
                      {op.requiresToken && !accessToken && (
                        <Shield className="h-3 w-3 text-yellow-500 ml-1" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              {OPERATIONS.map(op => (
                <TabsContent key={op.id} value={op.id} className="mt-4">
                  <op.Component
                    provider={selectedProvider}
                    accessToken={accessToken}
                    setAccessToken={setAccessToken}
                    addLog={addLog}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Access Token Status */}
          <Card title="Access Token">
            {accessToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                    Active
                  </Badge>
                </div>
                <div className="rounded-md bg-muted/30 p-2 text-[10px] font-mono break-all max-h-24 overflow-auto text-muted-foreground">
                  {accessToken}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyToken}
                    className="flex-1"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAccessToken(null);
                      toast.info('Token cleared');
                    }}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                No token. Login to get an access token.
              </p>
            )}
          </Card>

          {/* Provider Config */}
          <Card title="Provider Config">
            <div className="space-y-1.5 text-[11px]">
              {selectedProvider.loginradius?.apiKey && (
                <div>
                  <span className="text-muted-foreground font-medium">API Key:</span>
                  <p className="text-muted-foreground/70 break-all font-mono">
                    {selectedProvider.loginradius.apiKey}
                  </p>
                </div>
              )}
              {selectedProvider.loginradius?.apiBaseUrl && (
                <div>
                  <span className="text-muted-foreground font-medium">Base URL:</span>
                  <p className="text-muted-foreground/70 break-all font-mono">
                    {selectedProvider.loginradius.apiBaseUrl}
                  </p>
                </div>
              )}
              {selectedProvider.loginradius?.tenantName && (
                <div>
                  <span className="text-muted-foreground font-medium">Tenant:</span>
                  <p className="text-muted-foreground/70 break-all font-mono">
                    {selectedProvider.loginradius.tenantName}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Flow Logs */}
          <Card title="Flow Logs">
            <LogViewer logs={logs} maxHeight="400px" />
          </Card>
        </div>
      </div>
    </div>
  );
}
