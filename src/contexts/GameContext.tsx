
"use client";

import type { GameState, Player, Team, GameRound, TeamRole } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface GameContextType extends GameState {
  addPlayer: (name: string) => Player;
  createTeam: (name: string) => Team;
  assignPlayerToTeam: (playerId: string, teamId: string) => void;
  removePlayerFromTeam: (playerId: string, teamId: string) => void;
  updateTeamRole: (teamId: string, isHiding: boolean, isSeeking: boolean) => void;
  startNewRound: () => void;
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
      const hidingTeam = prev.teams.find(t => t.isHiding);
      const seekingTeams = prev.teams.filter(t => t.isSeeking);
      if (!hidingTeam || seekingTeams.length === 0) {
        // alert("Please assign one hiding team and at least one seeking team.");
        // This should be handled by a toast notification in the UI
        console.warn("Attempted to start round without proper team roles.");
        return prev;
      }
      const newRound: GameRound = {
        roundNumber: (prev.currentRound?.roundNumber || 0) + 1,
        hidingTeam,
        seekingTeams,
        startTime: new Date(),
        status: 'hiding-phase',
      };
      return { 
        ...prev, 
        currentRound: newRound,
        // Reset coins for seeking teams, reset curses used for hiding team
        teams: prev.teams.map(t => ({
          ...t,
          coins: t.isSeeking ? 0 : t.coins,
          cursesUsed: t.isHiding ? 0 : t.cursesUsed,
        }))
      };
    });
  }, []);

  const endCurrentRound = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const finishedRound: GameRound = { ...prev.currentRound, endTime: new Date(), status: 'completed' };
      return {
        ...prev,
        currentRound: null,
        gameHistory: [...prev.gameHistory, finishedRound],
        // Potentially update longest hiding times here or explicitly via updateHidingTime
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
          const newCoins = operation === 'add' ? team.coins + amount : Math.max(0, team.coins - amount);
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
