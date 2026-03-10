export interface ClaimDescription {
  name: string;
  fullName: string;
  description: string;
  spec: string;
  validatable: boolean;
}

export const CLAIM_DESCRIPTIONS: Record<string, ClaimDescription> = {
  iss: { name: 'iss', fullName: 'Issuer', description: 'Identifies the principal that issued the JWT', spec: 'RFC 7519 §4.1.1', validatable: true },
  sub: { name: 'sub', fullName: 'Subject', description: 'Identifies the principal that is the subject of the JWT', spec: 'RFC 7519 §4.1.2', validatable: true },
  aud: { name: 'aud', fullName: 'Audience', description: 'Identifies the recipients that the JWT is intended for', spec: 'RFC 7519 §4.1.3', validatable: true },
  exp: { name: 'exp', fullName: 'Expiration Time', description: 'Identifies the expiration time on or after which the JWT must not be accepted for processing', spec: 'RFC 7519 §4.1.4', validatable: true },
  nbf: { name: 'nbf', fullName: 'Not Before', description: 'Identifies the time before which the JWT must not be accepted for processing', spec: 'RFC 7519 §4.1.5', validatable: true },
  iat: { name: 'iat', fullName: 'Issued At', description: 'Identifies the time at which the JWT was issued', spec: 'RFC 7519 §4.1.6', validatable: true },
  jti: { name: 'jti', fullName: 'JWT ID', description: 'Provides a unique identifier for the JWT', spec: 'RFC 7519 §4.1.7', validatable: false },
  nonce: { name: 'nonce', fullName: 'Nonce', description: 'String value used to associate a Client session with an ID Token and to mitigate replay attacks', spec: 'OIDC Core §2', validatable: true },
  azp: { name: 'azp', fullName: 'Authorized Party', description: 'The party to which the ID Token was issued', spec: 'OIDC Core §2', validatable: true },
  at_hash: { name: 'at_hash', fullName: 'Access Token Hash', description: 'Hash value of the access token for validation', spec: 'OIDC Core §3.1.3.6', validatable: true },
  c_hash: { name: 'c_hash', fullName: 'Code Hash', description: 'Hash value of the authorization code for validation', spec: 'OIDC Core §3.3.2.11', validatable: true },
  auth_time: { name: 'auth_time', fullName: 'Authentication Time', description: 'Time when the End-User authentication occurred', spec: 'OIDC Core §2', validatable: true },
  acr: { name: 'acr', fullName: 'Authentication Context Class Reference', description: 'Authentication context class reference value', spec: 'OIDC Core §2', validatable: false },
  amr: { name: 'amr', fullName: 'Authentication Methods References', description: 'JSON array of authentication methods used', spec: 'RFC 8176', validatable: false },
  email: { name: 'email', fullName: 'Email', description: "End-User's e-mail address", spec: 'OIDC Core §5.1', validatable: false },
  email_verified: { name: 'email_verified', fullName: 'Email Verified', description: "Whether the End-User's e-mail address has been verified", spec: 'OIDC Core §5.1', validatable: true },
  name: { name: 'name', fullName: 'Full Name', description: "End-User's full name in displayable form", spec: 'OIDC Core §5.1', validatable: false },
  given_name: { name: 'given_name', fullName: 'Given Name', description: "Given name(s) or first name(s) of the End-User", spec: 'OIDC Core §5.1', validatable: false },
  family_name: { name: 'family_name', fullName: 'Family Name', description: "Surname(s) or last name(s) of the End-User", spec: 'OIDC Core §5.1', validatable: false },
  preferred_username: { name: 'preferred_username', fullName: 'Preferred Username', description: 'Shorthand name by which the End-User wishes to be referred to', spec: 'OIDC Core §5.1', validatable: false },
  picture: { name: 'picture', fullName: 'Picture', description: "URL of the End-User's profile picture", spec: 'OIDC Core §5.1', validatable: false },
  locale: { name: 'locale', fullName: 'Locale', description: "End-User's locale", spec: 'OIDC Core §5.1', validatable: false },
  zoneinfo: { name: 'zoneinfo', fullName: 'Time Zone', description: "End-User's time zone", spec: 'OIDC Core §5.1', validatable: false },
  updated_at: { name: 'updated_at', fullName: 'Updated At', description: "Time the End-User's information was last updated", spec: 'OIDC Core §5.1', validatable: false },
  scope: { name: 'scope', fullName: 'Scope', description: 'The scopes associated with the token', spec: 'RFC 6749', validatable: false },
  client_id: { name: 'client_id', fullName: 'Client ID', description: 'The client identifier for which the token was issued', spec: 'RFC 6749', validatable: true },
  token_type: { name: 'token_type', fullName: 'Token Type', description: 'The type of the token', spec: 'RFC 6749', validatable: false },
  sid: { name: 'sid', fullName: 'Session ID', description: 'The session identifier', spec: 'OIDC Front-Channel Logout', validatable: false },
};

export function getClaimDescription(claim: string): ClaimDescription | undefined {
  return CLAIM_DESCRIPTIONS[claim];
}
