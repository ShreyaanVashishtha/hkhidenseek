
"use client";

import type { 
  GameState, 
  Player, 
  Team, 
  GameRound, 
  AskedQuestion, 
  ActiveCurseInfo, 
  CurseRule, 
  ChallengeCard, 
  ActiveChallenge, 
  TimelineEvent 
} from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND, GAME_TITLE, CHALLENGE_PENALTY_MINUTES, HIDING_PHASE_DURATION_MINUTES, SEEKING_PHASE_DURATION_MINUTES, CURSE_DICE_COST } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { soundEffects } from '@/lib/soundEffects';
import { MTR_STATIONS } from '@/lib/mtrData';

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
  soundEnabled: true,
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
          (key === 'timestamp' || key === 'startTime' || key === 'phaseStartTime' || key === 'endTime' || key === 'completedAt' || key === 'taggedAt' || key === 'seekerPenaltyEndTime' || /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
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

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const uploadPhotoToSupabaseStorage = async (file: File, pathPrefix: string): Promise<string | null> => {
  if (!(file instanceof File) || file.size === 0) {
    console.error("[UPLOAD_PHOTO] Invalid or empty file object provided:", file);
    return null;
  }

  // If Supabase credentials are not set, immediately use base64 Data URL for local/offline support
  if (!isSupabaseConfigured) {
    try {
      console.log('[UPLOAD_PHOTO] Supabase not configured. Using local Data URL.');
      return await readFileAsDataUrl(file);
    } catch (e) {
      console.error('[UPLOAD_PHOTO] Failed to generate local Data URL:', e);
      return null;
    }
  }

  try {
    const filePath = `${pathPrefix}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('game-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error || !data?.path) {
      console.warn("[UPLOAD_PHOTO] Supabase Storage upload failed, falling back to local Data URL:", error);
      return await readFileAsDataUrl(file);
    }

    const { data: urlData } = supabase.storage.from('game-assets').getPublicUrl(data.path);
    if (!urlData || !urlData.publicUrl) {
      return await readFileAsDataUrl(file);
    }

    return urlData.publicUrl;
  } catch (e) {
    console.warn("[UPLOAD_PHOTO] Exception during upload, falling back to local Data URL:", e);
    return await readFileAsDataUrl(file);
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

  // Jet Lag Hide & Seek methods
  soundEnabled: boolean;
  toggleSound: () => void;
  eliminatedStationIds: string[];
  toggleEliminateStation: (stationId: string) => void;
  eliminateStationsBulk: (stationIds: string[], action: 'eliminate' | 'restore') => void;
  resetEliminations: () => void;
  acceptChallengeCard: (card: ChallengeCard) => void;
  completeChallengeCard: (card: ChallengeCard, photoFile?: File) => Promise<void>;
  vetoChallengeCard: (card: ChallengeCard) => void;
  lockHiderStation: (stationId: string) => void;
  declareEndgameBreach: () => void;
  tagHider: (photoFile?: File) => Promise<void>;
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  
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
    const nextState: GameState = typeof updater === 'function' ? updater(gameStateRef.current) : updater;
    gameStateRef.current = nextState;
    setGameStateInternal(nextState);
    console.log('[SET_GAME_STATE] Local state updated. Sending to Supabase. Admin PIN:', nextState.adminPin);

    // Save to localStorage for instant local/offline persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mtr_hide_and_seek_game_data', JSON.stringify(nextState));
      } catch (err) {
        console.warn('[LOCAL_STORAGE] Failed to persist state locally:', err);
      }
    }

    if (isSupabaseConfigured && nextState) {
      try {
        const serializedData = serializeStateForSupabase(nextState);
        if (nextState.currentRound?.askedQuestions) {
          console.log('[SYNC_UP] Sending to Supabase. Asked questions count:', nextState.currentRound.askedQuestions.length);
        }
        
        const { error } = await supabase
          .from('game_sessions')
          .update({ game_data: serializedData, updated_at: new Date().toISOString() })
          .eq('id', GAME_SESSION_ID);

        if (error) {
          console.warn("[SYNC_UP] Supabase sync issue:", error.message);
        }
      } catch (err) {
        console.warn("[SYNC_UP] Exception during Supabase update (offline or unreachable):", err);
      }
    }
  }, [toast]); 

  useEffect(() => {
    const LOCAL_GAME_KEY = 'mtr_hide_and_seek_game_data';

    const loadLocalFallback = () => {
      if (typeof window !== 'undefined') {
        const localData = localStorage.getItem(LOCAL_GAME_KEY);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            const deserialized = deserializeState(parsed);
            setGameStateInternal(deserialized);
            gameStateRef.current = deserialized;
            console.log('[INIT] Loaded existing state from localStorage.');
            return;
          } catch (e) {
            console.warn('[INIT] Error parsing local game data:', e);
          }
        }
      }
      setGameStateInternal(defaultGameState);
      gameStateRef.current = defaultGameState;
    };

    const fetchInitialState = async () => {
      if (!isSupabaseConfigured) {
        console.log('[INIT] Supabase is not configured. Running in local-first mode.');
        loadLocalFallback();
        setIsLoadingState(false);
        return;
      }

      console.log('[INIT] Fetching initial game state from Supabase...');
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('game_data') 
          .eq('id', GAME_SESSION_ID)
          .single();

        if (error && error.code !== 'PGRST116') { 
          console.warn("[INIT] Supabase fetch failed, falling back to local state:", error.message);
          loadLocalFallback();
        } else if (data && data.game_data) {
          const loadedState = deserializeState(data.game_data);
          setGameStateInternal(loadedState);
          gameStateRef.current = loadedState;
        } else {
          loadLocalFallback();
          try {
            await supabase.from('game_sessions').upsert({ 
              id: GAME_SESSION_ID, 
              game_data: serializeStateForSupabase(gameStateRef.current),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }); 
          } catch (insertError) {
            console.warn("[INIT] Warning saving initial default state to Supabase:", insertError);
          }
        }
      } catch (e) {
        console.warn("[INIT] Error during fetchInitialState, using local fallback:", e);
        loadLocalFallback();
      } finally {
        setIsLoadingState(false);
      }
    };

    fetchInitialState();

    // Load local auth statuses
    if (typeof window !== 'undefined') {
      setIsAdminAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'admin') === 'true');
      setIsHiderAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'hider') === 'true');
      setIsSeekerAuthenticated(localStorage.getItem(LOCAL_STORAGE_AUTH_PREFIX + 'seeker') === 'true');

      // Cross-tab synchronization in local mode
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === LOCAL_GAME_KEY && e.newValue) {
          try {
            const incomingState = deserializeState(JSON.parse(e.newValue));
            setGameStateInternal(incomingState);
            gameStateRef.current = incomingState;
          } catch (err) {
            console.warn('[STORAGE_SYNC] Error syncing tab state:', err);
          }
        }
      };
      window.addEventListener('storage', handleStorageChange);
    }

    let channel: any = null;
    if (isSupabaseConfigured) {
      console.log('[REALTIME] Setting up Supabase subscription...');
      channel = supabase
        .channel('game_state_updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${GAME_SESSION_ID}` },
          (payload) => {
            if (payload.new && (payload.new as any).game_data) {
              const newGameStateFromSupabase = deserializeState((payload.new as any).game_data);
              setGameStateInternal(newGameStateFromSupabase); 
              gameStateRef.current = newGameStateFromSupabase; 
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('[REALTIME] Successfully subscribed to real-time game updates!');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[REALTIME] Subscription ${status}:`, err);
          }
        });
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(err => console.error('[REALTIME] Error removing channel:', err));
      }
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
      const roundNum = (prev.currentRound?.roundNumber || 0) + 1;
      const newRound: GameRound = {
        roundNumber: roundNum,
        hidingTeam: { ...hidingTeamForRound }, 
        seekingTeams: seekingTeamsForRound.map(st => ({ ...st })), 
        startTime: roundStartTime,
        phaseStartTime: roundStartTime, 
        status: 'hiding-phase',
        askedQuestions: [],
        activeCurse: null,
        timeline: [
          {
            id: `tl-${Date.now()}`,
            timestamp: roundStartTime,
            type: 'round_start',
            title: `Round ${roundNum} Commenced`,
            description: `${hidingTeamForRound.name} is hiding! Hiders have 60 minutes to travel and lock into their 500m zone.`,
            badge: 'Round Start',
            teamName: hidingTeamForRound.name,
            teamRole: 'hider',
          }
        ],
        eliminatedStationIds: [],
        lockedHiderStationId: undefined,
        isEndgameBreached: false,
        activeChallenge: null,
      };

      return {
        ...prev,
        currentRound: newRound,
        teams: teamsWithRoundResets, 
      };
    });
  }, [setGameState, toast]);

  const startSeekingPhase = useCallback(() => {
    soundEffects.playVictory();
    setGameState(prev => {
      if (!prev.currentRound || prev.currentRound.status !== 'hiding-phase') {
        return prev;
      }
      const seekingStart = new Date();
      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: seekingStart,
        type: 'seeking_start',
        title: 'Seeking Phase Begun',
        description: 'Hiding period concluded! Seekers are now unleashed across the MTR network to pull challenges and ask questions.',
        badge: 'Seeking Phase',
      };

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          status: 'seeking-phase',
          phaseStartTime: seekingStart,
          timeline: [...existingTimeline, newEvent],
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
      
      soundEffects.playTick();
      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'question_asked',
        title: `${question.category} Question Asked`,
        description: `Seekers asked: "${question.text}". Hiders earn +${coinsToAward} coins.`,
        badge: question.category,
        teamRole: 'seeker',
      };

      const updatedAskedQuestions = [...prev.currentRound.askedQuestions, question];
      console.log(`[ASK_QUESTION] Adding new question. Total questions now: ${updatedAskedQuestions.length}. New question:`, JSON.stringify(question));
      
      const updatedRound = {
        ...prev.currentRound,
        hidingTeam: updatedHidingTeamInRound,
        askedQuestions: updatedAskedQuestions,
        timeline: [...existingTimeline, newEvent],
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
      if (uploadedUrl && typeof uploadedUrl === 'string') {
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
      soundEffects.playCoin();
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

        const answeredQ = prev.currentRound.askedQuestions.find(q => q.id === questionId);
        const existingTimeline = prev.currentRound.timeline || [];
        const isPhoto = finalResponse.startsWith('http') || finalResponse.startsWith('data:');
        const newEvent: TimelineEvent = {
          id: `tl-${Date.now()}`,
          timestamp: new Date(),
          type: 'question_answered',
          title: `Question Answered (${answeredQ?.category || 'Clue'})`,
          description: `Hider responded: "${isPhoto ? '[Photo Clue Attached]' : finalResponse}"`,
          badge: 'Answered',
          teamRole: 'hider',
          photoUrl: isPhoto ? finalResponse : undefined,
        };
        
        return {
          ...prev,
          currentRound: {
            ...prev.currentRound,
            askedQuestions: updatedAskedQuestions,
            timeline: [...existingTimeline, newEvent],
          },
        };
      });
    } else {
      console.error(`[ANSWER_QUESTION] Final response for question ${questionId} is undefined.`);
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
    soundEffects.playCurseAlarm();
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.hidingTeam || prev.currentRound.hidingTeam.id !== hiderTeamId) {
        toast({ title: "Error", description: "Cannot activate curse. Hiding team mismatch or no active round.", variant: "destructive" });
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

      const existingTimeline = prev.currentRound.timeline || [];
      const curseRule = CURSE_DICE_OPTIONS.find(c => c.number === rolledCurseNumber);
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'curse_activated',
        title: `Curse Activated: ${curseRule?.name || `Curse #${rolledCurseNumber}`}`,
        description: `${curseRule?.description || 'A curse was cast on the seekers!'}`,
        badge: `Curse #${rolledCurseNumber}`,
        teamRole: 'hider',
      };

      console.log(`[ACTIVATE_CURSE] Activating curse ${rolledCurseNumber} for team ${hiderTeamId}. Hider input: ${hiderInputText || 'N/A'}`);
      return { 
        ...prev, 
        currentRound: { 
          ...prev.currentRound, 
          activeCurse: activeCurseInfo,
          timeline: [...existingTimeline, newEvent]
        } 
      };
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

  // --- JET LAG HIDE & SEEK METHODS ---

  const toggleSound = useCallback(() => {
    setGameState(prev => {
      const nextSound = !(prev.soundEnabled ?? true);
      soundEffects.setEnabled(nextSound);
      return { ...prev, soundEnabled: nextSound };
    });
  }, [setGameState]);

  const lockHiderStation = useCallback((stationId: string) => {
    soundEffects.playCoin();
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const st = MTR_STATIONS[stationId];
      const stName = st ? `${st.name} (${st.nameZh})` : stationId;
      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'hiding_locked',
        title: 'Hiding Territory Anchored',
        description: `Hiders have anchored their secret 500m hiding perimeter at ${stName}.`,
        badge: 'Zone Locked',
        teamRole: 'hider',
      };

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          lockedHiderStationId: stationId,
          timeline: [...existingTimeline, newEvent],
        },
      };
    });
  }, [setGameState]);

  const toggleEliminateStation = useCallback((stationId: string) => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const currentEliminated = prev.currentRound.eliminatedStationIds || [];
      const isAlready = currentEliminated.includes(stationId);
      const nextEliminated = isAlready
        ? currentEliminated.filter(id => id !== stationId)
        : [...currentEliminated, stationId];

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          eliminatedStationIds: nextEliminated,
        },
      };
    });
  }, [setGameState]);

  const eliminateStationsBulk = useCallback((stationIds: string[], action: 'eliminate' | 'restore') => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const currentEliminated = prev.currentRound.eliminatedStationIds || [];
      let nextEliminated: string[];

      if (action === 'eliminate') {
        const set = new Set([...currentEliminated, ...stationIds]);
        nextEliminated = Array.from(set);
      } else {
        const removeSet = new Set(stationIds);
        nextEliminated = currentEliminated.filter(id => !removeSet.has(id));
      }

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          eliminatedStationIds: nextEliminated,
        },
      };
    });
  }, [setGameState]);

  const resetEliminations = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          eliminatedStationIds: [],
        },
      };
    });
  }, [setGameState]);

  const acceptChallengeCard = useCallback((card: ChallengeCard) => {
    soundEffects.playCardDraw();
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'challenge_drawn',
        title: `Challenge Accepted: ${card.title}`,
        description: `Seekers accepted "${card.title}" (${card.difficulty.toUpperCase()} tier). Reward: +${card.coinsReward} coins.`,
        badge: `+${card.coinsReward} Coins`,
        teamRole: 'seeker',
      };

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          activeChallenge: {
            card,
            startTime: new Date(),
            status: 'active',
          },
          timeline: [...existingTimeline, newEvent],
        },
      };
    });
  }, [setGameState]);

  const completeChallengeCard = useCallback(async (card: ChallengeCard, photoFile?: File) => {
    let uploadedPhotoUrl: string | undefined = undefined;
    if (photoFile) {
      const url = await uploadPhotoToSupabaseStorage(photoFile, 'public/challenge_proofs');
      if (url && typeof url === 'string') {
        uploadedPhotoUrl = url;
      }
    }

    soundEffects.playCoin();

    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const seekingTeam = prev.currentRound.seekingTeams[0];
      const seekerTeamId = seekingTeam?.id;

      const updatedTeams = prev.teams.map(t => {
        if (t.id === seekerTeamId || t.isSeeking) {
          return { ...t, coins: (t.coins || 0) + card.coinsReward };
        }
        return t;
      });

      const updatedSeekingTeams = prev.currentRound.seekingTeams.map(t => ({
        ...t,
        coins: (t.coins || 0) + card.coinsReward,
      }));

      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'challenge_completed',
        title: `Challenge Completed: ${card.title}`,
        description: `Seekers succeeded at "${card.title}"! Earned +${card.coinsReward} coins for the team bank.`,
        badge: `+${card.coinsReward} Earned`,
        teamRole: 'seeker',
        photoUrl: uploadedPhotoUrl,
      };

      return {
        ...prev,
        teams: updatedTeams,
        currentRound: {
          ...prev.currentRound,
          seekingTeams: updatedSeekingTeams,
          activeChallenge: null,
          timeline: [...existingTimeline, newEvent],
        },
      };
    });
  }, [setGameState]);

  const vetoChallengeCard = useCallback((card: ChallengeCard) => {
    soundEffects.playCurseAlarm();
    const penaltyEnd = new Date(Date.now() + 15 * 60 * 1000);

    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'challenge_vetoed',
        title: `Challenge Vetoed: ${card.title}`,
        description: `Seekers chose to veto "${card.title}". 15-minute freeze penalty activated (no MTR transit, no questions).`,
        badge: '15m Penalty',
        teamRole: 'seeker',
      };

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          activeChallenge: null,
          seekerPenaltyEndTime: penaltyEnd,
          timeline: [...existingTimeline, newEvent],
        },
      };
    });
  }, [setGameState]);

  const declareEndgameBreach = useCallback(() => {
    soundEffects.playBreachAlarm();
    setGameState(prev => {
      if (!prev.currentRound || prev.currentRound.isEndgameBreached) return prev;
      const existingTimeline = prev.currentRound.timeline || [];
      const lockedSt = prev.currentRound.lockedHiderStationId ? MTR_STATIONS[prev.currentRound.lockedHiderStationId] : null;
      const stName = lockedSt ? `${lockedSt.name} (${lockedSt.nameZh})` : 'Hider Zone';

      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
        type: 'endgame_breach',
        title: '🚨 ENDGAME 500m ZONE BREACHED!',
        description: `Seekers have penetrated the 500m perimeter around ${stName}! Photo questions are permanently disabled. Foot pursuit begins!`,
        badge: 'BREACH!',
      };

      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          isEndgameBreached: true,
          timeline: [...existingTimeline, newEvent],
        },
      };
    });
  }, [setGameState]);

  const tagHider = useCallback(async (photoFile?: File) => {
    let uploadedPhotoUrl: string | undefined = undefined;
    if (photoFile) {
      const url = await uploadPhotoToSupabaseStorage(photoFile, 'public/tag_photos');
      if (url && typeof url === 'string') {
        uploadedPhotoUrl = url;
      }
    }

    soundEffects.playVictory();

    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const endTime = new Date();
      const phaseStart = prev.currentRound.phaseStartTime ? new Date(prev.currentRound.phaseStartTime) : new Date(prev.currentRound.startTime || endTime);
      const totalHidingSeconds = Math.max(0, Math.floor((endTime.getTime() - phaseStart.getTime()) / 1000));
      const hours = Math.floor(totalHidingSeconds / 3600);
      const mins = Math.floor((totalHidingSeconds % 3600) / 60);
      const secs = totalHidingSeconds % 60;
      const durationStr = `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`;

      const seekingTeam = prev.currentRound.seekingTeams[0];
      const hidingTeam = prev.currentRound.hidingTeam;

      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: endTime,
        type: 'tagged',
        title: '🏆 HIDER CAUGHT AND TAGGED!',
        description: `Seekers successfully located and tagged ${hidingTeam?.name || 'Hiders'}! Total hiding time: ${durationStr}.`,
        badge: 'MATCH COMPLETE',
        photoUrl: uploadedPhotoUrl,
      };

      const finishedRound: GameRound = {
        ...prev.currentRound,
        endTime,
        status: 'completed',
        tagEvent: {
          taggedAt: endTime,
          taggedByTeamId: seekingTeam?.id || 'seekers',
          photoUrl: uploadedPhotoUrl,
        },
        timeline: [...existingTimeline, newEvent],
      };

      const updatedTeams = prev.teams.map(t => {
        if (t.id === hidingTeam?.id) {
          return {
            ...t,
            hidingTimeSeconds: Math.max(t.hidingTimeSeconds || 0, totalHidingSeconds),
          };
        }
        return t;
      });

      return {
        ...prev,
        currentRound: finishedRound,
        gameHistory: [...prev.gameHistory, finishedRound],
        teams: updatedTeams,
      };
    });
  }, [setGameState]);

  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    setGameState(prev => {
      if (!prev.currentRound) return prev;
      const existingTimeline = prev.currentRound.timeline || [];
      const newEvent: TimelineEvent = {
        ...event,
        id: `tl-${Date.now()}`,
        timestamp: new Date(),
      };
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          timeline: [...existingTimeline, newEvent],
        },
      };
    });
  }, [setGameState]);

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

  const eliminatedStationIds = gameStateRef.current.currentRound?.eliminatedStationIds || [];

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
      soundEnabled: gameStateRef.current.soundEnabled ?? true,
      toggleSound,
      eliminatedStationIds,
      toggleEliminateStation,
      eliminateStationsBulk,
      resetEliminations,
      acceptChallengeCard,
      completeChallengeCard,
      vetoChallengeCard,
      lockHiderStation,
      declareEndgameBreach,
      tagHider,
      addTimelineEvent,
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
    
