import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { AppThemeProvider } from "@/components/ThemeProvider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        <AppThemeProvider>
          <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 overflow-auto bg-bg-secondary">
                {children}
              </main>
            </div>
          </div>
        </AppThemeProvider>
      </body>
    </html>
  );
}
