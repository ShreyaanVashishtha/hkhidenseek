
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameContext } from "@/hooks/useGameContext";
import type { Player, Team } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck, Users, UserPlus, Play, StopCircle, Shuffle, Trash2, Map, Forward, ZapOff, KeyRound, LogOut } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CURSE_DICE_OPTIONS } from '@/lib/constants';
import { PinProtectPage } from '@/components/auth/PinProtectPage';

function AdminPageContent() {
  const { 
    players, 
    teams, 
    addPlayer, 
    createTeam, 
    assignPlayerToTeam,
    removePlayerFromTeam,
    updateTeamRole,
    currentRound,
    startNewRound,
    startSeekingPhase,
    endCurrentRound,
    mtrMapUrl,
    setMtrMapUrl,
    clearActiveCurse,
    adminPin, hiderPin, seekerPin,
    setAdminPin, setHiderPin, setSeekerPin,
    logoutAdmin, logoutHider, logoutSeeker
  } = useGameContext();
  const { toast } = useToast();

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [mapUrlInput, setMapUrlInput] = useState(mtrMapUrl || "");

  const [adminPinInput, setAdminPinInput] = useState("");
  const [hiderPinInput, setHiderPinInput] = useState("");
  const [seekerPinInput, setSeekerPinInput] = useState("");

  useEffect(() => {
    setMapUrlInput(mtrMapUrl || "");
  }, [mtrMapUrl]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName("");
      toast({ title: "Player Added", description: `${newPlayerName} has been added.` });
    } else {
      toast({ title: "Error", description: "Player name cannot be empty.", variant: "destructive" });
    }
  };

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      createTeam(newTeamName.trim());
      setNewTeamName("");
      toast({ title: "Team Created", description: `${newTeamName} has been created.` });
    } else {
      toast({ title: "Error", description: "Team name cannot be empty.", variant: "destructive" });
    }
  };

  const handleAssignPlayer = () => {
    if (selectedPlayerId && selectedTeamId) {
      assignPlayerToTeam(selectedPlayerId, selectedTeamId);
      toast({ title: "Player Assigned", description: `Player assigned to team.` });
      setSelectedPlayerId(undefined);
    } else {
      toast({ title: "Error", description: "Please select a player and a team.", variant: "destructive" });
    }
  };

  const handleRemovePlayer = (playerId: string, teamId: string) => {
    removePlayerFromTeam(playerId, teamId);
    toast({ title: "Player Removed", description: `Player removed from team.` });
  };

  const handleSetTeamRole = (teamId: string, role: "hider" | "seeker" | "none") => {
    const isHiding = role === "hider";
    const isSeeking = role === "seeker";
    
    if (isHiding && teams.some(t => t.isHiding && t.id !== teamId)) {
      toast({ title: "Error", description: "Only one team can be the hider.", variant: "destructive" });
      return;
    }
    updateTeamRole(teamId, isHiding, isSeeking);
    toast({ title: "Role Updated", description: `Team role set to ${role}.` });
  };

  const handleStartRound = () => {
    const hidingTeam = teams.find(t => t.isHiding);
    const seekingTeamsCount = teams.filter(t => t.isSeeking).length;

    if (!hidingTeam) {
      toast({ title: "Cannot Start Round", description: "A hiding team must be designated.", variant: "destructive" });
      return;
    }
    if (seekingTeamsCount === 0) {
      toast({ title: "Cannot Start Round", description: "At least one seeking team must be designated.", variant: "destructive" });
      return;
    }
    startNewRound();
    toast({ title: "Round Started!", description: `Round ${currentRound ? currentRound.roundNumber + 1 : 1} has begun. Hiding phase active.` });
  };

  const handleForceStartSeekingPhase = () => {
    if (currentRound && currentRound.status === 'hiding-phase') {
      startSeekingPhase();
      toast({ title: "Seeking Phase Started!", description: "The seeking phase has been manually started." });
    } else {
      toast({ title: "Error", description: "Cannot start seeking phase. Ensure a round is active and in the hiding phase.", variant: "destructive" });
    }
  };
  
  const handleEndRound = () => {
    if (currentRound) {
      endCurrentRound();
      toast({ title: "Round Ended", description: `Round ${currentRound.roundNumber} has finished.` });
    } else {
      toast({ title: "Error", description: "No active round to end.", variant: "destructive" });
    }
  };

  const handleSetMapUrl = () => {
    if (mapUrlInput.trim()) {
      setMtrMapUrl(mapUrlInput.trim());
      toast({ title: "MTR Map Updated", description: "The MTR map URL has been set." });
    } else {
      toast({ title: "Error", description: "Map URL cannot be empty.", variant: "destructive" });
    }
  };

  const handleClearCurse = () => {
    if (currentRound && currentRound.activeCurse) {
      clearActiveCurse();
      toast({ title: "Curse Cleared", description: "The active curse has been cleared by admin." });
    } else {
      toast({ title: "Error", description: "No active curse to clear.", variant: "destructive" });
    }
  };

  const handleSetAdminPin = () => {
    if (adminPinInput.trim()) setAdminPin(adminPinInput.trim());
    else toast({ title: "Error", description: "Admin PIN cannot be empty.", variant: "destructive"});
    setAdminPinInput("");
  };
  const handleSetHiderPin = () => {
    if (hiderPinInput.trim()) setHiderPin(hiderPinInput.trim());
    else toast({ title: "Error", description: "Hider PIN cannot be empty.", variant: "destructive"});
    setHiderPinInput("");
  };
  const handleSetSeekerPin = () => {
    if (seekerPinInput.trim()) setSeekerPin(seekerPinInput.trim());
    else toast({ title: "Error", description: "Seeker PIN cannot be empty.", variant: "destructive"});
    setSeekerPinInput("");
  };
  
  const activeCurseDetails = currentRound?.activeCurse 
    ? CURSE_DICE_OPTIONS.find(c => c.number === currentRound.activeCurse!.curseId)
    : null;

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Panel" description="Manage game settings, players, teams, rounds, and access PINs." icon={ShieldCheck} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound /> Access Control & PIN Management</CardTitle>
          <CardDescription>Set or update PINs for accessing different game panels. Clear PINs by setting an empty value (not recommended for Admin PIN if game is public).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="admin-pin">Admin Panel PIN (current: {adminPin ? "Set" : "Not Set"})</Label>
            <div className="flex gap-2">
              <Input id="admin-pin" type="password" value={adminPinInput} onChange={(e) => setAdminPinInput(e.target.value)} placeholder="Enter new Admin PIN" />
              <Button onClick={handleSetAdminPin}>Set Admin PIN</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hider-pin">Hider Panel PIN (current: {hiderPin ? "Set" : "Not Set"})</Label>
            <div className="flex gap-2">
              <Input id="hider-pin" type="password" value={hiderPinInput} onChange={(e) => setHiderPinInput(e.target.value)} placeholder="Enter new Hider PIN" />
              <Button onClick={handleSetHiderPin}>Set Hider PIN</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seeker-pin">Seeker Panel PIN (current: {seekerPin ? "Set" : "Not Set"})</Label>
            <div className="flex gap-2">
              <Input id="seeker-pin" type="password" value={seekerPinInput} onChange={(e) => setSeekerPinInput(e.target.value)} placeholder="Enter new Seeker PIN" />
              <Button onClick={handleSetSeekerPin}>Set Seeker PIN</Button>
            </div>
          </div>
          <Separator />
           <CardDescription>Force logout users from their authenticated sessions (e.g., for testing PIN entry).</CardDescription>
          <div className="flex flex-wrap gap-2">
             <Button variant="outline" onClick={logoutAdmin} className="flex items-center gap-2"><LogOut /> Logout Admin Session</Button>
             <Button variant="outline" onClick={logoutHider} className="flex items-center gap-2"><LogOut /> Logout Hider Session</Button>
             <Button variant="outline" onClick={logoutSeeker} className="flex items-center gap-2"><LogOut /> Logout Seeker Session</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus /> Manage Players</CardTitle>
            <CardDescription>Add new players to the game.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-player-name">New Player Name</Label>
              <Input 
                id="new-player-name" 
                value={newPlayerName} 
                onChange={(e) => setNewPlayerName(e.target.value)} 
                placeholder="Enter player name" 
              />
            </div>
            <Button onClick={handleAddPlayer} className="w-full">Add Player</Button>
            <Separator />
            <h4 className="font-medium text-sm">Available Players ({players.length})</h4>
            <ScrollArea className="h-32">
              <ul className="space-y-1 text-sm">
                {players.map(player => (
                  <li key={player.id} className="p-2 bg-muted/50 rounded-md">{player.name}</li>
                ))}
                {players.length === 0 && <li className="text-muted-foreground">No players added yet.</li>}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users /> Manage Teams</CardTitle>
            <CardDescription>Create teams and assign players.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-team-name">New Team Name</Label>
              <Input 
                id="new-team-name" 
                value={newTeamName} 
                onChange={(e) => setNewTeamName(e.target.value)} 
                placeholder="Enter team name"
              />
            </div>
            <Button onClick={handleCreateTeam} className="w-full">Create Team</Button>
            <Separator />
             <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="select-player">Select Player</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger id="select-player"><SelectValue placeholder="Choose player" /></SelectTrigger>
                  <SelectContent>
                    {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="select-team">Select Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger id="select-team"><SelectValue placeholder="Choose team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAssignPlayer} className="w-full" disabled={!selectedPlayerId || !selectedTeamId}>Assign Player to Team</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shuffle /> Team Configuration & Roles</CardTitle>
          <CardDescription>View teams, their members, and assign roles for the current round.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {teams.length === 0 && <p className="text-muted-foreground">No teams created yet.</p>}
          {teams.map(team => (
            <Card key={team.id} className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <div className="text-xs">
                  Role: {team.isHiding ? "Hider" : team.isSeeking ? "Seeker" : "None"} | Coins: {team.coins} | Curses Used (Hider): {team.cursesUsed}
                </div>
              </CardHeader>
              <CardContent className="py-2">
                <h5 className="font-medium text-sm mb-1">Players:</h5>
                {team.players.length === 0 && <p className="text-xs text-muted-foreground">No players assigned.</p>}
                <ul className="text-xs space-y-1">
                  {team.players.map(player => (
                    <li key={player.id} className="flex justify-between items-center p-1 bg-muted/30 rounded">
                      {player.name}
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemovePlayer(player.id, team.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-2 flex gap-2">
                <Button size="sm" variant={team.isHiding ? "default" : "outline"} onClick={() => handleSetTeamRole(team.id, "hider")}>Set as Hider</Button>
                <Button size="sm" variant={team.isSeeking ? "default" : "outline"} onClick={() => handleSetTeamRole(team.id, "seeker")}>Set as Seeker</Button>
                <Button size="sm" variant={!team.isHiding && !team.isSeeking ? "default" : "outline"} onClick={() => handleSetTeamRole(team.id, "none")}>Set to None</Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Map /> MTR Map Configuration</CardTitle>
            <CardDescription>Set the URL for the MTR map image displayed to hiders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-url">MTR Map Image URL</Label>
              <Input 
                id="map-url" 
                value={mapUrlInput} 
                onChange={(e) => setMapUrlInput(e.target.value)} 
                placeholder="https://example.com/mtr_map.png" 
              />
            </div>
            <Button onClick={handleSetMapUrl} className="w-full">Set Map URL</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Round Management</CardTitle>
          <CardDescription>
            {currentRound ? 
              `Round ${currentRound.roundNumber} is in ${currentRound.status}. ` +
              (currentRound.activeCurse && activeCurseDetails ? 
                `Curse Active: ${activeCurseDetails.name}.` :
                "No active curse.")
            : "No active round."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button 
            onClick={handleStartRound} 
            disabled={!!currentRound} 
            className="flex items-center gap-2"
          >
            <Play /> Start New Round
          </Button>
          <Button 
            onClick={handleForceStartSeekingPhase} 
            disabled={!currentRound || currentRound?.status !== 'hiding-phase'} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Forward /> Force Start Seeking Phase
          </Button>
          <Button 
            onClick={handleClearCurse} 
            disabled={!currentRound || !currentRound.activeCurse} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ZapOff /> Clear Active Curse
          </Button>
          <Button 
            onClick={handleEndRound} 
            disabled={!currentRound} 
            variant="destructive" 
            className="flex items-center gap-2"
          >
            <StopCircle /> End Current Round
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <PinProtectPage role="admin">
      <AdminPageContent />
    </PinProtectPage>
  );
}
