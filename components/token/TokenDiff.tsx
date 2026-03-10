'use client';

import { useMemo } from 'react';
import { cn, parseJWT } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TokenDiffProps {
  tokenA: string;
  tokenB: string;
  labelA?: string;
  labelB?: string;
  className?: string;
}

type DiffStatus = 'match' | 'differ' | 'only-a' | 'only-b';

interface DiffRow {
  key: string;
  valueA?: unknown;
  valueB?: unknown;
  status: DiffStatus;
}

export function TokenDiff({
  tokenA,
  tokenB,
  labelA = 'Token A',
  labelB = 'Token B',
  className,
}: TokenDiffProps) {
  const diff = useMemo(() => {
    const parsedA = tokenA ? parseJWT(tokenA) : null;
    const parsedB = tokenB ? parseJWT(tokenB) : null;

    if (!parsedA || !parsedB) return null;

    const payloadA = parsedA.payload as Record<string, unknown>;
    const payloadB = parsedB.payload as Record<string, unknown>;

    const allKeys = new Set([
      ...Object.keys(payloadA),
      ...Object.keys(payloadB),
    ]);

    const rows: DiffRow[] = [];

    for (const key of Array.from(allKeys).sort()) {
      const hasA = key in payloadA;
      const hasB = key in payloadB;
      const valA = payloadA[key];
      const valB = payloadB[key];

      let status: DiffStatus;
      if (hasA && hasB) {
        status = JSON.stringify(valA) === JSON.stringify(valB) ? 'match' : 'differ';
      } else if (hasA) {
        status = 'only-a';
      } else {
        status = 'only-b';
      }

      rows.push({ key, valueA: valA, valueB: valB, status });
    }

    return rows;
  }, [tokenA, tokenB]);

  if (!tokenA || !tokenB) {
    return (
      <div className={cn('text-center py-6 text-xs text-muted-foreground font-mono', className)}>
        Provide two tokens to compare
      </div>
    );
  }

  if (!diff) {
    return (
      <div className={cn('text-center py-6 text-xs text-destructive', className)}>
        Could not parse one or both tokens
      </div>
    );
  }

  const statusColors: Record<DiffStatus, string> = {
    match: '',
    differ: 'bg-yellow-500/5',
    'only-a': 'bg-blue-500/5',
    'only-b': 'bg-purple-500/5',
  };

  const statusBadge: Record<DiffStatus, { label: string; className: string }> = {
    match: { label: 'Match', className: 'text-status-success border-status-success/30' },
    differ: { label: 'Differ', className: 'text-yellow-500 border-yellow-500/30' },
    'only-a': { label: labelA, className: 'text-blue-400 border-blue-400/30' },
    'only-b': { label: labelB, className: 'text-purple-400 border-purple-400/30' },
  };

  return (
    <div className={cn('rounded-md border border-border overflow-hidden', className)}>
      <ScrollArea className="max-h-[400px]">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground w-[100px]">Claim</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-blue-400">{labelA}</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-purple-400">{labelB}</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-muted-foreground w-[70px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((row) => (
              <tr key={row.key} className={cn('border-b border-border/50 hover:bg-muted/20', statusColors[row.status])}>
                <td className="px-2 py-1 text-muted-foreground font-medium">{row.key}</td>
                <td className="px-2 py-1 break-all text-foreground/80">
                  {row.valueA !== undefined ? formatValue(row.valueA) : <span className="text-muted-foreground/30">—</span>}
                </td>
                <td className="px-2 py-1 break-all text-foreground/80">
                  {row.valueB !== undefined ? formatValue(row.valueB) : <span className="text-muted-foreground/30">—</span>}
                </td>
                <td className="px-2 py-1 text-center">
                  <Badge variant="outline" className={cn('text-[8px] px-1 py-0', statusBadge[row.status].className)}>
                    {statusBadge[row.status].label}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
