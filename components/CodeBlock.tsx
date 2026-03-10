'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = 'json', title, maxHeight = '400px', showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="relative rounded-md border border-border overflow-hidden bg-muted/30">
      {title && (
        <div className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-medium border-b border-border flex items-center justify-between">
          <span>{title}</span>
          <span className="text-[10px] opacity-60 font-mono">{language}</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-1.5 right-1.5 p-1 rounded transition-colors z-10',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <ScrollArea style={{ maxHeight }}>
          <pre className="p-3 text-xs font-mono leading-relaxed overflow-x-auto">
            <code className={`language-${language}`}>
              {showLineNumbers ? (
                lines.map((line, i) => (
                  <span key={i} className="flex">
                    <span className="select-none text-muted-foreground/40 w-8 shrink-0 text-right pr-3">
                      {i + 1}
                    </span>
                    <span>{line}</span>
                    {i < lines.length - 1 && '\n'}
                  </span>
                ))
              ) : (
                code
              )}
            </code>
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}
