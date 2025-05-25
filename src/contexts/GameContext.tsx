
"use client";

import type { GameState, Player, Team, GameRound, TeamRole, AskedQuestion } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS } from '@/lib/constants';
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
      coins: INITIAL_COINS,
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
        team.id === teamId ? { ...team, isHiding, isSeeking } : team
      ),
    }));
  }, []);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const teamsWithRoundResets = prev.teams.map(t => {
        let newCoins = t.coins;
        if (t.isSeeking) {
          newCoins = 0; // Seekers start with 0 coins
        }
        
        let newCursesUsed = t.cursesUsed || 0;
        if (t.isHiding) {
          newCursesUsed = 0; 
        }
        return {
          ...t,
          coins: newCoins,
          cursesUsed: newCursesUsed,
        };
      });

      const hidingTeamForRound = teamsWithRoundResets.find(t => t.isHiding);
      const seekingTeamsForRound = teamsWithRoundResets.filter(t => t.isSeeking);

      if (!hidingTeamForRound || seekingTeamsForRound.length === 0) {
        toast?.({ title: "Cannot Start Round", description: "A hiding team and at least one seeking team must be designated.", variant: "destructive" });
        return prev;
      }

      const roundStartTime = new Date();
      const newRound: GameRound = {
        roundNumber: (prev.currentRound?.roundNumber || 0) + 1,
        hidingTeam: hidingTeamForRound,
        seekingTeams: seekingTeamsForRound,
        startTime: roundStartTime,
        phaseStartTime: roundStartTime,
        status: 'hiding-phase',
        askedQuestions: [], // Initialize askedQuestions for the new round
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
        if (team.id === finishedRound.hidingTeam?.id && finishedRound.phaseStartTime) {
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
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team => {
        if (team.id === teamId) {
          const currentCoins = team.coins || 0;
          const newCoins = operation === 'add' ? currentCoins + amount : Math.max(0, currentCoins - amount);
          return { ...team, coins: newCoins };
        }
        return team;
      }),
    }));
  }, []);

  const setMtrMapUrl = useCallback((url: string) => {
    setGameState(prev => ({ ...prev, mtrMapUrl: url }));
  }, []);

  const askQuestion = useCallback((question: AskedQuestion) => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          askedQuestions: [...prev.currentRound.askedQuestions, question],
        },
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
    }}>
      {children}
    </GameContext.Provider>
  );
};
