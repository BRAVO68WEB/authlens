import type { ProtocolType } from './types';
import {
  Shield,
  Lock,
  Key,
  Globe,
  Code,
} from 'lucide-react';

export const PROTOCOL_COLORS: Record<ProtocolType, {
  accent: string;
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: typeof Shield;
}> = {
  oidc: {
    accent: 'text-protocol-oidc',
    bg: 'bg-protocol-oidc/10',
    text: 'text-protocol-oidc',
    border: 'border-protocol-oidc/30',
    label: 'OpenID Connect',
    icon: Shield,
  },
  oauth2: {
    accent: 'text-protocol-oauth2',
    bg: 'bg-protocol-oauth2/10',
    text: 'text-protocol-oauth2',
    border: 'border-protocol-oauth2/30',
    label: 'OAuth 2.0',
    icon: Lock,
  },
  saml: {
    accent: 'text-protocol-saml',
    bg: 'bg-protocol-saml/10',
    text: 'text-protocol-saml',
    border: 'border-protocol-saml/30',
    label: 'SAML 2.0',
    icon: Key,
  },
  loginradius: {
    accent: 'text-protocol-loginradius',
    bg: 'bg-protocol-loginradius/10',
    text: 'text-protocol-loginradius',
    border: 'border-protocol-loginradius/30',
    label: 'LoginRadius',
    icon: Globe,
  },
  api: {
    accent: 'text-protocol-api',
    bg: 'bg-protocol-api/10',
    text: 'text-protocol-api',
    border: 'border-protocol-api/30',
    label: 'API Testing',
    icon: Code,
  },
};

export const STATUS_COLORS = {
  pending: {
    dot: 'bg-status-pending',
    text: 'text-status-pending',
    label: 'Pending',
  },
  active: {
    dot: 'bg-status-active',
    text: 'text-status-active',
    label: 'Active',
  },
  success: {
    dot: 'bg-status-success',
    text: 'text-status-success',
    label: 'Success',
  },
  error: {
    dot: 'bg-status-error',
    text: 'text-status-error',
    label: 'Error',
  },
} as const;

export type StatusType = keyof typeof STATUS_COLORS;
