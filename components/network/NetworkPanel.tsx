'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RequestResponsePanel } from '@/components/flow/RequestResponsePanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, Search, Download, X, ChevronDown } from 'lucide-react';
import type { NetworkLogEntry } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NetworkPanelProps {
  logs: NetworkLogEntry[];
  className?: string;
  maxHeight?: string;
  onExportJSON?: () => void;
  onExportHAR?: () => void;
}

type FilterLevel = 'all' | 'request' | 'info' | 'warn' | 'error';

const levelIcons = {
  error: AlertCircle,
  warn: AlertTriangle,
  debug: Search,
  info: Info,
};

const levelColors = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  debug: 'text-muted-foreground',
  info: 'text-blue-400',
};

const typeColors: Record<string, string> = {
  request: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  response: 'bg-green-500/10 text-green-400 border-green-500/20',
  redirect: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  validation: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  info: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function NetworkPanel({
  logs,
  className,
  maxHeight = '300px',
  onExportJSON,
  onExportHAR,
}: NetworkPanelProps) {
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filter === 'request' && log.type !== 'request' && log.type !== 'response') return false;
      if (filter === 'info' && log.level !== 'info') return false;
      if (filter === 'warn' && log.level !== 'warn') return false;
      if (filter === 'error' && log.level !== 'error') return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filter, search]);

  if (logs.length === 0) {
    return (
      <div className={cn('text-center py-6 text-xs text-muted-foreground font-mono', className)}>
        Waiting for events...
      </div>
    );
  }

  const filterButtons: { value: FilterLevel; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: logs.length },
    { value: 'request', label: 'Requests', count: logs.filter((l) => l.type === 'request' || l.type === 'response').length },
    { value: 'info', label: 'Info', count: logs.filter((l) => l.level === 'info').length },
    { value: 'warn', label: 'Warnings', count: logs.filter((l) => l.level === 'warn').length },
    { value: 'error', label: 'Errors', count: logs.filter((l) => l.level === 'error').length },
  ];

  return (
    <div className={cn('rounded-md border border-border bg-muted/20 overflow-hidden', className)}>
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/40">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
              filter === btn.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {btn.label}
            {btn.count > 0 && (
              <span className="ml-1 text-muted-foreground/60">{btn.count}</span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="h-6 w-32 pl-6 text-[10px] bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {(onExportJSON || onExportHAR) && (
          <div className="flex items-center gap-0.5 ml-1">
            {onExportJSON && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onExportJSON}>
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Log entries */}
      <ScrollArea style={{ maxHeight }}>
        <div className="divide-y divide-border/50">
          {filteredLogs.map((log, index) => {
            const Icon = levelIcons[log.level] || Info;
            const isExpanded = expandedId === log.id;
            const hasExpandable = log.request || log.response || log.details;

            return (
              <div key={log.id}>
                <button
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-muted/40 transition-colors',
                    isExpanded && 'bg-muted/40'
                  )}
                  onClick={() => hasExpandable && setExpandedId(isExpanded ? null : log.id)}
                >
                  <span className="text-[10px] text-muted-foreground/40 font-mono w-4 shrink-0 text-right">
                    {index + 1}
                  </span>
                  <Icon className={cn('h-3 w-3 shrink-0', levelColors[log.level])} />
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0 w-16">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-[8px] px-1 py-0 h-4 shrink-0', typeColors[log.type] || typeColors.info)}
                  >
                    {log.type}
                  </Badge>
                  {log.stepId && (
                    <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">
                      [{log.stepId}]
                    </span>
                  )}
                  <span className="text-[11px] text-foreground/80 truncate flex-1 font-mono">
                    {log.message}
                  </span>
                  {log.response?.duration !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {log.response.duration}ms
                    </span>
                  )}
                  {hasExpandable && (
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 py-2 bg-muted/20 border-t border-border/30">
                    {(log.request || log.response) && (
                      <RequestResponsePanel request={log.request} response={log.response} />
                    )}
                    {log.details && !log.request && !log.response && (
                      <pre className="text-[10px] font-mono text-foreground/60 p-2 bg-muted/40 rounded overflow-auto max-h-32">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
