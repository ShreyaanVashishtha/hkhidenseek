
"use client";

import { useGameContext } from "@/hooks/useGameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Clock } from "lucide-react";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function LeaderboardPage() {
  const { teams, gameHistory } = useGameContext();

  // Calculate longest hiding time for each team from game history
  // This is a simplified representation. A more robust solution would track this per round.
  const leaderboardData = teams.map(team => {
    // For this example, we use the hidingTimeSeconds stored on the team,
    // which admin/game logic should update after each round.
    // A more complex calculation might iterate gameHistory.
    return {
      id: team.id,
      name: team.name,
      longestHidingTime: team.hidingTimeSeconds, // This should be the max across all rounds played as hider
      players: team.players.map(p => p.name).join(", "),
    };
  }).sort((a, b) => b.longestHidingTime - a.longestHidingTime);


  return (
    <div className="space-y-8">
      <PageHeader 
        title="Leaderboard"
        description="See which team has mastered the art of hiding!"
        icon={Trophy}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Longest Hiding Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardData.length === 0 ? (
            <p className="text-muted-foreground">No game data yet. Play some rounds to see the leaderboard!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead className="text-right">Longest Time Hidden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((team, index) => (
                  <TableRow key={team.id} className={index === 0 ? "bg-primary/10" : ""}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{team.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{team.players || 'N/A'}</TableCell>
                    <TableCell className="text-right font-semibold">{formatTime(team.longestHidingTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Potential future section for team coins or other stats */}
      {/* 
      <Card>
        <CardHeader>
          <CardTitle>Team Stats (Current Round)</CardTitle>
        </CardHeader>
        <CardContent>
          // Display team coins for seeking teams, etc.
        </CardContent>
      </Card>
      */}
    </div>
  );
}
