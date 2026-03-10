'use client';

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Shield, Play, Wrench, Settings, ArrowRight } from 'lucide-react';
import { PROTOCOL_COLORS } from '@/lib/theme';
import { ProtocolBadge } from '@/components/protocol-badge';
import type { ProtocolType } from '@/lib/types';

export default function Home() {
  const { providers } = useStore();

  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Multi-Protocol Support',
      description: 'Test OIDC, OAuth 2.0, SAML, and standard API authentication flows',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: <Play className="w-5 h-5" />,
      title: 'Flow Testing',
      description: 'Run authorization code, implicit, device code, and hybrid flows with PKCE',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: <Wrench className="w-5 h-5" />,
      title: 'Developer Tools',
      description: 'JWT validator, claim checker, and more debugging utilities',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: 'Provider Management',
      description: 'Configure and manage multiple identity providers with auto-discovery',
      color: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const quickLinks = [
    { href: '/providers', label: 'Configure Provider', icon: <Settings className="w-4 h-4" /> },
    { href: '/flows/oidc', label: 'Start OIDC Flow', icon: <Play className="w-4 h-4" /> },
    { href: '/tools/jwt', label: 'Validate JWT', icon: <Wrench className="w-4 h-4" /> },
    { href: '/workspace', label: 'Import Workspace', icon: <ArrowRight className="w-4 h-4" /> },
  ];

  const protocolFlows: { protocol: ProtocolType; href: string }[] = [
    { protocol: 'oidc', href: '/flows/oidc' },
    { protocol: 'oauth2', href: '/flows/oauth2' },
    { protocol: 'saml', href: '/flows/saml' },
    { protocol: 'loginradius', href: '/flows/loginradius' },
    { protocol: 'api', href: '/flows/api' },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground mb-1">
          AuthLens
        </h1>
        <p className="text-sm text-muted-foreground">
          Authentication playground and debugging tool
        </p>
      </div>

      {providers.length === 0 && (
        <div className="mb-6 p-4 bg-muted border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1 text-sm">
                Get Started
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                No providers configured yet. Add your first identity provider to begin testing authentication flows.
              </p>
              <Link href="/providers">
                <Button size="sm">Add Provider</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Launch</h2>
        <div className="flex flex-wrap gap-2">
          {protocolFlows.map(({ protocol, href }) => {
            const colors = PROTOCOL_COLORS[protocol];
            const Icon = colors.icon;
            return (
              <Link key={protocol} href={href}>
                <button
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${colors.bg} ${colors.border} ${colors.text} hover:opacity-80`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.accent.replace('text-', 'bg-')}`} />
                  {colors.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {features.map((feature, index) => (
          <Card key={index}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 ${feature.color}`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, index) => (
            <Link key={index} href={link.href}>
              <div className="p-3 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground">
                    {link.icon}
                  </div>
                  <span className="font-medium text-sm text-foreground">
                    {link.label}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {providers.length > 0 && (
        <Card title="Recent Providers" className="mt-6">
          <div className="space-y-2">
            {providers.slice(0, 5).map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">
                      {provider.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {provider.baseUrl || provider.discoveryUrl || 'No URL'}
                    </p>
                  </div>
                  <ProtocolBadge protocol={provider.type} />
                </div>
                <Link href={`/flows/${provider.type}`}>
                  <Button size="sm">
                    Test Flow
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
