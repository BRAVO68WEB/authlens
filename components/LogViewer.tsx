'use client';

import type { LogEntry } from '@/lib/types';
import { AlertCircle, AlertTriangle, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
}

const levelStyles = {
  error: { border: 'border-l-red-500', icon: AlertCircle, text: 'text-red-400' },
  warn: { border: 'border-l-yellow-500', icon: AlertTriangle, text: 'text-yellow-400' },
  debug: { border: 'border-l-muted-foreground', icon: Search, text: 'text-muted-foreground' },
  info: { border: 'border-l-blue-500', icon: Info, text: 'text-blue-400' },
};

export function LogViewer({ logs, maxHeight = '400px' }: LogViewerProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground font-mono">
        Waiting for events...
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="rounded-md border border-border bg-muted/20">
      <div className="p-1 space-y-px font-mono text-[11px]">
        {logs.map((log) => {
          const style = levelStyles[log.level] || levelStyles.info;
          const Icon = style.icon;

          return (
            <div
              key={log.id}
              className={cn(
                'flex gap-2 px-2 py-1 rounded-sm border-l-2 hover:bg-muted/40 transition-colors',
                style.border
              )}
            >
              <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', style.text)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold uppercase text-[10px]', style.text)}>
                    {log.type}
                  </span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-foreground/80 break-all">{log.message}</p>
                {log.details && (
                  <details className="mt-1">
                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                      details
                    </summary>
                    <pre className="mt-1 p-1.5 bg-muted/60 rounded text-[10px] overflow-auto max-h-32">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
