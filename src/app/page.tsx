
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Search, Eye, Users, ScrollText, Trophy, Radio } from 'lucide-react';
import { GAME_TITLE } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { useGameContext } from '@/hooks/useGameContext';
import { MatchTimeline } from '@/components/game/MatchTimeline';
import { Badge } from '@/components/ui/badge';

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
  const { currentRound, eliminatedStationIds } = useGameContext();
  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`Welcome to ${GAME_TITLE}!`}
        description="Embark on an epic game of hide and seek in a bustling city environment." // Updated description
        icon={Users}
      />

      {currentRound && (currentRound.status === 'hiding-phase' || currentRound.status === 'seeking-phase') && (
        <Card className="mb-10 border-primary/40 bg-gradient-to-r from-primary/5 via-card to-accent/5 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Radio className="h-5 w-5 text-emerald-500" />
                  Round {currentRound.roundNumber} is Live!
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentRound.status === 'seeking-phase' ? "default" : "secondary"}>
                  {currentRound.status === 'seeking-phase' ? '🎯 Seeking Phase' : '⏱️ Hiding Phase'}
                </Badge>
                {currentRound.isEndgameBreached && (
                  <Badge variant="destructive" className="animate-pulse">
                    🚨 500m Breach Siren Active
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription>
              Hiding Team: <strong>{currentRound.hidingTeam?.name || 'Hiders'}</strong> | Remaining Candidate Stations: <strong>{70 - (eliminatedStationIds?.length || 0)}/70</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <MatchTimeline events={currentRound.timeline} />
          </CardContent>
        </Card>
      )}

      {currentRound && currentRound.status === 'completed' && currentRound.timeline && currentRound.timeline.length > 0 && (
        <div className="mb-10">
          <MatchTimeline events={currentRound.timeline} />
        </div>
      )}

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
