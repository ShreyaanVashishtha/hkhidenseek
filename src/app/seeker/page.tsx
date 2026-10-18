
"use client";

import React, { useState, useEffect } from 'react'; 
import Image from 'next/image'; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGameContext } from "@/hooks/useGameContext";
import type { Challenge, AskedQuestion, QuestionOption as QuestionOptionType, Team, CurseRule, ActiveCurseInfo } from "@/lib/types";
import { QUESTION_OPTIONS, CURSE_DICE_OPTIONS, CHALLENGE_PENALTY_MINUTES, HIDING_PHASE_DURATION_MINUTES, SEEKING_PHASE_DURATION_MINUTES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import { VetoConsequenceModal } from "@/components/game/VetoConsequenceModal";
import { useToast } from '@/hooks/use-toast';
import { Search, ShieldQuestion, Send, ThumbsUp, ThumbsDown, ListChecks, Zap, Upload, CheckSquare, AlertTriangle, Dice6, Sparkles, Coins, Trophy, Flame, Map, Clock, Target, HelpCircle } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PinProtectPage } from '@/components/auth/PinProtectPage';
import { MTRMapDisplay } from "@/components/game/MTRMapDisplay";
import { MTR_STATIONS, MTRStation } from "@/lib/mtrData";
import { ChallengeDeckModal } from "@/components/game/ChallengeDeckModal";
import { EndgameBreachModal } from "@/components/game/EndgameBreachModal";
import { MatchTimeline } from "@/components/game/MatchTimeline";

interface PhotoResponseDisplayProps {
  imageUrl: string; 
}

const PhotoResponseDisplay: React.FC<PhotoResponseDisplayProps> = ({ imageUrl }) => {
  if (!imageUrl) {
    return <p className="text-sm text-muted-foreground">Loading photo...</p>;
  }

  return (
    <div className="mt-2">
      <Image 
        src={imageUrl} 
        alt="Hider's photo response" 
        width={300} 
        height={225} 
        className="rounded-md border object-contain" 
        data-ai-hint="response image"
      />
    </div>
  );
};

interface SeekerCursePhotoUploadProps {
  onPhotoSubmit: (file: File) => void; 
  disabled?: boolean;
}

