'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select, TextArea } from '@/components/Input';
import { CodeBlock } from '@/components/CodeBlock';
import { Alert } from '@/components/Alert';
import { Send } from 'lucide-react';

export default function APITestingPage() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const headersObj: Record<string, string> = {};
      if (headers) {
        headers.split('\n').forEach((line) => {
          const [key, value] = line.split(':').map((s) => s.trim());
          if (key && value) {
            headersObj[key] = value;
          }
        });
      }

      const options: RequestInit = {
        method,
        headers: headersObj,
      };

      if (body && method !== 'GET' && method !== 'HEAD') {
        options.body = body;
      }

      const startTime = Date.now();
      const res = await fetch(url, options);
      const duration = Date.now() - startTime;

      const responseText = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseData,
        duration,
      });
    } catch (error) {
      setResponse({
        error: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          API Request Builder
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test API endpoints with custom headers and body
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Request">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'PATCH', label: 'PATCH' },
                    { value: 'DELETE', label: 'DELETE' },
                  ]}
                  className="w-32"
                />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1"
                />
              </div>

              <TextArea
                label="Headers (one per line: Key: Value)"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="Authorization: Bearer token&#10;Content-Type: application/json"
                rows={4}
              />

              {method !== 'GET' && method !== 'HEAD' && (
                <TextArea
                  label="Request Body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={6}
                />
              )}

              <Button onClick={handleSend} loading={loading} disabled={!url}>
                <Send className="w-4 h-4" />
                Send Request
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {response && (
            <>
              {response.error ? (
                <Alert variant="error" title="Request Failed">
                  {response.error}
                </Alert>
              ) : (
                <>
                  <Card title="Response">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Status:</span>
                        <span
                          className={
                            response.status >= 200 && response.status < 300
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {response.status} {response.statusText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Duration:</span>
                        <span>{response.duration}ms</span>
                      </div>
                    </div>
                  </Card>

                  {response.headers && (
                    <Card title="Response Headers">
                      <CodeBlock
                        code={JSON.stringify(response.headers, null, 2)}
                        language="json"
                      />
                    </Card>
                  )}

                  <Card title="Response Body">
                    <CodeBlock
                      code={
                        typeof response.body === 'string'
                          ? response.body
                          : JSON.stringify(response.body, null, 2)
                      }
                      language="json"
                    />
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

