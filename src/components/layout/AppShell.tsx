
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, ShieldCheck, Search, Eye, ScrollText, Trophy, Menu, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GAME_TITLE, NAVIGATION_ITEMS } from "@/lib/constants";
import { useGameContext } from "@/hooks/useGameContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/seeker", label: "Seeker", icon: Search },
  { href: "/hider", label: "Hider", icon: Eye },
  { href: "/rules", label: "Rules", icon: ScrollText },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isMobile, soundEnabled, toggleSound } = useGameContext();


  const sidebarContent = (
    <ScrollArea className="h-full py-4 px-2">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-lg font-semibold tracking-tight text-primary">
            {GAME_TITLE}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleSound}
            title={soundEnabled ? "Sound Effects ON (Click to Mute)" : "Sound Effects OFF (Click to Enable)"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            <span className="sr-only">Toggle Sound</span>
          </Button>
        </div>
        <Separator className="my-4 bg-sidebar-border" />
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                pathname === item.href ? 
                "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90" :
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    const mobileBottomItems = [
      { href: "/", label: "Home", icon: Home },
      { href: "/seeker", label: "Seeker", icon: Search },
      { href: "/hider", label: "Hider", icon: Eye },
      { href: "/admin", label: "Admin", icon: ShieldCheck },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card/95 backdrop-blur-md px-3 sm:px-6 shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-primary">
              MTR HIDE & SEEK
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={toggleSound}
              title={soundEnabled ? "Sound ON" : "Sound OFF"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              <span className="sr-only">Toggle Sound</span>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Mobile Page Body */}
        <main className="flex-1 p-3 sm:p-6 max-w-full overflow-x-hidden">{children}</main>

        {/* Mobile Thumb-Friendly Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-2 py-1 flex items-center justify-around shadow-2xl safe-area-inset-bottom">
          {mobileBottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition-all select-none min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:scale-90"
                )}
              >
                <div className={cn("p-1 rounded-full transition-colors", isActive && "bg-primary/15")}>
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/leaderboard"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition-all select-none min-w-[60px]",
              pathname === "/leaderboard"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground active:scale-90"
            )}
          >
            <div className={cn("p-1 rounded-full transition-colors", pathname === "/leaderboard" && "bg-primary/15")}>
              <Trophy className={cn("h-4 w-4", pathname === "/leaderboard" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span>Scores</span>
          </Link>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr] bg-background">
      <aside className="sticky top-0 h-screen border-r bg-sidebar text-sidebar-foreground border-sidebar-border">
        {sidebarContent}
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