const SeekerCursePhotoUpload: React.FC<SeekerCursePhotoUploadProps> = ({ onPhotoSubmit, disabled }) => {
  const [cursePhoto, setCursePhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCursePhoto(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setCursePhoto(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = () => {
    if (cursePhoto) {
      onPhotoSubmit(cursePhoto);
      toast({ title: "Photo Submitted for Curse", description: "Your photo has been submitted for hider review." });
    } else {
      toast({ title: "No Photo Selected", description: "Please select a photo to submit.", variant: "destructive" });
    }
  };
  
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  return (
    <div className="space-y-3 mt-3">
      <Label htmlFor="seeker-curse-photo">Upload Photo for Curse Task:</Label>
      <Input id="seeker-curse-photo" type="file" accept="image/*" onChange={handleFileChange} 
        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
        disabled={disabled}
      />
      {previewUrl && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          <Image src={previewUrl} alt="Seeker curse photo preview" width={200} height={150} className="rounded-md border object-contain" data-ai-hint="curse photo" />
        </div>
      )}
      <Button onClick={handleSubmit} disabled={!cursePhoto || disabled} className="w-full flex items-center gap-2">
        <Upload className="h-4 w-4" /> Submit Photo & Resolve
      </Button>
    </div>
  );
};


function SeekerPageContent() {
  const { 
    teams, 
    currentRound, 
    startSeekingPhase, 
    askQuestion, 
    clearActiveCurse, 
    seekerCompletesCurseAction,
    acceptChallengeCard,
    completeChallengeCard,
    vetoChallengeCard,
    tagHider,
  } = useGameContext();
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);
  
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionOptionType | undefined>(undefined);
  const [questionText, setQuestionText] = useState("");
  const [stationAId, setStationAId] = useState<string>("");
  const [stationBId, setStationBId] = useState<string>("");

  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [gamblerSteps, setGamblerSteps] = useState<number | null>(null);

  useEffect(() => {
    if (currentRound && currentRound.seekingTeams.length > 0) {
        const userTeam = teams.find(t => currentRound.seekingTeams.some(st => st.id === t.id) && t.isSeeking);
        setMyTeam(userTeam);
    } else if (teams.some(t => t.isSeeking)) {
        setMyTeam(teams.find(t => t.isSeeking)); 
    } else {
        setMyTeam(undefined); 
    }
  }, [teams, currentRound]);

  // Thermometer question auto-formatter
  useEffect(() => {
    if (selectedQuestionType?.category === 'Thermometer') {
      if (stationAId && stationBId) {
        const stA = MTR_STATIONS[stationAId];
        const stB = MTR_STATIONS[stationBId];
        if (stA && stB) {
          setQuestionText(`Are you closer to ${stA.name} (${stA.nameZh}) or ${stB.name} (${stB.nameZh})?`);
        }
      }
    }
  }, [selectedQuestionType, stationAId, stationBId]);

  // Check penalty active from round or local
  const penaltyEndTime = currentRound?.seekerPenaltyEndTime ? new Date(currentRound.seekerPenaltyEndTime) : null;
  const isPenaltyActive = Boolean(penaltyEndTime && penaltyEndTime.getTime() > Date.now());
  const [penaltyTimeRemaining, setPenaltyTimeRemaining] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'questions' | 'challenges' | 'timeline'>('map');

  useEffect(() => {
    if (!penaltyEndTime) {
      setPenaltyTimeRemaining(null);
      return;
    }
    const updateCountdown = () => {
      const diffSecs = Math.max(0, Math.floor((penaltyEndTime.getTime() - Date.now()) / 1000));
      if (diffSecs <= 0) {
        setPenaltyTimeRemaining(null);
      } else {
        const mins = Math.floor(diffSecs / 60);
        const secs = diffSecs % 60;
        setPenaltyTimeRemaining(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [penaltyEndTime]);

  const handleAskQuestion = () => {
    if (!myTeam) {
        toast({ title: "Error", description: "No seeking team assigned.", variant: "destructive" });
        return;
    }
    if (!selectedQuestionType || !questionText.trim()) {
        toast({ title: "Error", description: "Please select a question type and enter your question.", variant: "destructive" });
        return;
    }
    if (isPenaltyActive) {
        toast({ title: "Penalty Active", description: "Cannot ask questions during a freeze penalty.", variant: "destructive"});
        return;
    }
    if (currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') {
        toast({ title: "Curse Active", description: "Cannot ask questions while a curse is active. Resolve the curse first.", variant: "destructive"});
        return;
    }

    const newQuestion: AskedQuestion = {
      id: `asked-${Date.now()}`,
      questionOptionId: selectedQuestionType.id,
      category: selectedQuestionType.category,
      text: questionText,
      timestamp: new Date(),
      askingTeamId: myTeam.id,
      stationAId: selectedQuestionType.category === 'Thermometer' ? stationAId : undefined,
      stationBId: selectedQuestionType.category === 'Thermometer' ? stationBId : undefined,
    };

    askQuestion(newQuestion); 
    toast({ title: "Question Asked!", description: `${selectedQuestionType.name} question sent. Hiders earn ${selectedQuestionType.hiderCoinsEarned} coins.` });
    
    setQuestionText("");
    setSelectedQuestionType(undefined);
    setStationAId("");
    setStationBId("");
  };
  
  const gamePhase = currentRound?.status || 'pending';
  const isHidingPhase = gamePhase === 'hiding-phase';
  const isSeekingPhase = gamePhase === 'seeking-phase';
  const displayedAskedQuestions = currentRound?.askedQuestions || [];
  
  const activeCurseDetails = currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved'
    ? CURSE_DICE_OPTIONS.find(c => c.number === currentRound.activeCurse!.curseId)
    : null;

  const handleRollForGamblerSteps = () => {
    setGamblerSteps(Math.floor(Math.random() * 6) + 1);
  };

  if (!myTeam && isSeekingPhase) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <PageHeader title="Seeker View" icon={Search}/>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Not Assigned to a Seeking Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please wait for the admin to assign you to a seeking team for the current round, or check the Admin panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentRound || (currentRound.status !== 'hiding-phase' && currentRound.status !== 'seeking-phase')) {
     return (
      <div className="flex flex-col items-center justify-center h-full">
        <PageHeader title="Seeker View" icon={Search}/>
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

  const currentPhaseDuration = isHidingPhase ? HIDING_PHASE_DURATION_MINUTES : SEEKING_PHASE_DURATION_MINUTES;
  const timerTitle = isHidingPhase ? "Hiding Phase Ends In" : "Seeking Phase Time Left";

  const isCurseActionDisabled = currentRound?.activeCurse?.resolutionStatus === 'pending_hider_acknowledgement';

  return (
    <div className="space-y-8">
      {/* Endgame 500m Breach Siren & Capture Dialog */}
      <EndgameBreachModal
        isBreached={Boolean(currentRound?.isEndgameBreached)}
        role="seeker"
        lockedStationName={currentRound?.lockedHiderStationId ? MTR_STATIONS[currentRound.lockedHiderStationId]?.name : undefined}
        onConfirmTag={tagHider}
      />

      {/* Challenge Card Deck Modal */}
      <ChallengeDeckModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        activeChallenge={currentRound?.activeChallenge}
        onAcceptChallenge={acceptChallengeCard}
        onCompleteChallenge={completeChallengeCard}
        onVetoChallenge={vetoChallengeCard}
        isPenaltyActive={isPenaltyActive}
        penaltyTimeRemaining={penaltyTimeRemaining}
      />

      <PageHeader 
        title={`Seeker View - Team: ${myTeam?.name || "N/A"}`}
        description={isSeekingPhase ? "Find the hiders! Complete challenges and ask questions." : "Hiding phase is active. Prepare your strategy!"}
        icon={Search}
      />

      {/* Sticky Quick Mobile Match HUD */}
      <div className="sticky top-14 z-30 bg-card/95 backdrop-blur-md border border-border/80 rounded-xl p-2.5 shadow-md flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <div className="flex items-center gap-1 text-amber-500 font-mono">
            <Coins className="h-4 w-4" />
            <span>{myTeam?.coins ?? 0}</span>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <div className="flex items-center gap-1 text-sky-500 font-mono">
            <Target className="h-4 w-4" />
            <span>{70 - (currentRound?.eliminatedStationIds?.length || 0)}/70</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isPenaltyActive && (
            <Badge variant="destructive" className="animate-pulse text-[10px] px-2 py-0.5">
              🧊 Freeze ({penaltyTimeRemaining || '15m'})
            </Badge>
          )}
          {currentRound?.isEndgameBreached && (
            <Badge variant="destructive" className="animate-bounce text-[10px] px-2 py-0.5">
              🚨 500m Breach
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsChallengeModalOpen(true)}
            className="h-7 text-[11px] px-2.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-bold flex items-center gap-1 rounded-full shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {currentRound?.activeChallenge ? "Active Challenge" : "Draw Cards"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-4">
        <TabsList className="grid grid-cols-4 w-full h-11 bg-muted/90 backdrop-blur rounded-xl p-1 shadow-sm">
          <TabsTrigger value="map" className="text-xs font-semibold py-1.5 flex items-center justify-center gap-1">
            <Map className="h-3.5 w-3.5" />
            <span>Map</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="text-xs font-semibold py-1.5 flex items-center justify-center gap-1">
            <ShieldQuestion className="h-3.5 w-3.5" />
            <span>Ask ({displayedAskedQuestions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs font-semibold py-1.5 flex items-center justify-center gap-1 relative">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Deck</span>
            {currentRound?.activeChallenge && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-2 animate-ping" />
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs font-semibold py-1.5 flex items-center justify-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Feed</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RADAR MAP */}
        <TabsContent value="map" className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            {isPenaltyActive && penaltyEndTime && (
              <TimerDisplay
                title="Penalty Time Left"
                durationMinutes={CHALLENGE_PENALTY_MINUTES}
                phaseStartTime={new Date(penaltyEndTime.getTime() - CHALLENGE_PENALTY_MINUTES * 60 * 1000)}
                isActive={isPenaltyActive}
                onTimerEnd={() => {
                  toast({ title: "Penalty Over!", description: "You can resume normal actions." });
                }}
              />
            )}
          </div>

          <div className="w-full">
            <MTRMapDisplay 
              role="seeker"
              onSelectStation={(station: MTRStation) => {
                setQuestionText((prev: string) => 
                  prev ? `${prev}, ${station.name} (${station.nameZh})` : `${station.name} (${station.nameZh})`
                );
                setActiveTab('questions');
                toast({
                  title: `${station.name} Selected`,
                  description: "Switched to Questions tab with station name filled in."
                });
              }}
            />
          </div>

          {isHidingPhase && (
            <Card>
              <CardHeader>
                <CardTitle>Hiding Phase Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Hiders are traveling to their chosen station. You cannot move or ask questions yet. Plan your route!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: QUESTIONS */}
        <TabsContent value="questions" className="space-y-4 mt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><ShieldQuestion /> Ask a Question</CardTitle>
              <CardDescription className="text-xs">Get clues about the hiders' location. Hiders earn coins when questions are asked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question-type" className="text-xs">Question Type</Label>
                <Select 
                  onValueChange={(value) => {
                    const opt = QUESTION_OPTIONS.find(q => q.id === value);
                    setSelectedQuestionType(opt);
                    if (opt?.category !== 'Thermometer') {
                      setStationAId("");
                      setStationBId("");
                    }
                  }}
                  disabled={isPenaltyActive || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')}
                  value={selectedQuestionType?.id}
                >
                  <SelectTrigger id="question-type"><SelectValue placeholder="Select question type" /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_OPTIONS.map(q => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name} (Hiders earn +{q.hiderCoinsEarned})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedQuestionType && (
                <p className="text-xs text-muted-foreground">{selectedQuestionType.description}</p>
              )}

              {/* Special Thermometer Station Selectors */}
              {selectedQuestionType?.category === 'Thermometer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Station A (Option 1)</Label>
                    <Select value={stationAId} onValueChange={setStationAId}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue placeholder="Choose Station A..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs max-h-56">
                        {Object.values(MTR_STATIONS).map(s => (
                          <SelectItem key={`stA-${s.id}`} value={s.id}>
                            {s.name} ({s.nameZh})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Station B (Option 2)</Label>
                    <Select value={stationBId} onValueChange={setStationBId}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue placeholder="Choose Station B..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs max-h-56">
                        {Object.values(MTR_STATIONS).map(s => (
                          <SelectItem key={`stB-${s.id}`} value={s.id}>
                            {s.name} ({s.nameZh})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="question-text" className="text-xs">Your Question / Location Specifics</Label>
                <Textarea 
                  id="question-text" 
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={selectedQuestionType?.seekerPrompt || "Enter your question based on the selected type..."}
                  disabled={isPenaltyActive || !selectedQuestionType || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleAskQuestion} 
                disabled={isPenaltyActive || !selectedQuestionType || !questionText.trim() || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')} 
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <Send className="h-4 w-4" /> Ask Question
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Question Log & Responses</CardTitle></CardHeader>
            <CardContent>
              {displayedAskedQuestions.length === 0 ? (
                <p className="text-muted-foreground text-xs">No questions asked yet.</p>
              ) : (
                <ScrollArea className="h-[350px] pr-3">
                <ul className="space-y-3">
                  {displayedAskedQuestions.map(q => (
                    <li key={q.id} className="p-3 border rounded-md bg-card/80 text-xs">
                      <p className="font-semibold text-primary">{q.category}: <span className="text-foreground">{q.text}</span></p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Asked by {teams.find(t => t.id === q.askingTeamId)?.name || 'Unknown Seeker'} at: {new Date(q.timestamp).toLocaleTimeString()}</p>
                      {q.response && (
                        <div className="mt-2 text-xs text-accent-foreground bg-accent/20 p-2 rounded-md">
                          <strong>Hider Response:</strong> 
                          {q.category === "Photo" && typeof q.response === 'string' && q.response.startsWith('http')
                            ? <PhotoResponseDisplay imageUrl={q.response} /> 
                            : typeof q.response === 'string'
                              ? <span className="ml-1">{q.response}</span>
                              : "Invalid response format"} 
                        </div>
                      )}
                      {!q.response && <p className="mt-1 text-xs text-muted-foreground italic">Awaiting response...</p>}
                    </li>
                  ))}
                </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CHALLENGES */}
        <TabsContent value="challenges" className="space-y-4 mt-2">
          {activeCurseDetails && currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved' && (
            <Card className="border-destructive bg-destructive/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive text-base">
                  {activeCurseDetails.icon && <activeCurseDetails.icon className="h-5 w-5" />}
                  Curse Active: {activeCurseDetails.name}
                </CardTitle>
                <CardDescription className="text-destructive/90 text-xs">
                  {activeCurseDetails.description} <br />
                  { (activeCurseDetails.requiresHiderTextInput && currentRound.activeCurse.hiderInputText) && (
                    <span className="font-semibold">Hider's input: "{currentRound.activeCurse.hiderInputText}"</span>
                  )}
                  <br/>
                  <strong>Effect on Seekers:</strong> {activeCurseDetails.effect}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentRound.activeCurse.resolutionStatus === 'pending_hider_acknowledgement' ? (
                  <p className="font-semibold text-primary text-xs">Photo submitted. Awaiting hider review.</p>
                ) : activeCurseDetails.durationMinutes && currentRound.activeCurse.startTime && currentRound.activeCurse.resolutionStatus === 'pending_seeker_action' ? (
                  <>
                  <TimerDisplay
                    title="Curse Time Remaining"
                    durationMinutes={activeCurseDetails.durationMinutes}
                    phaseStartTime={new Date(currentRound.activeCurse.startTime)}
                    isActive={currentRound.activeCurse.resolutionStatus === 'pending_seeker_action'}
                    onTimerEnd={() => {
                      toast({ title: "Curse Expired", description: `${activeCurseDetails.name} is no longer active.` });
                      clearActiveCurse(); 
                    }}
                    className="text-sm"
                  />
                  {activeCurseDetails.number === 3 && ( // Curse of the Gambler's Feet
                    <div className="mt-3">
                      <Button onClick={handleRollForGamblerSteps} className="w-full flex items-center gap-2 text-xs">
                        <Dice6 className="h-4 w-4"/> Roll for Steps
                      </Button>
                      {gamblerSteps !== null && (
                        <p className="mt-2 text-center text-sm font-semibold">You can take: {gamblerSteps} step(s). Re-roll after moving.</p>
                      )}
                    </div>
                  )}
                  </>
                ) : activeCurseDetails.requiresSeekerAction === 'confirmation' && currentRound.activeCurse.resolutionStatus === 'pending_seeker_action' ? (
                  <Button onClick={() => seekerCompletesCurseAction()} className="w-full flex items-center gap-2 mt-2 text-xs" disabled={isCurseActionDisabled}>
                     <CheckSquare className="h-4 w-4" /> Mark Curse Resolved
                  </Button>
                ) : activeCurseDetails.requiresSeekerAction === 'photo' && currentRound.activeCurse.resolutionStatus === 'pending_seeker_action' ? (
                   <SeekerCursePhotoUpload 
                     onPhotoSubmit={(file) => seekerCompletesCurseAction(file)}
                     disabled={isCurseActionDisabled}
                   />
                ) : null }
              </CardContent>
            </Card>
          )}

          {/* Jet Lag Hong Kong Challenge Deck */}
          <Card className="border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <CardTitle className="text-base text-white">Challenge Card Deck</CardTitle>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-amber-300">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>{myTeam?.coins ?? 0} Coins</span>
                </div>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Draw and complete authentic Hong Kong tasks to earn coins for asking questions.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4">
              {currentRound?.activeChallenge ? (
                <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-amber-600 text-white text-[10px]">
                      ACTIVE: {currentRound.activeChallenge.card.difficulty.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      +{currentRound.activeChallenge.card.coinsReward} Coins
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm">
                    {currentRound.activeChallenge.card.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentRound.activeChallenge.card.description}
                  </p>

                  <Button
                    onClick={() => setIsChallengeModalOpen(true)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-9 mt-2"
                  >
                    Open Active Challenge & Submit Proof
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/30">
                    <Sparkles className="h-6 w-6 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Draw Next Challenge</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Draw 2 cards from the deck and pick your task (+15 to 120 coins).
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsChallengeModalOpen(true)}
                    disabled={isPenaltyActive || !isSeekingPhase}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-6 h-9 shadow-lg"
                  >
                    Draw 2 Challenge Cards
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: TIMELINE FEED */}
        <TabsContent value="timeline" className="space-y-4 mt-2">
          <MatchTimeline events={currentRound?.timeline} maxHeight="600px" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SeekerPage() {
  return (
    <PinProtectPage role="seeker">
      <SeekerPageContent />
    </PinProtectPage>
  );
}
