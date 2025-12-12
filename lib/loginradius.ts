/**
 * LoginRadius CIAM API utilities
 */

import type { LoginRadiusConfig, LoginRadiusRegistrationField } from './types';

/**
 * Fetch APIKey, TenantName, Registration Form Schema, and SOTT from LoginRadius hosted page
 */
export async function fetchLoginRadiusConfig(hostedPageUrl: string): Promise<LoginRadiusConfig> {
  try {
    // Ensure URL ends with /auth.aspx
    const url = hostedPageUrl.endsWith('/auth.aspx') 
      ? hostedPageUrl 
      : `${hostedPageUrl.replace(/\/$/, '')}/auth.aspx`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch hosted page: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract raasoption.apiKey from script tag
    const apiKeyMatch = html.match(/raasoption\.apiKey\s*=\s*["']([^"']+)["']/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1] : undefined;
    
    // Extract raasoption.appName (tenant name) from script tag
    const appNameMatch = html.match(/raasoption\.appName\s*=\s*["']([^"']+)["']/);
    const tenantName = appNameMatch ? appNameMatch[1] : undefined;
    
    // Extract raasoption.registrationFormSchema from script tag
    // Use bracket counting to properly extract the full array (handles brackets inside strings)
    let registrationFormSchema: LoginRadiusRegistrationField[] | undefined;
    const startIndex = html.indexOf('raasoption.registrationFormSchema');
    if (startIndex !== -1) {
      const afterEquals = html.indexOf('=', startIndex);
      const arrayStart = html.indexOf('[', afterEquals);
      if (arrayStart !== -1) {
        // Find the matching closing bracket by counting brackets
        // This handles cases where brackets appear inside string values (e.g., "min_length[6]")
        let bracketCount = 0;
        let inString = false;
        let stringChar: string | null = null;
        let i = arrayStart;
        
        for (; i < html.length; i++) {
          const char = html[i];
          const prevChar = i > 0 ? html[i - 1] : '';
          
          // Handle string escaping - skip escaped characters
          if (prevChar === '\\') {
            continue;
          }
          
          // Toggle string state
          if ((char === '"' || char === "'") && !inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar && inString) {
            inString = false;
            stringChar = null;
          }
          
          // Count brackets only when not in string
          if (!inString) {
            if (char === '[') bracketCount++;
            if (char === ']') {
              bracketCount--;
              if (bracketCount === 0) {
                break; // Found matching closing bracket
              }
            }
          }
        }
        
        if (bracketCount === 0 && i < html.length) {
          const fullArray = html.substring(arrayStart, i + 1);
          try {
            registrationFormSchema = JSON.parse(fullArray);
          } catch (e) {
            console.warn('Failed to parse registrationFormSchema:', e);
          }
        }
      }
    }
    
    // Extract raasoption.sott from script tag
    const sottMatch = html.match(/raasoption\.sott\s*=\s*["']([^"']+)["']/);
    const sott = sottMatch ? sottMatch[1] : undefined;
    
    return {
      apiKey,
      tenantName,
      registrationFormSchema,
      sott,
    };
  } catch (error) {
    throw new Error(`Failed to fetch LoginRadius config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build LoginRadius API URL
 */
export function buildLoginRadiusApiUrl(baseUrl: string, endpoint: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBaseUrl}${cleanEndpoint}`;
}

/**
 * Get Site Config URL
 */
export function getSiteConfigUrl(apiKey: string): string {
  return `https://config.lrcontent.com/ciam/appInfo?apikey=${encodeURIComponent(apiKey)}`;
}

