'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/app-sidebar';
import { WorkspaceTabs } from '@/components/workspace-tabs';
import { AppHeader } from '@/components/app-header';
import { CommandPalette } from '@/components/command-palette';
import { Toaster } from '@/components/ui/sonner';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={0}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <WorkspaceTabs />
            <AppHeader />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette />
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}
