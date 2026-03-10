'use client';

import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/status-dot';
import { CodeBlock } from '@/components/CodeBlock';
import type { FlowStepState } from '@/lib/hooks/useFlowExecution';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FlowStepperProps {
  steps: FlowStepState[];
  className?: string;
}

const statusMap = {
  pending: 'pending',
  active: 'active',
  success: 'success',
  error: 'error',
  skipped: 'pending',
} as const;

export function FlowStepper({ steps, className }: FlowStepperProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => (
        <StepItem key={step.definition.id} step={step} isLast={index === steps.length - 1} />
      ))}
    </div>
  );
}

function StepItem({ step, isLast }: { step: FlowStepState; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const status = statusMap[step.status];
  const hasDetails = step.error || step.duration !== undefined;

  return (
    <div className="flex gap-3">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className="mt-1">
          <StatusDot
            status={status}
            pulse={step.status === 'active'}
            size="md"
          />
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 min-h-6',
              step.status === 'success' ? 'bg-status-success/30' :
              step.status === 'error' ? 'bg-status-error/30' :
              'bg-border'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    step.status === 'active' && 'text-status-active',
                    step.status === 'success' && 'text-foreground',
                    step.status === 'error' && 'text-status-error',
                    step.status === 'skipped' && 'text-muted-foreground line-through',
                    step.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.definition.label}
                </span>
                {step.definition.optional && (
                  <span className="text-[10px] text-muted-foreground/60">(optional)</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {step.definition.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {step.duration !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {step.duration}ms
                </span>
              )}
              {hasDetails && (
                <CollapsibleTrigger className="p-0.5 rounded hover:bg-muted transition-colors">
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 text-muted-foreground transition-transform',
                      open && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          <CollapsibleContent>
            <div className="mt-2 space-y-2">
              {step.error && (
                <div className="px-2 py-1.5 rounded bg-status-error/10 border border-status-error/20 text-[11px] text-status-error font-mono">
                  {step.error}
                </div>
              )}
              {step.duration !== undefined && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  Started: {step.startedAt ? new Date(step.startedAt).toLocaleTimeString() : '—'}
                  {' · '}
                  Completed: {step.completedAt ? new Date(step.completedAt).toLocaleTimeString() : '—'}
                  {' · '}
                  Duration: {step.duration}ms
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
