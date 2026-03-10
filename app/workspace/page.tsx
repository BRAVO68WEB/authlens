'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { CodeBlock } from '@/components/CodeBlock';
import { downloadFile } from '@/lib/utils';
import { Upload, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkspacePage() {
  const { exportWorkspace, importWorkspace, clearWorkspace, providers, presets } = useStore();
  const [importData, setImportData] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    const workspace = exportWorkspace();
    const json = JSON.stringify(workspace, null, 2);
    downloadFile(json, `authlens-workspace-${Date.now()}.json`, 'application/json');
  };

  const handleImport = () => {
    setError(null);
    try {
      const workspace = JSON.parse(importData);
      importWorkspace(workspace);
      setImportData('');
      toast.success('Workspace imported successfully!');
    } catch (error) {
      setError('Invalid workspace JSON: ' + String(error));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (
      confirm(
        'Are you sure you want to clear all workspace data? This action cannot be undone.'
      )
    ) {
      clearWorkspace();
      toast.success('Workspace cleared');
    }
  };

  const workspace = exportWorkspace();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground mb-2">
          Workspace Management
        </h1>
        <p className="text-xs text-muted-foreground">
          Export and import your workspace configuration
        </p>
      </div>

      <div className="space-y-6">
        <Card title="Current Workspace">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-bold text-primary">
                  {providers.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Providers</p>
              </div>
              <div className="p-4 bg-status-success/10 rounded-lg">
                <p className="text-lg font-bold text-status-success">
                  {presets.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Presets</p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-lg">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {workspace.claimRuleSets?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Claim Rule Sets
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export Workspace
              </Button>
              <Button variant="danger" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
                Clear Workspace
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Import Workspace">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Upload JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-foreground border border-border rounded-lg cursor-pointer bg-muted focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Or Paste JSON
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder='{"version": "1.0.0", "providers": [...], ...}'
                rows={10}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button onClick={handleImport} disabled={!importData}>
              <Upload className="w-4 h-4" />
              Import Workspace
            </Button>
          </div>
        </Card>

        <Card title="Workspace Preview">
          <CodeBlock code={JSON.stringify(workspace, null, 2)} language="json" />
        </Card>
      </div>
    </div>
  );
}
