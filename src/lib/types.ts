
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
  coins: number; // Still used by Hiders for curses
  hidingTimeSeconds: number; // Longest time hidden in a round
  cursesUsed: number;
}

export type QuestionCategory = "Radar" | "Precision" | "Relative" | "Photo" | "Scan";

export interface QuestionOption {
  id: string;
  name: string;
  category: QuestionCategory;
  cost: number; // Will be 0 for seekers, but kept for potential future use or hider costs
  description: string;
  seekerPrompt?: string; // e.g. "Enter location for Radar"
  disabledCondition?: (gameState: GameState, team: Team) => boolean; // e.g. Photo disabled if seekers in zone
  icon?: React.ElementType;
}

export interface AskedQuestion {
  id: string;
  questionOptionId: string;
  category: QuestionCategory;
  text: string; // The actual question asked by seeker
  response?: string | File; // Hider's response (text or photo)
  isTruthful?: boolean; // For Radar, Precision, Scan
  timestamp: Date;
  askingTeamId: string;
}

export interface Challenge {
  id:string;
  description: string;
  status: "pending" | "completed" | "failed" | "vetoed";
  // coinsEarned is removed as seekers have unlimited coins
}

export type CurseDiceOutcome = 1 | 2 | 3 | 4 | 5 | 6;

export interface Curse {
  id: string;
  name: string;
  description: string;
  effect: (gameState: GameState, seekingTeam: Team) => void; // Placeholder for effect logic
  icon?: React.ElementType;
}

export interface GameRound {
  roundNumber: number;
  hidingTeam: Team | null;
  seekingTeams: Team[];
  startTime?: Date; // General start of the round
  phaseStartTime?: Date; // Start of the current phase (hiding or seeking)
  endTime?: Date;
  status: "pending" | "hiding-phase" | "seeking-phase" | "completed";
  askedQuestions: AskedQuestion[]; // Added to store questions for the round
}

export interface GameState {
  players: Player[];
  teams: Team[];
  currentRound: GameRound | null;
  gameHistory: GameRound[]; // To calculate overall winner
  mtrMapUrl?: string; // URL for the MTR map image
}

export type TeamRole = "hider" | "seeker" | "admin" | "spectator";

