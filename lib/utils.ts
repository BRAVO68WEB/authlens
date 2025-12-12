import { clsx, type ClassValue } from 'clsx';

/**
 * Utility function for merging Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Generate a random string for state, nonce, etc.
 */
export function generateRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((x) => charset[x % charset.length])
    .join('');
}

/**
 * Generate code verifier for PKCE (43-128 chars)
 */
export function generateCodeVerifier(): string {
  return generateRandomString(128);
}

/**
 * Generate code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode
 */
export function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
export function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode base64
 */
export function decodeBase64(str: string): string {
  return atob(str);
}

/**
 * Encode base64
 */
export function encodeBase64(str: string): string {
  return btoa(str);
}

/**
 * Parse JWT without verification
 */
export function parseJWT(token: string): { header: unknown; payload: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
    
    return { header, payload };
  } catch (error) {
    return null;
  }
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | string[] | undefined>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else {
      searchParams.append(key, value);
    }
  });
  
  return searchParams.toString();
}

/**
 * Parse query string to object
 */
export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Redact sensitive values in logs
 */
export function redactSensitive(
  data: unknown,
  sensitiveKeys: string[] = [
    'client_secret',
    'password',
    'access_token',
    'refresh_token',
    'id_token',
    'code',
    'authorization',
  ]
): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => redactSensitive(item, sensitiveKeys));
  }
  
  const result: Record<string, unknown> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    const shouldRedact = sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()));
    
    if (shouldRedact && typeof value === 'string') {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value, sensitiveKeys);
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Format timestamp
 */
export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(timestamp);
  return date.toISOString();
}

/**
 * Get nested property from object by path
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep for ms
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format duration in ms
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const remaining = ms % 1000;
  return `${seconds}.${remaining.toString().padStart(3, '0')}s`;
}

/**
 * Convert object to form data
 */
export function objectToFormData(obj: Record<string, string>): URLSearchParams {
  const formData = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pretty print JSON
 */
export function prettyJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Format XML (basic)
 */
export function formatXML(xml: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  
  xml.split(/>\s*</).forEach(node => {
    if (node.match(/^\/\w/)) indent--;
    formatted += tab.repeat(indent) + '<' + node + '>\r\n';
    if (node.match(/^<?\w[^>]*[^/]$/)) indent++;
  });
  
  return formatted.substring(1, formatted.length - 3);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert request to curl command
 */
export function requestToCurl(request: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): string {
  let curl = `curl -X ${request.method.toUpperCase()} '${request.url}'`;
  
  if (request.headers) {
    Object.entries(request.headers).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });
  }
  
  if (request.body) {
    curl += ` \\\n  -d '${request.body.replace(/'/g, "'\\''")}'`;
  }
  
  return curl;
}

/**
 * Get current timestamp in ISO format
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Check if token is expired
 */
export function isTokenExpired(exp: number, clockSkew: number = 0): boolean {
  const now = Math.floor(Date.now() / 1000);
  return exp + clockSkew < now;
}

/**
 * Validate timestamp claims (exp, nbf, iat)
 */
export function validateTimestamps(
  payload: { exp?: number; nbf?: number; iat?: number },
  clockSkew: number = 0
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  
  const results = {
    exp: { valid: true, message: '' },
    nbf: { valid: true, message: '' },
    iat: { valid: true, message: '' },
  };
  
  if (payload.exp !== undefined) {
    if (payload.exp + clockSkew < nowSeconds) {
      results.exp = {
        valid: false,
        message: `Token expired at ${new Date(payload.exp * 1000).toISOString()}`,
      };
    } else {
      results.exp = {
        valid: true,
        message: `Expires at ${new Date(payload.exp * 1000).toISOString()}`,
      };
    }
  }
  
  if (payload.nbf !== undefined) {
    if (payload.nbf - clockSkew > nowSeconds) {
      results.nbf = {
        valid: false,
        message: `Token not valid before ${new Date(payload.nbf * 1000).toISOString()}`,
      };
    } else {
      results.nbf = {
        valid: true,
        message: `Valid since ${new Date(payload.nbf * 1000).toISOString()}`,
      };
    }
  }
  
  if (payload.iat !== undefined) {
    results.iat = {
      valid: true,
      message: `Issued at ${new Date(payload.iat * 1000).toISOString()}`,
    };
  }
  
  return results;
}

