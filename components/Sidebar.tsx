'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  LayoutDashboard,
  Settings,
  Play,
  Wrench,
  Download,
  KeyRound,
  CheckSquare,
  Globe,
  FileJson,
  Code,
  Shield,
  Lock,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Providers',
    href: '/providers',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    label: 'Flows',
    href: '/flows',
    icon: <Play className="w-5 h-5" />,
    children: [
      {
        label: 'OIDC',
        href: '/flows/oidc',
        icon: <Shield className="w-4 h-4" />,
      },
      {
        label: 'OAuth 2.0',
        href: '/flows/oauth2',
        icon: <Lock className="w-4 h-4" />,
      },
      {
        label: 'SAML',
        href: '/flows/saml',
        icon: <Key className="w-4 h-4" />,
      },
      {
        label: 'LR API',
        href: '/flows/loginradius',
        icon: <Globe className="w-4 h-4" />,
      },
      {
        label: 'API Testing',
        href: '/flows/api',
        icon: <Code className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Tools',
    href: '/tools',
    icon: <Wrench className="w-5 h-5" />,
    children: [
      {
        label: 'JWT Validator',
        href: '/tools/jwt',
        icon: <KeyRound className="w-4 h-4" />,
      },
      {
        label: 'Claim Checker',
        href: '/tools/claims',
        icon: <CheckSquare className="w-4 h-4" />,
      },
      // {
      //   label: 'Request Builder',
      //   href: '/tools/request',
      //   icon: <Globe className="w-4 h-4" />,
      // },
      {
        label: 'JWK Viewer',
        href: '/tools/jwk',
        icon: <Key className="w-4 h-4" />,
      },
      {
        label: 'XML Formatter',
        href: '/tools/xml',
        icon: <FileJson className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Workspace',
    href: '/workspace',
    icon: <Download className="w-5 h-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useStore();

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside className="w-64 bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-400" />
          AuthLens
        </h1>
        <p className="text-sm text-gray-400 mt-1">Auth Playground & Debugger</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => (
          <NavItemComponent key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          <p>Version 1.0.0</p>
          <p className="mt-1">Built with Next.js</p>
        </div>
      </div>
    </aside>
  );
}

function NavItemComponent({
  item,
  pathname,
  depth = 0,
}: {
  item: NavItem;
  pathname: string;
  depth?: number;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
          depth > 0 && 'pl-10 text-sm',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        )}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>

      {hasChildren && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavItemComponent
              key={child.href}
              item={child}
              pathname={pathname}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

