"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, ShieldCheck, Search, Eye, ScrollText, Trophy, Menu, Volume2, VolumeX, FlaskConical, Train } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useGameContext } from "@/hooks/useGameContext";
import { cn } from "@/lib/utils";
import { QuickRulesDrawer } from "@/components/game/QuickRulesDrawer";
import { TestingScenarioLab } from "@/components/game/TestingScenarioLab";
import { useState } from "react";
import { triggerHaptic } from "@/lib/haptics";

const navItems = [
  { href: "/", label: "Home", icon: Home, accentColor: "hover:text-blue-400" },
  { href: "/seeker", label: "Seeker HQ", icon: Search, accentColor: "hover:text-sky-400" },
  { href: "/hider", label: "Hider Safehouse", icon: Eye, accentColor: "hover:text-emerald-400" },
  { href: "/admin", label: "Admin Command", icon: ShieldCheck, accentColor: "hover:text-purple-400" },
  { href: "/rules", label: "Official Rules", icon: ScrollText, accentColor: "hover:text-amber-400" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, accentColor: "hover:text-yellow-400" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isMobile, soundEnabled, toggleSound, currentRound } = useGameContext();
  const [isTestingLabOpen, setIsTestingLabOpen] = useState(false);

  const isLive = currentRound && (currentRound.status === 'hiding-phase' || currentRound.status === 'seeking-phase');

  const sidebarContent = (
    <ScrollArea className="h-full py-4 px-3">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="px-2 pt-1 pb-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="group block">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <Train className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-tight text-white uppercase leading-none font-mono flex items-center gap-1.5">
                    Jet Lag <span className="text-sky-400">HK</span>
                  </h1>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">MTR Hide & Seek</span>
                </div>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              onClick={() => {
                triggerHaptic('light');
                toggleSound();
              }}
              title={soundEnabled ? "Sound ON (Click to mute)" : "Sound OFF (Click to unmute)"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </Button>
          </div>

          {/* MTR Subway Line Color Ribbon */}
          <div className="flex items-center gap-1.5 mt-3 px-0.5">
            <span className="h-1 flex-1 rounded-full bg-[#007DC5]" title="Island Line" />
            <span className="h-1 flex-1 rounded-full bg-[#E2231A]" title="Tsuen Wan Line" />
            <span className="h-1 flex-1 rounded-full bg-[#00AB4E]" title="Kwun Tong Line" />
            <span className="h-1 flex-1 rounded-full bg-[#F38B00]" title="Tung Chung Line" />
            <span className="h-1 flex-1 rounded-full bg-[#53B7E8]" title="East Rail Line" />
            <span className="h-1 flex-1 rounded-full bg-[#923011]" title="Tuen Ma Line" />
          </div>
        </div>

        {/* Live Indicator or Ready Badge */}
        <div className="px-1">
          {isLive ? (
            <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-tight">Round {currentRound.roundNumber} Live</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] font-mono">
                {currentRound.status === 'seeking-phase' ? 'Seeking' : 'Hiding'}
              </Badge>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Status: Standby</span>
              <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-700">Ready</Badge>
            </div>
          )}
        </div>

        {/* Utility Quick Actions */}
        <div className="space-y-1.5 px-1">
          <QuickRulesDrawer />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              triggerHaptic('medium');
              setIsTestingLabOpen(true);
            }}
            className="w-full text-xs font-bold text-purple-300 border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 flex items-center justify-center gap-1.5 h-8 rounded-xl shadow-xs transition-all"
          >
            <FlaskConical className="h-3.5 w-3.5 text-purple-400" />
            Testing Scenario Lab
          </Button>
        </div>

        <Separator className="bg-slate-800/80 my-2" />

        {/* Navigation Items */}
        <nav className="space-y-1 px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.label}
                variant="ghost"
                onClick={() => triggerHaptic('light')}
                className={cn(
                  "w-full justify-start text-xs font-bold h-10 rounded-xl transition-all",
                  isActive
                    ? "bg-slate-800 text-white shadow-sm border border-slate-700/80"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
                asChild
              >
                <Link href={item.href} className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive ? "bg-primary text-white" : "bg-slate-900 text-slate-400"
                  )}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    const mobileBottomItems = [
      { href: "/", label: "Home", icon: Home },
      { href: "/seeker", label: "Seeker", icon: Search },
      { href: "/hider", label: "Hider", icon: Eye },
      { href: "/admin", label: "Admin", icon: ShieldCheck },
      { href: "/leaderboard", label: "Scores", icon: Trophy },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <TestingScenarioLab
          isOpen={isTestingLabOpen}
          onClose={() => setIsTestingLabOpen(false)}
        />
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 shadow-md">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Train className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white font-mono uppercase">
              Jet Lag: <span className="text-sky-400">HK</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-purple-400 hover:bg-purple-950/40"
              onClick={() => {
                triggerHaptic('medium');
                setIsTestingLabOpen(true);
              }}
              title="Testing Studio"
            >
              <FlaskConical className="h-4 w-4" />
            </Button>
            <QuickRulesDrawer />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400"
              onClick={() => {
                triggerHaptic('light');
                toggleSound();
              }}
              title={soundEnabled ? "Sound ON" : "Sound OFF"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 bg-slate-950 text-slate-100 border-slate-800">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Mobile Page Body */}
        <main className="flex-1 p-3 sm:p-6 max-w-full overflow-x-hidden">{children}</main>

        {/* Mobile Thumb-Friendly Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-inset-bottom">
          {mobileBottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => triggerHaptic('light')}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all select-none min-w-[56px]",
                  isActive
                    ? "text-sky-400 font-extrabold"
                    : "text-slate-400 hover:text-slate-200 active:scale-90"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all mb-0.5",
                  isActive ? "bg-sky-500/20 text-sky-400 shadow-sm" : "text-slate-400"
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-background">
      <TestingScenarioLab
        isOpen={isTestingLabOpen}
        onClose={() => setIsTestingLabOpen(false)}
      />
      <aside className="sticky top-0 h-screen border-r border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
        {sidebarContent}
      </aside>
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
