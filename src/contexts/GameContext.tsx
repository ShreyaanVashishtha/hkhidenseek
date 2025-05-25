
"use client";

import type { GameState, Player, Team, GameRound, TeamRole, AskedQuestion, QuestionOption, ActiveCurseInfo, CurseRule } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const GAME_SESSION_ID = 'current_active_game'; 

const defaultGameState: GameState = {
  players: [],
  teams: [],
  currentRound: null,
  gameHistory: [],
  mtrMapUrl: MTR_MAP_PLACEHOLDER_URL,
  adminPin: "113221", // Default admin PIN
  hiderPin: undefined,
  seekerPin: undefined,
};

const deserializeState = (data: any): GameState => {
  if (!data) return { ...defaultGameState };

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
          newObj[key] = null; 
        } else {
          newObj[key] = deserializeDatesAndFiles(value);
        }
      }
    }
    return newObj;
  };
  
  const deserializedData = deserializeDatesAndFiles(data);
  const mergedState = { ...defaultGameState, ...deserializedData };

  mergedState.adminPin = mergedState.adminPin === "" ? undefined : (mergedState.adminPin ?? defaultGameState.adminPin);
  mergedState.hiderPin = mergedState.hiderPin === "" ? undefined : mergedState.hiderPin;
  mergedState.seekerPin = mergedState.seekerPin === "" ? undefined : mergedState.seekerPin;
  
  return mergedState;
};

