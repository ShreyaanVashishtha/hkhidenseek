
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useGameContext } from "@/hooks/useGameContext";
import type { AskedQuestion, Team, CurseRule, ActiveCurseInfo } from "@/lib/types";
import { CURSE_DICE_COST, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND, HIDING_PHASE_DURATION_MINUTES, SEEKING_PHASE_DURATION_MINUTES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import { MTRMapDisplay } from "@/components/game/MTRMapDisplay";
import { EndgameBreachModal } from "@/components/game/EndgameBreachModal";
import { MatchTimeline } from "@/components/game/MatchTimeline";
import { MTR_STATIONS, calculateHaversineDistanceKm } from "@/lib/mtrData";
import { useToast } from '@/hooks/use-toast';
import { Eye, ShieldQuestion, Upload, Send, Dice5, Zap, Coins, HelpCircle, CheckCircle, Image as ImageIcon, Loader2, Thermometer as ThermometerIcon, AlertTriangle, Map, Clock, Bell, Target, MapPin, Trophy, ArrowLeftRight } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PinProtectPage } from '@/components/auth/PinProtectPage';
import { BeaconPingAlert } from "@/components/game/BeaconPingAlert";
import { CaughtCelebrationModal } from "@/components/game/CaughtCelebrationModal";
import { triggerHaptic } from '@/lib/haptics';
import { soundEffects } from '@/lib/soundEffects';

interface SeekerPhotoDisplayProps {
  photoUrl: string;
}

const SeekerPhotoDisplay: React.FC<SeekerPhotoDisplayProps> = ({ photoUrl }) => {
  if (!photoUrl) return <p className="text-sm text-muted-foreground">Loading seeker's photo...</p>;

  return (
    <div className="mt-2">
      <p className="text-sm font-medium">Seeker's Submitted Photo for Curse Resolution:</p>
      <Image src={photoUrl} alt="Seeker's photo for curse" width={200} height={150} className="rounded-md border object-contain" data-ai-hint="selfie person" />
    </div>
  );
};


