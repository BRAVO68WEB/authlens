/**
 * Core type definitions for AuthLens
 */

export type ProtocolType = 'oidc' | 'oauth2' | 'saml' | 'api' | 'loginradius';

export type OIDCResponseType =
  | 'code'
  | 'id_token'
  | 'token'
  | 'code id_token'
  | 'code token'
  | 'id_token token'
  | 'code id_token token';

export type OAuth2ResponseType = 'code' | 'token';

export type GrantType =
  | 'authorization_code'
  | 'implicit'
  | 'password'
  | 'client_credentials'
  | 'refresh_token'
  | 'urn:ietf:params:oauth:grant-type:device_code'
  | 'urn:ietf:params:oauth:grant-type:token-exchange';

export type CodeChallengeMethod = 'plain' | 'S256';

/**
 * OIDC Prompt Values (per OIDC Core spec §3.1.2.1)
 * Space-delimited, case-sensitive ASCII string values that specify whether
 * the Authorization Server prompts the End-User for reauthentication and consent.
 */
export type OIDCPromptValue = 'none' | 'login' | 'consent' | 'select_account';

/**
 * OIDC Error Codes related to prompt parameter (per OIDC Core spec §3.1.2.6)
 */
export type OIDCPromptErrorCode =
  | 'login_required'
  | 'consent_required'
  | 'interaction_required'
  | 'account_selection_required';

/**
 * LoginRadius Registration Form Field
 */
export interface LoginRadiusRegistrationField {
  type: string;
  name: string;
  display: string;
  rules?: string;
  permission: 'r' | 'w';
  Parent?: string;
  options?: Array<{ value: string; text: string }> | null;
  Checked: boolean;
}

/**
 * LoginRadius Config fetched from hosted page
 */
export interface LoginRadiusConfig {
  apiKey?: string;
  tenantName?: string;
  registrationFormSchema?: LoginRadiusRegistrationField[];
  sott?: string;
}

/**
 * LoginRadius API Response types
 */
