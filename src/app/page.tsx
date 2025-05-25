
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Search, Eye, Users, ScrollText, Trophy } from 'lucide-react';
import { GAME_TITLE } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';

const roleCards = [
  { title: 'Admin Panel', description: 'Manage players, teams, and game rounds.', href: '/admin', icon: ShieldCheck, cta: 'Go to Admin' },
  { title: 'Seeker View', description: 'Join as a seeker to find the hiders.', href: '/seeker', icon: Search, cta: 'Join as Seeker' },
  { title: 'Hider View', description: 'Join as a hider and evade the seekers.', href: '/hider', icon: Eye, cta: 'Join as Hider' },
];

const infoCards = [
  { title: 'Game Rules', description: 'Understand the rules of the game.', href: '/rules', icon: ScrollText, cta: 'View Rules' }, // Updated description
  { title: 'Leaderboard', description: 'Check team scores and hiding times.', href: '/leaderboard', icon: Trophy, cta: 'View Leaderboard' },
];

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`Welcome to ${GAME_TITLE}!`}
        description="Embark on an epic game of hide and seek in a bustling city environment." // Updated description
        icon={Users}
      />

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-primary">Choose Your Role</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roleCards.map((card) => (
            <Card key={card.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <card.icon className="h-8 w-8 text-accent" />
                  <CardTitle className="text-xl">{card.title}</CardTitle>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link href={card.href}>{card.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-primary">Game Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoCards.map((card) => (
            <Card key={card.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <card.icon className="h-8 w-8 text-accent" />
                  <CardTitle className="text-xl">{card.title}</CardTitle>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                  <Link href={card.href}>{card.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
