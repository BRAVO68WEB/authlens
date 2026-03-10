'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CodeBlock } from '@/components/CodeBlock';
import { Alert } from '@/components/Alert';
import { fetchJWKS } from '@/lib/jwt';
import { Globe } from 'lucide-react';

export default function JWKViewerPage() {
  const [jwksUrl, setJwksUrl] = useState('');
  const [jwks, setJwks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchJWKS(jwksUrl);
      setJwks(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground mb-1">
          JWK Viewer
        </h1>
        <p className="text-xs text-muted-foreground">
          View and inspect JSON Web Key Sets
        </p>
      </div>

      <Card title="Fetch JWKS">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={jwksUrl}
              onChange={(e) => setJwksUrl(e.target.value)}
              placeholder="https://provider.com/.well-known/jwks.json"
              className="flex-1"
            />
            <Button onClick={handleFetch} loading={loading} disabled={!jwksUrl}>
              <Globe className="w-4 h-4" />
              Fetch
            </Button>
          </div>

          {error && <Alert variant="error">{error}</Alert>}
        </div>
      </Card>

      {jwks && (
        <Card title="JWKS" className="mt-6">
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Found {jwks.keys?.length || 0} key(s)
            </div>
            <CodeBlock code={JSON.stringify(jwks, null, 2)} language="json" />
          </div>
        </Card>
      )}
    </div>
  );
}
