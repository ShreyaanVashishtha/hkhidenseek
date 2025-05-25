
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

const deserializeState = (data: any): GameState => {
  if (!data) return { ...defaultGameState };
  console.log('[DESERIALIZE] Raw data from Supabase. Admin PIN:', data.adminPin, 'CurrentRound Status:', data.currentRound?.status);
  // console.log('[DESERIALIZE] Raw askedQuestions:', data.currentRound?.askedQuestions?.map((q:any) => ({id: q.id, response: q.response})));

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
        } else {
          newObj[key] = deserializeDates(value);
        }
      }
    }
    return newObj;
  };
  
  let deserialized = deserializeDates(data);
  // console.log('[DESERIALIZE] After deserializeDates. Admin PIN:', deserialized.adminPin, 'CurrentRound Status:', deserialized.currentRound?.status);
  console.log('[DESERIALIZE] After deserializeDates, askedQuestions:', deserialized.currentRound?.askedQuestions?.map((q:any) => ({id: q.id, response: q.response ? (typeof q.response === 'string' ? q.response.substring(0,30)+'...' : 'Non-string response') : undefined })));
  
  let adminPinToUse = deserialized.adminPin;
  if (deserialized.adminPin === null || deserialized.adminPin === '') { // Admin cleared PIN
    adminPinToUse = undefined;
  } else if (deserialized.adminPin === undefined && defaultGameState.adminPin) { // No PIN in DB, use default
    adminPinToUse = defaultGameState.adminPin;
  }

  return { 
    ...defaultGameState, 
    ...deserialized,
    adminPin: adminPinToUse, // Ensure default is applied if DB is null/undefined for admin
    hiderPin: deserialized.hiderPin === "" ? undefined : deserialized.hiderPin,
    seekerPin: deserialized.seekerPin === "" ? undefined : deserialized.seekerPin,
  };
};

