
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { GameProvider } from '@/contexts/GameContext';
import { AppShell } from '@/components/layout/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Jet Lag: Hong Kong — MTR Hide and Seek',
  description: 'Broadcast-grade transit hide and seek game across 70 Hong Kong MTR stations, featuring AI Referee, curses, radar questions, and 500m proximity breach.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen selection:bg-primary/30 selection:text-white`}>
        <GameProvider>
          <AppShell>
            {children}
          </AppShell>
          <Toaster />
        </GameProvider>
      </body>
    </html>
  );
}
