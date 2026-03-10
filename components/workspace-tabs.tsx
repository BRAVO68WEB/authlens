'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore, type WorkspaceTab } from '@/lib/store';
import { PROTOCOL_COLORS } from '@/lib/theme';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const PATH_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/providers': 'Providers',
  '/workspace': 'Workspace',
  '/flows/oidc': 'OIDC',
  '/flows/oauth2': 'OAuth 2.0',
  '/flows/saml': 'SAML',
  '/flows/loginradius': 'LoginRadius',
  '/flows/api': 'API Testing',
  '/tools/jwt': 'JWT Validator',
  '/tools/claims': 'Claim Checker',
  '/tools/jwk': 'JWK Viewer',
  '/tools/xml': 'XML Formatter',
};

const PATH_PROTOCOLS: Record<string, string> = {
  '/flows/oidc': 'oidc',
  '/flows/oauth2': 'oauth2',
  '/flows/saml': 'saml',
  '/flows/loginradius': 'loginradius',
  '/flows/api': 'api',
};

export function WorkspaceTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useStore();

  // Sync tabs with pathname
  useEffect(() => {
    if (pathname.startsWith('/callback/')) return;

    const title = PATH_TITLES[pathname] || pathname.split('/').pop() || 'Page';
    const protocol = PATH_PROTOCOLS[pathname];

    const existingTab = tabs.find((t) => t.path === pathname);
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      openTab({
        title,
        path: pathname,
        protocol: protocol as WorkspaceTab['protocol'],
        closable: pathname !== '/',
      });
    }
  }, [pathname]);

  const handleTabClick = (tab: WorkspaceTab) => {
    setActiveTab(tab.id);
    router.push(tab.path);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || !tab.closable) return;

    const idx = tabs.findIndex((t) => t.id === tabId);
    closeTab(tabId);

    if (activeTabId === tabId) {
      const nextTab = tabs[idx - 1] || tabs[idx + 1] || tabs[0];
      if (nextTab) {
        router.push(nextTab.path);
      }
    }
  };

  return (
    <div className="h-9 border-b border-border bg-background flex items-stretch shrink-0">
      <ScrollArea className="flex-1">
        <div className="flex items-stretch h-9">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const protocolColor = tab.protocol
              ? PROTOCOL_COLORS[tab.protocol]
              : null;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'group flex items-center gap-1.5 px-3 h-full text-xs border-r border-border shrink-0 transition-colors',
                  'hover:bg-accent/50',
                  isActive
                    ? 'bg-card text-foreground border-b-2 border-b-primary'
                    : 'text-muted-foreground'
                )}
              >
                {protocolColor && (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      protocolColor.accent.replace('text-', 'bg-')
                    )}
                  />
                )}
                <span className="truncate max-w-[120px]">{tab.title}</span>
                {tab.closable && (
                  <span
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className={cn(
                      'ml-1 rounded-sm p-0.5 hover:bg-muted transition-colors',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>
    </div>
  );
}