const serializeStateForSupabase = (state: GameState): any => {
  // Deep copy to avoid modifying the original state
  const stateCopy = JSON.parse(JSON.stringify(state));
  
  // Remove client-only File objects if they exist (they shouldn't be in the state going to Supabase anyway)
  if (stateCopy.currentRound && stateCopy.currentRound.activeCurse && stateCopy.currentRound.activeCurse.seekerSubmittedPhoto) {
    delete stateCopy.currentRound.activeCurse.seekerSubmittedPhoto;
  }
  // console.log('[SERIALIZE] Serialized game_data for Supabase:', JSON.stringify(stateCopy).substring(0, 500) + "...");
  console.log('[SERIALIZE] Serialized askedQuestions for Supabase:', stateCopy.currentRound?.askedQuestions?.map((q:any) => ({id: q.id, response: q.response ? (typeof q.response === 'string' ? q.response.substring(0,30)+'...' : 'Non-string response') : undefined })));
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
      .from('game-assets') // Ensure this bucket name is correct
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Set to true if you want to overwrite, false to prevent
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
  const [gameStateInternal, setGameStateInternal] = useState<GameState>(defaultGameState);
  const gameStateRef = useRef(gameStateInternal); // To get the latest state in async callbacks
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
      // Use gameStateRef.current to ensure the updater always operates on the most up-to-date state,
      // especially if setGameState is called multiple times rapidly.
      const newState = typeof updater === 'function' ? updater(gameStateRef.current) : updater;
      gameStateRef.current = newState; // Update the ref immediately
      finalNewState = newState;
      console.log('[SET_GAME_STATE] Local state updated. Admin PIN:', finalNewState?.adminPin, 'CurrentRound Status:', finalNewState?.currentRound?.status);
      return newState; // Return the new state for React
    });

    // Persist to Supabase
    if (finalNewState) {
      const serializedData = serializeStateForSupabase(finalNewState);
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
  }, [toast]); // Removed setGameStateInternal from dependencies

  useEffect(() => {
    const fetchInitialState = async () => {
      console.log('[INIT] Fetching initial game state from Supabase...');
      setIsLoadingState(true);
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('game_data') // Only select game_data as PINs are inside it
          .eq('id', GAME_SESSION_ID)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for initialization
          console.error("[INIT] Error fetching initial game state from Supabase:", error);
          toast({ title: "Database Error", description: `Failed to load game: ${error.message}`, variant: "destructive" });
          setGameStateInternal(defaultGameState); // Fallback to default if fetch fails
          gameStateRef.current = defaultGameState;
          // Attempt to save default if row didn't exist or fetch failed badly
          await supabase.from('game_sessions').upsert({
             id: GAME_SESSION_ID, 
             game_data: serializeStateForSupabase(defaultGameState),
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
          const { error: insertError } = await supabase
            .from('game_sessions')
            .upsert({ 
              id: GAME_SESSION_ID, 
              game_data: serializeStateForSupabase(defaultGameState),
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

    fetchInitialState();

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
            // console.log('[REALTIME] Incoming game_data (raw):', JSON.stringify(incomingGameData).substring(0, 500) + "...");
             console.log('[REALTIME] Incoming game_data. Admin PIN:', incomingGameData.adminPin, 'Incoming currentRound status:', incomingGameData.currentRound?.status);
            
            const newGameStateFromSupabase = deserializeState(incomingGameData);
            
            // Update local state without causing another Supabase update from this client
            setGameStateInternal(newGameStateFromSupabase); 
            gameStateRef.current = newGameStateFromSupabase; // Keep ref in sync
            console.log('[REALTIME] Change detected and applied. New Admin PIN in context:', newGameStateFromSupabase.adminPin, 'New currentRound status:', newGameStateFromSupabase.currentRound?.status);
            console.log('[REALTIME] Applied askedQuestions from Supabase:', newGameStateFromSupabase.currentRound?.askedQuestions?.map(q => ({id: q.id, response: q.response ? (typeof q.response === 'string' ? q.response.substring(0,30)+'...' : 'Non-string response') : undefined })));

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
          toast({ title: "Real-time Error", description: `Connection issue: ${status}. Try refreshing.`, variant: "destructive" });
        } else {
          console.log('[REALTIME] Subscription status:', status);
        }
      });

    return () => {
      console.log('[REALTIME] Removing Supabase channel subscription.');
      supabase.removeChannel(channel).catch(err => console.error('[REALTIME] Error removing channel:', err));
    };
  }, []); // Empty dependency array to run once on mount and clean up on unmount

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
        // If this team is being set as hider, ensure no other team is hider
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
        if (t.isHiding) { // The team that *was* hiding, or will be.
          updatedTeam.cursesUsed = 0; 
          // Hider coins persist / are managed, only reset curses.
        }
        // if (t.isSeeking) { // if a team is *now* seeking, their coins effectively reset or don't matter for them
        //   updatedTeam.coins = 0; // Not strictly necessary if seekers have unlimited coins.
        // }
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
        hidingTeam: { ...hidingTeamForRound }, // Use the potentially reset team object
        seekingTeams: seekingTeamsForRound.map(st => ({ ...st })), // Use potentially reset team objects
        startTime: roundStartTime,
        phaseStartTime: roundStartTime, 
        status: 'hiding-phase',
        askedQuestions: [],
        activeCurse: null,
      };

      return {
        ...prev,
        currentRound: newRound,
        teams: teamsWithRoundResets, // Ensure the main teams array reflects any resets
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
      console.log(`[ANSWER_QUESTION] Setting final response for question ${questionId}: ${finalResponse.substring(0,50)}...`);
      setGameState(prev => {
        if (!prev.currentRound) return prev;
        let updatedQuestionForLog: AskedQuestion | undefined = undefined;
        const updatedAskedQuestions = prev.currentRound.askedQuestions.map(q => {
          if (q.id === questionId) {
            updatedQuestionForLog = { ...q, response: finalResponse };
            console.log(`[ANSWER_QUESTION] Inside map: Updating question ${q.id}. Old response: ${q.response}, New response: ${finalResponse.substring(0,50)}...`);
            return updatedQuestionForLog;
          }
          return q;
        });
        
        console.log('[ANSWER_QUESTION] Updated question object:', updatedQuestionForLog ? {id: updatedQuestionForLog.id, response: updatedQuestionForLog.response?.substring(0,50)+'...'} : undefined);
        console.log('[ANSWER_QUESTION] Full updatedAskedQuestions array being set to currentRound:', updatedAskedQuestions.map(q => ({id: q.id, response: q.response ? (typeof q.response === 'string' ? q.response.substring(0,30)+'...' : 'Non-string response') : undefined })));
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            askedQuestions: updatedAskedQuestions,
          },
        };
      });
    } else {
      console.error(`[ANSWER_QUESTION] Final response for question ${questionId} is undefined. This should not happen if upload succeeded or failed gracefully.`);
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
        resolutionStatus: 'pending_seeker_action', // Default status when curse activates
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
      // console.log('[CURSE_CLEAR] Clearing active curse.');
      return { ...prev, currentRound: { ...prev.currentRound, activeCurse: null } };
    });
  }, [setGameState]);

  const seekerCompletesCurseAction = useCallback(async (photoFile?: File) => {
    const currentGameState = gameStateRef.current; // Use ref to get current state
    const currentActiveCurse = currentGameState.currentRound?.activeCurse;
    if (!currentActiveCurse) return;

    const actualCurseDetails = CURSE_DICE_OPTIONS.find(c => c.number === currentActiveCurse.curseId);
    if (!actualCurseDetails) return;

    if (actualCurseDetails.requiresSeekerAction === 'photo' && photoFile) {
      toast({ title: "Uploading Curse Photo...", description: "Please wait." });
      const uploadedUrl = await uploadPhotoToSupabaseStorage(photoFile, 'public/curse_photos');
      if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
        // toast({ title: "Curse Photo Uploaded!", description: "Awaiting hider acknowledgement." });
        setGameState(prev => { // Use setGameState to ensure change is synced
          if (!prev.currentRound?.activeCurse) return prev;
          return {
            ...prev,
            currentRound: {
              ...prev.currentRound,
              activeCurse: {
                ...prev.currentRound.activeCurse,
                seekerSubmittedPhotoUrl: uploadedUrl, // Store the URL
                resolutionStatus: 'pending_hider_acknowledgement',
              },
            },
          };
        });
      } else {
        toast({ title: "Curse Photo Upload Failed", description: "Could not upload photo for curse. Please try again.", variant: "destructive" });
      }
    } else if (actualCurseDetails.requiresSeekerAction === 'confirmation') {
      // console.log(`[CURSE_RESOLVE] Seeker confirmed curse ${actualCurseDetails.name}.`);
      clearActiveCurse(); // This will call setGameState internally
    }
  }, [setGameState, clearActiveCurse, toast]); // Ensure setGameState and clearActiveCurse are dependencies

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    // console.log('[CURSE_ACK] Hider acknowledged seeker photo.');
    clearActiveCurse(); // This will call setGameState internally
  }, [clearActiveCurse]); // Ensure clearActiveCurse is a dependency

  const setAdminPin = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, adminPin: newPin }));
    setIsAdminAuthenticated(false); 
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin');
    toast({ title: "Admin PIN Updated", description: `Admin access PIN has been ${newPin === undefined ? "cleared" : "set"}.`});
  }, [setGameState, toast]);

  const setHiderPin = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, hiderPin: newPin }));
    setIsHiderAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider');
    toast({ title: "Hider PIN Updated", description: `Hider panel PIN has been ${newPin === undefined ? "cleared" : "set"}.` });
  }, [setGameState, toast]);

  const setSeekerPin = useCallback((pin: string) => {
    const newPin = pin.trim() === "" ? undefined : pin.trim();
    setGameState(prev => ({ ...prev, seekerPin: newPin }));
    setIsSeekerAuthenticated(false);
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker');
    toast({ title: "Seeker PIN Updated", description: `Seeker panel PIN has been ${newPin === undefined ? "cleared" : "set"}.` });
  }, [setGameState, toast]);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    const effectiveAdminPin = gameStateRef.current.adminPin; // Use ref for current PIN
    if ((!effectiveAdminPin && enteredPin === defaultGameState.adminPin) || (effectiveAdminPin && effectiveAdminPin === enteredPin)) {
      setIsAdminAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin', 'true');
      return true;
    }
    if (!effectiveAdminPin && enteredPin === "113221") { // Default check
        setIsAdminAuthenticated(true);
        if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin', 'true');
        return true;
    }
    return false;
  }, []); // No dependency on gameStateInternal directly

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    const effectiveHiderPin = gameStateRef.current.hiderPin; // Use ref for current PIN
    if (effectiveHiderPin && effectiveHiderPin === enteredPin) {
      setIsHiderAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider', 'true');
      return true;
    }
    return false;
  }, []);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    const effectiveSeekerPin = gameStateRef.current.seekerPin; // Use ref for current PIN
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

    