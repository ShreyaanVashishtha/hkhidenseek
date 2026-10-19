"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Zap,
  Dice5,
  ShieldQuestion,
  AlertTriangle,
  Trophy,
  ArrowLeftRight,
  Radio,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  MapPin,
  Clock,
  Coins
} from 'lucide-react';
import { useGameContext } from '@/hooks/useGameContext';
import { CURSE_DICE_OPTIONS } from '@/lib/constants';
import { MTR_STATIONS, calculateHaversineDistanceKm } from '@/lib/mtrData';
import { useToast } from '@/hooks/use-toast';
import { triggerHaptic } from '@/lib/haptics';
import { soundEffects } from '@/lib/soundEffects';

interface TestingScenarioLabProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestingScenarioLab({ isOpen, onClose }: TestingScenarioLabProps) {
  const {
    currentRound,
    teams,
    seedSimulatedMatch,
    rollAndActivateCurse,
    clearActiveCurse,
    seekerCompletesCurseAction,
    hiderAcknowledgesSeekerPhoto,
    askQuestion,
    answerQuestion,
    declareEndgameBreach,
    tagHider,
    swapRolesAndStartNextRound,
    toggleEliminateStation,
    eliminateStationsBulk,
    transmitHiderBeacon,
    acceptChallengeCard,
    completeChallengeCard,
  } = useGameContext();

  const { toast } = useToast();
  const [isAutomating, setIsAutomating] = useState(false);
  const [activeTab, setActiveTab] = useState<'match' | 'curses' | 'questions' | 'endgame'>('match');

  // Helper for test photo data URL (canned drink / MTR signage)
  const testPhotoDataUrl = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><rect width='300' height='200' fill='%230f172a'/><text x='150' y='100' fill='%2338bdf8' font-size='18' font-weight='bold' text-anchor='middle'>Jet Lag Photo Proof</text></svg>";

  // 1. MATCH SEEDING
  const handleSeedStandardMatch = () => {
    seedSimulatedMatch({ phase: 'seeking-phase', hiderStationId: 'CEN' });
  };

  const handleSeedHidingPhase = () => {
    seedSimulatedMatch({ phase: 'hiding-phase', hiderStationId: 'ADM' });
  };

  const handleSeedCompletedMatch = () => {
    seedSimulatedMatch({ phase: 'completed', hiderStationId: 'CEN' });
  };

  // 2. CURSE TESTS
  const handleTestCurse = async (curseNum: number) => {
    const hidingTeam = teams.find(t => t.isHiding) || currentRound?.hidingTeam;
    if (!hidingTeam) {
      toast({ title: "Seed Match First", description: "Click 'Seed Standard Match' to create active teams.", variant: "destructive" });
      return;
    }
    await rollAndActivateCurse(hidingTeam.id, curseNum, `Simulated Test Handicap #${curseNum}`);
  };

  const handleSimulateSeekerCurseProof = async () => {
    if (!currentRound?.activeCurse) {
      toast({ title: "No Active Curse", description: "Deploy a curse first.", variant: "destructive" });
      return;
    }
    // Simulate seeker photo upload using dummy file
    const blob = new Blob(["test"], { type: "image/jpeg" });
    const file = new File([blob], "curse_proof.jpg", { type: "image/jpeg" });
    await seekerCompletesCurseAction(file);
    toast({ title: "Photo Submitted by Seekers", description: "Hiders can now review and approve." });
  };

  // 3. QUESTION TESTS
  const handleTestMatchingQuestion = async () => {
    if (!currentRound) {
      handleSeedStandardMatch();
    }
    const seekerTeam = teams.find(t => t.isSeeking) || { id: 'team-seekers-test' };
    const qId = `q-matching-${Date.now()}`;
    askQuestion({
      id: qId,
      questionOptionId: 'opt-precision-station',
      askingTeamId: seekerTeam.id,
      text: "Are you at Mong Kok Station?",
      category: "Precision",
      timestamp: new Date(),
    });

    // Auto-answer NO after 500ms and eliminate Mong Kok
    setTimeout(async () => {
      await answerQuestion(qId, "No (Not at Mong Kok)");
      eliminateStationsBulk(['MOK', 'PRE', 'YMT'], 'eliminate');
      toast({
        title: "Matching Question Answered: 'NO'",
        description: "Eliminated Mong Kok, Prince Edward, and Yau Ma Tei from map candidates!",
      });
    }, 600);
  };

