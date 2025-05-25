
"use client";

import type { GameState, Player, Team, GameRound, TeamRole, AskedQuestion, QuestionOption, ActiveCurseInfo, CurseRule } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const GAME_SESSION_ID = 'current_active_game'; // Fixed ID for the single game session row in Supabase

const defaultGameState: GameState = {
  players: [],
  teams: [],
  currentRound: null,
  gameHistory: [],
  mtrMapUrl: MTR_MAP_PLACEHOLDER_URL,
  adminPin: "113221",
  hiderPin: undefined,
  seekerPin: undefined,
  isAdminAuthenticated: false,
  isHiderAuthenticated: false,
  isSeekerAuthenticated: false,
};

// Helper to deserialize dates from JSON (and nullify File objects)
const deserializeState = (data: any): GameState => {
  if (!data) return { ...defaultGameState }; // Return a copy of default if data is null/undefined

  const deserializeDatesAndFiles = (obj: any): any => {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(deserializeDatesAndFiles);
    }
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'string' && (key === 'timestamp' || key === 'startTime' || key === 'phaseStartTime' || key === 'endTime')) {
          const date = new Date(value);
          newObj[key] = !isNaN(date.getTime()) ? date : value;
        } else if ((key === 'response' || key === 'seekerSubmittedPhoto') && value !== null && typeof value === 'object' && !(value instanceof Date)) {
          // Assuming File objects became generic objects after stringify/parse, nullify them.
          // Or, if they were already nullified before saving, this also handles it.
          newObj[key] = null; 
        } else {
          newObj[key] = deserializeDatesAndFiles(value);
        }
      }
    }
    return newObj;
  };
  
  const deserializedData = deserializeDatesAndFiles(data);

  // Ensure all defaultGameState keys are present, merging with deserializedData
  const mergedState = { ...defaultGameState, ...deserializedData };

  // Ensure PINs are correctly undefined if they were empty strings (or missing)
  mergedState.adminPin = mergedState.adminPin === "" ? undefined : (mergedState.adminPin ?? defaultGameState.adminPin);
  mergedState.hiderPin = mergedState.hiderPin === "" ? undefined : mergedState.hiderPin;
  mergedState.seekerPin = mergedState.seekerPin === "" ? undefined : mergedState.seekerPin;
  
  // Ensure auth flags are boolean
  mergedState.isAdminAuthenticated = !!mergedState.isAdminAuthenticated;
  mergedState.isHiderAuthenticated = !!mergedState.isHiderAuthenticated;
  mergedState.isSeekerAuthenticated = !!mergedState.isSeekerAuthenticated;

  return mergedState;
};

