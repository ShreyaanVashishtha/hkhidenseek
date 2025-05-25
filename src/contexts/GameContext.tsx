"use client";

import type { GameState, Player, Team, GameRound, TeamRole, AskedQuestion, QuestionOption, ActiveCurseInfo, CurseRule } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

const GAME_STATE_LOCAL_STORAGE_KEY = 'hideAndSeekGameState_v2';

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
  activateCurse: (hiderTeamId: string, rolledCurseNumber: number, hiderInputText?: string) => void;
  recordCurseUsed: (hiderTeamId: string) => void;
  clearActiveCurse: () => void;
  seekerCompletesCurseAction: (photoFile?: File) => void;
  hiderAcknowledgesSeekerPhoto: () => void;

  setAdminPin: (pin: string) => void;
  setHiderPin: (pin: string) => void;
  setSeekerPin: (pin: string) => void;
  authenticateAdmin: (enteredPin: string) => boolean;
  authenticateHider: (enteredPin: string) => boolean;
  authenticateSeeker: (enteredPin: string) => boolean;
  logoutAdmin: () => void;
  logoutHider: () => void;
  logoutSeeker: () => void;
}

const defaultGameState: GameState = {
  players: [],
  teams: [],
  currentRound: null,
  gameHistory: [],
  mtrMapUrl: MTR_MAP_PLACEHOLDER_URL,
  adminPin: "113221", // Default Admin PIN
  hiderPin: undefined,
  seekerPin: undefined,
  isAdminAuthenticated: false,
  isHiderAuthenticated: false,
  isSeekerAuthenticated: false,
};

// Helper to deserialize dates from JSON
const deserializeDates = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deserializeDates);
  }

  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        // Attempt to parse common date fields
        if (key === 'timestamp' || key === 'startTime' || key === 'phaseStartTime' || key === 'endTime') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            newObj[key] = date;
            continue;
          }
        }
      }
      // For File objects that were stringified, they might become empty objects or similar.
      // We explicitly nullify them here during deserialization if they were meant to be files.
      if ((key === 'response' && typeof value === 'object' && !(value instanceof Date)) || 
          (key === 'seekerSubmittedPhoto' && typeof value === 'object' && !(value instanceof Date))) {
            newObj[key] = null; // Ensure File objects are nulled if not properly handled
      } else {
        newObj[key] = deserializeDates(value);
      }
    }
  }
  return newObj;
};


const loadStateFromLocalStorage = (): GameState => {
  try {
    const serializedState = localStorage.getItem(GAME_STATE_LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      // If no state in localStorage, save the default state (which includes the default admin PIN)
      localStorage.setItem(GAME_STATE_LOCAL_STORAGE_KEY, JSON.stringify(defaultGameState));
      return defaultGameState;
    }
    const storedState = JSON.parse(serializedState);
    const deserializedState = deserializeDates(storedState);
    
    // Ensure essential default structure if something is missing from stored state
    // This also handles first load by ensuring adminPin default if not present
    return {
      ...defaultGameState, // provides defaults for any missing top-level keys
      ...deserializedState,
      adminPin: deserializedState.adminPin !== undefined ? deserializedState.adminPin : defaultGameState.adminPin, // Prioritize stored, then default for adminPin
      // Ensure auth flags are booleans
      isAdminAuthenticated: !!deserializedState.isAdminAuthenticated,
      isHiderAuthenticated: !!deserializedState.isHiderAuthenticated,
      isSeekerAuthenticated: !!deserializedState.isSeekerAuthenticated,
    };
  } catch (error) {
    console.error("Could not load game state from localStorage:", error);
    return defaultGameState; // Fallback to default if error
  }
};


