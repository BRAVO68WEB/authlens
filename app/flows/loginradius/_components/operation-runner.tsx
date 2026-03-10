'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/CodeBlock';
import { JWTInspector } from '@/components/token/JWTInspector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logRequest, logResponse } from '@/lib/logging';
import type { LogEntry, ProviderConfig } from '@/lib/types';

export interface RequestDetail {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ResponseDetail {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  parsed: unknown;
}

export interface ExecuteResult {
  ok: boolean;
  data: unknown;
  response: ResponseDetail;
  request: RequestDetail;
}

interface OperationRunnerChildProps {
  execute: (request: RequestDetail) => Promise<ExecuteResult>;
  loading: boolean;
  result: ExecuteResult | null;
  error: string | null;
}

interface OperationRunnerProps {
  children: (props: OperationRunnerChildProps) => React.ReactNode;
  addLog: (log: LogEntry) => void;
}

export function OperationRunner({ children, addLog }: OperationRunnerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (request: RequestDetail): Promise<ExecuteResult> => {
    setLoading(true);
    setError(null);
    setResult(null);

    addLog(logRequest({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
    }));

    const start = performance.now();

    try {
      const fetchOpts: RequestInit = {
        method: request.method,
        headers: request.headers,
      };
      if (request.body) {
        fetchOpts.body = request.body;
      }

      const res = await fetch(request.url, fetchOpts);
      const duration = Math.round(performance.now() - start);
      const bodyText = await res.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = bodyText;
      }

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseDetail: ResponseDetail = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: bodyText,
        duration,
        parsed,
      };

      addLog(logResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: bodyText,
        timing: { start, end: start + duration, duration },
      }));

      const execResult: ExecuteResult = {
        ok: res.ok,
        data: parsed,
        response: responseDetail,
        request,
      };

      setResult(execResult);

      if (!res.ok) {
        const errData = parsed as Record<string, unknown> | undefined;
        const msg = (errData?.Message ?? errData?.ErrorDescription ?? errData?.error_description ?? res.statusText) as string;
        setError(msg);
      }

      return execResult;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);

      addLog(logResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: errMsg,
        timing: { start, end: start + duration, duration },
      }));

      throw err;
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  return (
    <div className="space-y-4">
      {children({ execute, loading, result, error })}

      {result && (
        <ResponseDisplay result={result} />
      )}
    </div>
  );
}

function ResponseDisplay({ result }: { result: ExecuteResult }) {
  const { response, request } = result;
  const isSuccess = response.status >= 200 && response.status < 300;
  const isJWT = typeof result.data === 'object' && result.data !== null && 'access_token' in (result.data as Record<string, unknown>);
  const accessToken = isJWT ? (result.data as Record<string, unknown>).access_token as string : null;

  return (
    <div className="space-y-3">
      {/* Status line */}
      <div className="flex items-center gap-2">
        <Badge variant={isSuccess ? 'default' : 'destructive'} className="font-mono text-[10px]">
          {response.status} {response.statusText}
        </Badge>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {response.duration}ms
        </span>
      </div>

      {/* JWT Inspector if token present */}
      {accessToken && (
        <JWTInspector token={accessToken} label="Access Token" />
      )}

      {/* Response body */}
      <CodeBlock
        code={typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
        language="json"
        title="Response Body"
        maxHeight="300px"
      />

      {/* Collapsible request/response detail */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors group">
          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
          Request / Response Details
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            <CodeBlock
              code={formatRequest(request)}
              language="http"
              title="Request"
              maxHeight="200px"
            />
            <CodeBlock
              code={formatResponseHeaders(response)}
              language="http"
              title="Response Headers"
              maxHeight="200px"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function formatRequest(req: RequestDetail): string {
  let out = `${req.method} ${req.url}\n`;
  for (const [k, v] of Object.entries(req.headers)) {
    out += `${k}: ${v}\n`;
  }
  if (req.body) {
    out += `\n`;
    try {
      out += JSON.stringify(JSON.parse(req.body), null, 2);
    } catch {
      out += req.body;
    }
  }
  return out;
}

function formatResponseHeaders(res: ResponseDetail): string {
  let out = `HTTP ${res.status} ${res.statusText}\n`;
  for (const [k, v] of Object.entries(res.headers)) {
    out += `${k}: ${v}\n`;
  }
  return out;
}

// Shared types for operation components
export interface OperationProps {
  provider: ProviderConfig;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  addLog: (log: LogEntry) => void;
}

export interface LROperation {
  id: string;
  label: string;
  description: string;
  category: 'auth' | 'user' | 'account' | 'config';
  requiresToken: boolean;
  Component: React.ComponentType<OperationProps>;
}
