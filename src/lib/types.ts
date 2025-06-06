
export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  isHiding: boolean;
  isSeeking: boolean;
  coins: number;
  hidingTimeSeconds: number;
  cursesUsed: number;
}

export type QuestionCategory = "Radar" | "Precision" | "Relative" | "Photo" | "Scan";

export interface QuestionOption {
  id: string;
  name: string;
  category: QuestionCategory;
  cost: number;
  hiderCoinsEarned: number;
  description: string;
  seekerPrompt?: string;
  disabledCondition?: (gameState: GameState, team: Team) => boolean;
  icon?: React.ElementType;
}

export interface AskedQuestion {
  id: string;
  questionOptionId: string;
  category: QuestionCategory;
  text: string;
  response?: string; // Stores text response or URL for a photo
  isTruthful?: boolean;
  timestamp: Date;
  askingTeamId: string;
}

export interface Challenge {
  id:string;
  description: string;
  status: "pending" | "completed" | "failed" | "vetoed";
}

export type CurseDiceOutcome = 1 | 2 | 3 | 4 | 5 | 6;

export interface CurseRule {
  number: number;
  name: string;
  description: string;
  effect: string;
  icon: React.ElementType;
  durationMinutes?: number;
  requiresSeekerAction?: 'photo' | 'confirmation';
  requiresHiderTextInput?: boolean;
}


export interface ActiveCurseInfo {
  curseId: number;
  startTime: Date;
  hiderInputText?: string;
  seekerSubmittedPhoto?: File; // For local preview on seeker side
  seekerSubmittedPhotoUrl?: string; // For persisted storage and hider view
  resolutionStatus?: 'pending_seeker_action' | 'pending_hider_acknowledgement' | 'resolved';
}

export interface GameRound {
  roundNumber: number;
  hidingTeam: Team | null;
  seekingTeams: Team[];
  startTime?: Date;
  phaseStartTime?: Date;
  endTime?: Date;
  status: "pending" | "hiding-phase" | "seeking-phase" | "completed";
  askedQuestions: AskedQuestion[];
  activeCurse: ActiveCurseInfo | null;
}

export interface GameState {
  players: Player[];
  teams: Team[];
  currentRound: GameRound | null;
  gameHistory: GameRound[];
  mtrMapUrl?: string;
  adminPin?: string;
  hiderPin?: string;
  seekerPin?: string;
}

export type TeamRole = "hider" | "seeker" | "admin" | "spectator";

