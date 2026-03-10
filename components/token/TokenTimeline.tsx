'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TokenTimelineData } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ReactElement } from 'react';

interface TokenTimelineProps {
  iat?: number;
  nbf?: number;
  exp?: number;
  className?: string;
}

export function TokenTimeline({ iat, nbf, exp, className }: TokenTimelineProps) {
  const data = useMemo<TokenTimelineData | null>(() => {
    if (!iat && !nbf && !exp) return null;
    const now = Math.floor(Date.now() / 1000);
    return {
      iat,
      nbf,
      exp,
      now,
      isExpired: exp ? now > exp : false,
      isNotYetValid: nbf ? now < nbf : false,
      isValid: (!exp || now <= exp) && (!nbf || now >= nbf),
      expiresIn: exp ? exp - now : undefined,
    };
  }, [iat, nbf, exp]);

  if (!data) {
    return (
      <div className={cn('text-center py-3 text-[11px] text-muted-foreground', className)}>
        No time-based claims found
      </div>
    );
  }

  // Calculate positions along the timeline (0-100%)
  const timestamps = [data.iat, data.nbf, data.exp, data.now].filter(Boolean) as number[];
  const min = Math.min(...timestamps) - 60;
  const max = Math.max(...timestamps) + 60;
  const range = max - min || 1;
  const pos = (t: number) => ((t - min) / range) * 100;

  return (
    <div className={cn('rounded-md border border-border bg-muted/20 p-3', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Token Timeline</span>
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded',
            data.isValid ? 'bg-status-success/10 text-status-success' :
            data.isExpired ? 'bg-status-error/10 text-status-error' :
            'bg-yellow-500/10 text-yellow-500'
          )}
        >
          {data.isValid ? 'Valid' : data.isExpired ? 'Expired' : 'Not Yet Valid'}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-6 mt-4 mb-8">
        {/* Background track */}
        <div className="absolute inset-y-2 left-0 right-0 rounded-full bg-muted" />

        {/* Valid range highlight */}
        {data.nbf !== undefined && data.exp !== undefined && (
          <div
            className={cn(
              'absolute inset-y-2 rounded-full',
              data.isValid ? 'bg-status-success/20' : 'bg-muted-foreground/10'
            )}
            style={{
              left: `${pos(data.nbf)}%`,
              right: `${100 - pos(data.exp)}%`,
            }}
          />
        )}
        {data.nbf === undefined && data.iat !== undefined && data.exp !== undefined && (
          <div
            className={cn(
              'absolute inset-y-2 rounded-full',
              data.isValid ? 'bg-status-success/20' : 'bg-muted-foreground/10'
            )}
            style={{
              left: `${pos(data.iat)}%`,
              right: `${100 - pos(data.exp)}%`,
            }}
          />
        )}

        {/* Markers */}
        {data.iat !== undefined && (
          <TimelineMarker
            position={pos(data.iat)}
            label="iat"
            value={new Date(data.iat * 1000).toLocaleString()}
            color="text-blue-400"
            dotColor="bg-blue-400"
          />
        )}
        {data.nbf !== undefined && (
          <TimelineMarker
            position={pos(data.nbf)}
            label="nbf"
            value={new Date(data.nbf * 1000).toLocaleString()}
            color="text-yellow-400"
            dotColor="bg-yellow-400"
          />
        )}
        <TimelineMarker
          position={pos(data.now)}
          label="now"
          value={new Date(data.now * 1000).toLocaleString()}
          color="text-foreground"
          dotColor="bg-foreground"
          isNow
        />
        {data.exp !== undefined && (
          <TimelineMarker
            position={pos(data.exp)}
            label="exp"
            value={new Date(data.exp * 1000).toLocaleString()}
            color={data.isExpired ? 'text-status-error' : 'text-status-success'}
            dotColor={data.isExpired ? 'bg-status-error' : 'bg-status-success'}
          />
        )}
      </div>

      {/* Summary */}
      {data.expiresIn !== undefined && (
        <div className="text-[10px] text-muted-foreground font-mono text-center">
          {data.isExpired
            ? `Expired ${formatDurationHuman(Math.abs(data.expiresIn))} ago`
            : `Expires in ${formatDurationHuman(data.expiresIn)}`}
        </div>
      )}
    </div>
  );
}

function TimelineMarker({
  position,
  label,
  value,
  color,
  dotColor,
  isNow,
}: {
  position: number;
  label: string;
  value: string;
  color: string;
  dotColor: string;
  isNow?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-default"
        style={{ left: `${Math.max(2, Math.min(98, position))}%` }}
      >
        <div className={cn('w-2.5 h-2.5 rounded-full border-2 border-background', dotColor, isNow && 'ring-2 ring-foreground/20')} />
        <span className={cn('text-[9px] font-mono mt-1 whitespace-nowrap', color)}>{label}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{label}: {value}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
