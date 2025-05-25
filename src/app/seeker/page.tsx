
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGameContext } from "@/hooks/useGameContext";
import type { Challenge, AskedQuestion, QuestionOption as QuestionOptionType, Team } from "@/lib/types";
import { QUESTION_OPTIONS, CHALLENGE_PENALTY_MINUTES, HIDING_PHASE_DURATION_MINUTES, SEEKING_PHASE_DURATION_MINUTES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import { VetoConsequenceModal } from "@/components/game/VetoConsequenceModal";
import { useToast } from '@/hooks/use-toast';
import { Search, ShieldQuestion, Send, ThumbsUp, ThumbsDown, ListChecks } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SeekerPage() {
  const { teams, currentRound, startSeekingPhase } = useGameContext(); // Removed updateTeamCoins
  const { toast } = useToast();

  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);
  
  const [currentChallengeDescription, setCurrentChallengeDescription] = useState<string>("");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionOptionType | undefined>(undefined);
  const [questionText, setQuestionText] = useState("");
  const [askedQuestions, setAskedQuestions] = useState<AskedQuestion[]>([]); 

  const [isPenaltyActive, setIsPenaltyActive] = useState(false);
  const [penaltyEndTime, setPenaltyEndTime] = useState<Date | null>(null);


  useEffect(() => {
    // Attempt to find a team that is actively seeking in the current round
    if (currentRound && currentRound.seekingTeams.length > 0) {
        // This logic assumes a player belongs to one of the currentRound.seekingTeams.
        // A more robust solution might involve a currentUser concept or team selection UI.
        // For now, picking the first seeking team if multiple.
        setMyTeam(teams.find(t => t.id === currentRound.seekingTeams[0].id && t.isSeeking));
    } else {
        // If no current round or no seeking teams in current round, try to find a team generally marked as seeking.
        // This is a fallback and might not be desired depending on game flow.
        setMyTeam(teams.find(t => t.isSeeking));
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
      // coinsEarned is removed from type, no longer relevant here
    };
    setChallenges(prev => [challenge, ...prev]);

    if (status === "completed") {
      // No coins awarded for completing challenges anymore
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
    // Coin check removed: if (myTeam.coins < selectedQuestionType.cost)
    if (isPenaltyActive) {
        toast({ title: "Penalty Active", description: "Cannot ask questions during a penalty.", variant: "destructive"});
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

    // updateTeamCoins call removed
    setAskedQuestions(prev => [newQuestion, ...prev]);
    toast({ title: "Question Asked!", description: `${selectedQuestionType.name} question sent.` });
    
    setTimeout(() => {
        setAskedQuestions(prev => prev.map(q => q.id === newQuestion.id ? {...q, response: "Hider's mock response: Yes/No/Photo pending..."} : q));
    }, 3000);

    setQuestionText("");
    // setSelectedQuestionType(undefined); // Optionally reset question type
  };
  
  const gamePhase = currentRound?.status || 'pending';
  const isHidingPhase = gamePhase === 'hiding-phase';
  const isSeekingPhase = gamePhase === 'seeking-phase';

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

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Seeker View - Team: ${myTeam?.name || "N/A"}`}
        description={isSeekingPhase ? "Find the hiders! Complete challenges and ask questions." : "Hiding phase is active. Prepare your strategy!"}
        icon={Search}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> {/* Changed from lg:grid-cols-3 */}
        <TimerDisplay 
          title={timerTitle}
          durationMinutes={currentPhaseDuration}
          phaseStartTime={currentRound?.phaseStartTime}
          isActive={isHidingPhase || isSeekingPhase}
          onTimerEnd={isHidingPhase ? () => {
            toast({ title: "Hiding Phase Over!", description: "Seeking phase has begun!" });
            startSeekingPhase(); // Call from context
          } : undefined}
          className="lg:col-span-1"
        />
        {/* Team Coins card removed */}
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
                  disabled={isPenaltyActive}
                />
              </div>
              {/* Coins for completion input removed */}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button onClick={() => handleChallengeSubmit('completed')} disabled={isPenaltyActive || !currentChallengeDescription} className="bg-green-600 hover:bg-green-700 flex items-center gap-2"><ThumbsUp/>Completed</Button>
              <Button variant="outline" onClick={() => handleChallengeSubmit('failed')} disabled={isPenaltyActive || !currentChallengeDescription} className="flex items-center gap-2"><ThumbsDown/>Failed</Button>
              {currentChallengeDescription && 
                <VetoConsequenceModal 
                  challengeDescription={currentChallengeDescription} 
                  onConfirmVeto={() => handleChallengeSubmit('vetoed')} 
                />
              }
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Ask a Question</CardTitle>
              <CardDescription>Get clues about the hiders' location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question-type">Question Type</Label>
                <Select 
                  onValueChange={(value) => setSelectedQuestionType(QUESTION_OPTIONS.find(q => q.id === value))}
                  disabled={isPenaltyActive}
                >
                  <SelectTrigger id="question-type"><SelectValue placeholder="Select question type" /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_OPTIONS.map(q => (
                      <SelectItem key={q.id} value={q.id} disabled={q.disabledCondition?.(null as any, myTeam!)}>
                        {q.name} {q.disabledCondition?.(null as any, myTeam!) ? "(Disabled)" : ""}
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
                  disabled={isPenaltyActive || !selectedQuestionType}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAskQuestion} disabled={isPenaltyActive || !selectedQuestionType || !questionText.trim()} className="flex items-center gap-2">
                <Send /> Ask Question
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader><CardTitle>Question Log & Responses</CardTitle></CardHeader>
            <CardContent>
              {askedQuestions.length === 0 ? (
                <p className="text-muted-foreground">No questions asked yet.</p>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                <ul className="space-y-4">
                  {askedQuestions.map(q => (
                    <li key={q.id} className="p-3 border rounded-md bg-card/80">
                      <p className="font-semibold text-primary">{q.category}: <span className="text-foreground">{q.text}</span></p>
                      <p className="text-xs text-muted-foreground">Asked: {new Date(q.timestamp).toLocaleTimeString()}</p>
                      {q.response && <p className="mt-1 text-sm text-accent-foreground bg-accent/20 p-2 rounded-md">Hider: {typeof q.response === 'string' ? q.response : "Photo response (not displayed)"}</p>}
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
                      <p>Status: {c.status}</p> {/* Removed coins display */}
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