// Helper to serialize state for Supabase (nullify File objects)
const serializeStateForSupabase = (state: GameState): any => {
  return JSON.parse(JSON.stringify(state, (key, value) => {
    if (value instanceof File) {
      return null; // Nullify File objects
    }
    return value;
  }));
};


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

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameStateInternal] = useState<GameState>(defaultGameState);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const isUpdatingSupabase = useRef(false); // To prevent feedback loops from Supabase updates

  // Wrapper for setGameState to also update Supabase
  const setGameState = useCallback(async (updater: GameState | ((prevState: GameState) => GameState)) => {
    const newState = typeof updater === 'function' ? updater(gameState) : updater;
    setGameStateInternal(newState); // Update local state immediately for responsiveness

    isUpdatingSupabase.current = true; // Mark that we are initiating an update
    try {
      const serializedData = serializeStateForSupabase(newState);
      const { error } = await supabase
        .from('game_sessions')
        .update({ game_data: serializedData, updated_at: new Date().toISOString() })
        .eq('id', GAME_SESSION_ID);

      if (error) {
        console.error("Error updating game state in Supabase:", error);
        toast({ title: "Sync Error", description: "Failed to save game state to server.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Exception updating game state in Supabase:", e);
    } finally {
       // Delay slightly before resetting the flag to allow Supabase to process and send back the update
      setTimeout(() => {
        isUpdatingSupabase.current = false;
      }, 500); // Adjust delay as needed
    }
  }, [gameState]);


  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch initial state and subscribe to real-time updates
  useEffect(() => {
    const fetchInitialState = async () => {
      setIsLoadingState(true);
      const { data, error } = await supabase
        .from('game_sessions')
        .select('game_data')
        .eq('id', GAME_SESSION_ID)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        console.error("Error fetching initial game state:", error);
        toast({ title: "Load Error", description: "Failed to load game state from server.", variant: "destructive" });
        setGameStateInternal(deserializeState(null)); // Fallback to default
      } else if (data && data.game_data) {
        setGameStateInternal(deserializeState(data.game_data));
      } else {
        // No data found, or game_data is null, initialize with default and save to Supabase
        console.log("No game state found in Supabase, initializing with default and saving.");
        const defaultSerialized = serializeStateForSupabase(defaultGameState);
        const { error: insertError } = await supabase
          .from('game_sessions')
          .upsert({ id: GAME_SESSION_ID, game_data: defaultSerialized }, { onConflict: 'id' });
        if (insertError) {
            console.error("Error saving initial default state to Supabase:", insertError);
        }
        setGameStateInternal(defaultGameState); // Use the actual defaultGameState object
      }
      setIsLoadingState(false);
    };

    fetchInitialState();

    const channel = supabase
      .channel('game_state_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${GAME_SESSION_ID}` },
        (payload) => {
          if (isUpdatingSupabase.current) {
            // If this client initiated the update, Supabase sends it back.
            // We expect the local state to already reflect this.
            // To be safe, or if debouncing was used, one might re-deserialize.
            // For now, if we're the updater, we assume local state is king for a moment.
            // The flag is reset shortly after.
            return;
          }
          console.log('Game state updated from Supabase:', payload.new);
          if (payload.new && (payload.new as any).game_data) {
            setGameStateInternal(deserializeState((payload.new as any).game_data));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array: run once on mount


  const addPlayer = useCallback((name: string): Player => {
    const newPlayer: Player = { id: `player-${Date.now()}`, name };
    setGameState(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
    return newPlayer;
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [setGameState]);

  const removePlayerFromTeam = useCallback((playerId: string, teamId: string) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team =>
        team.id === teamId ? { ...team, players: team.players.filter(p => p.id !== playerId) } : team
      ),
    }));
  }, [setGameState]);

  const updateTeamRole = useCallback((teamId: string, isHiding: boolean, isSeeking: boolean) => {
    setGameState(prev => {
       const newTeams = prev.teams.map(team => {
        if (team.id === teamId) {
          const newRoleTeam = { ...team, isHiding, isSeeking };
          if (isHiding) {
             newRoleTeam.coins = team.coins === 0 && INITIAL_COINS_HIDER_START === 0 ? 0 : (team.coins || INITIAL_COINS_HIDER_START);
            newRoleTeam.cursesUsed = 0;
          } else if (isSeeking) {
            // Seeker coins are "unlimited" (no tracking).
          }
          return newRoleTeam;
        }
        // If this team is becoming a hider, ensure other teams are not hiders
        if (isHiding && team.id !== teamId) {
            return {...team, isHiding: false};
        }
        return team;
      });
      return { ...prev, teams: newTeams };
    });
  }, [setGameState]);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const teamsWithRoundResets = prev.teams.map(t => {
        const updatedTeam = { ...t };
        if (t.isHiding) {
          updatedTeam.cursesUsed = 0;
          updatedTeam.coins = t.coins === 0 && INITIAL_COINS_HIDER_START === 0 ? 0 : (t.coins || INITIAL_COINS_HIDER_START);
        }
        // Seeker coins are effectively unlimited - no specific reset needed here.
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
        hidingTeam: { ...hidingTeamForRound },
        seekingTeams: seekingTeamsForRound.map(st => ({ ...st })),
        startTime: roundStartTime,
        phaseStartTime: roundStartTime,
        status: 'hiding-phase',
        askedQuestions: [],
        activeCurse: null,
      };

      return {
        ...prev,
        currentRound: newRound,
        teams: teamsWithRoundResets, // Use the teams that had roles reset
      };
    });
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [setGameState]);

  const updateHidingTime = useCallback((teamId: string, timeSeconds: number) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team =>
        team.id === teamId && timeSeconds > team.hidingTimeSeconds
        ? { ...team, hidingTimeSeconds: timeSeconds }
        : team
      ),
    }));
  }, [setGameState]);

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
        return {
            ...prev,
            teams: newTeams,
            currentRound: newCurrentRound,
        };
    });
  }, [setGameState]);

  const setMtrMapUrl = useCallback((url: string) => {
    setGameState(prev => ({ ...prev, mtrMapUrl: url }));
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [setGameState]);

  const seekerCompletesCurseAction = useCallback((photoFile?: File) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse) return prev;
      const curseDetails = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound!.activeCurse!.curseId);
      if (!curseDetails) return prev;

      if (curseDetails.requiresSeekerAction === 'photo' && photoFile) {
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            activeCurse: {
              ...prev.currentRound.activeCurse,
              seekerSubmittedPhoto: photoFile, // Will be nullified on save/load from Supabase for now
              resolutionStatus: 'pending_hider_acknowledgement',
            },
          },
        };
      } else if (curseDetails.requiresSeekerAction === 'confirmation') {
        // Clear curse immediately for confirmation types
        const currentCurseName = curseDetails.name;
        toast({ title: "Curse Resolved", description: `${currentCurseName || 'The active curse'} has been resolved by seekers.` });
        return {
            ...prev,
            currentRound: { ...prev.currentRound, activeCurse: null }
        };
      }
      return prev; // No change if conditions not met (e.g. photo required but not provided)
    });
  }, [setGameState]);

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse || !prev.currentRound.activeCurse.seekerSubmittedPhoto) {
        toast({ title: "Error", description: "No seeker photo to acknowledge or no active curse.", variant: "destructive" });
        return prev;
      }
      const currentCurseName = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound?.activeCurse?.curseId)?.name;
      toast({ title: "Curse Resolved", description: `${currentCurseName || 'The photo curse'} has been acknowledged and resolved.` });
      return {
        ...prev,
        currentRound: { ...prev.currentRound, activeCurse: null }
      };
    });
  }, [setGameState]);


  // PIN and Auth Logic - now part of the main gameState synced with Supabase
  const setAdminPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    setGameState(prev => ({ ...prev, adminPin: newPin, isAdminAuthenticated: newPin === undefined ? false : prev.isAdminAuthenticated }));
    toast({ title: "Admin PIN Updated", description: `Admin access PIN has been ${newPin === undefined ? "cleared (access possibly revoked if default doesn't apply)" : "set"}.` });
  }, [setGameState]);

  const setHiderPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    setGameState(prev => ({ ...prev, hiderPin: newPin, isHiderAuthenticated: newPin === undefined ? false : prev.isHiderAuthenticated }));
    toast({ title: "Hider PIN Updated", description: `Hider panel PIN has been ${newPin === undefined ? "cleared (access revoked)" : "set"}.` });
  }, [setGameState]);

  const setSeekerPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    setGameState(prev => ({ ...prev, seekerPin: newPin, isSeekerAuthenticated: newPin === undefined ? false : prev.isSeekerAuthenticated }));
    toast({ title: "Seeker PIN Updated", description: `Seeker panel PIN has been ${newPin === undefined ? "cleared (access revoked)" : "set"}.` });
  }, [setGameState]);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameState.adminPin ?? defaultGameState.adminPin;
    if (effectiveAdminPin === enteredPin) {
      setGameState(prev => ({ ...prev, isAdminAuthenticated: true }));
      return true;
    }
    return false;
  }, [gameState.adminPin, setGameState]);

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    if (gameState.hiderPin && gameState.hiderPin === enteredPin) {
      setGameState(prev => ({ ...prev, isHiderAuthenticated: true }));
      return true;
    }
    return false;
  }, [gameState.hiderPin, setGameState]);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    if (gameState.seekerPin && gameState.seekerPin === enteredPin) {
      setGameState(prev => ({ ...prev, isSeekerAuthenticated: true }));
      return true;
    }
    return false;
  }, [gameState.seekerPin, setGameState]);

  const logoutAdmin = useCallback(() => {
    setGameState(prev => ({ ...prev, isAdminAuthenticated: false }));
    toast({ title: "Admin Logged Out", description: "Admin panel access has been revoked for this session." });
  }, [setGameState]);

  const logoutHider = useCallback(() => {
    setGameState(prev => ({ ...prev, isHiderAuthenticated: false }));
    toast({ title: "Hider Logged Out", description: "Hider panel access has been revoked for this session." });
  }, [setGameState]);

  const logoutSeeker = useCallback(() => {
    setGameState(prev => ({ ...prev, isSeekerAuthenticated: false }));
    toast({ title: "Seeker Logged Out", description: "Seeker panel access has been revoked for this session." });
  }, [setGameState]);

  if (isLoadingState) {
    // You might want to render a more sophisticated loading spinner/page here
    return <div className="flex justify-center items-center min-h-screen">Loading game state...</div>;
  }

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
