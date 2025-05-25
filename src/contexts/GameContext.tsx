
"use client";

import type { GameState, Player, Team, GameRound, AskedQuestion, ActiveCurseInfo, CurseRule } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND, GAME_TITLE } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const GAME_SESSION_ID = 'current_active_game';
const LOCAL_STORAGE_AUTH_PREFIX = `${GAME_TITLE.replace(/\s+/g, '_')}_auth_status_`;

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
        if (typeof value === 'string' && (key === 'timestamp' || key === 'startTime' || key === 'phaseStartTime' || key === 'endTime')) {
          const date = new Date(value);
          newObj[key] = !isNaN(date.getTime()) ? date : value;
        } else if (key === 'seekerSubmittedPhoto' && value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof File) ) {
           newObj[key] = null;
        } else {
          newObj[key] = deserializeDates(value);
        }
      }
    }
    return newObj;
  };

  let deserialized = deserializeDates(data);
  let merged = { ...defaultGameState, ...deserialized };

  merged.adminPin = merged.adminPin === "" ? undefined : (merged.adminPin ?? defaultGameState.adminPin);
  merged.hiderPin = merged.hiderPin === "" ? undefined : merged.hiderPin;
  merged.seekerPin = merged.seekerPin === "" ? undefined : merged.seekerPin;

  return merged;
};

const serializeStateForSupabase = (state: GameState): any => {
  return JSON.parse(JSON.stringify(state, (key, value) => {
    if ((key === 'seekerSubmittedPhoto' || key === 'responsePhoto') && value instanceof File) {
      return undefined; // Don't include File objects in JSON for Supabase
    }
    return value;
  }));
};

