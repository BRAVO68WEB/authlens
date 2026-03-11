/**
 * OAuth 2.0 utilities
 */

import type { TokenResponse, DeviceCodeResponse, IntrospectionResponse } from './types';
import { buildQueryString, objectToFormData } from './utils';

/**
 * Build OAuth2 authorization URL
 */
export function buildOAuth2AuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  responseType?: 'code' | 'token';
  prompt?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}): string {
  const queryParams: Record<string, string | undefined> = {
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: params.responseType || 'code',
    ...(params.scope && { scope: params.scope }),
    ...(params.state && { state: params.state }),
    ...(params.prompt && { prompt: params.prompt }),
    ...(params.codeChallenge && {
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod || 'S256',
    }),
  };

  const query = buildQueryString(queryParams);
  return `${params.authorizationEndpoint}?${query}`;
}

/**
 * Exchange authorization code for tokens (Authorization Code flow)
 */
export async function exchangeAuthorizationCode(params: {
  tokenEndpoint: string;
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<TokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
  };

  if (params.codeVerifier) {
    body.code_verifier = params.codeVerifier;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed: ${errorData.error_description || errorData.error || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Request tokens using Resource Owner Password Credentials flow (legacy)
 */
export async function requestPasswordGrant(params: {
  tokenEndpoint: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
}): Promise<TokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'password',
    username: params.username,
    password: params.password,
    client_id: params.clientId,
    response_type: 'token'
  };

  if (params.clientSecret) {
    body.client_secret = params.clientSecret;
  }

  if (params.scope) {
    body.scope = params.scope;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Password grant failed: ${errorData.error_description || errorData.error || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Request tokens using Client Credentials flow
 */
export async function requestClientCredentials(params: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}): Promise<TokenResponse> {
  const body: Record<string, string> = {
    audience: "https://api.loginradius.com/identity/v2/manage", // or your custom API endpoint
    grant_type: 'client_credentials',
    client_id: params.clientId,
    client_secret: params.clientSecret
  };

  if (params.scope) {
    body.scope = params.scope;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${btoa(`${params.clientId}:${params.clientSecret}`)}`,
  };

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Client credentials grant failed: ${errorData.error_description || errorData.error || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshToken(params: {
  tokenEndpoint: string;
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
}): Promise<TokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  };

  if (params.scope) {
    body.scope = params.scope;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Start device authorization flow
 */
export async function startDeviceAuthorization(params: {
  deviceAuthorizationEndpoint: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
}): Promise<DeviceCodeResponse> {
  const body: Record<string, string> = {
    client_id: params.clientId,
  };

  if (params.scope) {
    body.scope = params.scope;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(params.deviceAuthorizationEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Device authorization failed: ${errorData.error_description || errorData.error || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Poll device code token endpoint
 */
export async function pollDeviceToken(params: {
  tokenEndpoint: string;
  deviceCode: string;
  clientId: string;
  clientSecret?: string;
}): Promise<{
  status: 'pending' | 'slow_down' | 'complete' | 'expired' | 'denied';
  tokens?: TokenResponse;
  error?: string;
  interval?: number;
}> {
  const body: Record<string, string> = {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: params.deviceCode,
    client_id: params.clientId,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (response.ok) {
    const tokens = await response.json();
    return { status: 'complete', tokens };
  }

  const errorData = await response.json().catch(() => ({}));
  const error = errorData.error;

  if (error === 'authorization_pending') {
    return { status: 'pending' };
  }

  if (error === 'slow_down') {
    return { status: 'slow_down', interval: errorData.interval };
  }

  if (error === 'expired_token') {
    return { status: 'expired', error: errorData.error_description };
  }

  if (error === 'access_denied') {
    return { status: 'denied', error: errorData.error_description };
  }

  return { status: 'denied', error: error || 'Unknown error' };
}

/**
 * Introspect token
 */
export async function introspectToken(params: {
  introspectionEndpoint: string;
  token: string;
  clientId: string;
  clientSecret?: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
}): Promise<IntrospectionResponse> {
  const body: Record<string, string> = {
    token: params.token,
    client_id: params.clientId,
  };

  if (params.tokenTypeHint) {
    body.token_type_hint = params.tokenTypeHint;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(params.introspectionEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token introspection failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Revoke token
 */
export async function revokeToken(params: {
  revocationEndpoint: string;
  token: string;
  clientId: string;
  clientSecret?: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
}): Promise<void> {
  const body: Record<string, string> = {
    token: params.token,
    client_id: params.clientId,
  };

  if (params.tokenTypeHint) {
    body.token_type_hint = params.tokenTypeHint;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(params.revocationEndpoint, {
    method: 'POST',
    headers,
    body: objectToFormData(body).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token revocation failed: ${response.statusText}`);
  }
}

