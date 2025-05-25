
"use client";

import type { GameState, Player, Team, GameRound, TeamRole } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
// Assuming useToast is available and works correctly for client-side feedback
// If not, this import might need adjustment or the toast call removed/replaced.
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
      // Remove player from any other team first
      const updatedTeams = prev.teams.map(team => ({
        ...team,
        players: team.players.filter(p => p.id !== playerId)
      }));
      // Add to new team
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
      // First, determine the initial state of teams for this new round (coin/curse reset)
      const teamsWithRoundResets = prev.teams.map(t => {
        let newCoins = t.coins;
        if (t.isSeeking) { // If this team is currently designated as a seeker
          newCoins = 0;     // Reset their coins for the new round
        }
        // Hiders keep their coins (for curses), non-hider/non-seeker teams also keep theirs.

        let newCursesUsed = t.cursesUsed || 0;
        if (t.isHiding) { // If this team is currently designated as a hider
          newCursesUsed = 0; // Reset their curses used count for the new round
        }
        return {
          ...t,
          coins: newCoins,
          cursesUsed: newCursesUsed,
        };
      });

      // Now find the hider and seekers from this processed list
      const hidingTeamForRound = teamsWithRoundResets.find(t => t.isHiding);
      const seekingTeamsForRound = teamsWithRoundResets.filter(t => t.isSeeking);

      if (!hidingTeamForRound || seekingTeamsForRound.length === 0) {
        console.warn("Attempted to start round without proper team roles (hider and at least one seeker).");
        // This toast should ideally be triggered from AdminPage before calling,
        // but as a fallback:
        toast?.({ title: "Cannot Start Round", description: "A hiding team and at least one seeking team must be designated and have their roles set before starting a new round.", variant: "destructive" });
        return prev; // Return previous state if roles are not properly set
      }

      const roundStartTime = new Date();
      const newRound: GameRound = {
        roundNumber: (prev.currentRound?.roundNumber || 0) + 1,
        hidingTeam: hidingTeamForRound,       // Use the version with reset cursesUsed
        seekingTeams: seekingTeamsForRound,   // Use the versions with reset coins
        startTime: roundStartTime,
        phaseStartTime: roundStartTime,         // Hiding phase starts immediately
        status: 'hiding-phase',
      };

      return {
        ...prev,
        currentRound: newRound,
        teams: teamsWithRoundResets, // Update the main 'teams' array with reset states
      };
    });
  }, []);

  const startSeekingPhase = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || prev.currentRound.status !== 'hiding-phase') {
        console.warn("Cannot start seeking phase, not in hiding phase or no current round.");
        return prev;
      }
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          status: 'seeking-phase',
          phaseStartTime: new Date(), // Seeking phase starts now
        },
      };
    });
  }, []);

  const endCurrentRound = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const finishedRound: GameRound = { ...prev.currentRound, endTime: new Date(), status: 'completed' };
      
      const updatedTeams = prev.teams.map(team => {
        if (team.id === finishedRound.hidingTeam?.id && finishedRound.phaseStartTime) { // Check phaseStartTime
          const hideEndTime = finishedRound.endTime || new Date(); // Use current time if endTime isn't set
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
          const currentCoins = team.coins || 0; // Ensure currentCoins is a number
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
      isMobile
    }}>
      {children}
    </GameContext.Provider>
  );
};
