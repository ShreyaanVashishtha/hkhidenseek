
"use client";

import type { GameState, Player, Team, GameRound, AskedQuestion, ActiveCurseInfo, CurseRule } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND, GAME_TITLE, CHALLENGE_PENALTY_MINUTES, HIDING_PHASE_DURATION_MINUTES, SEEKING_PHASE_DURATION_MINUTES, CURSE_DICE_COST } from '@/lib/constants';
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

// Helper to deserialize dates from Supabase (JSON strings to Date objects)
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
      if (typeof value === 'string' && 
          (key === 'timestamp' || key === 'startTime' || key === 'phaseStartTime' || key === 'endTime' || /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
        const date = new Date(value);
        newObj[key] = !isNaN(date.getTime()) ? date : value;
      } else {
        newObj[key] = deserializeDates(value); 
      }
    }
  }
  return newObj;
};

const deserializeState = (data: any): GameState => {
  if (!data) return { ...defaultGameState };
  console.log('[DESERIALIZE] Raw game_data from Supabase:', JSON.stringify(data).substring(0, 300) + "...");
  
  let deserialized = deserializeDates(data);
  console.log('[DESERIALIZE] After deserializeDates. Admin PIN:', deserialized.adminPin, 'CurrentRound Status:', deserialized.currentRound?.status);

  if (deserialized.currentRound && deserialized.currentRound.askedQuestions) {
    console.log('[DESERIALIZE] askedQuestions before specific processing:', JSON.stringify(deserialized.currentRound.askedQuestions.map((q:any) => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined }))));
    deserialized.currentRound.askedQuestions = deserialized.currentRound.askedQuestions.map((q: any) => ({
      ...q,
      response: q.response, // Keep as is, assuming it's already a string (URL) or null/undefined
      timestamp: q.timestamp ? new Date(q.timestamp) : undefined,
    }));
    console.log('[DESERIALIZE] askedQuestions AFTER specific processing:', JSON.stringify(deserialized.currentRound.askedQuestions.map((q:any) => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined }))));
  } else {
    console.log('[DESERIALIZE] No currentRound or no askedQuestions to process specifically.');
  }
  
  let adminPinToUse = deserialized.adminPin;
  if (deserialized.adminPin === null || deserialized.adminPin === '') {
    adminPinToUse = undefined;
  } else if (deserialized.adminPin === undefined && defaultGameState.adminPin) {
    adminPinToUse = defaultGameState.adminPin;
  }

  const finalDeserializedState = { 
    ...defaultGameState, 
    ...deserialized,
    adminPin: adminPinToUse,
    hiderPin: deserialized.hiderPin === "" ? undefined : deserialized.hiderPin,
    seekerPin: deserialized.seekerPin === "" ? undefined : deserialized.seekerPin,
  };
  console.log('[DESERIALIZE] Final deserialized state. Admin PIN:', finalDeserializedState.adminPin);
  return finalDeserializedState;
};


const serializeStateForSupabase = (state: GameState): any => {
  const stateCopy = JSON.parse(JSON.stringify(state)); // Deep copy and convert Dates to ISO strings
  if (stateCopy.currentRound && stateCopy.currentRound.activeCurse && stateCopy.currentRound.activeCurse.seekerSubmittedPhoto) {
    delete stateCopy.currentRound.activeCurse.seekerSubmittedPhoto; // This field was for local File object, URL is seekerSubmittedPhotoUrl
  }
  if (stateCopy.currentRound?.askedQuestions) {
     console.log('[SERIALIZE] Serializing askedQuestions for Supabase. Responses:', stateCopy.currentRound.askedQuestions.map((q:any) => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined })));
  }
  return stateCopy;
};

