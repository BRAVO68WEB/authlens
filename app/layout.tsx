import type { Metadata } from "next";
import "./globals.css";
import { AppThemeProvider } from "@/components/ThemeProvider";
import { LayoutShell } from "@/components/layout-shell";
import { Geist, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "AuthLens - Auth Playground & Debugger",
  description: "A comprehensive authentication testing and debugging tool for OIDC, OAuth 2.0, SAML, and API authentication flows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geist.variable, jetbrainsMono.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <AppThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </AppThemeProvider>
      </body>
    </html>
  );
}
