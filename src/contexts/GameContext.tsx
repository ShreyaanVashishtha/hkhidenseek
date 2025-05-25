
"use client";

import type { GameState, Player, Team, GameRound, TeamRole, AskedQuestion, QuestionOption, ActiveCurseInfo, CurseRule } from '@/lib/types';
import { MTR_MAP_PLACEHOLDER_URL, INITIAL_COINS_HIDER_START, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, MAX_CURSES_PER_ROUND } from '@/lib/constants';
import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
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
  setCurrentUserRole: (role: TeamRole | null) => void; // This might not be used if PinProtectPage handles roles
  currentUserRole: TeamRole | null; // This might not be used
  isMobile: boolean;
  askQuestion: (question: AskedQuestion) => void;
  answerQuestion: (questionId: string, response: string | File) => void;
  activateCurse: (hiderTeamId: string, rolledCurseNumber: number, hiderInputText?: string) => void;
  recordCurseUsed: (hiderTeamId: string) => void;
  clearActiveCurse: () => void;
  seekerCompletesCurseAction: (photoFile?: File) => void;
  hiderAcknowledgesSeekerPhoto: () => void;

  // PIN and Auth functions
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
  adminPin: undefined,
  hiderPin: undefined,
  seekerPin: undefined,
  isAdminAuthenticated: false,
  isHiderAuthenticated: false,
  isSeekerAuthenticated: false,
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

  useEffect(() => {
    // Load PINs and auth status from localStorage on initial load
    const loadedAdminPin = localStorage.getItem('adminPin_mtrGame');
    const loadedHiderPin = localStorage.getItem('hiderPin_mtrGame');
    const loadedSeekerPin = localStorage.getItem('seekerPin_mtrGame');
    const loadedIsAdminAuthed = localStorage.getItem('isAdminAuthenticated_mtrGame') === 'true';
    const loadedIsHiderAuthed = localStorage.getItem('isHiderAuthenticated_mtrGame') === 'true';
    const loadedIsSeekerAuthed = localStorage.getItem('isSeekerAuthenticated_mtrGame') === 'true';

    setGameState(prev => ({
      ...prev,
      adminPin: loadedAdminPin || undefined,
      hiderPin: loadedHiderPin || undefined,
      seekerPin: loadedSeekerPin || undefined,
      isAdminAuthenticated: loadedIsAdminAuthed,
      isHiderAuthenticated: loadedIsHiderAuthed,
      isSeekerAuthenticated: loadedIsSeekerAuthed,
    }));
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
      teams: prev.teams.map(team =>
        team.id === teamId ? { ...team, isHiding, isSeeking, coins: isHiding ? (team.coins || INITIAL_COINS_HIDER_START) : (isSeeking ? 0 : team.coins), cursesUsed: isHiding ? 0 : team.cursesUsed } : team
      ),
    }));
  }, []);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const teamsWithRoundResets = prev.teams.map(t => ({
        ...t,
        cursesUsed: t.isHiding ? 0 : t.cursesUsed, 
        coins: t.isSeeking ? 0 : (t.isHiding ? (t.coins || INITIAL_COINS_HIDER_START) : t.coins), 
      }));

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
        hidingTeam: hidingTeamForRound,
        seekingTeams: seekingTeamsForRound || [],
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
        if (newCurrentRound) {
            if (newCurrentRound.hidingTeam?.id === teamId) {
                const currentHidingTeamCoins = newCurrentRound.hidingTeam.coins || 0;
                newCurrentRound.hidingTeam = {
                    ...newCurrentRound.hidingTeam,
                    coins: operation === 'add' ? currentHidingTeamCoins + amount : Math.max(0, currentHidingTeamCoins - amount)
                };
            }
        }

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
      return {
        ...prev,
        currentRound: {
          ...prev.currentRound,
          activeCurse: null,
        },
      };
    });
    toast({ title: "Curse Cleared/Ended", description: "The active curse is no longer in effect." });
  }, []);

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
        clearActiveCurse(); // Call the existing clear function
        return prev; // clearActiveCurse will update state, so return prev here to avoid double update
      }
      return prev; 
    });
  }, [clearActiveCurse]); // Add clearActiveCurse to dependency array

  const hiderAcknowledgesSeekerPhoto = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentRound || !prev.currentRound.activeCurse || !prev.currentRound.activeCurse.seekerSubmittedPhoto) {
        toast({ title: "Error", description: "No seeker photo to acknowledge or no active curse.", variant: "destructive" });
        return prev;
      }
      clearActiveCurse(); // Call the existing clear function
      return prev; // clearActiveCurse will update state
    });
  }, [clearActiveCurse]); // Add clearActiveCurse to dependency array

  // PIN and Auth Logic
  const setAdminPin = useCallback((pin: string) => {
    setGameState(prev => ({ ...prev, adminPin: pin }));
    localStorage.setItem('adminPin_mtrGame', pin);
    toast({ title: "Admin PIN Set", description: "Admin access PIN has been updated." });
  }, []);

  const setHiderPin = useCallback((pin: string) => {
    setGameState(prev => ({ ...prev, hiderPin: pin }));
    localStorage.setItem('hiderPin_mtrGame', pin);
    toast({ title: "Hider PIN Set", description: "Hider panel access PIN has been updated." });
  }, []);

  const setSeekerPin = useCallback((pin: string) => {
    setGameState(prev => ({ ...prev, seekerPin: pin }));
    localStorage.setItem('seekerPin_mtrGame', pin);
    toast({ title: "Seeker PIN Set", description: "Seeker panel access PIN has been updated." });
  }, []);

  const authenticateAdmin = useCallback((enteredPin: string): boolean => {
    if (gameState.adminPin === enteredPin) {
      setGameState(prev => ({ ...prev, isAdminAuthenticated: true }));
      localStorage.setItem('isAdminAuthenticated_mtrGame', 'true');
      return true;
    }
    return false;
  }, [gameState.adminPin]);

  const authenticateHider = useCallback((enteredPin: string): boolean => {
    if (gameState.hiderPin === enteredPin) {
      setGameState(prev => ({ ...prev, isHiderAuthenticated: true }));
      localStorage.setItem('isHiderAuthenticated_mtrGame', 'true');
      return true;
    }
    return false;
  }, [gameState.hiderPin]);

  const authenticateSeeker = useCallback((enteredPin: string): boolean => {
    if (gameState.seekerPin === enteredPin) {
      setGameState(prev => ({ ...prev, isSeekerAuthenticated: true }));
      localStorage.setItem('isSeekerAuthenticated_mtrGame', 'true');
      return true;
    }
    return false;
  }, [gameState.seekerPin]);

  const logoutAdmin = useCallback(() => {
    setGameState(prev => ({ ...prev, isAdminAuthenticated: false }));
    localStorage.removeItem('isAdminAuthenticated_mtrGame');
    toast({ title: "Admin Logged Out", description: "Admin panel access has been revoked for this session." });
  }, []);
  
  const logoutHider = useCallback(() => {
    setGameState(prev => ({ ...prev, isHiderAuthenticated: false }));
    localStorage.removeItem('isHiderAuthenticated_mtrGame');
    toast({ title: "Hider Logged Out", description: "Hider panel access has been revoked for this session." });
  }, []);

  const logoutSeeker = useCallback(() => {
    setGameState(prev => ({ ...prev, isSeekerAuthenticated: false }));
    localStorage.removeItem('isSeekerAuthenticated_mtrGame');
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
