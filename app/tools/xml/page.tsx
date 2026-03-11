'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/Input';
import { CodeBlock } from '@/components/CodeBlock';
import { formatSAMLXML } from '@/lib/saml';
import { decodeBase64 } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
      toast.success('XML formatted successfully');
    } catch (error) {
      toast.error('Failed to format XML: ' + String(error));
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground mb-1">
          XML Formatter
        </h1>
        <p className="text-xs text-muted-foreground">
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
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label
                htmlFor="base64"
                className="text-xs font-medium text-muted-foreground"
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
