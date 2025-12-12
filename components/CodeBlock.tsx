'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
}

export function CodeBlock({ code, language = 'json', title, maxHeight = '400px' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      {title && (
        <div className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium rounded-t-lg border-b border-gray-700">
          {title}
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-2 right-2 p-2 rounded-lg transition-colors z-10',
            copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          )}
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        <pre
          className={cn(
            'bg-gray-900 text-gray-100 p-4 overflow-auto text-sm font-mono',
            title ? 'rounded-b-lg' : 'rounded-lg'
          )}
          style={{ maxHeight }}
        >
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}

