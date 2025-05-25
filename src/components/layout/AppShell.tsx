
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, ShieldCheck, Search, Eye, ScrollText, Trophy, Menu } from "lucide-react";
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
  const { isMobile } = useGameContext();


  const sidebarContent = (
    <ScrollArea className="h-full py-4 px-2">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary">
          {GAME_TITLE}
        </h2>
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
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-primary">
            {GAME_TITLE}
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
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
