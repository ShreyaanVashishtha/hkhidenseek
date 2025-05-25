
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
import { useToast } from '@/hooks/use-toast';
import { Eye, ShieldQuestion, Upload, Send, Dice5, Zap, Coins, HelpCircle, CheckCircle, Image as ImageIcon } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PinProtectPage } from '@/components/auth/PinProtectPage';

interface SeekerPhotoDisplayProps {
  file: File;
}

const SeekerPhotoDisplay: React.FC<SeekerPhotoDisplayProps> = ({ file }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  if (!imageUrl) return <p className="text-sm text-muted-foreground">Loading seeker's photo...</p>;

  return (
    <div className="mt-2">
      <p className="text-sm font-medium">Seeker's Submitted Photo for Curse Resolution:</p>
      <Image src={imageUrl} alt="Seeker's photo for curse" width={200} height={150} className="rounded-md border object-contain" />
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
    hiderAcknowledgesSeekerPhoto 
  } = useGameContext();
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined); 
  
  const [selectedQuestionToAnswer, setSelectedQuestionToAnswer] = useState<AskedQuestion | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responsePhoto, setResponsePhoto] = useState<File | null>(null);
  const [yesNoResponse, setYesNoResponse] = useState<"yes" | "no" | undefined>(undefined);

  const [rolledCurse, setRolledCurse] = useState<CurseRule | null>(null);
  const [hasPendingRoll, setHasPendingRoll] = useState(false);
  const [hiderCurseInputText, setHiderCurseInputText] = useState("");


  useEffect(() => {
    const currentHidingTeamIdInRound = currentRound?.hidingTeam?.id;

    // Update myTeam state
    if (currentHidingTeamIdInRound) {
      const teamFromContext = teams.find(t => t.id === currentHidingTeamIdInRound);
      if (teamFromContext?.id !== myTeam?.id) {
        setMyTeam(teamFromContext);
      }
    } else {
      const generalHidingTeam = teams.find(t => t.isHiding);
      if (generalHidingTeam?.id !== myTeam?.id) {
        setMyTeam(generalHidingTeam);
      } else if (!generalHidingTeam && myTeam) {
        setMyTeam(undefined);
      }
    }
    
    const globallyActiveCurseInfo = currentRound?.activeCurse;

    if (globallyActiveCurseInfo && globallyActiveCurseInfo.resolutionStatus !== 'resolved') {
      // There is a globally active curse. Display it.
      const globalCurseDetails = CURSE_DICE_OPTIONS.find(c => c.number === globallyActiveCurseInfo.curseId);
      if (globalCurseDetails) {
        // If local rolledCurse isn't already showing this global curse, or if it's a different one, update it.
        if (!rolledCurse || rolledCurse.number !== globalCurseDetails.number) {
          setRolledCurse(globalCurseDetails);
        }
        setHiderCurseInputText(globallyActiveCurseInfo.hiderInputText || "");
      }
    } else {
      // No globally active curse.
      // If `hasPendingRoll` is true, user is in "buy" phase. `rolledCurse` should be null (set by handleBuyCurseDice).
      // If `hasPendingRoll` is false AND `rolledCurse` is non-null, it means a local roll is pending activation. We should *keep* it displayed.
      // If `hasPendingRoll` is false AND `rolledCurse` IS null (e.g., after activation, or initial state), clear related input text.
      if (!hasPendingRoll && !rolledCurse) {
        setHiderCurseInputText("");
      }
      // If `rolledCurse` *is* set (a local roll is pending) and there's no global curse, DO NOT clear `rolledCurse` here.
      // It will be cleared by `handleActivateRolledCurse` or `handleBuyCurseDice`.
    }
  }, [teams, currentRound, myTeam, hasPendingRoll, rolledCurse]);


  const handleSendResponse = () => {
    if (!selectedQuestionToAnswer || !myTeam) return;

    let finalResponse: string | File = "";
    if (["Radar", "Precision", "Scan"].includes(selectedQuestionToAnswer.category)) {
      if (!yesNoResponse) {
        toast({ title: "Error", description: "Please select Yes or No.", variant: "destructive" });
        return;
      }
      finalResponse = yesNoResponse.charAt(0).toUpperCase() + yesNoResponse.slice(1);
    } else if (selectedQuestionToAnswer.category === "Photo") {
      if (!responsePhoto) {
        toast({ title: "Error", description: "Please upload a photo.", variant: "destructive" });
        return;
      }
      finalResponse = responsePhoto;
    } else { // Relative
      if (!responseText.trim()) {
        toast({ title: "Error", description: "Please enter your response.", variant: "destructive" });
        return;
      }
      finalResponse = responseText;
    }

    answerQuestion(selectedQuestionToAnswer.id, finalResponse);
    toast({ title: "Response Sent!", description: `Your response to "${selectedQuestionToAnswer.text.substring(0,20)}..." has been sent.` });
    
    setSelectedQuestionToAnswer(null);
    setResponseText("");
    setResponsePhoto(null);
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
    // Check if a curse is already globally active OR if a local roll is pending activation
    if ((currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') || rolledCurse) { 
      toast({ title: "Roll Pending or Curse Active", description: "A dice roll is pending activation, or a curse is already globally active.", variant: "destructive" });
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
      return;
    }
    if (currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') {
         toast({ title: "Cannot Roll", description: "A curse is already active globally for this round.", variant: "destructive" });
        return;
    }

    const roll = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
    const curseDetails = CURSE_DICE_OPTIONS.find(c => c.number === roll);
    if (curseDetails) {
        setRolledCurse(curseDetails); 
        setHasPendingRoll(false); 
        toast({ title: "Dice Rolled!", description: `You got: ${curseDetails.name}. Confirm to activate.` });
    }
  };

  const handleActivateRolledCurse = () => {
    if (!myTeam || !rolledCurse || (currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved') ) {
        toast({ title: "Activation Error", description: "No curse rolled or a curse is already active.", variant: "destructive" });
        return;
    }
    if ((myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND) { // This check uses current cursesUsed, before incrementing for this one
      toast({ title: "Max Curses Used", description: `Cannot activate, max curses for this round reached.`, variant: "destructive" });
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
    if (!currentRound?.activeCurse || currentRound.activeCurse.resolutionStatus !== 'pending_hider_acknowledgement' || !currentRound.activeCurse.seekerSubmittedPhoto) {
      toast({ title: "Error", description: "No seeker photo to acknowledge or curse not in correct state.", variant: "destructive" });
      return;
    }
    hiderAcknowledgesSeekerPhoto();
  };
  
  const gamePhase = currentRound?.status || 'pending';
  const isHidingPhase = gamePhase === 'hiding-phase';
  const isSeekingPhase = gamePhase === 'seeking-phase';

  const questionsToAnswer = currentRound?.askedQuestions?.filter(q => !q.response) || [];


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

  const currentPhaseDuration = isHidingPhase ? HIDING_PHASE_DURATION_MINUTES : SEEKING_PHASE_DURATION_MINUTES;
  const timerTitle = isHidingPhase ? "Hiding Phase Ends In" : "Seeking Phase Active";

  const globallyActiveCurseInfo = currentRound?.activeCurse && currentRound.activeCurse.resolutionStatus !== 'resolved' 
    ? currentRound.activeCurse 
    : null;
  
  const displayedActiveCurseDetails = globallyActiveCurseInfo
    ? CURSE_DICE_OPTIONS.find(c => c.number === globallyActiveCurseInfo.curseId) 
    : null;

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Hider View - Team: ${myTeam?.name || "N/A"}`}
        description={isHidingPhase ? "Choose your hiding spot! The seekers are waiting." : "Evade the seekers! Answer their questions carefully."}
        icon={Eye}
      />
       <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    Team Coins: {myTeam?.coins ?? 0}
                </CardTitle>
                <CardDescription>Earn coins when seekers ask questions (see Rules). Use coins for Curse Dice.</CardDescription>
            </CardHeader>
        </Card>


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
        />
        <MTRMapDisplay />
      </div>

      {isHidingPhase && (
        <Card>
          <CardHeader>
            <CardTitle>Hiding Phase Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You have <strong>{HIDING_PHASE_DURATION_MINUTES} minutes</strong> to choose and travel to your hiding zone (500m radius from an MTR station).
              Stay within your zone and remain together. Good luck!
            </p>
          </CardContent>
        </Card>
      )}
      
      {isSeekingPhase && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Incoming Questions ({questionsToAnswer.length})</CardTitle>
              <CardDescription>Seekers are asking questions. Respond strategically!</CardDescription>
            </CardHeader>
            <CardContent>
              {questionsToAnswer.length === 0 ? (
                <p className="text-muted-foreground">No unanswered questions from seekers yet. Stay hidden!</p>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-4">
                  {questionsToAnswer.map(q => (
                    <li key={q.id} className={`p-3 border rounded-md cursor-pointer hover:bg-accent/10 ${selectedQuestionToAnswer?.id === q.id ? 'ring-2 ring-primary bg-primary/5' : 'bg-card/80'}`} onClick={() => setSelectedQuestionToAnswer(q)}>
                      <p className="font-semibold text-primary">{q.category}: <span className="text-foreground">{q.text}</span></p>
                      <p className="text-xs text-muted-foreground">From: Team {currentRound?.seekingTeams.find(st => st.id === q.askingTeamId)?.name || 'Seeker'} | Received: {new Date(q.timestamp).toLocaleTimeString()}</p>
                    </li>
                  ))}
                </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {selectedQuestionToAnswer && (
            <Card>
              <CardHeader>
                <CardTitle>Respond to: "{selectedQuestionToAnswer.text.substring(0,50)}..."</CardTitle>
                <CardDescription>Category: {selectedQuestionToAnswer.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Radar", "Precision", "Scan"].includes(selectedQuestionToAnswer.category) && (
                  <div>
                    <Label>Your Answer (Truthful Yes/No):</Label>
                    <RadioGroup onValueChange={(val: "yes" | "no") => setYesNoResponse(val)} value={yesNoResponse} className="flex gap-4 mt-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`yes-${selectedQuestionToAnswer.id}`} />
                        <Label htmlFor={`yes-${selectedQuestionToAnswer.id}`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`no-${selectedQuestionToAnswer.id}`} />
                        <Label htmlFor={`no-${selectedQuestionToAnswer.id}`}>No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                {selectedQuestionToAnswer.category === "Photo" && (
                  <div className="space-y-2">
                    <Label htmlFor="photo-upload">Upload Photo (no direct clues):</Label>
                    <Input 
                      id="photo-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setResponsePhoto(e.target.files ? e.target.files[0] : null)} 
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                    />
                    {responsePhoto && <p className="text-xs text-muted-foreground">Selected: {responsePhoto.name}</p>}
                  </div>
                )}
                {selectedQuestionToAnswer.category === "Relative" && ( 
                   <div className="space-y-2">
                     <Label htmlFor="text-response">Your Detailed Response:</Label>
                     <Textarea 
                        id="text-response" 
                        value={responseText} 
                        onChange={(e) => setResponseText(e.target.value)} 
                        placeholder="Enter your response..."
                      />
                   </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSendResponse} className="flex items-center gap-2"><Send /> Send Response</Button>
              </CardFooter>
            </Card>
          )}
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap/> Curse Dice</CardTitle>
                <CardDescription>Cost: {CURSE_DICE_COST} coins. Max {MAX_CURSES_PER_ROUND} uses per round. Curses used this round: {myTeam?.cursesUsed ?? 0}/{MAX_CURSES_PER_ROUND}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-start">
                <Button 
                    onClick={handleBuyCurseDice} 
                    disabled={!myTeam || myTeam.coins < CURSE_DICE_COST || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || hasPendingRoll || !!globallyActiveCurseInfo || !!rolledCurse}
                    className="flex items-center gap-2"
                >
                    <Dice5/> Buy Curse Dice ({CURSE_DICE_COST} coins)
                </Button>
                <Button 
                    onClick={handleRollCurseDice} 
                    disabled={!myTeam || !hasPendingRoll || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || !!rolledCurse || !!globallyActiveCurseInfo}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    Roll Dice!
                </Button>
            </CardContent>
            
            {/* Section for newly rolled curse (before activation) */}
            {rolledCurse && !globallyActiveCurseInfo && ( 
                <CardContent className="pt-4 space-y-3">
                  <Separator/>
                  <h4 className="font-semibold text-lg text-accent flex items-center gap-2">
                      {rolledCurse.icon && <rolledCurse.icon className="h-5 w-5"/>}
                      Rolled: {rolledCurse.name}
                  </h4>
                  <p className="text-sm">{rolledCurse.description}</p>
                  <p className="text-xs text-muted-foreground"><strong>Effect on Seekers:</strong> {rolledCurse.effect}</p>
                  
                  {rolledCurse.requiresHiderTextInput && (
                    <div className="space-y-2">
                      <Label htmlFor="hider-curse-input">Provide Details (e.g., Animal Category for Zoologist):</Label>
                      <Textarea 
                        id="hider-curse-input"
                        value={hiderCurseInputText}
                        onChange={(e) => setHiderCurseInputText(e.target.value)}
                        placeholder="Enter required details here..."
                        className="bg-background"
                      />
                    </div>
                  )}
                  <Button 
                    onClick={handleActivateRolledCurse}
                    disabled={(myTeam?.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || !!globallyActiveCurseInfo || (rolledCurse.requiresHiderTextInput && !hiderCurseInputText.trim())}
                    className="w-full"
                  >
                    Activate {rolledCurse.name} for Seekers
                  </Button>
                </CardContent>
            )}

            {/* Section for globally active curse */}
            { displayedActiveCurseDetails && globallyActiveCurseInfo && ( 
                 <CardFooter className="pt-4 mt-2 border-t">
                    <div className="p-4 border rounded-md bg-primary/10 w-full space-y-2">
                        <h4 className="font-semibold text-lg text-primary flex items-center gap-2">
                            {displayedActiveCurseDetails.icon && <displayedActiveCurseDetails.icon className="h-5 w-5"/>}
                            Curse Active: {displayedActiveCurseDetails.name}
                        </h4>
                        <p className="text-sm">{displayedActiveCurseDetails.description}</p>
                         {globallyActiveCurseInfo.hiderInputText && (
                            <p className="text-sm mt-1"><strong>Hider's Input:</strong> {globallyActiveCurseInfo.hiderInputText}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1"><strong>Effect on Seekers:</strong> {displayedActiveCurseDetails.effect}</p>
                        
                        {displayedActiveCurseDetails.durationMinutes && globallyActiveCurseInfo.startTime && globallyActiveCurseInfo.resolutionStatus === 'pending_seeker_action' && (
                           <div className="mt-2">
                             <TimerDisplay
                                title="Curse Active For"
                                durationMinutes={displayedActiveCurseDetails.durationMinutes}
                                phaseStartTime={new Date(globallyActiveCurseInfo.startTime)}
                                isActive={!!globallyActiveCurseInfo && globallyActiveCurseInfo.resolutionStatus === 'pending_seeker_action'}
                                onTimerEnd={() => { /* Seeker side handles clearing */ }} 
                                className="text-sm"
                             />
                           </div>
                        )}

                        {displayedActiveCurseDetails.requiresSeekerAction === 'photo' && globallyActiveCurseInfo.seekerSubmittedPhoto && globallyActiveCurseInfo.resolutionStatus === 'pending_hider_acknowledgement' && (
                          <div className="space-y-2 p-3 bg-background rounded-md border border-dashed">
                            <SeekerPhotoDisplay file={globallyActiveCurseInfo.seekerSubmittedPhoto} />
                            <Button onClick={handleHiderAcknowledgePhoto} className="w-full mt-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" /> Accept Seeker's Photo & End Curse
                            </Button>
                          </div>
                        )}
                         {displayedActiveCurseDetails.requiresSeekerAction === 'photo' && !globallyActiveCurseInfo.seekerSubmittedPhoto && globallyActiveCurseInfo.resolutionStatus === 'pending_seeker_action' && (
                            <p className="text-sm text-muted-foreground italic">Waiting for seeker to submit photo for this curse...</p>
                        )}
                         {globallyActiveCurseInfo.resolutionStatus === 'resolved' && ( // Should not happen if logic is correct
                            <p className="text-sm text-green-600 font-semibold">Curse has been resolved.</p>
                        )}
                    </div>
                </CardFooter>
            )}
          </Card>
        </>
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

    