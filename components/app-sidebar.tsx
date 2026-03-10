'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { PROTOCOL_COLORS } from '@/lib/theme';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Settings,
  Shield,
  Lock,
  Key,
  Globe,
  Code,
  Wrench,
  KeyRound,
  CheckSquare,
  FileJson,
  Download,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProtocolType } from '@/lib/types';

const flowItems: { label: string; href: string; icon: typeof Shield; protocol: ProtocolType }[] = [
  { label: 'OIDC', href: '/flows/oidc', icon: Shield, protocol: 'oidc' },
  { label: 'OAuth 2.0', href: '/flows/oauth2', icon: Lock, protocol: 'oauth2' },
  { label: 'SAML', href: '/flows/saml', icon: Key, protocol: 'saml' },
  { label: 'LoginRadius', href: '/flows/loginradius', icon: Globe, protocol: 'loginradius' },
  { label: 'API Testing', href: '/flows/api', icon: Code, protocol: 'api' },
];

const toolItems = [
  { label: 'JWT Validator', href: '/tools/jwt', icon: KeyRound },
  { label: 'Claim Checker', href: '/tools/claims', icon: CheckSquare },
  { label: 'JWK Viewer', href: '/tools/jwk', icon: Key },
  { label: 'XML Formatter', href: '/tools/xml', icon: FileJson },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { openTab } = useStore();

  const handleNav = (href: string, title: string, protocol?: ProtocolType) => {
    openTab({
      title,
      path: href,
      protocol,
      closable: href !== '/',
    });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <Link
          href="/"
          onClick={() => handleNav('/', 'Dashboard')}
          className="flex items-center gap-2 px-1"
        >
          <Shield className="h-6 w-6 shrink-0 text-primary" />
          <span className="font-semibold text-base group-data-[collapsible=icon]:hidden">
            AuthLens
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/'}
                  tooltip="Dashboard"
                  render={<Link href="/" onClick={() => handleNav('/', 'Dashboard')} />}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/providers'}
                  tooltip="Providers"
                  render={<Link href="/providers" onClick={() => handleNav('/providers', 'Providers')} />}
                >
                  <Settings className="h-4 w-4" />
                  <span>Providers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Play className="h-3 w-3 mr-1" />
            Flows
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {flowItems.map((item) => {
                const colors = PROTOCOL_COLORS[item.protocol];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={colors.label}
                      render={
                        <Link
                          href={item.href}
                          onClick={() => handleNav(item.href, item.label, item.protocol)}
                        />
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full shrink-0',
                            colors.accent.replace('text-', 'bg-')
                          )}
                        />
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Wrench className="h-3 w-3 mr-1" />
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={
                      <Link
                        href={item.href}
                        onClick={() => handleNav(item.href, item.label)}
                      />
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/workspace'}
                  tooltip="Workspace"
                  render={
                    <Link
                      href="/workspace"
                      onClick={() => handleNav('/workspace', 'Workspace')}
                    />
                  }
                >
                  <Download className="h-4 w-4" />
                  <span>Import / Export</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p>AuthLens v1.1.2</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
