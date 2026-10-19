"use client";

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
  Train 
} from 'lucide-react';
import { useGameContext } from '@/hooks/useGameContext';
import { MatchTimeline } from '@/components/game/MatchTimeline';
import { QuickRulesDrawer } from '@/components/game/QuickRulesDrawer';
import { triggerHaptic } from '@/lib/haptics';

export default function HomePage() {
  const { currentRound, eliminatedStationIds, teams } = useGameContext();
  const isRoundActive = currentRound && (currentRound.status === 'hiding-phase' || currentRound.status === 'seeking-phase');
  const remainingCandidates = 70 - (eliminatedStationIds?.length || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d1527] to-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-xs font-mono font-bold px-3 py-1 flex items-center gap-1.5">
              <Train className="h-3.5 w-3.5" />
              Hong Kong MTR Edition
            </Badge>
            <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs font-mono font-bold px-3 py-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Clue Referee
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase leading-none">
            Jet Lag: <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300">Hong Kong</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            The ultimate game of hide and seek across <strong>70 MTR subway stations</strong>. 
            Hiders lock in a 500m safe zone and deploy curse dice, while seekers ride the rails, draw challenge cards, and ask precision radar clues.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <QuickRulesDrawer />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3 rounded-full border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
              onClick={() => triggerHaptic('light')}
            >
              <Link href="/leaderboard">
                <Trophy className="h-3.5 w-3.5 mr-1 text-amber-400" />
                Scores & History
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

      {/* Live Match Radar Banner (if game active) */}
      {isRoundActive && (
        <Card className="border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-[#0c1424] to-emerald-950/30 shadow-xl overflow-hidden animate-in fade-in">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
                    Round {currentRound.roundNumber} is Currently Live!
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Hiding: <strong>{currentRound.hidingTeam?.name || 'Hiders'}</strong> • Remaining Candidates: <strong>{remainingCandidates}/70 Stations</strong>
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
            <p className="text-xs text-slate-300">
              The game is underway! Jump directly into your active role to track locations or answer questions.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button asChild className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
                <Link href="/seeker" onClick={() => triggerHaptic('light')}>
                  Resume as Seeker
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto border-emerald-600 text-emerald-400 hover:bg-emerald-950/40 font-bold text-xs h-9 px-4 rounded-xl">
                <Link href="/hider" onClick={() => triggerHaptic('light')}>
                  Resume as Hider
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Launchpad Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Choose Your Role</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SEEKER CARD */}
          <Card className="bg-gradient-to-b from-sky-950/40 via-card to-card border-sky-500/30 hover:border-sky-500/60 transition-all flex flex-col justify-between shadow-lg group">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Search className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors">
                Seeker HQ
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1">
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
          <Card className="bg-gradient-to-b from-emerald-950/40 via-card to-card border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col justify-between shadow-lg group">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Eye className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Hider Safehouse
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1">
                Choose your station, lock in your 500m territory, answer seeker questions to accumulate coins, and roll <strong>Curse Dice</strong> to freeze or blind the hunters.
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
          <Card className="bg-gradient-to-b from-purple-950/40 via-card to-card border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col justify-between shadow-lg group">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Fingerprint className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                <span>Admin Command</span>
                <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/40">
                  Passkey
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 leading-relaxed pt-1">
                Match control center. Start and end rounds, shuffle teams, log GPS breach events, and log in with native <strong>Face ID / Touch ID</strong> biometrics.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button asChild variant="outline" className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-950/40 font-bold text-xs h-10 rounded-xl">
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Match Event Feed</span>
          </h2>
          <MatchTimeline events={currentRound.timeline} />
        </section>
      )}
    </div>
  );
}