function HiderPageContent() {
  const {
    teams,
    currentRound,
    updateTeamCoins,
    startSeekingPhase,
    answerQuestion,
    activateCurse,
    recordCurseUsed,
    rollAndActivateCurse,
    clearActiveCurse,
    hiderAcknowledgesSeekerPhoto,
    isLoadingState, // Get loading state
    transmitHiderBeacon,
    swapRolesAndStartNextRound,
    seedSimulatedMatch,
  } = useGameContext();
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);
  const [isCaughtModalOpen, setIsCaughtModalOpen] = useState(true);

  const [selectedQuestionToAnswer, setSelectedQuestionToAnswer] = useState<AskedQuestion | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responsePhoto, setResponsePhoto] = useState<File | null>(null);
  const [responsePhotoPreview, setResponsePhotoPreview] = useState<string | null>(null);
  const [yesNoResponse, setYesNoResponse] = useState<"yes" | "no" | undefined>(undefined);

  const [hiderCurseInputText, setHiderCurseInputText] = useState("");
  const [selectedTestDie, setSelectedTestDie] = useState<string>("random");
  const [hiderTab, setHiderTab] = useState<'map' | 'questions' | 'curses' | 'timeline'>('map');


  useEffect(() => {
    const currentHidingTeamIdInRound = currentRound?.hidingTeam?.id;
    let determinedTeam: Team | undefined = undefined;

    if (currentHidingTeamIdInRound) {
      determinedTeam = teams.find(t => t.id === currentHidingTeamIdInRound);
    } else {
      determinedTeam = teams.find(t => t.isHiding);
    }
    setMyTeam(determinedTeam);
  }, [teams, currentRound]);

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setResponsePhoto(file);
    if (responsePhotoPreview) {
      URL.revokeObjectURL(responsePhotoPreview);
      setResponsePhotoPreview(null);
    }
    if (file) {
      setResponsePhotoPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    // Cleanup object URL
    return () => {
      if (responsePhotoPreview) {
        URL.revokeObjectURL(responsePhotoPreview);
      }
    };
  }, [responsePhotoPreview]);


  const handleSendResponse = async () => {
    if (!selectedQuestionToAnswer || !myTeam) return;

    let finalResponse: string | File = "";
    if (["Radar", "Precision", "Scan"].includes(selectedQuestionToAnswer.category)) {
      if (!yesNoResponse) {
        toast({ title: "Error", description: "Please select Yes or No.", variant: "destructive" });
        return;
      }
      finalResponse = yesNoResponse.charAt(0).toUpperCase() + yesNoResponse.slice(1);
    } else if (selectedQuestionToAnswer.category === "Photo") {
      if (currentRound?.isEndgameBreached) {
        toast({ title: "Endgame Breach Active", description: "Photo clues are disabled during an endgame breach.", variant: "destructive" });
        return;
      }
      if (!responsePhoto) {
        toast({ title: "Error", description: "Please upload a photo.", variant: "destructive" });
        return;
      }
      finalResponse = responsePhoto;
    } else { // Relative, Thermometer
      if (!responseText.trim()) {
        toast({ title: "Error", description: "Please enter your response.", variant: "destructive" });
        return;
      }
      finalResponse = responseText;
    }

    await answerQuestion(selectedQuestionToAnswer.id, finalResponse);
    soundEffects.playCardDraw();
    triggerHaptic('success');
    
    setSelectedQuestionToAnswer(null);
    setResponseText("");
    setResponsePhoto(null);
    setResponsePhotoPreview(null);
    setYesNoResponse(undefined);
  };

  const handleRollAndDeployCurse = async () => {
    if (!myTeam) {
      toast({ title: "No Hiding Team", description: "You must be on the hiding team to roll curses.", variant: "destructive" });
      return;
    }
    if (myTeam.coins < CURSE_DICE_COST) {
      toast({ title: "Not enough coins!", description: `You need ${CURSE_DICE_COST} coins. You have ${myTeam.coins}.`, variant: "destructive" });
      return;
    }
    if ((myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND) {
      toast({ title: "Max Curses Used", description: `You have reached the limit of ${MAX_CURSES_PER_ROUND} curses this round.`, variant: "destructive" });
      return;
    }
    if (currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') {
      toast({ title: "Curse Already Active", description: "Seekers are currently under an active curse handicap. Wait for resolution or clear it.", variant: "destructive" });
      return;
    }

    const forced = selectedTestDie !== "random" ? parseInt(selectedTestDie, 10) : undefined;
    await rollAndActivateCurse(myTeam.id, forced, hiderCurseInputText.trim() || undefined);
    setHiderCurseInputText("");
  };

  const handleHiderAcknowledgePhoto = () => {
    if (!currentRound?.activeCurse || currentRound.activeCurse.resolutionStatus !== 'pending_hider_acknowledgement' || !currentRound.activeCurse.seekerSubmittedPhotoUrl) {
      toast({ title: "Error", description: "No seeker photo URL to acknowledge or curse not in correct state.", variant: "destructive" });
      return;
    }
    soundEffects.playVictory();
    triggerHaptic('success');
    hiderAcknowledgesSeekerPhoto();
  };

  const gamePhase = currentRound?.status || 'pending';
  const isHidingPhase = gamePhase === 'hiding-phase';
  const isSeekingPhase = gamePhase === 'seeking-phase';

  const questionsToAnswer = currentRound?.askedQuestions?.filter(q => !q.response) || [];


  if (isLoadingState) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <PageHeader title="Hider View" icon={Eye}/>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading Game Data...</CardTitle>
          </CardHeader>
          <CardContent><p className="text-muted-foreground">Please wait while we fetch the latest game information.</p></CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentRound || (currentRound.status !== 'hiding-phase' && currentRound.status !== 'seeking-phase')) {
    if (currentRound?.status === 'completed') {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 max-w-lg mx-auto py-8">
          <CaughtCelebrationModal
            round={currentRound}
            onSwapRoles={swapRolesAndStartNextRound}
            isOpen={isCaughtModalOpen}
            onClose={() => setIsCaughtModalOpen(false)}
          />
          <PageHeader title="Hider View" icon={Eye}/>
          <Card className="w-full text-center border-amber-500/40 bg-gradient-to-b from-card to-amber-950/20 shadow-xl">
            <CardHeader className="space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <Trophy className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-black text-amber-500">
                Round Over — You Were Tagged!
              </CardTitle>
              <CardDescription>
                Epic hiding effort across Hong Kong! Ready to switch sides and hunt them down?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2.5">
                <Button 
                  onClick={() => setIsCaughtModalOpen(true)}
                  variant="outline"
                  className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  View Tag Celebration & Survival Stats
                </Button>
                <Button 
                  onClick={swapRolesAndStartNextRound}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Swap Roles & Become Seekers!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 max-w-lg mx-auto">
        <PageHeader title="Hider Safehouse" icon={Eye} badge="Status: Standby"/>
        <Card className="w-full text-center glass-card border-slate-800 shadow-2xl">
          <CardHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Eye className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-black text-white uppercase font-mono">No Active Round Underway</CardTitle>
            <CardDescription className="text-xs text-slate-300">
              The game round has not started or the previous match ended. Spin up a test match or start via Admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => {
                triggerHaptic('success');
                seedSimulatedMatch({ phase: 'seeking-phase' });
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" /> Quick-Start Match as Hiders (1-Click)
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-10 rounded-xl"
            >
              <a href="/admin">Open Match Control in Admin Panel</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!myTeam && (isHidingPhase || isSeekingPhase)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 max-w-lg mx-auto">
        <PageHeader title="Hider Safehouse" icon={Eye} badge="Status: Standby"/>
        <Card className="w-full text-center glass-card border-slate-800 shadow-2xl">
          <CardHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Eye className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-black text-white uppercase font-mono">Not Assigned to Hiding Team</CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Your profile is not currently assigned to the team designated as hiders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => {
                triggerHaptic('success');
                seedSimulatedMatch({ phase: 'seeking-phase' });
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" /> Quick-Start Test Match (Team Badam Hiders)
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-10 rounded-xl"
            >
              <a href="/admin">Manage Roles in Admin Panel</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const currentPhaseDuration = isHidingPhase ? HIDING_PHASE_DURATION_MINUTES : SEEKING_PHASE_DURATION_MINUTES;
  const timerTitle = isHidingPhase ? "Hiding Phase Ends In" : "Seeking Phase Active";

  const globallyActiveCurseInfo = currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved'
    ? currentRound.activeCurse
    : null;

  const displayedActiveCurseDetails = globallyActiveCurseInfo
    ? CURSE_DICE_OPTIONS.find(c => c.number === globallyActiveCurseInfo.curseId)
    : null;


  const lockedHiderStation = currentRound?.lockedHiderStationId ? MTR_STATIONS[currentRound.lockedHiderStationId] : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Hider View - Team: ${myTeam?.name || "N/A"}`}
        description={isHidingPhase ? "Choose your hiding spot! The seekers are waiting." : "Evade the seekers! Answer their questions carefully."}
        icon={Eye}
      />

      {/* 30-min Mandatory Cellular Beacon Ping Alert */}
      <BeaconPingAlert
        role="hider"
        latestPing={currentRound?.beaconPings?.[currentRound.beaconPings.length - 1]}
        onTransmitBeacon={transmitHiderBeacon}
        isSeekingPhase={isSeekingPhase}
      />

      <EndgameBreachModal
        isBreached={Boolean(currentRound?.isEndgameBreached)}
        role="hider"
      />

      {/* Sticky Mobile Match HUD */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur border rounded-xl p-2.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Coins className="h-4 w-4" />
              {myTeam?.coins ?? 0}
            </span>
            {lockedHiderStation ? (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
                <MapPin className="h-3 w-3" />
                {lockedHiderStation.name}
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border">
                No Safe Zone Locked
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {Boolean(currentRound?.isEndgameBreached) && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                ZONE BREACHED
              </Badge>
            )}
            {questionsToAnswer.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHiderTab('questions')}
                className="h-7 text-xs px-2.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 animate-pulse font-semibold"
              >
                <Bell className="h-3 w-3 mr-1" />
                {questionsToAnswer.length} Question{questionsToAnswer.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>

        {/* Segmented Mobile Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setHiderTab('map')}
            className={`py-1.5 px-1 rounded-md transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 ${
              hiderTab === 'map'
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="h-3.5 w-3.5" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={() => setHiderTab('questions')}
            className={`py-1.5 px-1 rounded-md transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
              hiderTab === 'questions'
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldQuestion className="h-3.5 w-3.5" />
            <span>Questions</span>
            {questionsToAnswer.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1 right-2 sm:static sm:w-1.5 sm:h-1.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setHiderTab('curses')}
            className={`py-1.5 px-1 rounded-md transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
              hiderTab === 'curses'
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Curse Dice</span>
            {Boolean(globallyActiveCurseInfo) && (
              <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-1 right-2 sm:static sm:w-1.5 sm:h-1.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setHiderTab('timeline')}
            className={`py-1.5 px-1 rounded-md transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 ${
              hiderTab === 'timeline'
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Feed</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {hiderTab === 'map' && (
        <div className="space-y-4">
          <TimerDisplay
            title={timerTitle}
            durationMinutes={currentPhaseDuration}
            phaseStartTime={currentRound?.phaseStartTime ? new Date(currentRound.phaseStartTime) : undefined}
            isActive={isHidingPhase || isSeekingPhase}
            onTimerEnd={isHidingPhase ? () => {
              toast({ title: "Hiding Phase Over!", description: "Seeking phase has begun!" });
              if(currentRound?.status === 'hiding-phase') startSeekingPhase();
            } : undefined}
          />

          {isHidingPhase && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Eye className="h-4 w-4" />
                  Hiding Phase Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                You have <strong>{HIDING_PHASE_DURATION_MINUTES} minutes</strong> to travel to your hiding zone (500m radius of an MTR station). Tap your chosen station on the map below and click <strong>"Lock In As Safe Zone"</strong>!
              </CardContent>
            </Card>
          )}

          <MTRMapDisplay role="hider" />
        </div>
      )}

      {hiderTab === 'questions' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldQuestion className="h-5 w-5 text-primary" />
                Incoming Questions ({questionsToAnswer.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Seekers are asking questions. Select a question below to respond.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questionsToAnswer.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldQuestion className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No unanswered questions!</p>
                  <p className="text-xs">Stay alert and keep an eye on seeker movements.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[300px] pr-2">
                  <ul className="space-y-2.5">
                    {questionsToAnswer.map(q => (
                      <li
                        key={q.id}
                        className={`p-3 border rounded-xl cursor-pointer transition-colors ${
                          selectedQuestionToAnswer?.id === q.id
                            ? 'ring-2 ring-primary bg-primary/10 border-primary/40'
                            : 'bg-card hover:bg-accent/10'
                        }`}
                        onClick={() => setSelectedQuestionToAnswer(q)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-primary px-2 py-0.5 rounded-full bg-primary/10">
                            {q.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-medium text-sm text-foreground">{q.text}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          From: Team {teams.find(t => t.id === q.askingTeamId)?.name || 'Seeker'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {selectedQuestionToAnswer && (
            <Card className="border-primary/40 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{selectedQuestionToAnswer.category}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setSelectedQuestionToAnswer(null)}
                  >
                    Close
                  </Button>
                </div>
                <CardTitle className="text-sm font-medium pt-1">
                  "{selectedQuestionToAnswer.text}"
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {["Radar", "Precision", "Scan"].includes(selectedQuestionToAnswer.category) && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Your Truthful Answer:</Label>
                    <RadioGroup onValueChange={(val: "yes" | "no") => setYesNoResponse(val)} value={yesNoResponse} className="grid grid-cols-2 gap-3">
                      <Label
                        htmlFor={`yes-${selectedQuestionToAnswer.id}`}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold transition-colors ${
                          yesNoResponse === 'yes' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <RadioGroupItem value="yes" id={`yes-${selectedQuestionToAnswer.id}`} />
                        YES
                      </Label>
                      <Label
                        htmlFor={`no-${selectedQuestionToAnswer.id}`}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold transition-colors ${
                          yesNoResponse === 'no' ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300' : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <RadioGroupItem value="no" id={`no-${selectedQuestionToAnswer.id}`} />
                        NO
                      </Label>
                    </RadioGroup>
                  </div>
                )}

                {selectedQuestionToAnswer.category === "Photo" && (
                  currentRound?.isEndgameBreached ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span><strong>Endgame Breach Active:</strong> Seekers have breached your 500m zone! Photo clues are disabled.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="photo-upload" className="text-xs font-semibold">Upload Photo (no direct station identifiers):</Label>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoInputChange}
                        className="file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 text-xs"
                      />
                      {responsePhotoPreview && (
                        <div className="mt-2">
                          <Image src={responsePhotoPreview} alt="Response photo preview" width={200} height={150} className="rounded-md border object-contain mx-auto" />
                        </div>
                      )}
                    </div>
                  )
                )}

                {selectedQuestionToAnswer.category === "Thermometer" && (() => {
                  const stA = selectedQuestionToAnswer.stationAId ? MTR_STATIONS[selectedQuestionToAnswer.stationAId] : null;
                  const stB = selectedQuestionToAnswer.stationBId ? MTR_STATIONS[selectedQuestionToAnswer.stationBId] : null;
                  const hiderStation = currentRound?.lockedHiderStationId ? MTR_STATIONS[currentRound.lockedHiderStationId] : null;

                  let distA: number | null = null;
                  let distB: number | null = null;
                  let closer: string | null = null;
                  let diffKm: string | null = null;

                  if (stA && stB && hiderStation) {
                    distA = calculateHaversineDistanceKm(hiderStation.lat, hiderStation.lng, stA.lat, stA.lng);
                    distB = calculateHaversineDistanceKm(hiderStation.lat, hiderStation.lng, stB.lat, stB.lng);
                    closer = distA < distB ? stA.name : stB.name;
                    diffKm = Math.abs(distA - distB).toFixed(2);
                  }

                  return (
                    <div className="space-y-3">
                      {hiderStation && stA && stB && distA !== null && distB !== null ? (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                            <ThermometerIcon className="h-4 w-4" />
                            <span>Automated Exact Distance Calculation</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Locked Safe Zone: <strong>{hiderStation.name} ({hiderStation.nameZh})</strong>
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-background rounded-lg border">
                              <span className="font-medium">{stA.name}</span>: {distA.toFixed(2)} km
                            </div>
                            <div className="p-2 bg-background rounded-lg border">
                              <span className="font-medium">{stB.name}</span>: {distB.toFixed(2)} km
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                            👉 You are closer to <strong>{closer}</strong> by {diffKm} km!
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setResponseText(`Closer to ${stA.name} (${distA!.toFixed(2)}km vs ${distB!.toFixed(2)}km)`)}
                            >
                              Closer to {stA.name}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setResponseText(`Closer to ${stB.name} (${distB!.toFixed(2)}km vs ${distA!.toFixed(2)}km)`)}
                            >
                              Closer to {stB.name}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                          💡 <em>Tip: Lock your hiding station on the Map tab to auto-calculate exact distance between {stA?.name || 'A'} and {stB?.name || 'B'}!</em>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label htmlFor="thermometer-response" className="text-xs">Response Text:</Label>
                        <Input
                          id="thermometer-response"
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="e.g. Closer to Admiralty"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  );
                })()}

                {selectedQuestionToAnswer.category === "Relative" && (
                  <div className="space-y-2">
                    <Label htmlFor="text-response" className="text-xs">Your Detailed Response:</Label>
                    <Textarea
                      id="text-response"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Enter your response..."
                      className="text-xs min-h-[80px]"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  onClick={handleSendResponse}
                  disabled={selectedQuestionToAnswer.category === "Photo" && Boolean(currentRound?.isEndgameBreached)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" /> Send Response to Seekers
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}

      {hiderTab === 'curses' && (
        <div className="space-y-4">
          {/* 1. ACTIVE CURSE DISPLAY (If one is currently active) */}
          {globallyActiveCurseInfo && displayedActiveCurseDetails ? (
            <Card className="border-purple-500/50 bg-gradient-to-br from-purple-950/20 via-card to-amber-950/10 shadow-lg">
              <CardHeader className="pb-3 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {displayedActiveCurseDetails.icon ? <displayedActiveCurseDetails.icon className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                    </div>
                    <div>
                      <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                        ACTIVE ON SEEKERS
                      </Badge>
                      <CardTitle className="text-base font-black text-foreground pt-0.5">
                        #{displayedActiveCurseDetails.number}: {displayedActiveCurseDetails.name}
                      </CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearActiveCurse();
                      toast({ title: "Curse Cleared", description: "Active curse has been ended." });
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear Curse
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <p className="text-xs text-foreground font-medium">{displayedActiveCurseDetails.description}</p>
                <div className="p-2.5 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-1">
                  <p><strong>Seeker Penalty:</strong> {displayedActiveCurseDetails.effect}</p>
                  {globallyActiveCurseInfo.hiderInputText && (
                    <p className="text-purple-600 dark:text-purple-300 font-semibold">
                      <strong>Your Custom Rule:</strong> "{globallyActiveCurseInfo.hiderInputText}"
                    </p>
                  )}
                </div>

                {displayedActiveCurseDetails.durationMinutes && globallyActiveCurseInfo.startTime && (
                  <div className="pt-1">
                    <TimerDisplay
                      title="Curse Duration Remaining"
                      durationMinutes={displayedActiveCurseDetails.durationMinutes}
                      phaseStartTime={new Date(globallyActiveCurseInfo.startTime)}
                      isActive={true}
                      onTimerEnd={() => {
                        toast({ title: "Curse Expired", description: "The time limit on this curse has elapsed." });
                      }}
                      className="text-xs"
                    />
                  </div>
                )}

                {/* Seeker Photo Submission Review */}
                {displayedActiveCurseDetails.requiresSeekerAction === 'photo' && (
                  globallyActiveCurseInfo.seekerSubmittedPhotoUrl ? (
                    <div className="space-y-2 p-3 bg-card rounded-xl border border-dashed border-emerald-500/40">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Seeker Submitted Photo Proof:
                      </div>
                      <SeekerPhotoDisplay photoUrl={globallyActiveCurseInfo.seekerSubmittedPhotoUrl} />
                      <Button 
                        onClick={handleHiderAcknowledgePhoto} 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 flex items-center justify-center gap-2 shadow-md"
                      >
                        <CheckCircle className="h-4 w-4" /> Accept Seeker's Proof & End Curse
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-500 italic flex items-center gap-1.5 p-2 bg-amber-500/10 rounded-lg">
                      <Clock className="h-3.5 w-3.5" /> Waiting for seekers to upload proof photo on their phone...
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          ) : (
            /* 2. ROLL & DEPLOY CURSE CARD */
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Deploy Jet Lag Curse Die
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono font-semibold">
                    {myTeam?.cursesUsed ?? 0} / {MAX_CURSES_PER_ROUND} Used
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Spend {CURSE_DICE_COST} coins to inflict an authentic Jet Lag handicap on the seekers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <Label className="text-xs font-semibold">Select Dice Mode:</Label>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <select
                        value={selectedTestDie}
                        onChange={(e) => setSelectedTestDie(e.target.value)}
                        className="text-xs h-8 px-2.5 rounded-lg border bg-background font-medium"
                      >
                        <option value="random">🎲 Roll Random 1–6 (Standard)</option>
                        <option value="1">Die #1: Freeze 15 Mins</option>
                        <option value="2">Die #2: Silence on Transit</option>
                        <option value="3">Die #3: Discard & Draw 2 Cards</option>
                        <option value="4">Die #4: Vending Machine Drink</option>
                        <option value="5">Die #5: Walk 500 Steps</option>
                        <option value="6">Die #6: Mascot / MTR Selfie</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Custom Restriction Field */}
                  <div className="space-y-1">
                    <Label htmlFor="hider-curse-custom-text" className="text-[11px] text-muted-foreground">
                      Custom Constraint / Restriction (Optional):
                    </Label>
                    <Input
                      id="hider-curse-custom-text"
                      value={hiderCurseInputText}
                      onChange={(e) => setHiderCurseInputText(e.target.value)}
                      placeholder="e.g. Must name 3 Hong Kong animals before next station"
                      className="text-xs h-8"
                    />
                  </div>

                  <Button
                    onClick={handleRollAndDeployCurse}
                    disabled={!myTeam || myTeam.coins < CURSE_DICE_COST || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-10 rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    <Dice5 className="h-4 w-4" />
                    Deploy Curse Die ({CURSE_DICE_COST} Coins)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. ALL 6 CURSE DICE QUICK REFERENCE */}
          <Card className="border-border">
            <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Official Jet Lag Hong Kong Curse Dice Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {CURSE_DICE_OPTIONS.map((c) => {
                  const Icon = c.icon || Zap;
                  return (
                    <div key={c.number} className="p-2.5 rounded-lg border bg-card space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <Icon className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span>#{c.number}: {c.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{c.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {hiderTab === 'timeline' && currentRound && (
        <MatchTimeline events={currentRound.timeline} />
      )}
    </div>
  );
}

export default function HiderPage() {
  return (
    <PinProtectPage role="hider">
      <HiderPageContent />
    </PinProtectPage>
  );
}

