/**
 * OIDC (OpenID Connect) utilities
 */

import type {
  OIDCDiscoveryDocument,
  OIDCResponseType,
  ProviderConfig,
  TokenResponse,
  IntrospectionResponse,
} from './types';
import {
  generateRandomString,
  generateCodeVerifier,
  generateCodeChallenge,
  buildQueryString,
  objectToFormData,
} from './utils';

/**
 * Fetch OIDC discovery document
 */
export async function fetchDiscoveryDocument(
  discoveryUrl: string
): Promise<OIDCDiscoveryDocument> {
  const response = await fetch(discoveryUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch discovery document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Auto-discover OIDC configuration from issuer
 */
export async function discoverFromIssuer(issuer: string): Promise<OIDCDiscoveryDocument> {
  const discoveryUrl = issuer.endsWith('/')
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;

  return fetchDiscoveryDocument(discoveryUrl);
}

/**
 * Build authorization URL for OIDC
 */
export async function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType?: OIDCResponseType;
  state?: string;
  nonce?: string;
  prompt?: string;
  maxAge?: number;
  acrValues?: string;
  usePKCE?: boolean;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  extraParams?: Record<string, string>;
}): Promise<{
  url: string;
  state: string;
  nonce?: string;
  codeVerifier?: string;
  codeChallenge?: string;
}> {
  const state = params.state || generateRandomString();
  const nonce = params.responseType?.includes('id_token')
    ? params.nonce || generateRandomString()
    : undefined;

  let codeVerifier: string | undefined;
  let codeChallenge = params.codeChallenge;

  if (params.usePKCE && params.responseType?.includes('code')) {
    codeVerifier = generateCodeVerifier();
    codeChallenge = await generateCodeChallenge(codeVerifier);
  }

  const queryParams: Record<string, string | undefined> = {
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: params.responseType || 'code',
    scope: params.scope,
    state,
    ...(nonce && { nonce }),
    ...(params.prompt && { prompt: params.prompt }),
    ...(params.maxAge !== undefined && { max_age: params.maxAge.toString() }),
    ...(params.acrValues && { acr_values: params.acrValues }),
    ...(codeChallenge && {
      code_challenge: codeChallenge,
      code_challenge_method: params.codeChallengeMethod || 'S256',
    }),
    ...params.extraParams,
  };

  const query = buildQueryString(queryParams);
  const url = `${params.authorizationEndpoint}?${query}`;

  return {
    url,
    state,
    nonce,
    codeVerifier,
    codeChallenge,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(params: {
  tokenEndpoint: string;
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier?: string;
  clientAuthMethod?: 'client_secret_basic' | 'client_secret_post' | 'none';
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

  // Handle client authentication
  const authMethod = params.clientAuthMethod || 'client_secret_basic';

  if (params.clientSecret) {
    if (authMethod === 'client_secret_basic') {
      const credentials = btoa(`${params.clientId}:${params.clientSecret}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (authMethod === 'client_secret_post') {
      body.client_secret = params.clientSecret;
    }
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
 * Fetch user info
 */
export async function fetchUserInfo(
  userinfoEndpoint: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await fetch(userinfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Introspect token
 */
export async function introspectToken(params: {
  introspectionEndpoint: string;
  token: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
  clientId: string;
  clientSecret?: string;
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
  tokenTypeHint?: 'access_token' | 'refresh_token';
  clientId: string;
  clientSecret?: string;
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

/**
 * Refresh access token
 */
export async function refreshAccessToken(params: {
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
 * Start device code flow
 */
export async function startDeviceCodeFlow(params: {
  deviceAuthorizationEndpoint: string;
  clientId: string;
  scope?: string;
}): Promise<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}> {
  const body: Record<string, string> = {
    client_id: params.clientId,
  };

  if (params.scope) {
    body.scope = params.scope;
  }

  const response = await fetch(params.deviceAuthorizationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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
 * Poll for device code token
 */
export async function pollDeviceCode(params: {
  tokenEndpoint: string;
  deviceCode: string;
  clientId: string;
}): Promise<
  | { status: 'pending' | 'slow_down'; interval?: number }
  | { status: 'complete'; tokens: TokenResponse }
  | { status: 'error'; error: string; error_description?: string }
> {
  const body: Record<string, string> = {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: params.deviceCode,
    client_id: params.clientId,
  };

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: objectToFormData(body).toString(),
  });

  if (response.ok) {
    const tokens = await response.json();
    return { status: 'complete', tokens };
  }

  const errorData = await response.json().catch(() => ({}));

  if (errorData.error === 'authorization_pending') {
    return { status: 'pending' };
  }

  if (errorData.error === 'slow_down') {
    return { status: 'slow_down', interval: errorData.interval };
  }

  return {
    status: 'error',
    error: errorData.error || 'unknown_error',
    error_description: errorData.error_description,
  };
}

/**
 * Validate callback parameters
 */
export function validateCallback(params: {
  callbackParams: Record<string, string>;
  expectedState?: string;
  expectedNonce?: string;
}): {
  valid: boolean;
  errors: string[];
  code?: string;
  accessToken?: string;
  idToken?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} {
  const errors: string[] = [];
  const { callbackParams, expectedState } = params;

  // Check for error response
  if (callbackParams.error) {
    const promptErrors = [
      'login_required',
      'consent_required',
      'interaction_required',
      'account_selection_required',
    ];
    const isPromptError = promptErrors.includes(callbackParams.error);

    return {
      valid: false,
      errors: [
        `Authorization error: ${callbackParams.error}`,
        ...(isPromptError
          ? ['This error is likely caused by the prompt parameter setting. Check the prompt value used in the authorization request.']
          : []),
      ],
      error: callbackParams.error,
      errorDescription: callbackParams.error_description,
    };
  }

  // Validate state
  if (expectedState && callbackParams.state !== expectedState) {
    errors.push('State mismatch - possible CSRF attack');
  }

  return {
    valid: errors.length === 0,
    errors,
    code: callbackParams.code,
    accessToken: callbackParams.access_token,
    idToken: callbackParams.id_token,
    state: callbackParams.state,
  };
}

/**
 * Parse callback from URL
 */
export function parseCallback(url: string): Record<string, string> {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};

  // Check query params (for response_mode=query)
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Check hash fragment (for implicit/hybrid flows)
  if (urlObj.hash) {
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    hashParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

/**
 * Update provider from discovery
 */
export function updateProviderFromDiscovery(
  provider: ProviderConfig,
  discovery: OIDCDiscoveryDocument
): Partial<ProviderConfig> {
  return {
    endpoints: {
      ...provider.endpoints,
      authorizationUrl: discovery.authorization_endpoint,
      tokenUrl: discovery.token_endpoint,
      userinfoUrl: discovery.userinfo_endpoint,
      jwksUrl: discovery.jwks_uri,
      introspectionUrl: discovery.introspection_endpoint,
      revocationUrl: discovery.revocation_endpoint,
      deviceCodeUrl: discovery.device_authorization_endpoint,
      endSessionUrl: discovery.end_session_endpoint,
    },
    advanced: {
      ...provider.advanced,
      responseTypes: discovery.response_types_supported,
      grantTypes: discovery.grant_types_supported as any[],
    },
  };
}

