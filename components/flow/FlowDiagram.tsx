'use client';

import { cn } from '@/lib/utils';
import type { FlowStepState } from '@/lib/hooks/useFlowExecution';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FlowDiagramProps {
  steps: FlowStepState[];
  className?: string;
}

type Actor = 'client' | 'auth_server' | 'resource_server';

interface DiagramArrow {
  from: Actor;
  to: Actor;
  label: string;
  status: FlowStepState['status'];
}

const ACTOR_LABELS: Record<Actor, string> = {
  client: 'Client',
  auth_server: 'Auth Server',
  resource_server: 'Resource',
};

const STEP_ARROWS: Record<string, { from: Actor; to: Actor }> = {
  build_url: { from: 'client', to: 'client' },
  build_request: { from: 'client', to: 'client' },
  encode: { from: 'client', to: 'client' },
  user_auth: { from: 'client', to: 'auth_server' },
  callback: { from: 'auth_server', to: 'client' },
  token_exchange: { from: 'client', to: 'auth_server' },
  token_request: { from: 'client', to: 'auth_server' },
  token_received: { from: 'auth_server', to: 'client' },
  userinfo: { from: 'client', to: 'resource_server' },
  introspection: { from: 'client', to: 'auth_server' },
  device_request: { from: 'client', to: 'auth_server' },
  user_action: { from: 'client', to: 'auth_server' },
  polling: { from: 'client', to: 'auth_server' },
  response_received: { from: 'auth_server', to: 'client' },
  parse: { from: 'client', to: 'client' },
  validate: { from: 'client', to: 'client' },
};

const ACTOR_ORDER: Actor[] = ['client', 'auth_server', 'resource_server'];

export function FlowDiagram({ steps, className }: FlowDiagramProps) {
  const [open, setOpen] = useState(false);

  const arrows: DiagramArrow[] = steps.map((step) => {
    const mapping = STEP_ARROWS[step.definition.id] || { from: 'client', to: 'auth_server' };
    return {
      from: mapping.from,
      to: mapping.to,
      label: step.definition.label,
      status: step.status,
    };
  });

  // Determine which actors are used
  const usedActors = new Set<Actor>();
  arrows.forEach((a) => {
    usedActors.add(a.from);
    usedActors.add(a.to);
  });
  const actors = ACTOR_ORDER.filter((a) => usedActors.has(a));

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full">
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        <span>Sequence Diagram</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border border-border bg-muted/20 p-3 overflow-x-auto">
          {/* Actor headers */}
          <div className="flex justify-around mb-3">
            {actors.map((actor) => (
              <div
                key={actor}
                className="px-3 py-1 rounded border border-border bg-muted text-[10px] font-mono font-medium text-center min-w-[80px]"
              >
                {ACTOR_LABELS[actor]}
              </div>
            ))}
          </div>

          {/* Lifelines + arrows */}
          <div className="relative">
            {/* Vertical lifelines */}
            <div className="flex justify-around absolute inset-0 pointer-events-none">
              {actors.map((actor) => (
                <div key={actor} className="w-px bg-border" />
              ))}
            </div>

            {/* Arrows */}
            <div className="relative space-y-1">
              {arrows.map((arrow, i) => {
                const fromIdx = actors.indexOf(arrow.from);
                const toIdx = actors.indexOf(arrow.to);
                const isSelfLoop = fromIdx === toIdx;
                const isRightward = toIdx > fromIdx;

                return (
                  <div key={i} className="flex items-center h-6 relative">
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        left: isSelfLoop
                          ? `${((fromIdx + 0.5) / actors.length) * 100}%`
                          : `${((Math.min(fromIdx, toIdx) + 0.5) / actors.length) * 100}%`,
                        right: isSelfLoop
                          ? undefined
                          : `${((actors.length - Math.max(fromIdx, toIdx) - 0.5) / actors.length) * 100}%`,
                        width: isSelfLoop ? '60px' : undefined,
                      }}
                    >
                      <span
                        className={cn(
                          'text-[9px] font-mono px-1 rounded whitespace-nowrap',
                          arrow.status === 'active' && 'text-status-active bg-status-active/10',
                          arrow.status === 'success' && 'text-status-success/80',
                          arrow.status === 'error' && 'text-status-error',
                          arrow.status === 'pending' && 'text-muted-foreground/50',
                          arrow.status === 'skipped' && 'text-muted-foreground/30 line-through'
                        )}
                      >
                        {isSelfLoop ? '↻ ' : isRightward ? '→ ' : '← '}
                        {arrow.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