  const handleTestThermometerQuestion = async () => {
    if (!currentRound) {
      handleSeedStandardMatch();
    }
    const seekerTeam = teams.find(t => t.isSeeking) || { id: 'team-seekers-test' };
    const qId = `q-thermo-${Date.now()}`;
    
    // Central station to Admiralty (0.9km) vs TST (1.8km)
    askQuestion({
      id: qId,
      questionOptionId: 'opt-thermometer',
      askingTeamId: seekerTeam.id,
      text: "Are you closer to Admiralty or Tsim Sha Tsui?",
      category: "Thermometer",
      stationAId: 'ADM',
      stationBId: 'TST',
      timestamp: new Date(),
    });

    setTimeout(async () => {
      await answerQuestion(qId, "Closer to Admiralty (0.9km vs 1.8km)");
      eliminateStationsBulk(['TST', 'JOR', 'YMT', 'MOK'], 'eliminate');
      toast({
        title: "Thermometer Clue Answered",
        description: "Hider confirmed closer to Admiralty. Kowloon stations eliminated!",
      });
    }, 600);
  };

  const handleTestRadarQuestion = async () => {
    if (!currentRound) {
      handleSeedStandardMatch();
    }
    const seekerTeam = teams.find(t => t.isSeeking) || { id: 'team-seekers-test' };
    const qId = `q-radar-${Date.now()}`;
    askQuestion({
      id: qId,
      questionOptionId: 'opt-radar-stations',
      askingTeamId: seekerTeam.id,
      text: "Are you within 3 stations of Central?",
      category: "Radar",
      timestamp: new Date(),
    });

    setTimeout(async () => {
      await answerQuestion(qId, "YES (Within 3 Stations)");
      eliminateStationsBulk(['CHW', 'HFC', 'SKW', 'TAK', 'QUB', 'NOP', 'FOH', 'TIH', 'CAB'], 'eliminate');
      toast({
        title: "Radar Ping: YES",
        description: "Hider is within 3 stations! Eastern Island line stations crossed off.",
      });
    }, 600);
  };

  // 4. ENDGAME & ROLE SWAP
  const handleTestTagHider = async () => {
    const blob = new Blob(["tag"], { type: "image/jpeg" });
    const file = new File([blob], "tag_proof.jpg", { type: "image/jpeg" });
    await tagHider(file);
    toast({
      title: "Hider Tagged!",
      description: "Caught celebration dialog has been triggered.",
    });
  };

