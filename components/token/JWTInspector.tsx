'use client';

import { useState, useMemo } from 'react';
import { cn, parseJWT } from '@/lib/utils';
import { CodeBlock } from '@/components/CodeBlock';
import { CLAIM_DESCRIPTIONS } from '@/lib/claim-descriptions';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ReactElement } from 'react';

interface JWTInspectorProps {
  token: string;
  label?: string;
  className?: string;
}

export function JWTInspector({ token, label, className }: JWTInspectorProps) {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!token) return null;
    try {
      const result = parseJWT(token);
      if (!result) return null;
      const parts = token.split('.');
      return {
        header: result.header as Record<string, unknown>,
        payload: result.payload as Record<string, unknown>,
        rawParts: {
          header: parts[0],
          payload: parts[1],
          signature: parts[2],
        },
      };
    } catch {
      return null;
    }
  }, [token]);

  if (!token) {
    return (
      <div className={cn('text-center py-6 text-xs text-muted-foreground font-mono', className)}>
        No token to inspect
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className={cn('rounded-md border border-destructive/30 bg-destructive/5 p-3', className)}>
        <p className="text-xs text-destructive font-medium">Invalid JWT</p>
        <p className="text-[11px] text-muted-foreground mt-1">Could not decode this token as a valid JWT.</p>
        <pre className="mt-2 text-[10px] font-mono text-foreground/60 break-all">{token}</pre>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border border-border overflow-hidden', className)}>
      {label && (
        <div className="px-3 py-1.5 bg-muted border-b border-border text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Raw token */}
        <div className="p-3">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-2">Encoded</p>
          <ScrollArea className="max-h-[300px]">
            <div className="font-mono text-[11px] break-all leading-relaxed">
              <span className="text-blue-400">{parsed.rawParts.header}</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-purple-400">{parsed.rawParts.payload}</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-red-400">{parsed.rawParts.signature}</span>
            </div>
          </ScrollArea>
          <div className="flex gap-3 mt-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Header
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Payload
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Signature
            </span>
          </div>
        </div>

        {/* Decoded */}
        <div className="p-3">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-2">Decoded</p>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {/* Header */}
              <div>
                <p className="text-[10px] text-blue-400 font-semibold mb-1">HEADER</p>
                <CodeBlock
                  code={JSON.stringify(parsed.header, null, 2)}
                  language="json"
                  maxHeight="120px"
                />
              </div>

              {/* Payload claims */}
              <div>
                <p className="text-[10px] text-purple-400 font-semibold mb-1">PAYLOAD</p>
                <div className="space-y-0.5">
                  {Object.entries(parsed.payload).map(([key, value]) => {
                    const claimInfo = CLAIM_DESCRIPTIONS[key];
                    const isTimestamp = ['exp', 'nbf', 'iat', 'auth_time', 'updated_at'].includes(key) && typeof value === 'number';
                    const isSelected = selectedClaim === key;

                    return (
                      <div key={key}>
                        <button
                          className={cn(
                            'w-full text-left px-2 py-1 rounded text-[11px] font-mono flex items-start gap-2 hover:bg-muted/60 transition-colors',
                            isSelected && 'bg-muted/60'
                          )}
                          onClick={() => setSelectedClaim(isSelected ? null : key)}
                        >
                          <span className="text-purple-400 shrink-0">{key}:</span>
                          <span className="text-foreground/80 break-all">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                          {isTimestamp && (
                            <span className="text-muted-foreground/60 text-[10px] shrink-0">
                              {new Date(value * 1000).toLocaleString()}
                            </span>
                          )}
                          {claimInfo && (
                            <Tooltip>
                              <TooltipTrigger render={<span />}>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 shrink-0">
                                  {claimInfo.spec}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[250px]">
                                <p className="text-xs font-medium">{claimInfo.fullName}</p>
                                <p className="text-[11px] text-muted-foreground">{claimInfo.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </button>

                        {isSelected && claimInfo && (
                          <div className="ml-2 px-2 py-1.5 mb-1 rounded bg-muted/40 border-l-2 border-purple-400/30">
                            <p className="text-[11px] font-medium">{claimInfo.fullName}</p>
                            <p className="text-[10px] text-muted-foreground">{claimInfo.description}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{claimInfo.spec}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
