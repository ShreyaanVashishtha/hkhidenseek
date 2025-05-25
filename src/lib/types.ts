
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
  cost: number; // Cost for seeker (will be 0 as they have unlimited)
  hiderCoinsEarned: number; // Coins hider earns for this question
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
  response?: string | File;
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

export interface Curse {
  id: string;
  name: string;
  description: string;
  effect: (gameState: GameState, seekingTeam: Team) => void;
  icon?: React.ElementType;
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
  activeCurse: {
    curseId: number; // The number rolled, links to CURSE_DICE_OPTIONS
    startTime: Date;
  } | null;
}

export interface GameState {
  players: Player[];
  teams: Team[];
  currentRound: GameRound | null;
  gameHistory: GameRound[];
  mtrMapUrl?: string;
}

export type TeamRole = "hider" | "seeker" | "admin" | "spectator";