export interface LoginRadiusRegistrationResponse {
  IsPosted?: boolean;
  Data?: {
    Uid?: string;
    Email?: Array<{ Type: string; Value: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface LoginRadiusLoginResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  profile?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LoginRadiusUserInfoResponse {
  Uid?: string;
  Email?: Array<{ Type: string; Value: string }>;
  [key: string]: unknown;
}

export interface LoginRadiusSiteConfigResponse {
  [key: string]: unknown;
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProtocolType;
  baseUrl?: string;
  discoveryUrl?: string;

  // OAuth/OIDC
  clientId?: string;
  clientSecret?: string;
  redirectUris?: string[];
  scopes?: string[];
  audience?: string;

  // Endpoints
  endpoints: {
    authorizationUrl?: string;
    tokenUrl?: string;
    userinfoUrl?: string;
    introspectionUrl?: string;
    revocationUrl?: string;
    deviceCodeUrl?: string;
    jwksUrl?: string;
    endSessionUrl?: string;
  };

  // SAML
  saml?: {
    entityId?: string;
    ssoUrl?: string;
    sloUrl?: string;
    certificate?: string;
    certificates?: string[];
    privateKey?: string;
    requestedAttributes?: string[];
    assertionConsumerServiceUrl?: string;
    signRequests?: boolean;
    wantAssertionsSigned?: boolean;
  };

  // LoginRadius
  loginradius?: {
    apiKey?: string;
    apiSecret?: string;
    hostedPageUrl?: string;
    apiBaseUrl?: string;
    tenantName?: string;
    sott?: string; // Long-lived SOTT token (optional)
    registrationFormSchema?: Array<{
      type: string;
      name: string;
      display: string;
      rules?: string;
      permission: 'r' | 'w';
      Parent?: string;
      options?: Array<{ value: string; text: string }> | null;
      Checked: boolean;
    }>;
  };

  // Advanced
  advanced: {
    responseTypes?: string[];
    grantTypes?: GrantType[];
    codeChallengeMethod?: CodeChallengeMethod;
    prompt?: OIDCPromptValue[];
    maxAge?: number;
    acrValues?: string[];
    clockSkew?: number; // seconds
  };

  createdAt: string;
  updatedAt: string;
}

/**
 * OIDC Discovery Document
 */
export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  token_endpoint_auth_methods_supported?: string[];
  claims_supported?: string[];
  code_challenge_methods_supported?: string[];
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  device_authorization_endpoint?: string;
  end_session_endpoint?: string;
}

/**
 * Flow Run
 */
export interface FlowRun {
  id: string;
  providerId: string;
  protocol: ProtocolType;
  flowType: string; // 'authorization_code', 'implicit', 'device_code', etc.
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  steps: FlowStep[];
  logs: LogEntry[];
  artifacts: FlowArtifacts;
  timings: Record<string, number>;
  warnings: string[];
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

export interface FlowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  timestamp: string;
  duration?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  type: 'request' | 'response' | 'redirect' | 'validation' | 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
  redacted?: boolean;
}

export interface FlowArtifacts {
  // OAuth/OIDC
  authorizationUrl?: string;
  state?: string;
  nonce?: string;
  codeVerifier?: string;
  codeChallenge?: string;
  authorizationCode?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: string;
  scope?: string;
  userInfo?: Record<string, unknown>;

  // Device Code
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  interval?: number;

  // SAML
  authnRequest?: string;
  samlResponse?: string;
  relayState?: string;
  assertions?: SAMLAssertion[];

  // API
  apiResponse?: APIResponse;
}

/**
 * JWT Validation
 */
export interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface JWTValidationResult {
  valid: boolean;
  header: JWTHeader;
  payload: JWTPayload;
  signatureValid: boolean;
  alg: string;
  kid?: string;
  jwkUsed?: JWK;
  standardChecks: {
    exp: { valid: boolean; message: string };
    nbf: { valid: boolean; message: string };
    iat: { valid: boolean; message: string };
  };
  claimResults: ClaimCheckResult[];
  errors: string[];
  warnings: string[];
}

/**
 * JWK (JSON Web Key)
 */
export interface JWK {
  kty: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  x5u?: string;
  x5c?: string[];
  x5t?: string;
  'x5t#S256'?: string;

  // RSA
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;

  // EC
  crv?: string;
  x?: string;
  y?: string;

  // Symmetric
  k?: string;
}

export interface JWKS {
  keys: JWK[];
}

/**
 * Claim Checker
 */
export type ClaimRuleOperator =
  | 'exists'
  | 'not_exists'
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in';

export interface ClaimRule {
  id: string;
  claimPath: string; // e.g., 'email', 'address.country'
  operator: ClaimRuleOperator;
  value?: unknown;
  description?: string;
  required?: boolean;
}

export interface ClaimCheckResult {
  ruleId: string;
  claimPath: string;
  operator: ClaimRuleOperator;
  passed: boolean;
  actualValue?: unknown;
  expectedValue?: unknown;
  message: string;
}

/**
 * SAML
 */
export interface SAMLAssertion {
  id: string;
  issuer: string;
  subject: {
    nameId: string;
    nameIdFormat?: string;
    subjectConfirmation?: {
      method: string;
      recipient?: string;
      notOnOrAfter?: string;
      inResponseTo?: string;
    };
  };
  conditions?: {
    notBefore?: string;
    notOnOrAfter?: string;
    audienceRestriction?: string[];
  };
  attributes: Record<string, string | string[]>;
  authnStatement?: {
    authnInstant: string;
    sessionIndex?: string;
    authnContext?: string;
  };
  signatureValid?: boolean;
  signatureAlgorithm?: string;
}

export interface SAMLValidationResult {
  valid: boolean;
  assertions: SAMLAssertion[];
  errors: string[];
  warnings: string[];
  responseId?: string;
  inResponseTo?: string;
  issuer?: string;
  destination?: string;
  issueInstant?: string;
}

/**
 * HTTP Request/Response
 */
export interface HTTPRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  queryParams?: Record<string, string>;
}

export interface HTTPResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  redirects?: string[];
}

export interface APIResponse extends HTTPResponse {
  parsed?: unknown;
  error?: string;
}

/**
 * Request Preset
 */
export interface RequestPreset {
  id: string;
  name: string;
  description?: string;
  providerId?: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyType?: 'json' | 'form' | 'text';
  queryParams?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workspace
 */
export interface Workspace {
  version: string;
  name: string;
  providers: ProviderConfig[];
  presets: RequestPreset[];
  claimRuleSets: ClaimRuleSet[];
  exportedAt: string;
}

export interface ClaimRuleSet {
  id: string;
  name: string;
  description?: string;
  rules: ClaimRule[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Device Code Flow
 */
export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface DeviceCodePollResult {
  status: 'pending' | 'complete' | 'expired' | 'denied';
  tokens?: {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
  };
  error?: string;
  error_description?: string;
}

/**
 * OAuth2 Token Response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string; // OIDC
}

/**
 * Token Introspection Response
 */
export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  [key: string]: unknown;
}

/**
 * Enhanced Flow Types for Visualization
 */
export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  queryParams?: Record<string, string>;
  timestamp: number;
}

export interface CapturedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  duration: number;
  timestamp: number;
}

export interface NetworkLogEntry extends LogEntry {
  stepId?: string;
  protocol?: ProtocolType;
  request?: CapturedRequest;
  response?: CapturedResponse;
  expandable?: boolean;
}

export interface TokenInspection {
  raw: string;
  parts: { header: string; payload: string; signature: string };
  decoded: {
    header: JWTHeader;
    payload: JWTPayload;
  };
  validation?: JWTValidationResult;
  timeline?: TokenTimelineData;
}

export interface TokenTimelineData {
  iat?: number;
  nbf?: number;
  exp?: number;
  now: number;
  isValid: boolean;
  isExpired: boolean;
  isNotYetValid: boolean;
  expiresIn?: number;
}

