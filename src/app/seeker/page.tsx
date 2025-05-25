
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
import { Search, ShieldQuestion, Send, ThumbsUp, ThumbsDown, ListChecks, Zap, Upload, CheckSquare, AlertTriangle, Dice6 } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { PinProtectPage } from '@/components/auth/PinProtectPage';

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
  const { teams, currentRound, startSeekingPhase, askQuestion, clearActiveCurse, seekerCompletesCurseAction } = useGameContext();
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);
  
  const [currentChallengeDescription, setCurrentChallengeDescription] = useState<string>("");
  const [challenges, setChallenges] = useState<Challenge[]>([]); 
  
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionOptionType | undefined>(undefined);
  const [questionText, setQuestionText] = useState("");

  const [isPenaltyActive, setIsPenaltyActive] = useState(false);
  const [penaltyEndTime, setPenaltyEndTime] = useState<Date | null>(null);
  const [gamblerSteps, setGamblerSteps] = useState<number | null>(null);


  useEffect(() => {
    if (currentRound && currentRound.seekingTeams.length > 0) {
        const userTeam = teams.find(t => currentRound.seekingTeams.some(st => st.id === t.id) && t.isSeeking);
        setMyTeam(userTeam);
    } else if (teams.some(t => t.isSeeking)) {
        // Fallback if currentRound.seekingTeams is not yet populated but a team is marked as seeker
        setMyTeam(teams.find(t => t.isSeeking)); 
    } else {
        setMyTeam(undefined); 
    }
  }, [teams, currentRound]);

  const handleChallengeSubmit = (status: "completed" | "failed" | "vetoed") => {
    if (!myTeam) {
      toast({ title: "Error", description: "No seeking team assigned.", variant: "destructive" });
      return;
    }
    if (!currentChallengeDescription) {
        toast({ title: "Error", description: "Challenge description cannot be empty.", variant: "destructive" });
        return;
    }

    const challenge: Challenge = {
      id: `challenge-${Date.now()}`,
      description: currentChallengeDescription,
      status,
    };
    setChallenges(prev => [challenge, ...prev]); 

    if (status === "completed") {
      toast({ title: "Challenge Completed!", description: `Good job, ${myTeam.name}!` });
    } else { 
      setIsPenaltyActive(true);
      const newPenaltyEndTime = new Date(Date.now() + CHALLENGE_PENALTY_MINUTES * 60 * 1000);
      setPenaltyEndTime(newPenaltyEndTime);
      toast({ title: `Challenge ${status === "failed" ? "Failed" : "Vetoed"}`, description: `${CHALLENGE_PENALTY_MINUTES} min penalty for ${myTeam.name}.`, variant: "destructive" });
    }
    setCurrentChallengeDescription("");
  };

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
        toast({ title: "Penalty Active", description: "Cannot ask questions during a penalty.", variant: "destructive"});
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
    };

    askQuestion(newQuestion); 
    toast({ title: "Question Asked!", description: `${selectedQuestionType.name} question sent. Hiders earn ${selectedQuestionType.hiderCoinsEarned} coins.` });
    
    setQuestionText("");
    setSelectedQuestionType(undefined); 
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
      <PageHeader 
        title={`Seeker View - Team: ${myTeam?.name || "N/A"}`}
        description={isSeekingPhase ? "Find the hiders! Complete challenges and ask questions." : "Hiding phase is active. Prepare your strategy!"}
        icon={Search}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimerDisplay 
          title={timerTitle}
          durationMinutes={currentPhaseDuration}
          phaseStartTime={currentRound?.phaseStartTime ? new Date(currentRound.phaseStartTime) : undefined}
          isActive={isHidingPhase || isSeekingPhase}
          onTimerEnd={isHidingPhase ? () => {
            toast({ title: "Hiding Phase Over!", description: "Seeking phase has begun!" });
            if(currentRound?.status === 'hiding-phase') startSeekingPhase(); 
          } : undefined}
          className="lg:col-span-1"
        />
         {isPenaltyActive && penaltyEndTime && (
          <TimerDisplay
            title="Penalty Time Left"
            durationMinutes={CHALLENGE_PENALTY_MINUTES}
            phaseStartTime={new Date(penaltyEndTime.getTime() - CHALLENGE_PENALTY_MINUTES * 60 * 1000)}
            isActive={isPenaltyActive}
            onTimerEnd={() => {
              setIsPenaltyActive(false);
              setPenaltyEndTime(null);
              toast({ title: "Penalty Over!", description: "You can resume normal actions." });
            }}
            className="lg:col-span-1"
          />
        )}
      </div>
      
      {isHidingPhase && (
        <Card>
          <CardHeader>
            <CardTitle>Hiding Phase Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Hiders are choosing their location. You cannot move or perform actions yet. Plan your strategy!</p>
          </CardContent>
        </Card>
      )}

      {isSeekingPhase && (
        <>
          {activeCurseDetails && currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved' && (
            <Card className="border-destructive bg-destructive/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  {activeCurseDetails.icon && <activeCurseDetails.icon className="h-6 w-6" />}
                  Curse Active: {activeCurseDetails.name}
                </CardTitle>
                <CardDescription className="text-destructive/90">
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
                  <p className="font-semibold text-primary">Photo submitted. Awaiting hider review.</p>
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
                      <Button onClick={handleRollForGamblerSteps} className="w-full flex items-center gap-2">
                        <Dice6 className="h-4 w-4"/> Roll for Steps
                      </Button>
                      {gamblerSteps !== null && (
                        <p className="mt-2 text-center text-lg font-semibold">You can take: {gamblerSteps} step(s). Re-roll after moving.</p>
                      )}
                    </div>
                  )}
                  </>
                ) : activeCurseDetails.requiresSeekerAction === 'confirmation' && currentRound.activeCurse.resolutionStatus === 'pending_seeker_action' ? (
                  <Button onClick={() => seekerCompletesCurseAction()} className="w-full flex items-center gap-2 mt-2" disabled={isCurseActionDisabled}>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks /> Challenges</CardTitle>
              <CardDescription>Complete challenges. Penalties apply for failure or veto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="challenge-desc">Challenge Description</Label>
                <Textarea 
                  id="challenge-desc" 
                  value={currentChallengeDescription} 
                  onChange={(e) => setCurrentChallengeDescription(e.target.value)}
                  placeholder="Describe the physical or location-based task" 
                  disabled={isPenaltyActive || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button 
                onClick={() => handleChallengeSubmit('completed')} 
                disabled={isPenaltyActive || !currentChallengeDescription || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')} 
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"><ThumbsUp/>Completed</Button>
              <Button 
                variant="outline" 
                onClick={() => handleChallengeSubmit('failed')} 
                disabled={isPenaltyActive || !currentChallengeDescription || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')} 
                className="flex items-center gap-2"><ThumbsDown/>Failed</Button>
              {currentChallengeDescription && 
                <VetoConsequenceModal 
                  challengeDescription={currentChallengeDescription} 
                  onConfirmVeto={() => handleChallengeSubmit('vetoed')} 
                  triggerDisabled={isPenaltyActive || !currentChallengeDescription || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')}
                />
              }
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Ask a Question</CardTitle>
              <CardDescription>Get clues about the hiders' location. Questions are free for seekers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question-type">Question Type</Label>
                <Select 
                  onValueChange={(value) => setSelectedQuestionType(QUESTION_OPTIONS.find(q => q.id === value))}
                  disabled={isPenaltyActive || (!!currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved')}
                  value={selectedQuestionType?.id}
                >
                  <SelectTrigger id="question-type"><SelectValue placeholder="Select question type" /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_OPTIONS.map(q => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name} (Hiders earn {q.hiderCoinsEarned})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedQuestionType && (
                <p className="text-sm text-muted-foreground">{selectedQuestionType.description}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="question-text">Your Question / Location Specifics</Label>
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
                className="flex items-center gap-2"
              >
                <Send /> Ask Question
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader><CardTitle>Question Log & Responses</CardTitle></CardHeader>
            <CardContent>
              {displayedAskedQuestions.length === 0 ? (
                <p className="text-muted-foreground">No questions asked yet.</p>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-4">
                  {displayedAskedQuestions.map(q => (
                    <li key={q.id} className="p-3 border rounded-md bg-card/80">
                      <p className="font-semibold text-primary">{q.category}: <span className="text-foreground">{q.text}</span></p>
                      <p className="text-xs text-muted-foreground">Asked by {teams.find(t => t.id === q.askingTeamId)?.name || 'Unknown Seeker'} at: {new Date(q.timestamp).toLocaleTimeString()}</p>
                      {q.response && (
                        <div className="mt-1 text-sm text-accent-foreground bg-accent/20 p-2 rounded-md">
                          Hider Response: 
                          {q.category === "Photo" && typeof q.response === 'string' && q.response.startsWith('http')
                            ? <PhotoResponseDisplay imageUrl={q.response} /> 
                            : typeof q.response === 'string'
                              ? <span className="ml-1">{q.response}</span>
                              : "Invalid response format"} 
                        </div>
                      )}
                      {!q.response && <p className="mt-1 text-sm text-muted-foreground italic">Awaiting response...</p>}
                    </li>
                  ))}
                </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Challenge History</CardTitle></CardHeader>
            <CardContent>
              {challenges.length === 0 ? (
                 <p className="text-muted-foreground">No challenges attempted yet.</p>
              ) : (
                <ScrollArea className="h-[200px] pr-4">
                <ul className="space-y-2">
                  {challenges.map(c => (
                    <li key={c.id} className={`p-2 border rounded-md text-sm ${c.status === "completed" ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"}`}>
                      <p className="font-medium">{c.description}</p>
                      <p>Status: {c.status}</p>
                    </li>
                  ))}
                </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
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
