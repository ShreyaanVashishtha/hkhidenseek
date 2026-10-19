"use client";

import { useGameContext } from "@/hooks/useGameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Clock, Medal, Zap, Users, ShieldAlert, CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import Image from "next/image";

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export default function LeaderboardPage() {
  const { teams, gameHistory, seedSimulatedMatch } = useGameContext();

  const leaderboardData = teams.map(team => {
    return {
      id: team.id,
      name: team.name,
      longestHidingTime: team.hidingTimeSeconds || 0,
      players: team.players.map(p => p.name).join(", "),
      isHiding: team.isHiding,
      isSeeking: team.isSeeking,
    };
  }).sort((a, b) => b.longestHidingTime - a.longestHidingTime);

  const topTeam = leaderboardData[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <PageHeader 
        title="Season Leaderboard"
        description="Official match rankings: teams ranked by total hiding survival time across Hong Kong."
        icon={Trophy}
        badge="Official Standings"
      />

      {/* Podium Champion Showcase */}
      {topTeam && topTeam.longestHidingTime > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 border border-amber-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] font-mono uppercase px-2 py-0.5">
                  1st Place
                </Badge>
                <span className="text-xs font-mono text-amber-300/80">Season Leader</span>
              </div>
              <h2 className="text-2xl font-black text-white font-mono uppercase tracking-tight mt-1">
                {topTeam.name}
              </h2>
              <p className="text-xs text-slate-300">
                Roster: {topTeam.players || "Squad members"}
              </p>
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 self-stretch sm:self-center flex flex-col justify-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Longest Survival</span>
            <span className="text-3xl font-black text-amber-400 font-digital">
              {formatTime(topTeam.longestHidingTime)}
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <Card className="glass-card border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-white font-mono uppercase">
              <Clock className="h-4 w-4 text-sky-400" />
              Team Survival Times
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono text-slate-400 border-slate-700">
              {leaderboardData.length} Teams Registered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboardData.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <p className="text-sm text-slate-400">No match records yet. Spin up a match or play rounds to track standings!</p>
              <Button
                onClick={() => {
                  triggerHaptic('success');
                  seedSimulatedMatch({ phase: 'seeking-phase' });
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md"
              >
                <Zap className="h-3.5 w-3.5 mr-1" /> Quick-Start Test Match
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-[70px] text-xs font-mono uppercase text-slate-400">Rank</TableHead>
                  <TableHead className="text-xs font-mono uppercase text-slate-400">Team Name</TableHead>
                  <TableHead className="text-xs font-mono uppercase text-slate-400">Squad Players</TableHead>
                  <TableHead className="text-right text-xs font-mono uppercase text-slate-400">Hiding Record</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((team, index) => {
                  const isFirst = index === 0 && team.longestHidingTime > 0;
                  const isSecond = index === 1 && team.longestHidingTime > 0;
                  const isThird = index === 2 && team.longestHidingTime > 0;

                  return (
                    <TableRow 
                      key={team.id} 
                      className={`border-slate-800/80 hover:bg-slate-800/40 transition-colors ${
                        isFirst ? "bg-amber-500/5 font-semibold" : ""
                      }`}
                    >
                      <TableCell className="font-mono text-sm">
                        {isFirst ? (
                          <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <Medal className="h-4 w-4" /> #1
                          </span>
                        ) : isSecond ? (
                          <span className="flex items-center gap-1 text-slate-300 font-bold">
                            <Medal className="h-4 w-4" /> #2
                          </span>
                        ) : isThird ? (
                          <span className="flex items-center gap-1 text-amber-600 font-bold">
                            <Medal className="h-4 w-4" /> #3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-white text-sm">
                        {team.name}
                        {team.isHiding && (
                          <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px]">
                            Current Hider
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{team.players || 'N/A'}</TableCell>
                      <TableCell className="text-right font-digital font-bold text-white text-sm">
                        {team.longestHidingTime > 0 ? (
                          formatTime(team.longestHidingTime)
                        ) : (
                          <span className="text-slate-500 font-mono font-normal text-xs">Unranked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed Rounds Archive (if available) */}
      {gameHistory && gameHistory.length > 0 && (
        <Card className="glass-card border-slate-800 shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white font-mono uppercase">
              Completed Round Episodes ({gameHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {gameHistory.map((round, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-sky-400">Round {round.roundNumber}</span>
                  <h4 className="text-sm font-bold text-white">Hider: {round.hidingTeam?.name || 'Hiders'}</h4>
                  <p className="text-xs text-slate-400">
                    Tagged by: {round.seekingTeams?.map(st => st.name).join(', ') || 'Seekers'}
                  </p>
                </div>
                {round.tagEvent?.photoUrl && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-700 relative shrink-0">
                    <Image src={round.tagEvent.photoUrl} alt="Tag proof" fill className="object-cover" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