const uploadPhotoToSupabaseStorage = async (file: File, pathPrefix: string): Promise<string | null> => {
  try {
    const filePath = `${pathPrefix}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    console.log('[UPLOAD_PHOTO] Attempting to upload to Supabase Storage path:', filePath);

    const { data, error } = await supabase.storage
      .from('game-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error("[UPLOAD_PHOTO] Supabase Storage upload error:", error);
      return null;
    }
    if (!data) {
      console.error("[UPLOAD_PHOTO] Supabase Storage upload returned no data object.");
      return null;
    }

    console.log('[UPLOAD_PHOTO] Supabase Storage upload successful, data path:', data.path);
    const { data: urlData } = supabase.storage.from('game-assets').getPublicUrl(data.path); // Use data.path from upload result

    if (!urlData || !urlData.publicUrl) {
      console.error("[UPLOAD_PHOTO] Error getting public URL: urlData or publicUrl is null/undefined.", urlData);
      return null;
    }

    console.log('[UPLOAD_PHOTO] Successfully retrieved public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (e) {
    console.error("[UPLOAD_PHOTO] Exception during photo upload:", e);
    return null;
  }
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
  answerQuestion: (questionId: string, response: string | File) => Promise<void>;
  activateCurse: (hiderTeamId: string, rolledCurseNumber: number, hiderInputText?: string) => void;
  recordCurseUsed: (hiderTeamId: string) => void;
  clearActiveCurse: () => void;
  seekerCompletesCurseAction: (photoFile?: File) => Promise<void>;
  hiderAcknowledgesSeekerPhoto: () => void;

  setAdminPinCtx: (pin: string) => void;
  setHiderPinCtx: (pin: string) => void;
  setSeekerPinCtx: (pin: string) => void;
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
  const [gameStateInternal, setGameStateInternal] = useState<GameState>(defaultGameState);
  const gameStateRef = useRef(gameStateInternal);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isHiderAuthenticated, setIsHiderAuthenticated] = useState(false);
  const [isSeekerAuthenticated, setIsSeekerAuthenticated] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    gameStateRef.current = gameStateInternal;
  }, [gameStateInternal]);

  const setGameState = useCallback(async (updater: GameState | ((prevState: GameState) => GameState)) => {
    let finalNewState: GameState | null = null;

    setGameStateInternal(currentInternalState => {
      const newState = typeof updater === 'function' ? updater(currentInternalState) : updater;
      gameStateRef.current = newState;
      finalNewState = newState;
      console.log('[SET_GAME_STATE] Local state updated. Admin PIN in new state:', finalNewState?.adminPin);
      return newState;
    });

    if (finalNewState) {
      const serializedData = serializeStateForSupabase(finalNewState);
      console.log('[SYNC_UP] Attempting to update Supabase with state. Admin PIN:', finalNewState.adminPin);
      // console.log('[SYNC_UP] Data being sent to Supabase:', JSON.stringify(serializedData).substring(0, 500) + "...");

      const { error } = await supabase
        .from('game_sessions')
        .update({ game_data: serializedData, updated_at: new Date().toISOString() })
        .eq('id', GAME_SESSION_ID);

      if (error) {
        console.error("[SYNC_UP] Error updating game state in Supabase:", error);
        toast({ title: "Sync Error", description: `Failed to save game state: ${error.message}`, variant: "destructive" });
      } else {
        // console.log("[SYNC_UP] Supabase update successful.");
      }
    }
  }, [toast]);

  useEffect(() => {
    const fetchInitialState = async () => {
      console.log('[INIT] Fetching initial game state from Supabase...');
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('game_data')
          .eq('id', GAME_SESSION_ID)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("[INIT] Error fetching initial game state from Supabase:", error);
          toast({ title: "Database Error", description: `Failed to load game: ${error.message}`, variant: "destructive" });
          setGameStateInternal(defaultGameState);
          gameStateRef.current = defaultGameState;
          const defaultSerialized = serializeStateForSupabase(defaultGameState);
          await supabase.from('game_sessions').upsert({
            id: GAME_SESSION_ID,
            game_data: defaultSerialized,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        } else if (data && data.game_data) {
          console.log("[INIT] Game state found in Supabase. Deserializing...");
          const loadedState = deserializeState(data.game_data);
          setGameStateInternal(loadedState);
          gameStateRef.current = loadedState;
        } else {
          console.log("[INIT] No game state found or empty game_data. Initializing with default and saving to Supabase.");
          setGameStateInternal(defaultGameState);
          gameStateRef.current = defaultGameState;
          const defaultSerialized = serializeStateForSupabase(defaultGameState);
          const { error: insertError } = await supabase
            .from('game_sessions')
            .upsert({
              id: GAME_SESSION_ID,
              game_data: defaultSerialized,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          if (insertError) {
            console.error("[INIT] Error saving initial default state to Supabase:", insertError);
            toast({ title: "Database Error", description: `Failed to save initial game state: ${insertError.message}`, variant: "destructive" });
          }
        }
      } catch (e) {
        console.error("[INIT] Critical error during fetchInitialState:", e);
        toast({ title: "Initialization Error", description: "Could not initialize game state.", variant: "destructive" });
        setGameStateInternal(defaultGameState);
        gameStateRef.current = defaultGameState;
      } finally {
        setIsLoadingState(false);
        console.log('[INIT] Initial state loading process complete. Admin PIN in context:', gameStateRef.current.adminPin);
      }
    };

    if (typeof window !== 'undefined') {
      setIsAdminAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin') === 'true');
      setIsHiderAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider') === 'true');
      setIsSeekerAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker') === 'true');
    }

    fetchInitialState();

    console.log('[REALTIME] Setting up Supabase subscription...');
    const channel = supabase
      .channel('game_state_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${GAME_SESSION_ID}` },
        (payload) => {
          console.log('[REALTIME] Received Supabase payload:', payload.eventType, 'at', new Date().toLocaleTimeString());
          if (payload.new && (payload.new as any).game_data) {
            const incomingGameData = (payload.new as any).game_data;
            console.log('[REALTIME] Incoming game_data. Admin PIN:', incomingGameData.adminPin);
            const newGameStateFromSupabase = deserializeState(incomingGameData);
            setGameStateInternal(newGameStateFromSupabase);
            console.log('[REALTIME] Local state updated from Supabase. New Admin PIN in context:', newGameStateFromSupabase.adminPin, 'New currentRound status:', newGameStateFromSupabase.currentRound?.status);
          } else {
            console.log('[REALTIME] Payload did not contain new.game_data or new was null.');
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME] Successfully subscribed to real-time game updates!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[REALTIME] Subscription ${status}:`, err);
          toast({ title: "Real-time Error", description: `Connection issue: ${status}. Try refreshing.`, variant: "destructive" });
        } else {
          console.log('[REALTIME] Subscription status:', status);
        }
      });

    return () => {
      console.log('[REALTIME] Removing Supabase channel subscription.');
      supabase.removeChannel(channel).catch(err => console.error('[REALTIME] Error removing channel:', err));
    };
  }, []); // Empty dependency array

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
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
      let updatedTeams = prev.teams.map(team => {
        if (team.id === teamId) {
          const newRoleTeam = { ...team, isHiding, isSeeking };
          if (isHiding) {
            newRoleTeam.coins = team.coins === 0 && INITIAL_COINS_HIDER_START === 0 ? 0 : (team.coins || INITIAL_COINS_HIDER_START);
            newRoleTeam.cursesUsed = 0;
          } else if (isSeeking) {
            // Seeker coins are free
          }
          return newRoleTeam;
        }
        if (isHiding && team.id !== teamId) {
          return { ...team, isHiding: false };
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
          updatedTeam.coins = 0; // Seekers start with 0 coins per rules (unlimited asking)
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
      if (newCurrentRound?.hidingTeam?.id === teamId) {
        const currentHidingTeamCoins = newCurrentRound.hidingTeam.coins || 0;
        newCurrentRound.hidingTeam = {
          ...newCurrentRound.hidingTeam,
          coins: operation === 'add' ? currentHidingTeamCoins + amount : Math.max(0, currentHidingTeamCoins - amount)
        };
      }
      if (newCurrentRound?.seekingTeams) {
          newCurrentRound.seekingTeams = newCurrentRound.seekingTeams.map(st => {
              if (st.id === teamId) {
                  const currentSeekingTeamCoins = st.coins || 0;
                  return {
                      ...st,
                      coins: operation === 'add' ? currentSeekingTeamCoins + amount : Math.max(0, currentSeekingTeamCoins - amount)
                  };
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

  const answerQuestion = useCallback(async (questionId: string, response: string | File) => {
    let finalResponse: string | undefined = undefined;
    console.log(`[ANSWER_QUESTION] Processing question ${questionId}, response type: ${typeof response}`);

    if (typeof response === 'string') {
      finalResponse = response;
    } else if (response instanceof File) {
      toast({ title: "Uploading Photo...", description: "Please wait." });
      const uploadedUrl = await uploadPhotoToSupabaseStorage(response, 'public/question_responses');
      if (uploadedUrl) {
        finalResponse = uploadedUrl;
        toast({ title: "Photo Uploaded!", description: "Your photo response has been sent." });
        console.log(`[ANSWER_QUESTION] Photo uploaded for question ${questionId}, URL: ${uploadedUrl}`);
      } else {
        finalResponse = "[Photo Upload Failed]";
        toast({ title: "Upload Failed", description: "Could not upload photo. Please try again or check Supabase Storage policies.", variant: "destructive" });
        console.error(`[ANSWER_QUESTION] Photo upload failed for question ${questionId}. Check Supabase Storage & policies.`);
      }
    }

    if (finalResponse !== undefined) {
      console.log(`[ANSWER_QUESTION] Setting final response for question ${questionId}:`, finalResponse);
      setGameState(prev => {
        if (!prev.currentRound) return prev;
        const updatedAskedQuestions = prev.currentRound.askedQuestions.map(q =>
          q.id === questionId ? { ...q, response: finalResponse } : q
        );
        const updatedQuestion = updatedAskedQuestions.find(q => q.id === questionId);
        console.log('[ANSWER_QUESTION] Updated question in local state before Supabase sync:', updatedQuestion);
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            askedQuestions: updatedAskedQuestions,
          },
        };
      });
    } else {
      console.error(`[ANSWER_QUESTION] Final response for question ${questionId} is undefined. This should not happen.`);
    }
  }, [setGameState, toast]);

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
        toast({ title: "Error", description: "Cannot activate curse. Hiding team mismatch or no active round.", variant: "destructive" })
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
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: activeCurseInfo } };
    });
  }, [setGameState, toast]);

  const clearActiveCurse = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse) return prev;
      // toast({ title: "Curse Cleared", description: "The active curse has been resolved or cleared." });
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: null } };
    });
  }, [setGameState]);

  const seekerCompletesCurseAction = useCallback(async (photoFile?: File) => {
    const currentActiveCurse = gameStateRef.current.currentRound?.activeCurse;
    if (!currentActiveCurse) return;

    const actualCurseDetails = CURSE_DICE_OPTIONS.find(c => c.number === currentActiveCurse.curseId);
    if (!actualCurseDetails) return;

    if (actualCurseDetails.requiresSeekerAction === 'photo' && photoFile) {
      toast({ title: "Uploading Curse Photo...", description: "Please wait." });
      const uploadedUrl = await uploadPhotoToSupabaseStorage(photoFile, 'public/curse_photos');
      if (uploadedUrl) {
        toast({ title: "Curse Photo Uploaded!", description: "Awaiting hider acknowledgement." });
        setGameState(prev => {
          if (!prev.currentRound?.activeCurse) return prev;
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              activeCurse: {
                ...prev.currentRound.activeCurse,
                seekerSubmittedPhoto: photoFile, // Keep local File for immediate preview
                seekerSubmittedPhotoUrl: uploadedUrl, // Store URL for persistence
                resolutionStatus: 'pending_hider_acknowledgement',
              },
            },
          };
        });
      } else {
        toast({ title: "Curse Photo Upload Failed", description: "Could not upload photo for curse. Please try again.", variant: "destructive" });
      }
    } else if (actualCurseDetails.requiresSeekerAction === 'confirmation') {
      clearActiveCurse();
    }
  }, [setGameState, clearActiveCurse, toast]);

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    // toast({ title: "Photo Acknowledged", description: "The curse has been resolved." });
    clearActiveCurse();
  }, [clearActiveCurse]);

  const setAdminPinCtx = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, adminPin: newPin }));
    setIsAdminAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin');
    toast({ title: "Admin PIN Updated", description: `Admin access PIN has been ${newPin === undefined ? "cleared" : "set"}. You may need to re-login.` });
  }, [setGameState, toast]);

  const setHiderPinCtx = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, hiderPin: newPin }));
    setIsHiderAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider');
    toast({ title: "Hider PIN Updated", description: `Hider panel PIN has been ${newPin === undefined ? "cleared" : "set"}. Access may be revoked until re-login.` });
  }, [setGameState, toast]);

  const setSeekerPinCtx = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, seekerPin: newPin }));
    setIsSeekerAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker');
    toast({ title: "Seeker PIN Updated", description: `Seeker panel PIN has been ${newPin === undefined ? "cleared" : "set"}. Access may be revoked until re-login.` });
  }, [setGameState, toast]);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameStateRef.current.adminPin || defaultGameState.adminPin;
    if (effectiveAdminPin && effectiveAdminPin === enteredPin) {
      setIsAdminAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin', 'true');
      return true;
    }
    return false;
  }, []);

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    if (gameStateRef.current.hiderPin && gameStateRef.current.hiderPin === enteredPin) {
      setIsHiderAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider', 'true');
      return true;
    }
    return false;
  }, []);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    if (gameStateRef.current.seekerPin && gameStateRef.current.seekerPin === enteredPin) {
      setIsSeekerAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker', 'true');
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin');
    toast({ title: "Admin Logged Out", description: "Admin panel access has been revoked for this session." });
  }, [toast]);

  const logoutHider = useCallback(() => {
    setIsHiderAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider');
    toast({ title: "Hider Logged Out", description: "Hider panel access has been revoked for this session." });
  }, [toast]);

  const logoutSeeker = useCallback(() => {
    setIsSeekerAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker');
    toast({ title: "Seeker Logged Out", description: "Seeker panel access has been revoked for this session." });
  }, [toast]);


  if (isLoadingState && typeof window !== 'undefined') {
    return <div className="flex justify-center items-center min-h-screen text-lg bg-background text-foreground p-4">Loading game state from server... Please wait.</div>;
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
      setAdminPinCtx,
      setHiderPinCtx,
      setSeekerPinCtx,
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
