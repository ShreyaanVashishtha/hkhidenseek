
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
import { Eye, ShieldQuestion, Upload, Send, Dice5, Zap, Coins, HelpCircle, CheckCircle, Image as ImageIcon, Loader2, Thermometer as ThermometerIcon, AlertTriangle, Map, Clock, Bell, Target, MapPin } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PinProtectPage } from '@/components/auth/PinProtectPage';

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
    hiderAcknowledgesSeekerPhoto,
    isLoadingState, // Get loading state
  } = useGameContext();
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);

  const [selectedQuestionToAnswer, setSelectedQuestionToAnswer] = useState<AskedQuestion | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responsePhoto, setResponsePhoto] = useState<File | null>(null);
  const [responsePhotoPreview, setResponsePhotoPreview] = useState<string | null>(null);
  const [yesNoResponse, setYesNoResponse] = useState<"yes" | "no" | undefined>(undefined);

  const [rolledCurse, setRolledCurse] = useState<CurseRule | null>(null);
  const [hasPendingRoll, setHasPendingRoll] = useState(false);
  const [hiderCurseInputText, setHiderCurseInputText] = useState("");
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

    const globallyActiveCurseInfo = currentRound?.activeCurse;

    if (globallyActiveCurseInfo && globallyActiveCurseInfo.resolutionStatus !== 'resolved') {
      const globalCurseDetails = CURSE_DICE_OPTIONS.find(c => c.number === globallyActiveCurseInfo.curseId);
      if (globalCurseDetails) {
        if (!rolledCurse || rolledCurse.number !== globalCurseDetails.number || (globallyActiveCurseInfo.hiderInputText && hiderCurseInputText !== globallyActiveCurseInfo.hiderInputText)) {
            setRolledCurse(globalCurseDetails);
        }
        setHasPendingRoll(false); 
        setHiderCurseInputText(globallyActiveCurseInfo.hiderInputText || "");
      }
    } else if (!globallyActiveCurseInfo && !hasPendingRoll && rolledCurse) {
      setRolledCurse(null);
      setHiderCurseInputText("");
    } else if (!globallyActiveCurseInfo && !hasPendingRoll && !rolledCurse) {
      setHiderCurseInputText("");
    }

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
    
    setSelectedQuestionToAnswer(null);
    setResponseText("");
    setResponsePhoto(null);
    setResponsePhotoPreview(null);
    setYesNoResponse(undefined);
  };

  const handleBuyCurseDice = () => {
    if (!myTeam) return;
    if (myTeam.coins < CURSE_DICE_COST) {
      toast({ title: "Not enough coins!", description: `You need ${CURSE_DICE_COST} coins. You have ${myTeam.coins}.`, variant: "destructive" });
      return;
    }
    if ((myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND) {
      toast({ title: "Max Curses Used", description: `You have already used curse dice ${MAX_CURSES_PER_ROUND} times this round.`, variant: "destructive" });
      return;
    }
    if ((currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') || rolledCurse || hasPendingRoll) {
      toast({ title: "Roll Pending or Curse Active", description: "A dice roll is pending activation, a curse is already globally active, or you've already bought dice.", variant: "destructive" });
      return;
    }

    updateTeamCoins(myTeam.id, CURSE_DICE_COST, 'subtract');
    setHasPendingRoll(true);
    setRolledCurse(null);
    setHiderCurseInputText("");
    toast({ title: "Curse Dice Purchased!", description: `-${CURSE_DICE_COST} coins. Roll the dice!` });
  };

  const handleRollCurseDice = () => {
    if (!myTeam || !hasPendingRoll) {
      toast({ title: "Cannot Roll", description: "Buy curse dice first.", variant: "destructive" });
      return;
    }
    if ((myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND) {
      toast({ title: "Max Curses Used", description: `Cannot roll, max curses for this round reached.`, variant: "destructive" });
      setHasPendingRoll(false);
      return;
    }
    if (currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') {
      toast({ title: "Cannot Roll", description: "A curse is already active globally for this round.", variant: "destructive" });
      setHasPendingRoll(false);
      return;
    }

    const roll = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
    const curseDetails = CURSE_DICE_OPTIONS.find(c => c.number === roll);
    if (curseDetails) {
      setRolledCurse(curseDetails);
      setHasPendingRoll(false); 
      setHiderCurseInputText("");
      toast({ title: "Dice Rolled!", description: `You got: ${curseDetails.name}. Confirm to activate.` });
    }
  };

  const handleActivateRolledCurse = () => {
    if (!myTeam || !rolledCurse || (currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')) {
      toast({ title: "Activation Error", description: "No curse rolled or a curse is already active.", variant: "destructive" });
      return;
    }
    if ((myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND) {
      toast({ title: "Max Curses Used", description: `Cannot activate, max curses for this round reached.`, variant: "destructive" });
      setRolledCurse(null);
      return;
    }
    if (rolledCurse.requiresHiderTextInput && !hiderCurseInputText.trim()) {
      toast({ title: "Input Required", description: `Please provide details for ${rolledCurse.name}.`, variant: "destructive" });
      return;
    }

    activateCurse(myTeam.id, rolledCurse.number, rolledCurse.requiresHiderTextInput ? hiderCurseInputText : undefined);
    recordCurseUsed(myTeam.id);

    toast({ title: "Curse Activated!", description: `${rolledCurse.name} is now active for seekers.` });
    setRolledCurse(null);
    setHiderCurseInputText("");
  };

  const handleHiderAcknowledgePhoto = () => {
    if (!currentRound?.activeCurse || currentRound.activeCurse.resolutionStatus !== 'pending_hider_acknowledgement' || !currentRound.activeCurse.seekerSubmittedPhotoUrl) {
      toast({ title: "Error", description: "No seeker photo URL to acknowledge or curse not in correct state.", variant: "destructive" });
      return;
    }
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
     return (
      <div className="flex flex-col items-center justify-center h-full">
        <PageHeader title="Hider View" icon={Eye}/>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Active Round</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">The game round has not started or has ended. Please wait for the admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!myTeam && (isHidingPhase || isSeekingPhase)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <PageHeader title="Hider View" icon={Eye}/>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Not Assigned to Hiding Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please wait for the admin to assign you to the hiding team for the current round, or check the Admin panel.</p>
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

  const displayedActiveCurseDetails = (globallyActiveCurseInfo || rolledCurse)
    ? CURSE_DICE_OPTIONS.find(c => c.number === (globallyActiveCurseInfo?.curseId || rolledCurse!.number))
    : null;

  const isLocallyRolledCurseDisplayed = rolledCurse && !globallyActiveCurseInfo;


  const lockedHiderStation = currentRound?.lockedHiderStationId ? MTR_STATIONS[currentRound.lockedHiderStationId] : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Hider View - Team: ${myTeam?.name || "N/A"}`}
        description={isHidingPhase ? "Choose your hiding spot! The seekers are waiting." : "Evade the seekers! Answer their questions carefully."}
        icon={Eye}
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
            {Boolean(globallyActiveCurseInfo || rolledCurse) && (
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-purple-500" />
                  Curse Dice
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {myTeam?.cursesUsed ?? 0} / {MAX_CURSES_PER_ROUND} Used
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Roll the Jet Lag Curse Dice to handicap the seekers (Cost: {CURSE_DICE_COST} coins).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleBuyCurseDice}
                  disabled={!myTeam || myTeam.coins < CURSE_DICE_COST || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || hasPendingRoll || !!globallyActiveCurseInfo || !!rolledCurse}
                  className="w-full flex items-center justify-center gap-2 text-xs"
                >
                  <Dice5 className="h-4 w-4" /> Buy ({CURSE_DICE_COST} coins)
                </Button>
                <Button
                  onClick={handleRollCurseDice}
                  disabled={!myTeam || !hasPendingRoll || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || !!rolledCurse || !!globallyActiveCurseInfo}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold"
                >
                  🎲 Roll Dice!
                </Button>
              </div>

              {isLocallyRolledCurseDisplayed && displayedActiveCurseDetails && (
                <div className="p-4 border rounded-xl bg-purple-500/10 border-purple-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-base font-bold text-purple-700 dark:text-purple-300">
                    {displayedActiveCurseDetails.icon && <displayedActiveCurseDetails.icon className="h-5 w-5" />}
                    <span>Rolled: #{displayedActiveCurseDetails.number} - {displayedActiveCurseDetails.name}</span>
                  </div>
                  <p className="text-xs text-foreground">{displayedActiveCurseDetails.description}</p>
                  <p className="text-xs text-muted-foreground"><strong>Effect:</strong> {displayedActiveCurseDetails.effect}</p>

                  {displayedActiveCurseDetails.requiresHiderTextInput && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="hider-curse-input" className="text-xs font-semibold">Provide Details (e.g., Animal Category):</Label>
                      <Textarea
                        id="hider-curse-input"
                        value={hiderCurseInputText}
                        onChange={(e) => setHiderCurseInputText(e.target.value)}
                        placeholder="Enter required curse details..."
                        className="bg-background text-xs"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleActivateRolledCurse}
                    disabled={(myTeam?.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || !!globallyActiveCurseInfo || (displayedActiveCurseDetails.requiresHiderTextInput && !hiderCurseInputText.trim())}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    Activate {displayedActiveCurseDetails.name} on Seekers
                  </Button>
                </div>
              )}

              {globallyActiveCurseInfo && displayedActiveCurseDetails && !isLocallyRolledCurseDisplayed && (
                <div className="p-4 border rounded-xl bg-amber-500/10 border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-base font-bold text-amber-700 dark:text-amber-300">
                    {displayedActiveCurseDetails.icon && <displayedActiveCurseDetails.icon className="h-5 w-5" />}
                    <span>Active: {displayedActiveCurseDetails.name}</span>
                  </div>
                  <p className="text-xs text-foreground">{displayedActiveCurseDetails.description}</p>
                  {globallyActiveCurseInfo.hiderInputText && (
                    <p className="text-xs"><strong>Your Instruction:</strong> {globallyActiveCurseInfo.hiderInputText}</p>
                  )}
                  <p className="text-xs text-muted-foreground"><strong>Effect:</strong> {displayedActiveCurseDetails.effect}</p>

                  {displayedActiveCurseDetails.durationMinutes && globallyActiveCurseInfo.startTime && globallyActiveCurseInfo.resolutionStatus === 'pending_seeker_action' && (
                    <div className="pt-2">
                      <TimerDisplay
                        title="Curse Active For"
                        durationMinutes={displayedActiveCurseDetails.durationMinutes}
                        phaseStartTime={new Date(globallyActiveCurseInfo.startTime)}
                        isActive={!!globallyActiveCurseInfo && globallyActiveCurseInfo.resolutionStatus === 'pending_seeker_action'}
                        onTimerEnd={() => {}}
                        className="text-xs"
                      />
                    </div>
                  )}

                  {displayedActiveCurseDetails.requiresSeekerAction === 'photo' && globallyActiveCurseInfo.seekerSubmittedPhotoUrl && globallyActiveCurseInfo.resolutionStatus === 'pending_hider_acknowledgement' && (
                    <div className="space-y-2 p-3 bg-background rounded-lg border border-dashed">
                      <SeekerPhotoDisplay photoUrl={globallyActiveCurseInfo.seekerSubmittedPhotoUrl} />
                      <Button onClick={handleHiderAcknowledgePhoto} className="w-full mt-2 flex items-center justify-center gap-2 text-xs">
                        <CheckCircle className="h-4 w-4" /> Accept Seeker's Photo & End Curse
                      </Button>
                    </div>
                  )}

                  {displayedActiveCurseDetails.requiresSeekerAction === 'photo' && !globallyActiveCurseInfo.seekerSubmittedPhotoUrl && globallyActiveCurseInfo.resolutionStatus === 'pending_seeker_action' && (
                    <p className="text-xs text-muted-foreground italic">Waiting for seeker to submit curse completion photo...</p>
                  )}

                  {globallyActiveCurseInfo.resolutionStatus === 'resolved' && (
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Curse has been resolved.
                    </p>
                  )}
                </div>
              )}
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

