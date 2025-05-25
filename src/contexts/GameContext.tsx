
"use client";

import type { GameState, Player, Team, GameRound, TeamRole, AskedQuestion, QuestionOption } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';


interface GameContextType extends GameState {
  addPlayer: (name: string) => Player;
  createTeam: (name: string) => Team;
  assignPlayerToTeam: (playerId: string, teamId: string) => void;
  removePlayerFromTeam: (playerId: string, teamId: string) => void;
  updateTeamRole: (teamId: string, isHiding: boolean, isSeeking: boolean) => void;
  startNewRound: () => void;
  startSeekingPhase: () => void;
  endCurrentRound: () => void;
  updateHidingTime: (teamId: string, timeSeconds: number) => void;
  updateTeamCoins: (teamId: string, amount: number, operation?: 'add' | 'subtract') => void;
  setMtrMapUrl: (url: string) => void;
  setCurrentUserRole: (role: TeamRole | null) => void;
  currentUserRole: TeamRole | null;
  isMobile: boolean;
  askQuestion: (question: AskedQuestion) => void;
  answerQuestion: (questionId: string, response: string | File) => void;
  activateCurse: (hiderTeamId: string, rolledCurseNumber: number) => void;
  clearActiveCurse: () => void;
}

const defaultGameState: GameState = {
  players: [],
  teams: [],
  currentRound: null,
  gameHistory: [],
  mtrMapUrl: MTR_MAP_PLACEHOLDER_URL,
};

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const addPlayer = useCallback((name: string): Player => {
    const newPlayer: Player = { id: `player-${Date.now()}`, name };
    setGameState(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
    return newPlayer;
  }, []);

  const createTeam = useCallback((name: string): Team => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name,
      players: [],
      isHiding: false,
      isSeeking: false,
      coins: 0,
      hidingTimeSeconds: 0,
      cursesUsed: 0,
    };
    setGameState(prev => ({ ...prev, teams: [...prev.teams, newTeam] }));
    return newTeam;
  }, []);

  const assignPlayerToTeam = useCallback((playerId: string, teamId: string) => {
    setGameState(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;
      const updatedTeams = prev.teams.map(team => ({
        ...team,
        players: team.players.filter(p => p.id !== playerId)
      }));
      return {
        ...prev,
        teams: updatedTeams.map(team =>
          team.id === teamId ? { ...team, players: [...team.players, player] } : team
        ),
      };
    });
  }, []);

  const removePlayerFromTeam = useCallback((playerId: string, teamId: string) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team =>
        team.id === teamId ? { ...team, players: team.players.filter(p => p.id !== playerId) } : team
      ),
    }));
  }, []);

  const updateTeamRole = useCallback((teamId: string, isHiding: boolean, isSeeking: boolean) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team =>
        team.id === teamId ? { ...team, isHiding, isSeeking, coins: isHiding ? (team.coins || INITIAL_COINS_HIDER_START) : 0 } : team
      ),
    }));
  }, []);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const teamsWithRoundResets = prev.teams.map(t => ({
        ...t,
        cursesUsed: t.isHiding ? 0 : t.cursesUsed, // Reset curses for new hider
        coins: t.isSeeking ? 0 : (t.isHiding ? (t.coins || INITIAL_COINS_HIDER_START) : t.coins), // Seekers 0, hiders keep/start fresh
      }));

      const hidingTeamForRound = teamsWithRoundResets.find(t => t.isHiding);
      const seekingTeamsForRound = teamsWithRoundResets.filter(t => t.isSeeking);

      if (!hidingTeamForRound) {
        toast?.({ title: "Cannot Start Round", description: "A hiding team must be designated.", variant: "destructive" });
        return prev;
      }
      if (seekingTeamsForRound.length === 0) {
        toast?.({ title: "Cannot Start Round", description: "At least one seeking team must be designated.", variant: "destructive" });
        return prev;
      }


      const roundStartTime = new Date();
      const newRound: GameRound = {
        roundNumber: (prev.currentRound?.roundNumber || 0) + 1,
        hidingTeam: hidingTeamForRound,
        seekingTeams: seekingTeamsForRound || [],
        startTime: roundStartTime,
        phaseStartTime: roundStartTime,
        status: 'hiding-phase',
        askedQuestions: [],
        activeCurse: null,
      };

      return {
        ...prev,
        currentRound: newRound,
        teams: teamsWithRoundResets,
      };
    });
  }, []);

  const startSeekingPhase = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || prev.currentRound.status !== 'hiding-phase') {
        return prev;
      }
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          status: 'seeking-phase',
          phaseStartTime: new Date(),
        },
      };
    });
  }, []);

  const endCurrentRound = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const finishedRound: GameRound = { ...prev.currentRound, endTime: new Date(), status: 'completed' };
      
      const updatedTeams = prev.teams.map(team => {
        if (team.id === finishedRound.hidingTeam?.id && finishedRound.phaseStartTime && finishedRound.status === 'seeking-phase') { // only calculate if seeking phase started
          const hideEndTime = finishedRound.endTime || new Date();
          const roundHidingDuration = Math.floor((hideEndTime.getTime() - new Date(finishedRound.phaseStartTime).getTime()) / 1000);
          if (roundHidingDuration > team.hidingTimeSeconds) {
            return { ...team, hidingTimeSeconds: roundHidingDuration };
          }
        }
        return team;
      });

      return {
        ...prev,
        currentRound: null,
        gameHistory: [...prev.gameHistory, finishedRound],
        teams: updatedTeams,
      };
    });
  }, []);

  const updateHidingTime = useCallback((teamId: string, timeSeconds: number) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team =>
        team.id === teamId && timeSeconds > team.hidingTimeSeconds
        ? { ...team, hidingTimeSeconds: timeSeconds }
        : team
      ),
    }));
  }, []);

  const updateTeamCoins = useCallback((teamId: string, amount: number, operation: 'add' | 'subtract' = 'add') => {
    setGameState(prev => {
        const newTeams = prev.teams.map(team => {
            if (team.id === teamId) {
                const currentCoins = team.coins || 0;
                const newCoins = operation === 'add' ? currentCoins + amount : Math.max(0, currentCoins - amount);
                return { ...team, coins: newCoins };
            }
            return team;
        });

        let newCurrentRound = prev.currentRound ? { ...prev.currentRound } : null;
        if (newCurrentRound) {
            if (newCurrentRound.hidingTeam?.id === teamId) {
                const currentHidingTeamCoins = newCurrentRound.hidingTeam.coins || 0;
                newCurrentRound.hidingTeam = {
                    ...newCurrentRound.hidingTeam,
                    coins: operation === 'add' ? currentHidingTeamCoins + amount : Math.max(0, currentHidingTeamCoins - amount)
                };
            }
             // Seeking teams coins are not managed this way anymore, but keep structure if needed later
            newCurrentRound.seekingTeams = newCurrentRound.seekingTeams.map(st => {
                if (st.id === teamId) {
                    // This part is less relevant now that seekers have "unlimited" coins for questions
                    // but if they had other coin mechanics, it would be here.
                    const currentSeekingTeamCoins = st.coins || 0;
                    return {
                        ...st,
                        coins: operation === 'add' ? currentSeekingTeamCoins + amount : Math.max(0, currentSeekingTeamCoins - amount)
                    };
                }
                return st;
            });
        }

        return {
            ...prev,
            teams: newTeams,
            currentRound: newCurrentRound,
        };
    });
  }, []);


  const setMtrMapUrl = useCallback((url: string) => {
    setGameState(prev => ({ ...prev, mtrMapUrl: url }));
  }, []);

  const askQuestion = useCallback((question: AskedQuestion) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.hidingTeam) return prev;
      
      const questionOption = QUESTION_OPTIONS.find(opt => opt.id === question.questionOptionId);
      let coinsToAward = 0;
      if (questionOption) {
        coinsToAward = questionOption.hiderCoinsEarned;
      }

      let updatedTeams = prev.teams;
      let updatedHidingTeamInRound = { ...prev.currentRound.hidingTeam };

      if (coinsToAward > 0) {
        const hiderTeamId = prev.currentRound.hidingTeam.id;
        updatedTeams = prev.teams.map(team => {
          if (team.id === hiderTeamId) {
            const currentCoins = team.coins || 0;
            return { ...team, coins: currentCoins + coinsToAward };
          }
          return team;
        });
        
        updatedHidingTeamInRound = {
            ...updatedHidingTeamInRound,
            coins: (updatedHidingTeamInRound.coins || 0) + coinsToAward
        };
      }
      
      const updatedRound = {
        ...prev.currentRound,
        hidingTeam: updatedHidingTeamInRound,
        askedQuestions: [...prev.currentRound.askedQuestions, question],
      };
      
      return {
        ...prev,
        currentRound: updatedRound,
        teams: updatedTeams,
      };
    });
  }, []);

  const answerQuestion = useCallback((questionId: string, response: string | File) => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          askedQuestions: prev.currentRound.askedQuestions.map(q =>
            q.id === questionId ? { ...q, response } : q
          ),
        },
      };
    });
  }, []);

  const activateCurse = useCallback((hiderTeamId: string, rolledCurseNumber: number) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.hidingTeam || prev.currentRound.hidingTeam.id !== hiderTeamId) {
        toast({title: "Error", description: "Cannot activate curse. Hiding team mismatch or no active round.", variant: "destructive"})
        return prev;
      }
      
      if ((prev.currentRound.hidingTeam.cursesUsed || 0) >= MAX_CURSES_PER_ROUND) {
        toast({title: "Max Curses", description: "Maximum curses already used for this round.", variant: "destructive"})
        return prev;
      }

      const newTeams = prev.teams.map(team => {
        if (team.id === hiderTeamId) {
          return { ...team, cursesUsed: (team.cursesUsed || 0) + 1 };
        }
        return team;
      });

      const newCurrentRound = {
        ...prev.currentRound,
        hidingTeam: {
          ...prev.currentRound.hidingTeam,
          cursesUsed: (prev.currentRound.hidingTeam.cursesUsed || 0) + 1,
        },
        activeCurse: {
          curseId: rolledCurseNumber,
          startTime: new Date(),
        }
      };
      
      return {
        ...prev,
        teams: newTeams,
        currentRound: newCurrentRound,
      };
    });
  }, []);

  const clearActiveCurse = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          activeCurse: null,
        },
      };
    });
  }, []);


  return (
    <GameContext.Provider value={{
      ...gameState,
      addPlayer,
      createTeam,
      assignPlayerToTeam,
      removePlayerFromTeam,
      updateTeamRole,
      startNewRound,
      startSeekingPhase,
      endCurrentRound,
      updateHidingTime,
      updateTeamCoins,
      setMtrMapUrl,
      currentUserRole,
      setCurrentUserRole,
      isMobile,
      askQuestion,
      answerQuestion,
      activateCurse,
      clearActiveCurse,
    }}>
      {children}
    </GameContext.Provider>
  );
};
