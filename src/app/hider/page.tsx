
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useGameContext } from "@/hooks/useGameContext";
import type { AskedQuestion, Team } from "@/lib/types";
import { CURSE_DICE_COST, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND, HIDING_PHASE_DURATION_MINUTES, SEEKING_PHASE_DURATION_MINUTES, COINS_EARNED_PER_QUESTION } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import { MTRMapDisplay } from "@/components/game/MTRMapDisplay";
import { useToast } from '@/hooks/use-toast';
import { Eye, ShieldQuestion, Upload, Send, Dice5, Zap, Coins } from "lucide-react"; // Added Coins icon
import { ScrollArea } from '@/components/ui/scroll-area';

export default function HiderPage() {
  const { teams, currentRound, updateTeamCoins, startSeekingPhase, answerQuestion } = useGameContext();
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined); 
  
  const [selectedQuestionToAnswer, setSelectedQuestionToAnswer] = useState<AskedQuestion | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responsePhoto, setResponsePhoto] = useState<File | null>(null);
  const [yesNoResponse, setYesNoResponse] = useState<"yes" | "no" | undefined>(undefined);

  const [rolledCurse, setRolledCurse] = useState<{ number: number; name: string; description: string; effect: string; icon: React.ElementType } | null>(null);

  useEffect(() => {
    // Find the hider team from the context's currentRound if available, otherwise from teams list
    if (currentRound?.hidingTeam) {
      // Ensure 'myTeam' state reflects the potentially updated coin balance from GameContext
      const updatedHidingTeamFromContext = teams.find(t => t.id === currentRound.hidingTeam!.id);
      setMyTeam(updatedHidingTeamFromContext);
    } else {
       setMyTeam(teams.find(t => t.isHiding));
    }
  }, [teams, currentRound]);

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
    } else { 
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
      toast({ title: "Not enough coins!", description: `You need ${CURSE_DICE_COST} coins to buy Curse Dice. You have ${myTeam.coins}.`, variant: "destructive" });
      return;
    }
    if (myTeam.cursesUsed >= MAX_CURSES_PER_ROUND) {
      toast({ title: "Max Curses Used", description: `You have already used curse dice ${MAX_CURSES_PER_ROUND} times this round.`, variant: "destructive" });
      return;
    }
    updateTeamCoins(myTeam.id, CURSE_DICE_COST, 'subtract');
    // The `myTeam` state will be updated via useEffect when `teams` from context changes.
    toast({ title: "Curse Dice Purchased!", description: `-${CURSE_DICE_COST} coins. Roll the dice!` });
  };

  const handleRollCurseDice = () => {
    if (!myTeam || (myTeam.cursesUsed || 0) === 0 || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || !currentRound?.seekingTeams.length) { 
        toast({ title: "Cannot Roll", description: "Buy curse dice first or max uses reached.", variant: "destructive" });
        return;
    }
    // Increment cursesUsed via context (or a dedicated function if preferred)
    // For simplicity, we can let the Admin verify, or add a function to context later.
    // Here, we'll assume the buyCurse already implicitly means one use will occur.
    // Or, we can update cursesUsed directly here and rely on it in context if needed.
    // For now, we'll let the toast handle the UI and assume `myTeam.cursesUsed` is updated by `buyCurseDice` or its effect.
    // A more robust solution might be: updateTeamCursesUsed(myTeam.id, 1, 'add');

    const roll = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
    const curse = CURSE_DICE_OPTIONS.find(c => c.number === roll);
    if (curse) {
        setRolledCurse(curse);
        // Increment cursesUsed count on the team (optimistic update for UI, context should be source of truth)
        setMyTeam(prev => prev ? ({...prev, cursesUsed: (prev.cursesUsed || 0) + 1 }) : undefined);
        toast({ title: "Curse Rolled!", description: `Curse of ${curse.name} activated!` });
    }
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
                <CardDescription>Earn {COINS_EARNED_PER_QUESTION} coins for each question seekers ask. Use coins for Curse Dice.</CardDescription>
            </CardHeader>
        </Card>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimerDisplay 
          title={timerTitle}
          durationMinutes={currentPhaseDuration}
          phaseStartTime={currentRound?.phaseStartTime}
          isActive={isHidingPhase || isSeekingPhase}
          onTimerEnd={isHidingPhase ? () => {
            toast({ title: "Hiding Phase Over!", description: "Seeking phase has begun!" });
            startSeekingPhase();
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
              <CardDescription>Seekers are asking questions. Respond strategically to earn coins!</CardDescription>
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
            <CardContent className="flex flex-wrap gap-4 items-center">
                <Button 
                    onClick={handleBuyCurseDice} 
                    disabled={!myTeam || myTeam.coins < CURSE_DICE_COST || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND}
                    className="flex items-center gap-2"
                >
                    <Dice5/> Buy Curse Dice ({CURSE_DICE_COST} coins)
                </Button>
                <Button 
                    onClick={handleRollCurseDice} 
                    disabled={!myTeam || (myTeam.cursesUsed || 0) === 0 || (myTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND || !currentRound?.seekingTeams.length || rolledCurse !== null}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    Roll Dice!
                </Button>
            </CardContent>
            {rolledCurse && (
                <CardFooter className="pt-4">
                    <div className="p-4 border rounded-md bg-accent/10 w-full">
                        <h4 className="font-semibold text-lg text-accent flex items-center gap-2">
                            <rolledCurse.icon className="h-5 w-5"/>
                            Rolled: {rolledCurse.name}
                        </h4>
                        <p className="text-sm">{rolledCurse.description}</p>
                        <p className="text-xs text-muted-foreground mt-1"><strong>Effect on Seekers:</strong> {rolledCurse.effect}</p>
                    </div>
                </CardFooter>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