  // 4b. AI REFEREE VERDICT SIMULATION
  const [aiTestResult, setAiTestResult] = useState<{ approved: boolean; title: string; commentary: string; isAiPowered: boolean } | null>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);

  const handleTestAIReferee = async (verdict: 'approve' | 'reject') => {
    setIsTestingAI(true);
    toast({ title: `Calling AI Referee: ${verdict === 'approve' ? 'Testing Approval' : 'Testing Rejection'}...` });
    try {
      const res = await fetch('/api/ai/verify-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'challenge_proof',
          taskTitle: 'Photograph Hong Kong Egg Waffles',
          taskDescription: 'Seekers must purchase and photograph authentic egg waffles on camera.',
          photoDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="%230f172a"/><text x="150" y="100" fill="%2338bdf8" font-size="16" font-weight="bold" text-anchor="middle">Egg Waffle Proof</text></svg>',
          simulatedVerdict: verdict,
        }),
      });
      const data = await res.json();
      setAiTestResult({
        approved: data.approved,
        title: data.verdictTitle,
        commentary: data.refereeCommentary,
        isAiPowered: Boolean(data.isAiPowered),
      });
      if (data.approved) {
        soundEffects.playVictory();
        toast({ title: data.verdictTitle, description: data.refereeCommentary });
      } else {
        soundEffects.playCurseAlarm();
        toast({ title: data.verdictTitle, description: data.refereeCommentary, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "AI Referee Test Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsTestingAI(false);
    }
  };

  // 5. AUTOMATED 10-SECOND DEMO
  const handleRunAutomatedDemo = async () => {
    setIsAutomating(true);
    toast({ title: "🎬 Running 10-Second Automated Jet Lag Demo..." });

    // Step 1: Seed match
    handleSeedStandardMatch();
    await new Promise(r => setTimeout(r, 1500));

    // Step 2: Transmit cell beacon
    transmitHiderBeacon();
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: Roll Curse Die #1 (Freeze)
    await handleTestCurse(1);
    await new Promise(r => setTimeout(r, 1800));

    // Step 4: Ask & Answer Radar question
    await handleTestRadarQuestion();
    await new Promise(r => setTimeout(r, 2000));

    // Step 5: Trigger 500m breach
    declareEndgameBreach();
    await new Promise(r => setTimeout(r, 2000));

    // Step 6: Tag hider
    await handleTestTagHider();
    setIsAutomating(false);
    toast({
      title: "✅ Full Jet Lag Simulation Complete!",
      description: "Match reached completed status. Check out the Caught Celebration Modal!",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border shadow-2xl p-6 rounded-3xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                <FlaskConical className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                Jet Lag Match Testing & Simulation Studio
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold text-purple-600 border-purple-500/30">
              Dev Sandbox
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Test each feature, curse die, question matrix calculation, AI referee response, and role swap with 1 click.
          </DialogDescription>
        </DialogHeader>

        {/* Global Match Quick-Bar */}
        <div className="my-3 p-3 rounded-2xl bg-muted/60 border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Status:</span>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {currentRound?.status || 'No Round'}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              Seekers: <strong>{teams.find(t => t.isSeeking)?.coins ?? 0}c</strong>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              Hiders: <strong>{teams.find(t => t.isHiding)?.coins ?? 0}c</strong>
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleRunAutomatedDemo}
            disabled={isAutomating}
            className="h-8 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isAutomating ? "Simulating..." : "Run 10s Auto Demo"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-4">
          <TabsList className="grid grid-cols-4 w-full h-10 bg-muted/80 rounded-xl p-1 text-xs">
            <TabsTrigger value="match" className="text-xs font-semibold">1. State</TabsTrigger>
            <TabsTrigger value="curses" className="text-xs font-semibold">2. Curses (1–6)</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs font-semibold">3. Questions</TabsTrigger>
            <TabsTrigger value="endgame" className="text-xs font-semibold">4. Tag & Swap</TabsTrigger>
          </TabsList>

          {/* TAB 1: MATCH SEEDING */}
          <TabsContent value="match" className="space-y-3">
            <Card className="border-border">
              <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick-Seed Match States
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    onClick={handleSeedStandardMatch}
                    className="h-9 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl"
                  >
                    🌱 Seed Seeking Phase
                  </Button>
                  <Button
                    onClick={handleSeedHidingPhase}
                    variant="outline"
                    className="h-9 text-xs font-bold rounded-xl"
                  >
                    ⏱️ Seed Hiding Phase
                  </Button>
                  <Button
                    onClick={handleSeedCompletedMatch}
                    variant="outline"
                    className="h-9 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/40 rounded-xl"
                  >
                    🏆 Seed Tagged/Caught
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Seeds a 2-team game (Team Ben & Adam vs Team Badam) with coins, questions, timeline events, and safe zone locked in Central Station.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  30-Min Cell Tower Beacon
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Simulates hider mandatory 30-minute cellular ping broadcast.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    transmitHiderBeacon();
                    toast({ title: "Beacon Broadcasted", description: "Cell tower ping registered for seekers." });
                  }}
                  className="h-8 text-xs text-sky-600 border-sky-500/40 font-bold whitespace-nowrap"
                >
                  <Radio className="h-3.5 w-3.5 mr-1" /> Transmit Ping
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CURSES TESTER */}
          <TabsContent value="curses" className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  Currently Active Curse:
                </span>
                <p className="text-muted-foreground">
                  {currentRound?.activeCurse
                    ? `Die #${currentRound.activeCurse.curseId} - Status: ${currentRound.activeCurse.resolutionStatus}`
                    : "None active right now."}
                </p>
              </div>
              {currentRound?.activeCurse && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSimulateSeekerCurseProof}
                    className="h-7 text-[11px] font-bold text-emerald-600"
                  >
                    Seeker Uploads Proof
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearActiveCurse}
                    className="h-7 text-[11px] text-destructive hover:bg-destructive/10"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CURSE_DICE_OPTIONS.map((c) => {
                const Icon = c.icon || Zap;
                const isThisCurseActive = currentRound?.activeCurse?.curseId === c.number;
                return (
                  <div
                    key={c.number}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                      isThisCurseActive
                        ? 'bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/40'
                        : 'bg-card border-border hover:border-purple-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                          <Icon className="h-4 w-4 text-purple-500" />
                          <span>#{c.number}: {c.name}</span>
                        </div>
                        {isThisCurseActive && (
                          <Badge className="bg-purple-600 text-white text-[9px]">ACTIVE</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleTestCurse(c.number)}
                      className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
                    >
                      Deploy Die #{c.number}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: QUESTIONS TESTER */}
          <TabsContent value="questions" className="space-y-3">
            <Card className="border-border">
              <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Simulate Question & Map Deductions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                {/* 1. MATCHING */}
                <div className="p-3 rounded-xl border bg-card flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <ShieldQuestion className="h-3.5 w-3.5 text-sky-500" />
                      Matching Station Test
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Asks "Are you at Mong Kok?" → Answers "NO" → Crosses off Mong Kok line on map.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleTestMatchingQuestion}
                    className="h-8 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl whitespace-nowrap"
                  >
                    Test Matching
                  </Button>
                </div>

                {/* 2. THERMOMETER */}
                <div className="p-3 rounded-xl border bg-card flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                      Thermometer Distance Test
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Calculates exact km from Central to Admiralty vs TST → Auto-answers and eliminates!
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleTestThermometerQuestion}
                    className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl whitespace-nowrap"
                  >
                    Test Thermometer
                  </Button>
                </div>

                {/* 3. RADAR */}
                <div className="p-3 rounded-xl border bg-card flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-emerald-500" />
                      Radar Clue Scan Test
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Asks "Within 3 stations of Central?" → Answers "YES" → Crosses off far stations.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleTestRadarQuestion}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl whitespace-nowrap"
                  >
                    Test Radar
                  </Button>
                </div>

                {/* 4. AI REFEREE VERIFICATION */}
                <div className="p-3 rounded-xl border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        AI Clue Referee Verification Test
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Simulate both positive approval and negative rejection verdicts with Jet Lag referee commentary.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleTestAIReferee('approve')}
                      disabled={isTestingAI}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Test Positive Verdict (Approve)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleTestAIReferee('reject')}
                      disabled={isTestingAI}
                      variant="outline"
                      className="h-8 text-xs font-bold border-rose-500/40 text-rose-500 hover:bg-rose-950/20 rounded-xl"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Test Negative Verdict (Reject)
                    </Button>
                  </div>

                  {aiTestResult && (
                    <div className={`p-3 rounded-xl border text-xs space-y-1 mt-2 ${
                      aiTestResult.approved 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <div className="font-bold flex items-center justify-between">
                        <span>{aiTestResult.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {aiTestResult.isAiPowered ? 'Gemini 2.0' : 'Referee Fallback'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {aiTestResult.commentary}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: TAG, BREACH & ROLE SWAP */}
          <TabsContent value="endgame" className="space-y-3">
            {/* 500m Breach */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive animate-bounce" />
                    <span className="font-bold text-xs text-destructive">
                      500m Safe Zone Breach Siren
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Triggers alarm audio, physical haptic vibration, and disables photo clues.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={declareEndgameBreach}
                  className="h-8 text-xs font-bold whitespace-nowrap"
                >
                  Trigger Breach
                </Button>
              </CardContent>
            </Card>

            {/* Tag & Role Swap */}
            <Card className="border-border">
              <CardContent className="p-3.5 space-y-3">
                <div>
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Tag Hider & Trigger Caught Celebration Modal
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Simulates capturing the hider, generates survival duration, and displays episode finale photo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Button
                    onClick={handleTestTagHider}
                    className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md"
                  >
                    🎯 Tag Hider at Central Station
                  </Button>

                  <Button
                    onClick={() => {
                      swapRolesAndStartNextRound();
                      toast({
                        title: "Roles Inverted!",
                        description: "Hiders are now Seekers, Seekers are now Hiders. Round 2 started!",
                      });
                    }}
                    className="h-9 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Swap Roles (Start Next Round)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
