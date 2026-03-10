import type { ProtocolType } from './types';

export interface FlowStepDefinition {
  id: string;
  label: string;
  description: string;
  optional?: boolean;
}

export const OIDC_AUTH_CODE_STEPS: FlowStepDefinition[] = [
  { id: 'build_url', label: 'Build Authorization URL', description: 'Construct the authorization request URL with required parameters' },
  { id: 'user_auth', label: 'User Authentication', description: 'Redirect user to the identity provider for authentication' },
  { id: 'callback', label: 'Receive Callback', description: 'Receive the authorization code via redirect callback' },
  { id: 'token_exchange', label: 'Token Exchange', description: 'Exchange the authorization code for tokens at the token endpoint' },
  { id: 'token_received', label: 'Tokens Received', description: 'Process the received access token, ID token, and optional refresh token' },
  { id: 'userinfo', label: 'Fetch UserInfo', description: 'Retrieve user profile information from the UserInfo endpoint', optional: true },
  { id: 'introspection', label: 'Token Introspection', description: 'Validate the token via the introspection endpoint', optional: true },
];

export const OIDC_IMPLICIT_STEPS: FlowStepDefinition[] = [
  { id: 'build_url', label: 'Build Authorization URL', description: 'Construct the implicit flow authorization URL' },
  { id: 'user_auth', label: 'User Authentication', description: 'Redirect user to the identity provider for authentication' },
  { id: 'callback', label: 'Receive Tokens', description: 'Receive tokens directly via URL fragment in the callback' },
  { id: 'token_received', label: 'Tokens Processed', description: 'Parse and process the received tokens from the fragment' },
];

export const OAUTH2_AUTH_CODE_STEPS: FlowStepDefinition[] = [
  { id: 'build_url', label: 'Build Authorization URL', description: 'Construct the OAuth 2.0 authorization request URL' },
  { id: 'user_auth', label: 'User Authorization', description: 'Redirect user to authorize the application' },
  { id: 'callback', label: 'Receive Callback', description: 'Receive the authorization code via redirect callback' },
  { id: 'token_exchange', label: 'Token Exchange', description: 'Exchange the authorization code for an access token' },
  { id: 'token_received', label: 'Token Received', description: 'Process the received access token and optional refresh token' },
];

export const OAUTH2_CLIENT_CREDENTIALS_STEPS: FlowStepDefinition[] = [
  { id: 'token_request', label: 'Token Request', description: 'Request access token using client credentials' },
  { id: 'token_received', label: 'Token Received', description: 'Process the received access token' },
];

export const OAUTH2_PASSWORD_STEPS: FlowStepDefinition[] = [
  { id: 'token_request', label: 'Token Request', description: 'Request access token using username and password' },
  { id: 'token_received', label: 'Token Received', description: 'Process the received access token' },
];

export const OAUTH2_DEVICE_CODE_STEPS: FlowStepDefinition[] = [
  { id: 'device_request', label: 'Device Authorization', description: 'Request device and user codes from the authorization server' },
  { id: 'user_action', label: 'User Action', description: 'User visits verification URI and enters the user code' },
  { id: 'polling', label: 'Polling', description: 'Poll the token endpoint for authorization completion' },
  { id: 'token_received', label: 'Token Received', description: 'Process the received access token after user authorization' },
];

export const SAML_SP_STEPS: FlowStepDefinition[] = [
  { id: 'build_request', label: 'Build AuthnRequest', description: 'Construct the SAML AuthnRequest XML document' },
  { id: 'encode', label: 'Encode Request', description: 'Deflate compress and Base64 encode the AuthnRequest for HTTP-Redirect binding' },
  { id: 'user_auth', label: 'User Authentication', description: 'Redirect user to the Identity Provider for authentication' },
  { id: 'response_received', label: 'Response Received', description: 'Receive the SAML Response from the Identity Provider' },
  { id: 'parse', label: 'Parse Response', description: 'Decode and parse the SAML Response XML' },
  { id: 'validate', label: 'Validate Response', description: 'Validate signature, conditions, and assertions in the SAML Response' },
];

export function getFlowSteps(protocol: ProtocolType, flowType?: string): FlowStepDefinition[] {
  switch (protocol) {
    case 'oidc':
      if (flowType === 'implicit') return OIDC_IMPLICIT_STEPS;
      return OIDC_AUTH_CODE_STEPS;
    case 'oauth2':
      switch (flowType) {
        case 'client_credentials': return OAUTH2_CLIENT_CREDENTIALS_STEPS;
        case 'password': return OAUTH2_PASSWORD_STEPS;
        case 'device_code': return OAUTH2_DEVICE_CODE_STEPS;
        default: return OAUTH2_AUTH_CODE_STEPS;
      }
    case 'saml':
      return SAML_SP_STEPS;
    default:
      return [];
  }
}