export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>(loadStateFromLocalStorage);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    try {
      // Prepare state for serialization: nullify File objects
      const stateToSave = JSON.parse(JSON.stringify(gameState, (key, value) => {
        if (value instanceof File) {
          return null; // Or some placeholder if you need to identify it later
        }
        return value;
      }));
      localStorage.setItem(GAME_STATE_LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Could not save game state to localStorage:", error);
    }
  }, [gameState]);


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
      teams: prev.teams.map(team => {
        if (team.id === teamId) {
          const newRoleTeam = { ...team, isHiding, isSeeking };
          if (isHiding) {
            newRoleTeam.coins = team.coins === 0 && INITIAL_COINS_HIDER_START === 0 ? 0 : (team.coins || INITIAL_COINS_HIDER_START); // Respect existing coins if not 0
            newRoleTeam.cursesUsed = 0;
          } else if (isSeeking) {
            // Seeker coins are effectively unlimited and not tracked this way.
            // Their actual "coin" count is not relevant for actions.
          }
          return newRoleTeam;
        }
        return team;
      }),
    }));
  }, []);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const teamsWithRoundResets = prev.teams.map(t => {
        const updatedTeam = { ...t };
        if (t.isHiding) {
          updatedTeam.cursesUsed = 0;
          // Hider coins carry over or start with initial if not set
          updatedTeam.coins = t.coins === 0 && INITIAL_COINS_HIDER_START === 0 ? 0 : (t.coins || INITIAL_COINS_HIDER_START);
        }
        // Seeker coins are not explicitly managed here as they are "unlimited" for actions.
        return updatedTeam;
      });

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
        hidingTeam: { ...hidingTeamForRound }, // Ensure a copy
        seekingTeams: seekingTeamsForRound.map(st => ({ ...st })) || [], // Ensure copies
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
        if (team.id === finishedRound.hidingTeam?.id && finishedRound.phaseStartTime && prev.currentRound?.status === 'seeking-phase') {
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
        if (newCurrentRound && newCurrentRound.hidingTeam?.id === teamId) {
            const currentHidingTeamCoins = newCurrentRound.hidingTeam.coins || 0;
            newCurrentRound.hidingTeam = {
                ...newCurrentRound.hidingTeam,
                coins: operation === 'add' ? currentHidingTeamCoins + amount : Math.max(0, currentHidingTeamCoins - amount)
            };
        }
        // No explicit coin management for seekingTeams in currentRound as their coins are "unlimited" for actions.

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

  const recordCurseUsed = useCallback((hiderTeamId: string) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.hidingTeam || prev.currentRound.hidingTeam.id !== hiderTeamId) {
        return prev;
      }
      const newTeams = prev.teams.map(team => {
        if (team.id === hiderTeamId) {
          return { ...team, cursesUsed: (team.cursesUsed || 0) + 1 };
        }
        return team;
      });
      const newCurrentRoundHidingTeam = prev.currentRound.hidingTeam ? {
        ...prev.currentRound.hidingTeam,
        cursesUsed: (prev.currentRound.hidingTeam.cursesUsed || 0) + 1,
      } : null;

      if (!newCurrentRoundHidingTeam) return prev;

      const newCurrentRound = {
        ...prev.currentRound,
        hidingTeam: newCurrentRoundHidingTeam,
      };
      return {
        ...prev,
        teams: newTeams,
        currentRound: newCurrentRound,
      };
    });
  }, []);

  const activateCurse = useCallback((hiderTeamId: string, rolledCurseNumber: number, hiderInputText?: string) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.hidingTeam || prev.currentRound.hidingTeam.id !== hiderTeamId) {
        toast({title: "Error", description: "Cannot activate curse. Hiding team mismatch or no active round.", variant: "destructive"})
        return prev;
      }
      
      const activeCurseInfo: ActiveCurseInfo = {
        curseId: rolledCurseNumber,
        startTime: new Date(),
        resolutionStatus: 'pending_seeker_action',
      };
      if (hiderInputText) {
        activeCurseInfo.hiderInputText = hiderInputText;
      }

      const newCurrentRound = {
        ...prev.currentRound,
        activeCurse: activeCurseInfo
      };
      
      return {
        ...prev,
        currentRound: newCurrentRound,
      };
    });
  }, []);

  const clearActiveCurse = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const currentCurseName = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound?.activeCurse?.curseId)?.name;
      toast({ title: "Curse Ended", description: `${currentCurseName || 'The active curse'} is no longer in effect.` });
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          activeCurse: null,
        },
      };
    });
  }, []);

 const seekerCompletesCurseAction = useCallback((photoFile?: File) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse) return prev;

      const curseDetails = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound!.activeCurse!.curseId);
      if (!curseDetails) return prev;

      if (curseDetails.requiresSeekerAction === 'photo' && photoFile) {
        // Note: photoFile itself won't be persisted in localStorage through simple JSON.stringify
        // It's available for immediate UI use, then effectively "lost" on reload from this state.
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            activeCurse: {
              ...prev.currentRound.activeCurse,
              seekerSubmittedPhoto: photoFile, // Will be nullified on save to localStorage
              resolutionStatus: 'pending_hider_acknowledgement',
            },
          },
        };
      } else if (curseDetails.requiresSeekerAction === 'confirmation') {
         // For confirmation curses, clearActiveCurse will be called separately by the component.
         // For now, we simply update the status to resolved.
         // Or, we could directly call logic that would lead to clearActiveCurse.
         // Let's assume for now the component handles calling clearActiveCurse after this.
         // This function is more about updating state *before* clearing.
         // So, we can let the component call clearActiveCurse.
      }
      return prev;
    });
     // Call clearActiveCurse if it's a confirmation type, as it resolves immediately by seeker.
    if (gameState.currentRound?.activeCurse) {
        const curseDetails = CURSE_DICE_OPTIONS.find(c => c.number === gameState.currentRound!.activeCurse!.curseId);
        if (curseDetails && curseDetails.requiresSeekerAction === 'confirmation') {
            clearActiveCurse();
        }
    }
  }, [clearActiveCurse, gameState.currentRound?.activeCurse]);

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse || !prev.currentRound.activeCurse.seekerSubmittedPhoto) {
        toast({ title: "Error", description: "No seeker photo to acknowledge or no active curse.", variant: "destructive" });
        return prev;
      }
      // No specific state change here other than what clearActiveCurse will do.
      return prev;
    });
    clearActiveCurse(); // This will set activeCurse to null and trigger re-renders.
  }, [clearActiveCurse]);

  // PIN and Auth Logic
  const setAdminPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    setGameState(prev => ({ ...prev, adminPin: newPin, isAdminAuthenticated: newPin === undefined ? false : prev.isAdminAuthenticated }));
    toast({ title: "Admin PIN Updated", description: `Admin access PIN has been ${newPin === undefined ? "cleared (access possibly revoked if default doesn't apply)" : "set"}.` });
  }, []);

  const setHiderPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    setGameState(prev => ({ ...prev, hiderPin: newPin, isHiderAuthenticated: newPin === undefined ? false : prev.isHiderAuthenticated }));
    toast({ title: "Hider PIN Updated", description: `Hider panel PIN has been ${newPin === undefined ? "cleared (access revoked)" : "set"}.` });
  }, []);

  const setSeekerPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    setGameState(prev => ({ ...prev, seekerPin: newPin, isSeekerAuthenticated: newPin === undefined ? false : prev.isSeekerAuthenticated }));
    toast({ title: "Seeker PIN Updated", description: `Seeker panel PIN has been ${newPin === undefined ? "cleared (access revoked)" : "set"}.` });
  }, []);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameState.adminPin ?? defaultGameState.adminPin; // Use default if current is undefined
    if (effectiveAdminPin === enteredPin) {
      setGameState(prev => ({ ...prev, isAdminAuthenticated: true }));
      return true;
    }
    return false;
  }, [gameState.adminPin]);

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    if (gameState.hiderPin === enteredPin) { // Hider/Seeker PINs must be explicitly set to be active
      setGameState(prev => ({ ...prev, isHiderAuthenticated: true }));
      return true;
    }
    return false;
  }, [gameState.hiderPin]);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    if (gameState.seekerPin === enteredPin) { // Hider/Seeker PINs must be explicitly set to be active
      setGameState(prev => ({ ...prev, isSeekerAuthenticated: true }));
      return true;
    }
    return false;
  }, [gameState.seekerPin]);

  const logoutAdmin = useCallback(() => {
    setGameState(prev => ({ ...prev, isAdminAuthenticated: false }));
    toast({ title: "Admin Logged Out", description: "Admin panel access has been revoked for this session." });
  }, []);

  const logoutHider = useCallback(() => {
    setGameState(prev => ({ ...prev, isHiderAuthenticated: false }));
    toast({ title: "Hider Logged Out", description: "Hider panel access has been revoked for this session." });
  }, []);

  const logoutSeeker = useCallback(() => {
    setGameState(prev => ({ ...prev, isSeekerAuthenticated: false }));
    toast({ title: "Seeker Logged Out", description: "Seeker panel access has been revoked for this session." });
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
      recordCurseUsed,
      clearActiveCurse,
      seekerCompletesCurseAction,
      hiderAcknowledgesSeekerPhoto,
      setAdminPin,
      setHiderPin,
      setSeekerPin,
      authenticateAdmin,
      authenticateHider,
      authenticateSeeker,
      logoutAdmin,
      logoutHider,
      logoutSeeker,
    }}>
      {children}
    </GameContext.Provider>
  );
};

// Note: For PinProtectPage, if a PIN (e.g. adminPin) is undefined in gameState,
// it means no PIN is set for that role, and access should be granted.
// The default adminPin "113221" will be active on first load if no saved state.
// If an admin clears their PIN, gameState.adminPin becomes undefined.
