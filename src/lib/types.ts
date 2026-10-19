
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

export type QuestionCategory = "Radar" | "Precision" | "Relative" | "Photo" | "Scan" | "Thermometer";

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
  stationAId?: string; // For Thermometer questions
  stationBId?: string;
}

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ChallengeCard {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  coinsReward: number;
  timeLimitMinutes?: number;
  category: 'transit' | 'food' | 'culture' | 'physical' | 'stealth';
  requiresPhotoProof?: boolean;
}

export interface ActiveChallenge {
  card: ChallengeCard;
  startTime: Date;
  status: 'active' | 'completed' | 'failed' | 'vetoed';
  submittedPhotoUrl?: string;
  completedAt?: Date;
}

export interface Challenge {
  id: string;
  description: string;
  status: "pending" | "completed" | "failed" | "vetoed";
}

export type TimelineEventType =
  | 'round_start'
  | 'hiding_locked'
  | 'seeking_start'
  | 'question_asked'
  | 'question_answered'
  | 'challenge_drawn'
  | 'challenge_completed'
  | 'challenge_vetoed'
  | 'curse_activated'
  | 'curse_resolved'
  | 'endgame_breach'
  | 'tagged'
  | 'round_completed';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: TimelineEventType;
  title: string;
  description: string;
  teamId?: string;
  teamName?: string;
  teamRole?: 'hider' | 'seeker';
  badge?: string;
  photoUrl?: string;
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

export interface BeaconPing {
  id: string;
  timestamp: Date;
  district: string;
  lineName: string;
  message: string;
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
  // Jet Lag Hide & Seek additions:
  timeline?: TimelineEvent[];
  activeChallenge?: ActiveChallenge | null;
  drawnChallengeOptions?: ChallengeCard[];
  handCards?: ChallengeCard[]; // Up to 3 challenge cards in hand
  eliminatedStationIds?: string[];
  suspectStationIds?: string[]; // Ben & Adam's Top Suspects
  beaconPings?: BeaconPing[]; // 30-min mandatory hider pings
  nextBeaconTime?: Date;
  lockedHiderStationId?: string;
  isEndgameBreached?: boolean;
  tagEvent?: {
    taggedAt: Date;
    taggedByTeamId: string;
    photoUrl?: string;
  };
  seekerPenaltyEndTime?: Date;
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
  soundEnabled?: boolean;
}

export type TeamRole = "hider" | "seeker" | "admin" | "spectator";