const serializeStateForSupabase = (state: GameState): any => {
  return JSON.parse(JSON.stringify(state, (key, value) => {
    if (value instanceof File) {
      return null; 
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
  isAdminAuthenticated: boolean;
  isHiderAuthenticated: boolean;
  isSeekerAuthenticated: boolean;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameStateInternal] = useState<GameState>(defaultGameState);
  const gameStateRef = useRef(gameState); // Ref to get current gameState in callbacks

  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const isUpdatingSupabase = useRef(false);

  // Client-side authentication states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isHiderAuthenticated, setIsHiderAuthenticated] = useState(false);
  const [isSeekerAuthenticated, setIsSeekerAuthenticated] = useState(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load auth status from localStorage on initial mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdminAuthenticated(localStorage.getItem('isAdminAuthenticated_mtrGame') === 'true');
      setIsHiderAuthenticated(localStorage.getItem('isHiderAuthenticated_mtrGame') === 'true');
      setIsSeekerAuthenticated(localStorage.getItem('isSeekerAuthenticated_mtrGame') === 'true');
    }
  }, []);


  const setGameState = useCallback(async (updater: GameState | ((prevState: GameState) => GameState)) => {
    const newState = typeof updater === 'function' ? updater(gameStateRef.current) : updater;
    setGameStateInternal(newState); 

    isUpdatingSupabase.current = true; 
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
      setTimeout(() => {
        isUpdatingSupabase.current = false;
      }, 100); 
    }
  }, []); // Removed gameStateRef from dependencies, it's a ref.

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchInitialState = async () => {
      setIsLoadingState(true);
      const { data, error } = await supabase
        .from('game_sessions')
        .select('game_data')
        .eq('id', GAME_SESSION_ID)
        .single();

      if (error && error.code !== 'PGRST116') { 
        console.error("Error fetching initial game state:", error);
        toast({ title: "Load Error", description: "Failed to load game state from server.", variant: "destructive" });
        setGameStateInternal(deserializeState(null)); 
      } else if (data && data.game_data) {
        setGameStateInternal(deserializeState(data.game_data));
      } else {
        console.log("No game state found in Supabase, initializing with default and saving.");
        const defaultSerialized = serializeStateForSupabase(defaultGameState);
        const { error: insertError } = await supabase
          .from('game_sessions')
          .upsert({ id: GAME_SESSION_ID, game_data: defaultSerialized, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (insertError) {
            console.error("Error saving initial default state to Supabase:", insertError);
        }
        setGameStateInternal(defaultGameState);
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
          // Always apply updates from Supabase as it's the source of truth
          // The local optimistic update has already happened.
          // This ensures consistency if multiple clients update or if there's a server-side change.
          console.log('Game state updated from Supabase REAL-TIME:', payload.new);
          if (payload.new && (payload.new as any).game_data) {
            const newGameStateFromSupabase = deserializeState((payload.new as any).game_data);
            setGameStateInternal(newGameStateFromSupabase);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time game updates!');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Real-time subscription error:', status, err);
          toast({ title: "Real-time Error", description: "Connection to real-time updates failed. Try refreshing.", variant: "destructive" });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); 

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
          }
          return newRoleTeam;
        }
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
        } else if (t.isSeeking) {
          // Seekers have unlimited coins, effectively starting at 0 for tracking if needed, but not for spending.
           // updatedTeam.coins = 0; // Not strictly needed as they don't spend.
        }
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
        teams: teamsWithRoundResets, 
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
              seekerSubmittedPhoto: photoFile, 
              resolutionStatus: 'pending_hider_acknowledgement',
            },
          },
        };
      } else if (curseDetails.requiresSeekerAction === 'confirmation') {
        const currentCurseName = curseDetails.name;
        toast({ title: "Curse Resolved", description: `${currentCurseName || 'The active curse'} has been resolved by seekers.` });
        return {
            ...prev,
            currentRound: { ...prev.currentRound, activeCurse: null }
        };
      }
      return prev; 
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

  const setAdminPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    if (gameStateRef.current.adminPin !== newPin) {
        setIsAdminAuthenticated(false);
        if (typeof window !== 'undefined') localStorage.removeItem('isAdminAuthenticated_mtrGame');
    }
    setGameState(prev => ({ ...prev, adminPin: newPin }));
    toast({ title: "Admin PIN Updated", description: `Admin access PIN has been ${newPin === undefined ? "cleared" : "set"}. You may need to re-login.` });
  }, [setGameState]);

  const setHiderPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
     if (gameStateRef.current.hiderPin !== newPin) {
        setIsHiderAuthenticated(false);
        if (typeof window !== 'undefined') localStorage.removeItem('isHiderAuthenticated_mtrGame');
    }
    setGameState(prev => ({ ...prev, hiderPin: newPin }));
    toast({ title: "Hider PIN Updated", description: `Hider panel PIN has been ${newPin === undefined ? "cleared" : "set"}. Access may be revoked until re-login.` });
  }, [setGameState]);

  const setSeekerPin = useCallback((pin: string) => {
    const newPin = pin === "" ? undefined : pin;
    if (gameStateRef.current.seekerPin !== newPin) {
        setIsSeekerAuthenticated(false);
        if (typeof window !== 'undefined') localStorage.removeItem('isSeekerAuthenticated_mtrGame');
    }
    setGameState(prev => ({ ...prev, seekerPin: newPin }));
    toast({ title: "Seeker PIN Updated", description: `Seeker panel PIN has been ${newPin === undefined ? "cleared" : "set"}. Access may be revoked until re-login.` });
  }, [setGameState]);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameStateRef.current.adminPin ?? defaultGameState.adminPin;
    if (effectiveAdminPin === enteredPin) {
      setIsAdminAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem('isAdminAuthenticated_mtrGame', 'true');
      return true;
    }
    return false;
  }, []); // Depends on gameStateRef.current.adminPin, which is stable via ref

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    if (gameStateRef.current.hiderPin && gameStateRef.current.hiderPin === enteredPin) {
      setIsHiderAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem('isHiderAuthenticated_mtrGame', 'true');
      return true;
    }
    return false;
  }, []);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    if (gameStateRef.current.seekerPin && gameStateRef.current.seekerPin === enteredPin) {
      setIsSeekerAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem('isSeekerAuthenticated_mtrGame', 'true');
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem('isAdminAuthenticated_mtrGame');
    toast({ title: "Admin Logged Out", description: "Admin panel access has been revoked for this session." });
  }, []);

  const logoutHider = useCallback(() => {
    setIsHiderAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem('isHiderAuthenticated_mtrGame');
    toast({ title: "Hider Logged Out", description: "Hider panel access has been revoked for this session." });
  }, []);

  const logoutSeeker = useCallback(() => {
    setIsSeekerAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem('isSeekerAuthenticated_mtrGame');
    toast({ title: "Seeker Logged Out", description: "Seeker panel access has been revoked for this session." });
  }, []);

  if (isLoadingState) {
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
      isAdminAuthenticated, 
      isHiderAuthenticated, 
      isSeekerAuthenticated,
    }}>
      {children}
    </GameContext.Provider>
  );
};
