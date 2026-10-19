
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
import { ShieldCheck, Users, UserPlus, Play, StopCircle, Shuffle, Trash2, Map, Forward, ZapOff, KeyRound, LogOut, Siren, Eye, Radio, Fingerprint, CheckCircle2, FlaskConical } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CURSE_DICE_OPTIONS } from '@/lib/constants';
import { PinProtectPage } from '@/components/auth/PinProtectPage';
import { MTR_STATIONS } from '@/lib/mtrData';
import { MatchTimeline } from '@/components/game/MatchTimeline';
import { Badge } from '@/components/ui/badge';
import { registerAdminPasskey, hasRegisteredAdminPasskey, removeAdminPasskey, isPasskeySupported } from '@/lib/passkeyAuth';
import { TestingScenarioLab } from '@/components/game/TestingScenarioLab';

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
    logoutAdmin, logoutHider, logoutSeeker,
    declareEndgameBreach,
    eliminatedStationIds
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

  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isTestingLabOpen, setIsTestingLabOpen] = useState(false);

  useEffect(() => {
    isPasskeySupported().then(supported => setPasskeySupported(supported));
    setPasskeyRegistered(hasRegisteredAdminPasskey());
  }, []);

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    const result = await registerAdminPasskey("Admin / Referee Device");
    setIsRegisteringPasskey(false);
    if (result.success) {
      setPasskeyRegistered(true);
      toast({
        title: "Passkey Registered!",
        description: "You can now log into the Admin panel using Touch ID / Face ID."
      });
    } else {
      toast({
        title: "Passkey Registration Failed",
        description: result.error || "Could not register biometric passkey.",
        variant: "destructive"
      });
    }
  };

  const handleRemovePasskey = () => {
    removeAdminPasskey();
    setPasskeyRegistered(false);
    toast({
      title: "Passkey Removed",
      description: "Touch ID / Face ID passkey has been removed from this device."
    });
  };

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

  const handleAdminClearCurse = () => {
    if (currentRound && currentRound.activeCurse) {
      clearActiveCurse();
      toast({ title: "Curse Cleared by Admin", description: "The active curse has been cleared." });
    } else {
      toast({ title: "Error", description: "No active curse to clear.", variant: "destructive" });
    }
  };

  const handleSetAdminPin = () => {
    setAdminPin(adminPinInput.trim()); // Context handles empty string for clearing
    setAdminPinInput("");
  };
  const handleSetHiderPin = () => {
    setHiderPin(hiderPinInput.trim());
    setHiderPinInput("");
  };
  const handleSetSeekerPin = () => {
    setSeekerPin(seekerPinInput.trim());
    setSeekerPinInput("");
  };
  
  const activeCurseDetails = currentRound?.activeCurse 
    ? CURSE_DICE_OPTIONS.find(c => c.number === currentRound.activeCurse!.curseId)
    : null;

  return (
    <div className="space-y-8">
      {/* Jet Lag Testing & Simulation Studio Modal */}
      <TestingScenarioLab
        isOpen={isTestingLabOpen}
        onClose={() => setIsTestingLabOpen(false)}
      />

      <PageHeader title="Admin Panel" description="Manage game settings, players, teams, rounds, and access PINs." icon={ShieldCheck} />

      {/* Match Simulator & Feature Testing Studio */}
      <Card className="border-purple-500/40 bg-gradient-to-r from-purple-950/10 via-card to-indigo-950/10 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              Jet Lag Testing & Match Simulation Studio
            </CardTitle>
            <Badge className="bg-purple-600 text-white text-xs font-bold">Dev Sandbox</Badge>
          </div>
          <CardDescription className="text-xs">
            Simulate and test each feature: 6 curse dice, question matrix calculations, AI referee passes/rejects, 500m breach siren, and role-swap finale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setIsTestingLabOpen(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold h-11 rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <FlaskConical className="h-4 w-4" /> Open Match Simulation & Feature Testing Lab
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-slate-800 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-white font-mono uppercase">
              <KeyRound className="h-5 w-5 text-amber-400" /> Access Control & PIN Configuration
            </CardTitle>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono">
              Competitive Secrecy
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-300">
            Set role-protection PINs to prevent players on separate mobile devices from peeking at opposing screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Admin PIN Status</span>
              <p className="font-mono font-bold text-sm text-purple-400">
                {adminPin || "113221 (Default)"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Hider PIN Status</span>
              <p className="font-mono font-bold text-sm text-emerald-400">
                {hiderPin ? hiderPin : "Open / Unset (No password)"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Seeker PIN Status</span>
              <p className="font-mono font-bold text-sm text-sky-400">
                {seekerPin ? seekerPin : "Open / Unset (No password)"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-pin" className="text-xs font-mono uppercase text-slate-300">Admin Panel PIN</Label>
              <div className="flex gap-2">
                <Input 
                  id="admin-pin" 
                  type="text" 
                  value={adminPinInput} 
                  onChange={(e) => setAdminPinInput(e.target.value)} 
                  placeholder="e.g. 113221" 
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm"
                />
                <Button onClick={handleSetAdminPin} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4">
                  Set Admin PIN
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hider-pin" className="text-xs font-mono uppercase text-slate-300">Hider Panel PIN</Label>
              <div className="flex gap-2">
                <Input 
                  id="hider-pin" 
                  type="text" 
                  value={hiderPinInput} 
                  onChange={(e) => setHiderPinInput(e.target.value)} 
                  placeholder="e.g. 0000 or blank to open" 
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm"
                />
                <Button onClick={handleSetHiderPin} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4">
                  Set Hider PIN
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seeker-pin" className="text-xs font-mono uppercase text-slate-300">Seeker Panel PIN</Label>
              <div className="flex gap-2">
                <Input 
                  id="seeker-pin" 
                  type="text" 
                  value={seekerPinInput} 
                  onChange={(e) => setSeekerPinInput(e.target.value)} 
                  placeholder="e.g. 1111 or blank to open" 
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm"
                />
                <Button onClick={handleSetSeekerPin} className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4">
                  Set Seeker PIN
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAdminPin('113221');
                setHiderPin('0000');
                setSeekerPin('1111');
                toast({
                  title: "Preset Test PINs Applied",
                  description: "Admin: 113221 • Hider: 0000 • Seeker: 1111",
                });
              }}
              className="text-xs font-mono border-slate-700 bg-slate-900/80 text-amber-300 hover:bg-slate-800"
            >
              ⚡ Set Standard PINs (Admin: 113221, Hider: 0000, Seeker: 1111)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setHiderPin('');
                setSeekerPin('');
                toast({
                  title: "Player PINs Cleared",
                  description: "Hider and Seeker panels are now in open access mode.",
                });
              }}
              className="text-xs font-mono border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
            >
              🔓 Clear Player PINs (Open Access)
            </Button>
          </div>

          <Separator className="bg-slate-800" />
          <CardDescription className="text-xs text-slate-400">
            Force logout local cached sessions for testing authentication:
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={logoutAdmin} className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Logout Admin
            </Button>
            <Button variant="outline" size="sm" onClick={logoutHider} className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Logout Hider
            </Button>
            <Button variant="outline" size="sm" onClick={logoutSeeker} className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Logout Seeker
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Biometric Passkey Authentication Management */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" /> Passkey Biometrics (Touch ID / Face ID)
            </CardTitle>
            <Badge variant={passkeyRegistered ? "default" : "outline"} className={passkeyRegistered ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
              {passkeyRegistered ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Configured</span>
              ) : (
                "Not Registered"
              )}
            </Badge>
          </div>
          <CardDescription>
            Register your device's biometric authenticator (Apple Face ID / Touch ID, Windows Hello, Android Biometrics) to access the Admin Panel without typing PINs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
            <p className="font-medium text-foreground">
              Device Compatibility: {passkeySupported ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Supported on this browser & device</span>
              ) : (
                <span className="text-amber-600 font-semibold">Not detected or disabled</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Passkeys are stored securely in your hardware security enclave. They cannot be phished or shared across non-approved origins.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleRegisterPasskey}
              disabled={isRegisteringPasskey}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Fingerprint className="h-4 w-4" />
              {isRegisteringPasskey
                ? "Registering Biometric..."
                : passkeyRegistered
                ? "Re-register Biometric Passkey"
                : "Register Face ID / Touch ID on this Device"}
            </Button>
            {passkeyRegistered && (
              <Button
                variant="outline"
                onClick={handleRemovePasskey}
                className="text-destructive hover:bg-destructive/10"
              >
                Remove Passkey from this Device
              </Button>
            )}
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
            onClick={handleAdminClearCurse} 
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

      {/* Jet Lag God-Mode Referee Card */}
      {currentRound && (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Eye className="h-5 w-5" /> Referee God-Mode (Round {currentRound.roundNumber})
              </CardTitle>
              <Badge variant={currentRound.isEndgameBreached ? "destructive" : "outline"}>
                {currentRound.isEndgameBreached ? "🚨 500m Breach Siren Active" : "🛡️ Stealth Zone Secure"}
              </Badge>
            </div>
            <CardDescription>
              Real-time referee oversight of the hidden player, seeker fog of war, and endgame trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-background rounded-md border">
                <p className="text-xs text-muted-foreground font-medium">Hider Locked Zone</p>
                {currentRound.lockedHiderStationId && MTR_STATIONS[currentRound.lockedHiderStationId] ? (
                  <p className="font-bold text-base text-primary">
                    {MTR_STATIONS[currentRound.lockedHiderStationId].name} ({MTR_STATIONS[currentRound.lockedHiderStationId].nameZh})
                    <span className="block text-xs font-normal text-muted-foreground">
                      District: {MTR_STATIONS[currentRound.lockedHiderStationId].district} (Lat: {MTR_STATIONS[currentRound.lockedHiderStationId].lat.toFixed(4)}, Lng: {MTR_STATIONS[currentRound.lockedHiderStationId].lng.toFixed(4)})
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-amber-600 italic">Hider has not locked a station yet</p>
                )}
              </div>
              <div className="p-3 bg-background rounded-md border">
                <p className="text-xs text-muted-foreground font-medium">Seeker Elimination Fog-of-War</p>
                <p className="font-bold text-base text-primary">
                  {eliminatedStationIds.length} / 70 Stations Eliminated
                </p>
                <p className="text-xs text-muted-foreground">
                  {70 - eliminatedStationIds.length} candidate stations remaining on seekers' map
                </p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <p className="text-xs text-muted-foreground font-medium">Active Challenge & Curse</p>
                <p className="text-sm font-semibold text-foreground">
                  {currentRound.activeChallenge ? currentRound.activeChallenge.card.title : "No challenge in progress"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Curse: {currentRound.activeCurse ? (activeCurseDetails?.name || "Active") : "None"}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                variant={currentRound.isEndgameBreached ? "secondary" : "destructive"}
                onClick={() => {
                  declareEndgameBreach();
                  toast({
                    title: currentRound.isEndgameBreached ? "Endgame Breach Already Active" : "Endgame Breach Siren Triggered!",
                    description: "Seekers and hider notified of 500m proximity breach."
                  });
                }}
                className="flex items-center gap-2"
              >
                <Siren className="h-4 w-4" />
                {currentRound.isEndgameBreached ? "🚨 500m Breach Siren is Triggered" : "🚨 Referee Manual 500m Breach Trigger"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Match Timeline */}
      {currentRound && (
        <MatchTimeline events={currentRound.timeline} />
      )}
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