const uploadPhotoToSupabaseStorage = async (file: File, pathPrefix: string): Promise<string | null> => {
  if (!(file instanceof File)) {
    console.error("[UPLOAD_PHOTO] Invalid file object provided:", file);
    return null;
  }
  if (file.size === 0) {
    console.error("[UPLOAD_PHOTO] File is empty (0 bytes). Cannot upload.");
    return null;
  }

  try {
    const filePath = `${pathPrefix}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    console.log('[UPLOAD_PHOTO] Attempting to upload file:', {name: file.name, size: file.size, type: file.type}, 'to Supabase Storage path:', filePath);

    const { data, error } = await supabase.storage
      .from('game-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Use false to avoid accidental overwrites if IDs are reused quickly, though unlikely with Date.now()
      });

    if (error) {
      console.error("[UPLOAD_PHOTO] Supabase Storage UPLOAD FAILED. Error object from SDK:", error);
      return null;
    }
    if (!data || !data.path) { 
      console.error("[UPLOAD_PHOTO] Supabase Storage upload returned no data object or no path in data object. Data:", data);
      return null;
    }
    console.log('[UPLOAD_PHOTO] Supabase Storage upload successful, data.path:', data.path);

    const { data: urlData } = supabase.storage.from('game-assets').getPublicUrl(data.path);

    if (!urlData || !urlData.publicUrl) {
      console.error("[UPLOAD_PHOTO] FAILED to get public URL. urlData object:", urlData);
      return null;
    }
    console.log('[UPLOAD_PHOTO] Successfully retrieved public URL:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (e) {
    console.error("[UPLOAD_PHOTO] CRITICAL EXCEPTION during photo upload process:", e);
    return null;
  }
};

interface GameContextType extends GameState {
  isLoadingState: boolean;
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
  
  authenticateAdmin: (enteredPin: string) => boolean;
  authenticateHider: (enteredPin: string) => boolean;
  authenticateSeeker: (enteredPin: string) => boolean;
  logoutAdmin: () => void;
  logoutHider: () => void;
  logoutSeeker: () => void;
  isAdminAuthenticated: boolean; 
  isHiderAuthenticated: boolean;
  isSeekerAuthenticated: boolean;
  setAdminPin: (pin: string) => void;
  setHiderPin: (pin: string) => void;
  setSeekerPin: (pin: string) => void;
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
      const newState = typeof updater === 'function' ? updater(gameStateRef.current) : updater; // Use gameStateRef.current
      gameStateRef.current = newState; 
      finalNewState = newState;
      console.log('[SET_GAME_STATE] Local state updated. Sending to Supabase. Admin PIN:', finalNewState?.adminPin);
      return newState; 
    });

    if (finalNewState) {
      const serializedData = serializeStateForSupabase(finalNewState);
      if (finalNewState.currentRound?.askedQuestions) {
         console.log('[SYNC_UP] About to send to Supabase. Asked questions responses:', finalNewState.currentRound.askedQuestions.map(q => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined })));
      }
      console.log('[SYNC_UP] Attempting to update Supabase with state. Admin PIN:', finalNewState.adminPin);
      
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
          await supabase.from('game_sessions').upsert({
             id: GAME_SESSION_ID, 
             game_data: serializeStateForSupabase(defaultGameState),
             updated_at: new Date().toISOString() 
          }, { onConflict: 'id' });

        } else if (data && data.game_data) {
          console.log("[INIT] Game state found in Supabase. Raw game_data:", JSON.stringify(data.game_data).substring(0, 500) + "...");
          if (data.game_data.currentRound && data.game_data.currentRound.askedQuestions) {
            console.log("[INIT] Raw askedQuestions from Supabase before deserialization:", JSON.stringify(data.game_data.currentRound.askedQuestions.map((q:any) => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined }))));
          }
          const loadedState = deserializeState(data.game_data);
          setGameStateInternal(loadedState);
          gameStateRef.current = loadedState;
        } else {
          console.log("[INIT] No game state found or empty game_data. Initializing with default and saving to Supabase.");
          setGameStateInternal(defaultGameState);
          gameStateRef.current = defaultGameState;
          const { error: insertError } = await supabase
            .from('game_sessions')
            .upsert({ 
              id: GAME_SESSION_ID, 
              game_data: serializeStateForSupabase(defaultGameState),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }); 
          if (insertError) {
            console.error("[INIT] Error saving initial default state to Supabase:", insertError);
          }
        }
      } catch (e) {
        console.error("[INIT] Critical error during fetchInitialState:", e);
        setGameStateInternal(defaultGameState);
        gameStateRef.current = defaultGameState;
      } finally {
          setIsLoadingState(false);
          console.log('[INIT] Initial state loading process complete. Admin PIN in context:', gameStateRef.current.adminPin);
      }
    };

    fetchInitialState();

    // Load local auth statuses
    if (typeof window !== 'undefined') {
        setIsAdminAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin') === 'true');
        setIsHiderAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider') === 'true');
        setIsSeekerAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker') === 'true');
    }

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
            console.log('[REALTIME] Incoming game_data (raw). Admin PIN:', incomingGameData.adminPin, 'CurrentRound Status:', incomingGameData.currentRound?.status);
             if (incomingGameData.currentRound && incomingGameData.currentRound.askedQuestions) {
                console.log('[REALTIME] Incoming askedQuestions from Supabase before deserialization:', JSON.stringify(incomingGameData.currentRound.askedQuestions.map((q:any) => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined }))));
             }
            
            const newGameStateFromSupabase = deserializeState(incomingGameData);
            
            setGameStateInternal(newGameStateFromSupabase); 
            gameStateRef.current = newGameStateFromSupabase; 
            console.log('[REALTIME] Change detected and applied. New Admin PIN in context:', newGameStateFromSupabase.adminPin);
            if (newGameStateFromSupabase.currentRound?.askedQuestions) {
                console.log('[REALTIME] Applied askedQuestions from Supabase (after deserialization):', newGameStateFromSupabase.currentRound.askedQuestions.map(q => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined })));
            }
          } else {
            console.warn('[REALTIME] Payload did not contain new.game_data or new was null.');
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME] Successfully subscribed to real-time game updates!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[REALTIME] Subscription ${status}:`, err);
        } else {
          console.log('[REALTIME] Subscription status:', status);
        }
      });

    return () => {
      console.log('[REALTIME] Removing Supabase channel subscription.');
      supabase.removeChannel(channel).catch(err => console.error('[REALTIME] Error removing channel:', err));
    };
  }, []); // Empty dependency array for setup/teardown once

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
             newRoleTeam.coins = INITIAL_COINS_HIDER_START;
             newRoleTeam.cursesUsed = 0; 
          }
          return newRoleTeam;
        }
        if (isHiding && team.isHiding && team.id !== teamId) {
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
        }
        if (t.isSeeking) { // Reset seeker coins only if they become seekers
             updatedTeam.coins = 0;
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
      if (newCurrentRound) {
        if (newCurrentRound.hidingTeam?.id === teamId) {
            const currentHidingTeamCoins = newCurrentRound.hidingTeam.coins || 0;
            newCurrentRound.hidingTeam = {
            ...newCurrentRound.hidingTeam,
            coins: operation === 'add' ? currentHidingTeamCoins + amount : Math.max(0, currentHidingTeamCoins - amount)
            };
        }
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
      } else {
          console.warn(`[ASK_QUESTION] Could not find question option details for ID: ${question.questionOptionId}`);
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
         console.log(`[ASK_QUESTION] Awarded ${coinsToAward} coins to hider team ${hiderTeamId}. New total: ${updatedHidingTeamInRound.coins}`);
      }
      
      const updatedAskedQuestions = [...prev.currentRound.askedQuestions, question];
      console.log(`[ASK_QUESTION] Adding new question. Total questions now: ${updatedAskedQuestions.length}. New question:`, JSON.stringify(question));
      
      const updatedRound = {
        ...prev.currentRound,
        hidingTeam: updatedHidingTeamInRound,
        askedQuestions: updatedAskedQuestions,
      };

      return { ...prev, teams: updatedTeams, currentRound: updatedRound };
    });
  }, [setGameState]);

  const answerQuestion = useCallback(async (questionId: string, response: string | File) => {
    let finalResponse: string | undefined = undefined;
    console.log(`[ANSWER_QUESTION] Processing questionId: ${questionId}, response type: ${typeof response}, isFile: ${response instanceof File}`);

    if (typeof response === 'string') {
      finalResponse = response;
    } else if (response instanceof File) {
      toast({ title: "Uploading Photo...", description: "Please wait." });
      const uploadedUrl = await uploadPhotoToSupabaseStorage(response, 'public/question_responses');
      if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
        finalResponse = uploadedUrl;
        toast({ title: "Photo Uploaded!", description: "Your photo response has been sent." });
        console.log(`[ANSWER_QUESTION] Photo uploaded for question ${questionId}, URL: ${finalResponse}`);
      } else {
        finalResponse = "[Photo Upload Failed - Check Logs & Supabase Policies]";
        toast({ title: "Upload Failed", description: "Could not upload photo. Please try again or check Supabase Storage policies.", variant: "destructive" });
        console.error(`[ANSWER_QUESTION] Photo upload failed for question ${questionId}. Upload function returned:`, uploadedUrl);
      }
    }

    if (finalResponse !== undefined) {
      console.log(`[ANSWER_QUESTION] Setting final response for question ${questionId}: ${finalResponse}`);
      setGameState(prev => {
        if (!prev.currentRound) {
            console.error("[ANSWER_QUESTION] No current round to update.");
            return prev;
        }
        let questionFoundAndUpdated = false;
        const updatedAskedQuestions = prev.currentRound.askedQuestions.map(q => {
          if (q.id === questionId) {
            console.log(`[ANSWER_QUESTION] Inside map: Updating question ${q.id}. Old response: ${q.response ? String(q.response).substring(0,70)+'...' : 'undefined'}, New response: ${String(finalResponse).substring(0,70)}...`);
            questionFoundAndUpdated = true;
            return { ...q, response: finalResponse };
          }
          return q;
        });

        if (!questionFoundAndUpdated) {
            console.error(`[ANSWER_QUESTION] Question with ID ${questionId} not found in currentRound.askedQuestions.`);
            return prev;
        }
        
        const updatedQuestionForLog = updatedAskedQuestions.find(q => q.id === questionId);
        console.log('[ANSWER_QUESTION] Updated question object:', JSON.stringify(updatedQuestionForLog));
        console.log('[ANSWER_QUESTION] Full updatedAskedQuestions array being set to currentRound:', updatedAskedQuestions.map(q => ({id: q.id, response: q.response ? String(q.response).substring(0,70)+'...' : undefined })));
        
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            askedQuestions: updatedAskedQuestions,
          },
        };
      });
    } else {
      console.error(`[ANSWER_QUESTION] Final response for question ${questionId} is undefined. Photo upload might have failed silently or an unexpected response type was encountered.`);
      toast({ title: "Response Error", description: "Failed to process response for question.", variant: "destructive" });
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
      console.log(`[ACTIVATE_CURSE] Activating curse ${rolledCurseNumber} for team ${hiderTeamId}. Hider input: ${hiderInputText || 'N/A'}`);
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: activeCurseInfo } };
    });
  }, [setGameState, toast]);

  const clearActiveCurse = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse) return prev;
      console.log('[CURSE_CLEAR] Clearing active curse. Old curseId:', prev.currentRound.activeCurse.curseId);
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: null } };
    });
  }, [setGameState]);

  const seekerCompletesCurseAction = useCallback(async (photoFile?: File) => {
    const currentGameState = gameStateRef.current; 
    const currentActiveCurse = currentGameState.currentRound?.activeCurse;
    if (!currentActiveCurse) {
        console.log('[SEEKER_CURSE_ACTION] No active curse to complete.');
        return;
    }

    const actualCurseDetails = CURSE_DICE_OPTIONS.find(c => c.number === currentActiveCurse.curseId);
    if (!actualCurseDetails) {
        console.log(`[SEEKER_CURSE_ACTION] Could not find details for curse ID ${currentActiveCurse.curseId}`);
        return;
    }
    console.log(`[SEEKER_CURSE_ACTION] Seeker attempting to complete action for curse: ${actualCurseDetails.name}`);

    if (actualCurseDetails.requiresSeekerAction === 'photo' && photoFile) {
      toast({ title: "Uploading Curse Photo...", description: "Please wait." });
      const uploadedUrl = await uploadPhotoToSupabaseStorage(photoFile, 'public/curse_photos');
      if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
        setGameState(prev => { 
          if (!prev.currentRound?.activeCurse) return prev;
          console.log(`[SEEKER_CURSE_ACTION] Photo uploaded for curse. URL: ${uploadedUrl}. Setting status to pending_hider_acknowledgement.`);
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              activeCurse: {
                ...prev.currentRound.activeCurse,
                seekerSubmittedPhotoUrl: uploadedUrl, 
                resolutionStatus: 'pending_hider_acknowledgement',
              },
            },
          };
        });
      } else {
        toast({ title: "Curse Photo Upload Failed", description: "Could not upload photo for curse. Please try again.", variant: "destructive" });
         console.error(`[SEEKER_CURSE_ACTION] Curse photo upload failed. Upload function returned:`, uploadedUrl);
      }
    } else if (actualCurseDetails.requiresSeekerAction === 'confirmation') {
      console.log(`[SEEKER_CURSE_ACTION] Seeker confirmed curse ${actualCurseDetails.name}. Clearing curse.`);
      clearActiveCurse(); 
    } else if (!actualCurseDetails.requiresSeekerAction && actualCurseDetails.durationMinutes) {
      console.log(`[SEEKER_CURSE_ACTION] Curse ${actualCurseDetails.name} is timed. Resolution handled by timer.`);
    } else {
        console.warn(`[SEEKER_CURSE_ACTION] Curse ${actualCurseDetails.name} was actioned by seeker but conditions not fully met (e.g. photo needed but not provided, or no action defined). Curse state:`, currentActiveCurse);
    }
  }, [setGameState, clearActiveCurse, toast]); 

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    console.log('[HIDER_ACK_PHOTO] Hider acknowledged seeker photo. Clearing curse.');
    clearActiveCurse(); 
  }, [clearActiveCurse]); 

  const setAdminPin = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, adminPin: newPin }));
    setIsAdminAuthenticated(false); 
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin');
  }, [setGameState]);

  const setHiderPin = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, hiderPin: newPin }));
    setIsHiderAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider');
  }, [setGameState]);

  const setSeekerPin = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, seekerPin: newPin }));
    setIsSeekerAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker');
  }, [setGameState]);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameStateRef.current.adminPin ?? defaultGameState.adminPin; 
    if (effectiveAdminPin && effectiveAdminPin === enteredPin) {
      setIsAdminAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin', 'true');
      return true;
    }
    return false;
  }, []); 

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    const effectiveHiderPin = gameStateRef.current.hiderPin; 
    if (effectiveHiderPin && effectiveHiderPin === enteredPin) {
      setIsHiderAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider', 'true');
      return true;
    }
    return false;
  }, []);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    const effectiveSeekerPin = gameStateRef.current.seekerPin; 
    if (effectiveSeekerPin && effectiveSeekerPin === enteredPin) {
      setIsSeekerAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker', 'true');
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin');
  }, []);

  const logoutHider = useCallback(() => {
    setIsHiderAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider');
  }, []);

  const logoutSeeker = useCallback(() => {
    setIsSeekerAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker');
  }, []);


  if (isLoadingState && typeof window !== 'undefined') { 
    return <div className="flex justify-center items-center min-h-screen text-lg bg-background text-foreground p-4">Loading game state from server... Please wait.</div>;
  }

  return (
    <GameContext.Provider value={{
      ...gameStateRef.current, 
      isLoadingState,
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
      adminPin: gameStateRef.current.adminPin, 
      hiderPin: gameStateRef.current.hiderPin,
      seekerPin: gameStateRef.current.seekerPin,
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
    
