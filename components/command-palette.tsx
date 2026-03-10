'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Settings,
  Shield,
  Lock,
  Key,
  Globe,
  Code,
  KeyRound,
  CheckSquare,
  FileJson,
  Download,
  Moon,
  Sun,
  Play,
  Wrench,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Providers', href: '/providers', icon: Settings, group: 'Navigation' },
  { label: 'Workspace', href: '/workspace', icon: Download, group: 'Navigation' },
  { label: 'OIDC Flow', href: '/flows/oidc', icon: Shield, group: 'Flows' },
  { label: 'OAuth 2.0 Flow', href: '/flows/oauth2', icon: Lock, group: 'Flows' },
  { label: 'SAML Flow', href: '/flows/saml', icon: Key, group: 'Flows' },
  { label: 'LoginRadius Flow', href: '/flows/loginradius', icon: Globe, group: 'Flows' },
  { label: 'API Testing', href: '/flows/api', icon: Code, group: 'Flows' },
  { label: 'JWT Validator', href: '/tools/jwt', icon: KeyRound, group: 'Tools' },
  { label: 'Claim Checker', href: '/tools/claims', icon: CheckSquare, group: 'Tools' },
  { label: 'JWK Viewer', href: '/tools/jwk', icon: Key, group: 'Tools' },
  { label: 'XML Formatter', href: '/tools/xml', icon: FileJson, group: 'Tools' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { darkMode, toggleDarkMode, providers, openTab } = useStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (href: string, title: string) => {
    openTab({
      title,
      path: href,
      closable: href !== '/',
    });
    router.push(href);
    setOpen(false);
  };

  const groups = ['Navigation', 'Flows', 'Tools'];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, providers, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {navItems
              .filter((item) => item.group === group)
              .map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => handleSelect(item.href, item.label)}
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        ))}

        {providers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Providers">
              {providers.map((provider) => (
                <CommandItem
                  key={provider.id}
                  onSelect={() => handleSelect(`/flows/${provider.type}`, provider.name)}
                  className="gap-2"
                >
                  <Play className="h-4 w-4 text-muted-foreground" />
                  <span>{provider.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {provider.type.toUpperCase()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              toggleDarkMode();
              setOpen(false);
            }}
            className="gap-2"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Toggle {darkMode ? 'Light' : 'Dark'} Mode</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
