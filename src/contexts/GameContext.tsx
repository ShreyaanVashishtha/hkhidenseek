
"use client";

import type { GameState, Player, Team, GameRound, AskedQuestion, ActiveCurseInfo } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, MAX_CURSES_PER_ROUND } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const GAME_SESSION_ID = 'current_active_game';
const GAME_STATE_LOCAL_STORAGE_KEY_PREFIX = 'hideAndSeekGameState_auth_'; // For client-side auth only

const defaultGameState: GameState = {
  players: [],
  teams: [],
  currentRound: null,
  gameHistory: [],
  mtrMapUrl: MTR_MAP_PLACEHOLDER_URL,
  adminPin: "113221", 
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
  
  const deserialized = deserializeDatesAndFiles(data);
  let merged = { ...defaultGameState, ...deserialized };
  merged.adminPin = merged.adminPin === "" ? undefined : (merged.adminPin ?? defaultGameState.adminPin);
  merged.hiderPin = merged.hiderPin === "" ? undefined : merged.hiderPin;
  merged.seekerPin = merged.seekerPin === "" ? undefined : merged.seekerPin;
  return merged;
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
  const gameStateRef = useRef(gameState); 

  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isHiderAuthenticated, setIsHiderAuthenticated] = useState(false);
  const [isSeekerAuthenticated, setIsSeekerAuthenticated] = useState(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdminAuthenticated(localStorage.getItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isAdminAuthenticated') === 'true');
      setIsHiderAuthenticated(localStorage.getItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isHiderAuthenticated') === 'true');
      setIsSeekerAuthenticated(localStorage.getItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isSeekerAuthenticated') === 'true');
    }
  }, []);

  const setGameState = useCallback(async (updater: GameState | ((prevState: GameState) => GameState)) => {
    let finalNewState: GameState | null = null;

    setGameStateInternal(currentInternalState => {
      const newState = typeof updater === 'function' ? updater(currentInternalState) : updater;
      gameStateRef.current = newState; 
      finalNewState = newState; 
      return newState; 
    });
    
    if (finalNewState) {
      const serializedData = serializeStateForSupabase(finalNewState);
      const { error } = await supabase
        .from('game_sessions')
        .update({ game_data: serializedData, updated_at: new Date().toISOString() })
        .eq('id', GAME_SESSION_ID);

      if (error) {
        console.error("Error updating game state in Supabase (from setGameState):", error);
        toast({ title: "Sync Error", description: "Failed to save game state to server.", variant: "destructive" });
      }
    }
  }, [serializeStateForSupabase, supabase, GAME_SESSION_ID, toast]);


  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchInitialState = async () => {
      setIsLoadingState(true);
      console.log('[INIT] Fetching initial game state from Supabase...');
      const { data, error } = await supabase
        .from('game_sessions')
        .select('game_data, adminPin, hiderPin, seekerPin') // Fetch PINs directly if stored as separate columns
        .eq('id', GAME_SESSION_ID)
        .single();

      if (error && error.code !== 'PGRST116') { 
        console.error("[INIT] Error fetching initial game state:", error);
        setGameStateInternal(deserializeState(null));
      } else if (data && data.game_data) {
        console.log("[INIT] Game state found in Supabase. Deserializing...");
        let loadedState = deserializeState(data.game_data);
        // Ensure PINs from specific columns (if used) or from game_data are correctly set
        loadedState.adminPin = data.adminPin ?? loadedState.adminPin;
        loadedState.hiderPin = data.hiderPin ?? loadedState.hiderPin;
        loadedState.seekerPin = data.seekerPin ?? loadedState.seekerPin;
        
        setGameStateInternal(loadedState);
      } else {
        console.log("[INIT] No game state found. Initializing with default and saving to Supabase.");
        const defaultSerialized = serializeStateForSupabase(defaultGameState);
        const { error: insertError } = await supabase
          .from('game_sessions')
          .upsert({ 
            id: GAME_SESSION_ID, 
            game_data: defaultSerialized, 
            updated_at: new Date().toISOString(),
            adminPin: defaultGameState.adminPin, // Save default PINs if table has separate columns
            hiderPin: defaultGameState.hiderPin,
            seekerPin: defaultGameState.seekerPin
          }, { onConflict: 'id' });
        if (insertError) {
            console.error("[INIT] Error saving initial default state to Supabase:", insertError);
        }
        setGameStateInternal(defaultGameState);
      }
      setIsLoadingState(false);
      console.log('[INIT] Initial state loading complete.');
    };

    fetchInitialState();

    console.log('[REALTIME] Setting up Supabase subscription...');
    const channel = supabase
      .channel('game_state_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${GAME_SESSION_ID}` },
        (payload) => {
          console.log('[REALTIME] Received Supabase payload:', payload.eventType, 'at', new Date().toLocaleTimeString());
          // console.log('[REALTIME] Full payload:', JSON.stringify(payload).substring(0,1000));


          if (payload.new && (payload.new as any).game_data) {
            const incomingGameData = (payload.new as any).game_data;
            // console.log('[REALTIME] Incoming game_data (raw):', JSON.stringify(incomingGameData).substring(0, 300) + "...");

            const currentLocalStateForComparison = gameStateRef.current;
            const serializedCurrentLocalState = serializeStateForSupabase(currentLocalStateForComparison);
            
            // console.log('[REALTIME] Current local state (serialized for comparison):', JSON.stringify(serializedCurrentLocalState).substring(0, 300) + "...");
            
            if (JSON.stringify(serializedCurrentLocalState) !== JSON.stringify(incomingGameData)) {
              console.log('[REALTIME] Change detected. Applying update.');
              const newGameStateFromSupabase = deserializeState(incomingGameData);
              // console.log('[REALTIME] Deserialized new state to apply:', JSON.stringify(newGameStateFromSupabase).substring(0,300) + "...");
              // console.log('[REALTIME] Current local state before update (ref):', JSON.stringify(gameStateRef.current).substring(0,300) + "...");
              setGameStateInternal(newGameStateFromSupabase);
              // gameStateRef.current will be updated by the useEffect watching `gameState`
            } else {
              console.log("[REALTIME] Echo detected or data is identical. Skipping update.");
            }
          } else {
            console.log('[REALTIME] Payload did not contain new.game_data or new was null.');
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME] Successfully subscribed to real-time game updates!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[REALTIME] Subscription channel error:', err);
          toast({ title: "Real-time Error", description: `Channel error: ${err?.message}. Try refreshing.`, variant: "destructive" });
        } else if (status === 'TIMED_OUT') {
          console.error('[REALTIME] Subscription timed out.');
          toast({ title: "Real-time Error", description: "Connection timed out. Try refreshing.", variant: "destructive" });
        } else {
          console.log('[REALTIME] Subscription status:', status);
        }
      });

    return () => {
      console.log('[REALTIME] Removing Supabase channel subscription.');
      supabase.removeChannel(channel);
    };
  }, [supabase, GAME_SESSION_ID, toast, deserializeState, serializeStateForSupabase]);

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
       let updatedTeams = prev.teams.map(team => {
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
      return { ...prev, teams: updatedTeams };
    });
  }, [setGameState]);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const teamsWithRoundResets = prev.teams.map(t => {
        const updatedTeam = { ...t };
        if (t.isHiding) {
          updatedTeam.cursesUsed = 0;
          updatedTeam.coins = updatedTeam.coins || INITIAL_COINS_HIDER_START; 
        } else if (t.isSeeking) {
          // Seekers have unlimited coins for actions, their coin count is not actively managed for spending
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
  }, [setGameState, toast]);

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
        if (newCurrentRound && newCurrentRound.seekingTeams.some(st => st.id === teamId)) {
          newCurrentRound.seekingTeams = newCurrentRound.seekingTeams.map(st => {
            if (st.id === teamId) {
              const currentCoins = st.coins || 0; // Seekers don't spend, but if this is for other reasons
              return { ...st, coins: operation === 'add' ? currentCoins + amount : Math.max(0, currentCoins - amount) };
            }
            return st;
          });
        }
        return { ...prev, teams: newTeams, currentRound: newCurrentRound };
    });
  }, [setGameState]);

  const setMtrMapUrl = useCallback((url: string) => {
    setGameState(prev => ({ ...prev, mtrMapUrl: url }));
  }, [setGameState]);

  const askQuestion = useCallback((question: AskedQuestion) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.hidingTeam) return prev;
      
      const questionOptionDetails = QUESTION_OPTIONS.find(opt => opt.id === question.questionOptionId);
      let coinsToAward = 0;
      if (questionOptionDetails) {
        coinsToAward = questionOptionDetails.hiderCoinsEarned;
      }

      let updatedTeams = [...prev.teams];
      let updatedHidingTeamInRound = prev.currentRound.hidingTeam ? { ...prev.currentRound.hidingTeam } : null;

      if (coinsToAward > 0 && updatedHidingTeamInRound) {
        const hiderTeamId = updatedHidingTeamInRound.id;
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
      
      return { ...prev, teams: updatedTeams, currentRound: updatedRound };
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

      const newCurrentRoundHidingTeam = {
        ...prev.currentRound.hidingTeam,
        cursesUsed: (prev.currentRound.hidingTeam.cursesUsed || 0) + 1,
      };

      return { ...prev, teams: newTeams, currentRound: { ...prev.currentRound, hidingTeam: newCurrentRoundHidingTeam } };
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
        resolutionStatus: 'pending_seeker_action', // Default status
      };
      if (hiderInputText) {
        activeCurseInfo.hiderInputText = hiderInputText;
      }
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: activeCurseInfo } };
    });
  }, [setGameState, toast]);

  const clearActiveCurse = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse) return prev;
      // const currentCurseName = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound?.activeCurse?.curseId)?.name;
      // toast({ title: "Curse Ended", description: `${currentCurseName || 'The active curse'} is no longer in effect.` });
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: null } };
    });
  }, [setGameState]);

  const seekerCompletesCurseAction = useCallback((photoFile?: File) => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse) return prev;
      const curseDetails = QUESTION_OPTIONS.find(q => q.id === `curse-${prev.currentRound!.activeCurse!.curseId}`); // This needs to be CURSE_DICE_OPTIONS
      const actualCurseDetails = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound!.activeCurse!.curseId);


      if (!actualCurseDetails) return prev;

      if (actualCurseDetails.requiresSeekerAction === 'photo' && photoFile) {
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
      } else if (actualCurseDetails.requiresSeekerAction === 'confirmation') {
        // const currentCurseName = actualCurseDetails.name;
        // toast({ title: "Curse Resolved", description: `${currentCurseName || 'The active curse'} has been resolved by seekers.` });
        return { ...prev, currentRound: { ...prev.currentRound, activeCurse: null } };
      }
      return prev; // Should not happen if logic is correct
    });
  }, [setGameState]);

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse || !prev.currentRound.activeCurse.seekerSubmittedPhoto) {
        toast({ title: "Error", description: "No seeker photo to acknowledge or no active curse.", variant: "destructive" });
        return prev;
      }
      // const currentCurseName = CURSE_DICE_OPTIONS.find(c => c.number === prev.currentRound?.activeCurse?.curseId)?.name;
      // toast({ title: "Curse Resolved", description: `${currentCurseName || 'The photo curse'} has been acknowledged and resolved.` });
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: null } };
    });
  }, [setGameState, toast]);
  
  const setAdminPinCb = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, adminPin: newPin }));
    setIsAdminAuthenticated(false); 
    localStorage.removeItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isAdminAuthenticated');
    toast({ title: "Admin PIN Updated", description: `Admin access PIN has been ${newPin === undefined ? "cleared" : "set"}. You may need to re-login.` });
  }, [setGameState, toast]);

  const setHiderPinCb = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, hiderPin: newPin }));
    setIsHiderAuthenticated(false);
    localStorage.removeItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isHiderAuthenticated');
    toast({ title: "Hider PIN Updated", description: `Hider panel PIN has been ${newPin === undefined ? "cleared" : "set"}. Access may be revoked until re-login.` });
  }, [setGameState, toast]);

  const setSeekerPinCb = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, seekerPin: newPin }));
    setIsSeekerAuthenticated(false);
    localStorage.removeItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isSeekerAuthenticated');
    toast({ title: "Seeker PIN Updated", description: `Seeker panel PIN has been ${newPin === undefined ? "cleared" : "set"}. Access may be revoked until re-login.` });
  }, [setGameState, toast]);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameStateRef.current.adminPin ?? defaultGameState.adminPin;
    if (effectiveAdminPin && effectiveAdminPin === enteredPin) {
      setIsAdminAuthenticated(true);
      localStorage.setItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isAdminAuthenticated', 'true');
      return true;
    }
    return false;
  }, []); 

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    if (gameStateRef.current.hiderPin && gameStateRef.current.hiderPin === enteredPin) {
      setIsHiderAuthenticated(true);
      localStorage.setItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isHiderAuthenticated', 'true');
      return true;
    }
    return false;
  }, []); 

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    if (gameStateRef.current.seekerPin && gameStateRef.current.seekerPin === enteredPin) {
      setIsSeekerAuthenticated(true);
      localStorage.setItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isSeekerAuthenticated', 'true');
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isAdminAuthenticated');
    toast({ title: "Admin Logged Out", description: "Admin panel access has been revoked for this session." });
  }, [toast]);

  const logoutHider = useCallback(() => {
    setIsHiderAuthenticated(false);
    localStorage.removeItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isHiderAuthenticated');
    toast({ title: "Hider Logged Out", description: "Hider panel access has been revoked for this session." });
  }, [toast]);

  const logoutSeeker = useCallback(() => {
    setIsSeekerAuthenticated(false);
    localStorage.removeItem(GAME_STATE_LOCAL_STORAGE_KEY_PREFIX + 'isSeekerAuthenticated');
    toast({ title: "Seeker Logged Out", description: "Seeker panel access has been revoked for this session." });
  }, [toast]);


  if (isLoadingState) {
    return <div className="flex justify-center items-center min-h-screen text-lg">Loading game state from server...</div>;
  }

  return (
    <GameContext.Provider value={{
      ...gameStateRef.current, 
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
      isMobile,
      askQuestion,
      answerQuestion,
      activateCurse,
      recordCurseUsed,
      clearActiveCurse,
      seekerCompletesCurseAction,
      hiderAcknowledgesSeekerPhoto,
      setAdminPin: setAdminPinCb,
      setHiderPin: setHiderPinCb,
      setSeekerPin: setSeekerPinCb,
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
