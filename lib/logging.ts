/**
 * Logging utilities
 */

import type { LogEntry, HTTPRequest, HTTPResponse } from './types';
import { generateId, now, redactSensitive } from './utils';

/**
 * Create log entry
 */
export function createLogEntry(
  level: LogEntry['level'],
  type: LogEntry['type'],
  message: string,
  details?: Record<string, unknown>,
  shouldRedact: boolean = true
): LogEntry {
  return {
    id: generateId(),
    timestamp: now(),
    level,
    type,
    message,
    details: shouldRedact && details ? (redactSensitive(details) as Record<string, unknown>) : details,
    redacted: shouldRedact,
  };
}

/**
 * Create info log
 */
export function logInfo(message: string, details?: Record<string, unknown>): LogEntry {
  return createLogEntry('info', 'info', message, details, false);
}

/**
 * Create warning log
 */
export function logWarning(message: string, details?: Record<string, unknown>): LogEntry {
  return createLogEntry('warn', 'warning', message, details, false);
}

/**
 * Create error log
 */
export function logError(message: string, details?: Record<string, unknown>): LogEntry {
  return createLogEntry('error', 'error', message, details, false);
}

/**
 * Create request log
 */
export function logRequest(request: HTTPRequest, shouldRedact: boolean = true): LogEntry {
  return createLogEntry(
    'debug',
    'request',
    `${request.method} ${request.url}`,
    {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      queryParams: request.queryParams,
    },
    shouldRedact
  );
}

/**
 * Create response log
 */
export function logResponse(response: HTTPResponse, shouldRedact: boolean = true): LogEntry {
  return createLogEntry(
    'debug',
    'response',
    `${response.status} ${response.statusText}`,
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      timing: response.timing,
      redirects: response.redirects,
    },
    shouldRedact
  );
}

/**
 * Create redirect log
 */
export function logRedirect(url: string): LogEntry {
  return createLogEntry('info', 'redirect', `Redirecting to ${url}`, { url }, false);
}

/**
 * Create validation log
 */
export function logValidation(
  valid: boolean,
  message: string,
  details?: Record<string, unknown>
): LogEntry {
  return createLogEntry(
    valid ? 'info' : 'warn',
    'validation',
    message,
    details,
    false
  );
}

/**
 * Export logs as JSON
 */
export function exportLogsAsJSON(logs: LogEntry[]): string {
  return JSON.stringify(logs, null, 2);
}

/**
 * Export logs as HAR (HTTP Archive)
 */
export function exportLogsAsHAR(
  logs: LogEntry[],
  pageTitle: string = 'AuthLens Flow'
): string {
  const entries: any[] = [];
  
  // Group request/response pairs
  const requests = logs.filter(log => log.type === 'request');
  
  requests.forEach(reqLog => {
    const reqDetails = reqLog.details as any;
    
    // Find corresponding response
    const resLog = logs.find(
      log =>
        log.type === 'response' &&
        log.timestamp > reqLog.timestamp &&
        new Date(log.timestamp).getTime() - new Date(reqLog.timestamp).getTime() < 60000
    );
    
    const resDetails = resLog?.details as any;
    
    const entry = {
      startedDateTime: reqLog.timestamp,
      time: resDetails?.timing?.duration || 0,
      request: {
        method: reqDetails?.method || 'GET',
        url: reqDetails?.url || '',
        httpVersion: 'HTTP/1.1',
        headers: Object.entries(reqDetails?.headers || {}).map(([name, value]) => ({
          name,
          value: value as string,
        })),
        queryString: Object.entries(reqDetails?.queryParams || {}).map(([name, value]) => ({
          name,
          value: value as string,
        })),
        cookies: [],
        headersSize: -1,
        bodySize: reqDetails?.body?.length || 0,
        ...(reqDetails?.body && {
          postData: {
            mimeType: reqDetails.headers?.['content-type'] || 'application/json',
            text: reqDetails.body,
          },
        }),
      },
      response: {
        status: resDetails?.status || 0,
        statusText: resDetails?.statusText || '',
        httpVersion: 'HTTP/1.1',
        headers: Object.entries(resDetails?.headers || {}).map(([name, value]) => ({
          name,
          value: value as string,
        })),
        cookies: [],
        content: {
          size: resDetails?.body?.length || 0,
          mimeType: resDetails?.headers?.['content-type'] || 'application/json',
          text: resDetails?.body || '',
        },
        redirectURL: resDetails?.redirects?.[0] || '',
        headersSize: -1,
        bodySize: resDetails?.body?.length || 0,
      },
      cache: {},
      timings: {
        send: 0,
        wait: resDetails?.timing?.duration || 0,
        receive: 0,
      },
    };
    
    entries.push(entry);
  });
  
  const har = {
    log: {
      version: '1.2',
      creator: {
        name: 'AuthLens',
        version: '1.0.0',
      },
      pages: [
        {
          startedDateTime: logs[0]?.timestamp || new Date().toISOString(),
          id: 'page_1',
          title: pageTitle,
          pageTimings: {},
        },
      ],
      entries,
    },
  };
  
  return JSON.stringify(har, null, 2);
}

/**
 * Format log for display
 */
export function formatLog(log: LogEntry): string {
  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const levelIcon = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  };
  
  let formatted = `[${timestamp}] ${levelIcon[log.level]} ${log.message}`;
  
  if (log.details) {
    formatted += `\n${JSON.stringify(log.details, null, 2)}`;
  }
  
  return formatted;
}

/**
 * Filter logs by level
 */
export function filterLogsByLevel(
  logs: LogEntry[],
  levels: LogEntry['level'][]
): LogEntry[] {
  return logs.filter(log => levels.includes(log.level));
}

/**
 * Filter logs by type
 */
export function filterLogsByType(
  logs: LogEntry[],
  types: LogEntry['type'][]
): LogEntry[] {
  return logs.filter(log => types.includes(log.type));
}

/**
 * Get error logs
 */
export function getErrors(logs: LogEntry[]): LogEntry[] {
  return logs.filter(log => log.level === 'error');
}

/**
 * Get warnings
 */
export function getWarnings(logs: LogEntry[]): LogEntry[] {
  return logs.filter(log => log.level === 'warn');
}

/**
 * Count logs by level
 */
export function countByLevel(logs: LogEntry[]): Record<LogEntry['level'], number> {
  return logs.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    },
    {} as Record<LogEntry['level'], number>
  );
}

