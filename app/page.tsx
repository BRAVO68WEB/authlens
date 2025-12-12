'use client';

import { useStore } from '@/lib/store';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Shield, Play, Wrench, Settings, ArrowRight, CheckCircle } from 'lucide-react';

export default function Home() {
  const { providers } = useStore();

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Multi-Protocol Support',
      description: 'Test OIDC, OAuth 2.0, SAML, and standard API authentication flows',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: <Play className="w-6 h-6" />,
      title: 'Flow Testing',
      description: 'Run authorization code, implicit, device code, and hybrid flows with PKCE',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: <Wrench className="w-6 h-6" />,
      title: 'Developer Tools',
      description: 'JWT validator, claim checker, request builder, and more debugging utilities',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: 'Provider Management',
      description: 'Configure and manage multiple identity providers with auto-discovery',
      color: 'text-orange-600 dark:text-orange-400',
    },
  ];

  const quickLinks = [
    { href: '/providers', label: 'Configure Provider', icon: <Settings className="w-5 h-5" /> },
    { href: '/flows/oidc', label: 'Start OIDC Flow', icon: <Play className="w-5 h-5" /> },
    { href: '/tools/jwt', label: 'Validate JWT', icon: <Wrench className="w-5 h-5" /> },
    { href: '/workspace', label: 'Import Workspace', icon: <ArrowRight className="w-5 h-5" /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to AuthLens
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Your comprehensive authentication playground and debugging tool
        </p>
      </div>

      {providers.length === 0 && (
        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Get Started
              </h3>
              <p className="text-blue-800 dark:text-blue-200 mb-4">
                You haven't configured any providers yet. Start by adding your first identity provider
                to begin testing authentication flows.
              </p>
              <Link href="/providers">
                <Button>Add Your First Provider</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => (
          <Card key={index}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 ${feature.color}`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600 dark:text-blue-400">
                    {link.icon}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {link.label}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {providers.length > 0 && (
        <Card title="Recent Providers" className="mt-8">
          <div className="space-y-3">
            {providers.slice(0, 5).map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {provider.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {provider.type.toUpperCase()} • {provider.baseUrl || provider.discoveryUrl || 'No URL'}
                  </p>
                </div>
                <Link href={`/flows/${provider.type}`}>
                  <Button size="sm">
                    Test Flow
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          What's Supported?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Protocols
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                OpenID Connect (OIDC)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                OAuth 2.0
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                SAML 2.0
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Standard API (REST)
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Features
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                PKCE Support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                JWT Validation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Token Introspection
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Auto-Discovery
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
