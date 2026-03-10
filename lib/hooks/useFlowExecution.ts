'use client';

import { useState, useCallback, useRef } from 'react';
import type { LogEntry } from '@/lib/types';
import type { FlowStepDefinition } from '@/lib/flow-steps';

export type StepStatus = 'pending' | 'active' | 'success' | 'error' | 'skipped';

export interface FlowStepState {
  definition: FlowStepDefinition;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
}

export interface UseFlowExecutionReturn {
  steps: FlowStepState[];
  logs: LogEntry[];
  currentStepId: string | null;
  isRunning: boolean;
  startStep: (stepId: string) => void;
  completeStep: (stepId: string) => void;
  failStep: (stepId: string, error: string) => void;
  skipStep: (stepId: string) => void;
  addLog: (log: LogEntry) => void;
  reset: () => void;
  clearLogs: () => void;
  totalDuration: number;
}

export function useFlowExecution(stepDefinitions: FlowStepDefinition[]): UseFlowExecutionReturn {
  const [steps, setSteps] = useState<FlowStepState[]>(
    stepDefinitions.map((def) => ({ definition: def, status: 'pending' as StepStatus }))
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number>(0);

  const startStep = useCallback((stepId: string) => {
    const now = performance.now();
    if (!isRunning) {
      setIsRunning(true);
      startTimeRef.current = now;
    }
    setCurrentStepId(stepId);
    setSteps((prev) =>
      prev.map((step) =>
        step.definition.id === stepId
          ? { ...step, status: 'active' as StepStatus, startedAt: now }
          : step
      )
    );
  }, [isRunning]);

  const completeStep = useCallback((stepId: string) => {
    const now = performance.now();
    setSteps((prev) =>
      prev.map((step) =>
        step.definition.id === stepId
          ? {
              ...step,
              status: 'success' as StepStatus,
              completedAt: now,
              duration: step.startedAt ? Math.round(now - step.startedAt) : 0,
            }
          : step
      )
    );
    setCurrentStepId(null);
  }, []);

  const failStep = useCallback((stepId: string, error: string) => {
    const now = performance.now();
    setSteps((prev) =>
      prev.map((step) =>
        step.definition.id === stepId
          ? {
              ...step,
              status: 'error' as StepStatus,
              completedAt: now,
              duration: step.startedAt ? Math.round(now - step.startedAt) : 0,
              error,
            }
          : step
      )
    );
    setCurrentStepId(null);
    setIsRunning(false);
  }, []);

  const skipStep = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.definition.id === stepId
          ? { ...step, status: 'skipped' as StepStatus }
          : step
      )
    );
  }, []);

  const addLog = useCallback((log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const reset = useCallback(() => {
    setSteps(stepDefinitions.map((def) => ({ definition: def, status: 'pending' as StepStatus })));
    setLogs([]);
    setCurrentStepId(null);
    setIsRunning(false);
    startTimeRef.current = 0;
  }, [stepDefinitions]);

  const totalDuration = steps.reduce((acc, step) => acc + (step.duration || 0), 0);

  return {
    steps,
    logs,
    currentStepId,
    isRunning,
    startStep,
    completeStep,
    failStep,
    skipStep,
    addLog,
    reset,
    clearLogs,
    totalDuration,
  };
}
