'use client';

import type { LogEntry } from '@/lib/types';
import { formatLog } from '@/lib/logging';
import { AlertCircle, AlertTriangle, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
}

export function LogViewer({ logs, maxHeight = '400px' }: LogViewerProps) {
  const getIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'debug':
        return <Search className="w-4 h-4 text-gray-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'debug':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No logs yet
      </div>
    );
  }

  return (
    <div
      className="space-y-2 overflow-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
      style={{ maxHeight }}
    >
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(log.level)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className={cn('font-medium text-sm', getLevelColor(log.level))}>
                {log.type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {log.message}
            </p>
            {log.details && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  View details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

