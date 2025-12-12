'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/Input';
import { CodeBlock } from '@/components/CodeBlock';
import { formatSAMLXML } from '@/lib/saml';
import { decodeBase64 } from '@/lib/utils';
import { FileText } from 'lucide-react';

export default function XMLFormatterPage() {
  const [input, setInput] = useState('');
  const [formatted, setFormatted] = useState('');
  const [isBase64, setIsBase64] = useState(false);

  const handleFormat = () => {
    try {
      let xml = input;
      if (isBase64) {
        xml = decodeBase64(input);
      }
      const result = formatSAMLXML(xml);
      setFormatted(result);
    } catch (error) {
      alert('Failed to format XML: ' + String(error));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          XML Formatter
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Format and decode SAML XML responses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Input">
          <div className="space-y-4">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste XML or base64-encoded SAML response..."
              rows={15}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="base64"
                checked={isBase64}
                onChange={(e) => setIsBase64(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="base64"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Base64 encoded
              </label>
            </div>
            <Button onClick={handleFormat} disabled={!input}>
              <FileText className="w-4 h-4" />
              Format XML
            </Button>
          </div>
        </Card>

        {formatted && (
          <Card title="Formatted XML">
            <CodeBlock code={formatted} language="xml" />
          </Card>
        )}
      </div>
    </div>
  );
}

