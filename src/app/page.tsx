"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Search, 
  Eye, 
  Users, 
  ScrollText, 
  Trophy, 
  Radio, 
  MapPin, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Fingerprint, 
  Compass, 
  Shield, 
  Train,
  FlaskConical,
  Play,
  KeyRound,
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';
import { useGameContext } from '@/hooks/useGameContext';
import { MatchTimeline } from '@/components/game/MatchTimeline';
import { QuickRulesDrawer } from '@/components/game/QuickRulesDrawer';
import { TestingScenarioLab } from '@/components/game/TestingScenarioLab';
import { triggerHaptic } from '@/lib/haptics';

export default function HomePage() {
  const { 
    currentRound, 
    eliminatedStationIds, 
    teams, 
    seedSimulatedMatch,
    adminPin,
    hiderPin,
    seekerPin
  } = useGameContext();
  const [isTestingLabOpen, setIsTestingLabOpen] = useState(false);

  const isRoundActive = currentRound && (currentRound.status === 'hiding-phase' || currentRound.status === 'seeking-phase');
  const remainingCandidates = 70 - (eliminatedStationIds?.length || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Testing & Simulation Studio Modal */}
      <TestingScenarioLab
        isOpen={isTestingLabOpen}
        onClose={() => setIsTestingLabOpen(false)}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl text-white">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/40 text-xs font-mono font-bold px-3 py-1 flex items-center gap-1.5 shadow-sm">
              <Train className="h-3.5 w-3.5" />
              Hong Kong MTR Edition
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/40 text-xs font-mono font-bold px-3 py-1 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Gemini Vision AI Referee
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-xs font-mono font-bold px-3 py-1 flex items-center gap-1.5 shadow-sm">
              <Radio className="h-3.5 w-3.5" />
              Live 500m Breach Radar
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase leading-none font-mono">
            Jet Lag:{" "}
            <span 
              className="bg-gradient-to-r from-sky-400 via-teal-300 to-amber-300 bg-clip-text text-transparent inline-block font-black"
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Hong Kong
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            The broadcast game of hide and seek across <strong>70 MTR subway stations</strong>. 
            Hiders lock in a 500m safe zone and deploy curse dice, while seekers ride the rails, draw challenge cards with the AI referee, and cross off candidates.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!isRoundActive && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  triggerHaptic('success');
                  seedSimulatedMatch({ phase: 'seeking-phase' });
                }}
                className="h-9 text-xs px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Quick-Start Match (1-Click)
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => {
                triggerHaptic('medium');
                setIsTestingLabOpen(true);
              }}
              className="h-9 text-xs px-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-md flex items-center gap-1.5"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Testing Scenario Lab
            </Button>

            <QuickRulesDrawer />

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 text-xs px-3.5 rounded-full border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white"
              onClick={() => triggerHaptic('light')}
            >
              <Link href="/leaderboard">
                <Trophy className="h-3.5 w-3.5 mr-1 text-amber-400" />
                Leaderboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative Grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      {/* Security & Credentials Quick-Ref Bar */}
      <div className="p-3.5 rounded-2xl glass-card border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-bold text-white uppercase tracking-wider font-mono">Role Credentials:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-300 font-mono">
            <strong>Seeker:</strong> {seekerPin ? seekerPin : 'Open (or 1111)'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
            <strong>Hider:</strong> {hiderPin ? hiderPin : 'Open (or 0000)'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 font-mono">
            <strong>Admin:</strong> {adminPin || '113221'} (or 1234)
          </span>
        </div>
      </div>

      {/* Live Match Radar Banner (if game active) */}
      {isRoundActive && (
        <Card className="border-sky-500/40 bg-gradient-to-r from-sky-950/90 via-slate-950 to-emerald-950/80 text-white shadow-xl overflow-hidden animate-in fade-in">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-mono">
                    <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
                    Round {currentRound.roundNumber} is Currently Live!
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300 mt-0.5">
                    Hiding: <strong className="text-emerald-300">{currentRound.hidingTeam?.name || 'Hiders'}</strong> • Remaining Candidates: <strong className="text-sky-300">{remainingCandidates}/70 Stations</strong>
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={currentRound.status === 'seeking-phase' ? "default" : "secondary"} className="text-xs font-semibold px-2.5 py-1">
                  {currentRound.status === 'seeking-phase' ? '🎯 Seeking Phase' : '⏱️ Hiding Phase'}
                </Badge>
                {currentRound.isEndgameBreached && (
                  <Badge variant="destructive" className="animate-pulse text-xs px-2.5 py-1 font-bold">
                    🚨 500m Breach Siren
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-200">
              The match is active across the MTR. Jump directly into your active role or view the radar deduction map.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button asChild className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
                <Link href="/seeker" onClick={() => triggerHaptic('light')}>
                  Seeker HQ <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto border-emerald-500 text-emerald-300 hover:bg-emerald-950/60 font-bold text-xs h-9 px-4 rounded-xl">
                <Link href="/hider" onClick={() => triggerHaptic('light')}>
                  Hider Safehouse <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Launchpad Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <span>Choose Operational Role</span>
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsTestingLabOpen(true)}
            className="text-xs font-bold text-purple-400 hover:bg-purple-500/10"
          >
            <FlaskConical className="h-3.5 w-3.5 mr-1" /> Open Test Lab
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* SEEKER CARD */}
          <Card className="glass-card border-slate-800 hover:border-sky-500/60 transition-all flex flex-col justify-between shadow-xl group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Search className="h-6 w-6" />
                </div>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-mono">
                  PIN: {seekerPin ? seekerPin : 'Open (or 1111)'}
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-white group-hover:text-sky-400 transition-colors uppercase font-mono">
                Seeker HQ
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1 font-normal">
                Hunt down the hiders across the MTR. Complete challenge cards with the <strong>Gemini AI Referee</strong>, ask Radar & Thermometer clues, and cross off candidate stations.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button asChild className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-10 rounded-xl shadow-md">
                <Link href="/seeker" onClick={() => triggerHaptic('light')} className="flex items-center justify-center gap-2">
                  Launch Seeker View <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* HIDER CARD */}
          <Card className="glass-card border-slate-800 hover:border-emerald-500/60 transition-all flex flex-col justify-between shadow-xl group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Eye className="h-6 w-6" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
                  PIN: {hiderPin ? hiderPin : 'Open (or 0000)'}
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors uppercase font-mono">
                Hider Safehouse
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1 font-normal">
                Choose your station, lock in your 500m territory, answer seeker questions to accumulate coins, and deploy <strong>Curse Dice</strong> to freeze or blind the hunters.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl shadow-md">
                <Link href="/hider" onClick={() => triggerHaptic('light')} className="flex items-center justify-center gap-2">
                  Launch Hider View <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* ADMIN CARD */}
          <Card className="glass-card border-slate-800 hover:border-purple-500/60 transition-all flex flex-col justify-between shadow-xl group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-mono">
                  PIN: {adminPin || '113221'} (or 1234)
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-white group-hover:text-purple-400 transition-colors uppercase font-mono flex items-center gap-2">
                <span>Admin Command</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1 font-normal">
                Match referee center. Start and end rounds, shuffle teams, log GPS breach events, and log in with native <strong>Face ID / Touch ID</strong> biometrics.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button asChild variant="outline" className="w-full border-purple-500/40 text-purple-300 hover:bg-purple-500/20 font-bold text-xs h-10 rounded-xl">
                <Link href="/admin" onClick={() => triggerHaptic('light')} className="flex items-center justify-center gap-2">
                  Open Admin Panel <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Match Timeline Feed (if available) */}
      {currentRound?.timeline && currentRound.timeline.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase font-mono">
            <span>Match Event Feed</span>
          </h2>
          <MatchTimeline events={currentRound.timeline} />
        </section>
      )}
    </div>
  );
}
