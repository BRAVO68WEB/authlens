'use client';

import { useState } from 'react';
import { cn, requestToCurl } from '@/lib/utils';
import { CodeBlock } from '@/components/CodeBlock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CapturedRequest, CapturedResponse } from '@/lib/types';

interface RequestResponsePanelProps {
  request?: CapturedRequest;
  response?: CapturedResponse;
  className?: string;
}

export function RequestResponsePanel({ request, response, className }: RequestResponsePanelProps) {
  if (!request && !response) return null;

  return (
    <div className={cn('rounded-md border border-border bg-muted/20 overflow-hidden', className)}>
      <Tabs defaultValue={request ? 'request' : 'response'}>
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/40 h-8">
          {request && (
            <TabsTrigger value="request" className="text-[11px] h-7 px-3 rounded-none data-[state=active]:bg-background">
              Request
            </TabsTrigger>
          )}
          {response && (
            <TabsTrigger value="response" className="text-[11px] h-7 px-3 rounded-none data-[state=active]:bg-background">
              Response
              {response.status && (
                <span className={cn(
                  'ml-1.5 text-[10px] font-mono',
                  response.status >= 200 && response.status < 300 ? 'text-status-success' :
                  response.status >= 400 ? 'text-status-error' :
                  'text-muted-foreground'
                )}>
                  {response.status}
                </span>
              )}
            </TabsTrigger>
          )}
          {request && (
            <TabsTrigger value="curl" className="text-[11px] h-7 px-3 rounded-none data-[state=active]:bg-background">
              cURL
            </TabsTrigger>
          )}
          {response?.duration !== undefined && (
            <TabsTrigger value="timing" className="text-[11px] h-7 px-3 rounded-none data-[state=active]:bg-background">
              Timing
            </TabsTrigger>
          )}
        </TabsList>

        {request && (
          <TabsContent value="request" className="m-0">
            <RequestDetail request={request} />
          </TabsContent>
        )}

        {response && (
          <TabsContent value="response" className="m-0">
            <ResponseDetail response={response} />
          </TabsContent>
        )}

        {request && (
          <TabsContent value="curl" className="m-0 p-3">
            <CodeBlock
              code={requestToCurl({
                method: request.method,
                url: request.url,
                headers: request.headers,
                body: request.body,
              })}
              language="bash"
              maxHeight="200px"
            />
          </TabsContent>
        )}

        {response?.duration !== undefined && (
          <TabsContent value="timing" className="m-0 p-3">
            <TimingDetail duration={response.duration} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function RequestDetail({ request }: { request: CapturedRequest }) {
  return (
    <div className="divide-y divide-border">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="font-semibold text-status-active">{request.method}</span>
          <span className="text-foreground/80 break-all">{request.url}</span>
        </div>
      </div>

      {Object.keys(request.headers).length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Headers</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            {Object.entries(request.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="text-foreground/80 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {request.queryParams && Object.keys(request.queryParams).length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Query Parameters</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            {Object.entries(request.queryParams).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{key}=</span>
                <span className="text-foreground/80 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {request.body && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Body</p>
          <CodeBlock
            code={tryFormatJSON(request.body)}
            language="json"
            maxHeight="200px"
          />
        </div>
      )}
    </div>
  );
}

function ResponseDetail({ response }: { response: CapturedResponse }) {
  return (
    <div className="divide-y divide-border">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={cn(
            'font-semibold',
            response.status >= 200 && response.status < 300 ? 'text-status-success' :
            response.status >= 400 ? 'text-status-error' :
            'text-muted-foreground'
          )}>
            {response.status}
          </span>
          <span className="text-foreground/80">{response.statusText}</span>
          {response.duration !== undefined && (
            <span className="text-muted-foreground text-[10px]">{response.duration}ms</span>
          )}
        </div>
      </div>

      {Object.keys(response.headers).length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Headers</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="text-foreground/80 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {response.body && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Body</p>
          <CodeBlock
            code={tryFormatJSON(response.body)}
            language="json"
            maxHeight="300px"
          />
        </div>
      )}
    </div>
  );
}

function TimingDetail({ duration }: { duration: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total Duration</span>
        <span className="font-mono font-medium">{duration}ms</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-status-active transition-all"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

function tryFormatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
