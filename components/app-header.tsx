'use client';

import { useStore } from '@/lib/store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Moon, Sun, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AppHeader() {
  const { darkMode, toggleDarkMode, providers, selectedProviderId, selectProvider } = useStore();
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <header className="h-10 flex items-center gap-2 px-2 border-b border-border bg-background shrink-0">
      <SidebarTrigger className="h-7 w-7" />
      <Separator orientation="vertical" className="h-4" />

      <div className="flex-1 flex items-center gap-2">
        {providers.length > 0 && (
          <select
            value={selectedProviderId || ''}
            onChange={(e) => selectProvider(e.target.value || null)}
            className="h-7 px-2 text-xs bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[200px]"
          >
            <option value="">Select provider...</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type.toUpperCase()})
              </option>
            ))}
          </select>
        )}

        {selectedProvider && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {selectedProvider.type.toUpperCase()}
          </Badge>
        )}
      </div>

      <Badge
        variant="outline"
        className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-accent hidden md:flex"
        onClick={() => {
          const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
          document.dispatchEvent(event);
        }}
      >
        <Search className="h-2.5 w-2.5" />
        <span className="font-mono">&#8984;K</span>
      </Badge>

      <button
        onClick={toggleDarkMode}
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </header>
  );
}
