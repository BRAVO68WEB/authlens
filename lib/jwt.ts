/**
 * JWT validation and utilities
 */

import { jwtVerify, createRemoteJWKSet, decodeJwt, decodeProtectedHeader } from 'jose';
import type {
  JWTValidationResult,
  JWTHeader,
  JWTPayload,
  JWK,
  JWKS,
  ClaimRule,
  ClaimCheckResult,
} from './types';
import { validateTimestamps, getNestedValue } from './utils';

/**
 * Fetch JWKS from URL
 */
export async function fetchJWKS(jwksUrl: string): Promise<JWKS> {
  const response = await fetch(jwksUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Decode JWT without verification
 */
export function decodeJWT(token: string): {
  header: JWTHeader;
  payload: JWTPayload;
} {
  const header = decodeProtectedHeader(token) as JWTHeader;
  const payload = decodeJwt(token) as JWTPayload;
  
  return { header, payload };
}

/**
 * Verify JWT signature using JWKS
 */
export async function verifyJWT(params: {
  token: string;
  jwksUrl?: string;
  jwks?: JWKS;
  audience?: string | string[];
  issuer?: string | string[];
  clockSkew?: number;
}): Promise<{
  valid: boolean;
  payload: JWTPayload;
  header: JWTHeader;
  error?: string;
}> {
  try {
    let jwksSource;
    
    if (params.jwksUrl) {
      jwksSource = createRemoteJWKSet(new URL(params.jwksUrl));
    } else if (params.jwks) {
      // Create local JWKS
      const localJWKS = async () => params.jwks!;
      jwksSource = localJWKS as any;
    } else {
      throw new Error('Either jwksUrl or jwks must be provided');
    }
    
    const verifyOptions: any = {
      clockTolerance: params.clockSkew || 0,
    };
    
    if (params.audience) {
      verifyOptions.audience = params.audience;
    }
    
    if (params.issuer) {
      verifyOptions.issuer = params.issuer;
    }
    
    const { payload, protectedHeader } = await jwtVerify(
      params.token,
      jwksSource,
      verifyOptions
    );
    
    return {
      valid: true,
      payload: payload as JWTPayload,
      header: protectedHeader as JWTHeader,
    };
  } catch (error) {
    const decoded = decodeJWT(params.token);
    return {
      valid: false,
      payload: decoded.payload,
      header: decoded.header,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Full JWT validation with claim checking
 */
export async function validateJWT(params: {
  token: string;
  jwksUrl?: string;
  jwks?: JWKS;
  audience?: string | string[];
  issuer?: string | string[];
  clockSkew?: number;
  claimRules?: ClaimRule[];
}): Promise<JWTValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Decode token
  let header: JWTHeader;
  let payload: JWTPayload;
  
  try {
    const decoded = decodeJWT(params.token);
    header = decoded.header;
    payload = decoded.payload;
  } catch (error) {
    return {
      valid: false,
      header: {} as JWTHeader,
      payload: {} as JWTPayload,
      signatureValid: false,
      alg: 'unknown',
      standardChecks: {
        exp: { valid: false, message: 'Failed to decode token' },
        nbf: { valid: true, message: '' },
        iat: { valid: true, message: '' },
      },
      claimResults: [],
      errors: ['Failed to decode JWT: ' + (error instanceof Error ? error.message : 'Unknown error')],
      warnings: [],
    };
  }
  
  // Verify signature
  let signatureValid = false;
  let jwkUsed: JWK | undefined;
  
  if (params.jwksUrl || params.jwks) {
    try {
      const verifyResult = await verifyJWT({
        token: params.token,
        jwksUrl: params.jwksUrl,
        jwks: params.jwks,
        audience: params.audience,
        issuer: params.issuer,
        clockSkew: params.clockSkew,
      });
      
      signatureValid = verifyResult.valid;
      
      if (!verifyResult.valid && verifyResult.error) {
        errors.push(`Signature validation failed: ${verifyResult.error}`);
      }
      
      // Try to find the JWK used
      if (params.jwks && header.kid) {
        jwkUsed = params.jwks.keys.find(k => k.kid === header.kid);
      }
    } catch (error) {
      errors.push('Signature validation error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  } else {
    warnings.push('No JWKS provided - signature not verified');
  }
  
  // Validate standard claims
  const timestampChecks = validateTimestamps(
    {
      exp: payload.exp,
      nbf: payload.nbf,
      iat: payload.iat,
    },
    params.clockSkew || 0
  );
  
  if (!timestampChecks.exp.valid) {
    errors.push(timestampChecks.exp.message);
  }
  
  if (!timestampChecks.nbf.valid) {
    errors.push(timestampChecks.nbf.message);
  }
  
  // Validate algorithm
  if (header.alg === 'none') {
    errors.push('Algorithm "none" is not allowed');
  }
  
  // Check for missing standard claims
  if (!payload.iss) {
    warnings.push('Missing issuer (iss) claim');
  }
  
  if (!payload.sub) {
    warnings.push('Missing subject (sub) claim');
  }
  
  if (!payload.aud) {
    warnings.push('Missing audience (aud) claim');
  }
  
  // Validate custom claim rules
  const claimResults = params.claimRules
    ? checkClaims(payload, params.claimRules)
    : [];
  
  const failedClaims = claimResults.filter(r => !r.passed);
  if (failedClaims.length > 0) {
    errors.push(`${failedClaims.length} claim check(s) failed`);
  }
  
  return {
    valid: signatureValid && errors.length === 0,
    header,
    payload,
    signatureValid,
    alg: header.alg,
    kid: header.kid,
    jwkUsed,
    standardChecks: timestampChecks,
    claimResults,
    errors,
    warnings,
  };
}

/**
 * Check claims against rules
 */
export function checkClaims(
  payload: JWTPayload | Record<string, unknown>,
  rules: ClaimRule[]
): ClaimCheckResult[] {
  return rules.map(rule => checkClaim(payload, rule));
}

/**
 * Check single claim against rule
 */
export function checkClaim(
  payload: JWTPayload | Record<string, unknown>,
  rule: ClaimRule
): ClaimCheckResult {
  const actualValue = getNestedValue(payload, rule.claimPath);
  
  let passed = false;
  let message = '';
  
  switch (rule.operator) {
    case 'exists':
      passed = actualValue !== undefined && actualValue !== null;
      message = passed
        ? `Claim '${rule.claimPath}' exists`
        : `Claim '${rule.claimPath}' does not exist`;
      break;
      
    case 'not_exists':
      passed = actualValue === undefined || actualValue === null;
      message = passed
        ? `Claim '${rule.claimPath}' does not exist (as expected)`
        : `Claim '${rule.claimPath}' exists (unexpected)`;
      break;
      
    case 'equals':
      passed = actualValue === rule.value;
      message = passed
        ? `Claim '${rule.claimPath}' equals expected value`
        : `Claim '${rule.claimPath}' (${actualValue}) does not equal ${rule.value}`;
      break;
      
    case 'not_equals':
      passed = actualValue !== rule.value;
      message = passed
        ? `Claim '${rule.claimPath}' does not equal ${rule.value}`
        : `Claim '${rule.claimPath}' equals ${rule.value} (unexpected)`;
      break;
      
    case 'contains':
      if (typeof actualValue === 'string' && typeof rule.value === 'string') {
        passed = actualValue.includes(rule.value);
        message = passed
          ? `Claim '${rule.claimPath}' contains '${rule.value}'`
          : `Claim '${rule.claimPath}' does not contain '${rule.value}'`;
      } else if (Array.isArray(actualValue)) {
        passed = actualValue.includes(rule.value);
        message = passed
          ? `Claim '${rule.claimPath}' array contains ${rule.value}`
          : `Claim '${rule.claimPath}' array does not contain ${rule.value}`;
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a string or array`;
      }
      break;
      
    case 'not_contains':
      if (typeof actualValue === 'string' && typeof rule.value === 'string') {
        passed = !actualValue.includes(rule.value);
        message = passed
          ? `Claim '${rule.claimPath}' does not contain '${rule.value}'`
          : `Claim '${rule.claimPath}' contains '${rule.value}' (unexpected)`;
      } else if (Array.isArray(actualValue)) {
        passed = !actualValue.includes(rule.value);
        message = passed
          ? `Claim '${rule.claimPath}' array does not contain ${rule.value}`
          : `Claim '${rule.claimPath}' array contains ${rule.value} (unexpected)`;
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a string or array`;
      }
      break;
      
    case 'regex':
      if (typeof actualValue === 'string' && typeof rule.value === 'string') {
        try {
          const regex = new RegExp(rule.value);
          passed = regex.test(actualValue);
          message = passed
            ? `Claim '${rule.claimPath}' matches regex`
            : `Claim '${rule.claimPath}' does not match regex`;
        } catch (error) {
          passed = false;
          message = `Invalid regex: ${rule.value}`;
        }
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a string`;
      }
      break;
      
    case 'gt':
      if (typeof actualValue === 'number' && typeof rule.value === 'number') {
        passed = actualValue > rule.value;
        message = passed
          ? `Claim '${rule.claimPath}' (${actualValue}) > ${rule.value}`
          : `Claim '${rule.claimPath}' (${actualValue}) is not > ${rule.value}`;
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a number`;
      }
      break;
      
    case 'gte':
      if (typeof actualValue === 'number' && typeof rule.value === 'number') {
        passed = actualValue >= rule.value;
        message = passed
          ? `Claim '${rule.claimPath}' (${actualValue}) >= ${rule.value}`
          : `Claim '${rule.claimPath}' (${actualValue}) is not >= ${rule.value}`;
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a number`;
      }
      break;
      
    case 'lt':
      if (typeof actualValue === 'number' && typeof rule.value === 'number') {
        passed = actualValue < rule.value;
        message = passed
          ? `Claim '${rule.claimPath}' (${actualValue}) < ${rule.value}`
          : `Claim '${rule.claimPath}' (${actualValue}) is not < ${rule.value}`;
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a number`;
      }
      break;
      
    case 'lte':
      if (typeof actualValue === 'number' && typeof rule.value === 'number') {
        passed = actualValue <= rule.value;
        message = passed
          ? `Claim '${rule.claimPath}' (${actualValue}) <= ${rule.value}`
          : `Claim '${rule.claimPath}' (${actualValue}) is not <= ${rule.value}`;
      } else {
        passed = false;
        message = `Claim '${rule.claimPath}' is not a number`;
      }
      break;
      
    case 'in':
      if (Array.isArray(rule.value)) {
        passed = rule.value.includes(actualValue);
        message = passed
          ? `Claim '${rule.claimPath}' is in allowed values`
          : `Claim '${rule.claimPath}' (${actualValue}) is not in allowed values`;
      } else {
        passed = false;
        message = 'Rule value must be an array for "in" operator';
      }
      break;
      
    case 'not_in':
      if (Array.isArray(rule.value)) {
        passed = !rule.value.includes(actualValue);
        message = passed
          ? `Claim '${rule.claimPath}' is not in disallowed values`
          : `Claim '${rule.claimPath}' (${actualValue}) is in disallowed values`;
      } else {
        passed = false;
        message = 'Rule value must be an array for "not_in" operator';
      }
      break;
      
    default:
      passed = false;
      message = `Unknown operator: ${rule.operator}`;
  }
  
  return {
    ruleId: rule.id,
    claimPath: rule.claimPath,
    operator: rule.operator,
    passed,
    actualValue,
    expectedValue: rule.value,
    message,
  };
}

/**
 * Find JWK by kid
 */
export function findJWK(jwks: JWKS, kid: string): JWK | undefined {
  return jwks.keys.find(k => k.kid === kid);
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const { payload } = decodeJWT(token);
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string, clockSkew: number = 0): boolean {
  try {
    const { payload } = decodeJWT(token);
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp + clockSkew < now;
    }
    return false;
  } catch {
    return true;
  }
}

