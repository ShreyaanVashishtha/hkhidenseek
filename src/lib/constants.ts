
import type { QuestionOption, CurseRule } from '@/lib/types';
import { MapPin, Target, GitCompareArrows, Camera, ScanLine, ShieldAlert, Citrus, Footprints, Car, Route, Bird, Home, ShieldCheck, Search, Eye, ScrollText, Trophy } from 'lucide-react';

export const GAME_TITLE = "MTR Hide and Seek";

export const MTR_MAP_PLACEHOLDER_URL = "https://www.mtr.com.hk/en/customer/images/services/MTR_routemap_510.jpg"; // Default to actual MTR map

export const GAME_RULES = {
  introduction: "The team of Hiders that avoids capture for the longest time overall wins.",
  transport: {
    title: "Allowed Transport",
    rules: [
      "Only the MTR may be used.",
      "No buses, ferries, taxis, or trams."
    ]
  },
  geographicScope: {
    title: "Geographic Scope",
    rules: [
      "Hong Kong is divided by MTR lines and station zones.",
      "A hiding zone is defined as a 500m radius from a chosen MTR station.",
      "The hider must stay within their 500m zone once hiding begins."
    ]
  },
  gamePhases: {
    title: "Game Phases",
    phases: [
      { name: "1. Hiding Phase (1 hour)", description: "Hiders choose and travel to a hiding zone. Seekers must remain at their starting location and cannot move during this time. Once the hour ends, the hiding timer starts." },
      { name: "2. Seeking Phase (up to 2 hours or until capture)", description: "Seekers begin moving via the MTR. Seekers complete challenges. Questions can be asked to narrow down the hider's location." }
    ]
  },
  hidingRules: {
    title: "Hiding Rules",
    rules: [
      "Hiders must stay inside their selected 500m zone.",
      "Once Seekers enter that zone, Hiders are no longer allowed to use Photo questions to protect their location.",
      "Hiders must stay together.",
      "Hiders may purchase curse dice to interfere with Seekers. Hiders earn coins when Seekers ask questions (see Question Types for amounts)."
    ]
  },
  challenges: {
    title: "Challenges (Seekers Only)",
    rules: [
      "Seekers complete physical, or location-based tasks.",
      "If a challenge is failed, Seekers receive a 15-minute penalty (no MTR use and no questions).",
      "Seekers may veto a challenge instead, with the same penalty."
    ]
  },
  coins: {
    title: "Coins",
    rules: [
      "Hiders use coins earned from Seekers' questions to purchase Curse Dice.",
      "Seekers have unlimited coins for asking questions (questions are free for them)."
    ]
  },
  questionRules: {
    title: "Question Rules",
    rules: [
      "Photo questions are disabled once seekers enter the 500m zone of the hiders.",
      "Scan responses must be truthful and answered within 2 minutes."
    ]
  },
  curseDiceRules: {
    title: "Hider’s Curse Dice Rules",
    rules: [
      `Cost: ${50} coins (purchased during the seeking phase).`, // CURSE_DICE_COST will be used in code
      "Roll a 6-sided die; results apply immediately.",
      `Curse dice can only be used ${2} times per round, per hider team.`, // MAX_CURSES_PER_ROUND
      "If you get the same curse number as before, you may get 1 additional try. If you still get the same curse number, your chance is lost."
    ]
  },
  endgame: {
    title: "Endgame",
    rules: [
      "Once a hider is caught, the round ends and teams rotate roles.",
      "The team with the longest successful hiding time across all rounds wins.",
      "After each round, roles rotate: One new team becomes Hiders, the rest become Seekers, shuffled if necessary.",
      "Each team should hide and seek at least once."
    ]
  }
};

export const QUESTION_OPTIONS: QuestionOption[] = [
  { id: 'q_radar', name: 'Radar', category: 'Radar', cost: 0, hiderCoinsEarned: 30, description: "Determine if hiders are near a location. Must be answered truthfully with 'Yes' or 'No'.", seekerPrompt: "e.g., Tsim Sha Tsui Station, Tsuen Wan Line, Hong Kong Island, New Territories, station connecting to East Rail Line, station with MTR interchange, station above ground.", icon: MapPin },
  { id: 'q_precision', name: 'Precision', category: 'Precision', cost: 0, hiderCoinsEarned: 10, description: "Yes/no questions to narrow down exact characteristics.", seekerPrompt: "e.g., Does your zone include a park? Near coastal area? District starts with 'S'? Includes a university? Connected to 2+ MTR lines?", icon: Target },
  { id: 'q_relative', name: 'Relative', category: 'Relative', cost: 0, hiderCoinsEarned: 40, description: "Compare a trait of seekers' current position with hiders'.", seekerPrompt: "e.g., Higher elevation? Line with fewer stations? MTR station closer to Central? Nearest MTR station north of us? More residential area?", icon: GitCompareArrows },
  { id: 'q_photo', name: 'Photo', category: 'Photo', cost: 0, hiderCoinsEarned: 15, description: "Hiders send a real-time photo of something nearby (no direct clues). Disabled if seekers in zone.", seekerPrompt: "e.g., Nearest shop? Tree/park? Something blue? Building >10 floors? Any advertisement? Tallest building seen?", icon: Camera, disabledCondition: (gameState, team) => { /* complex logic: if seekers in hider zone */ return false; } },
  { id: 'q_scan', name: 'Scan', category: 'Scan', cost: 0, hiderCoinsEarned: 20, description: "Ask 'Are you in [specific region]?' (1 per 30 mins). Truthful response within 2 mins.", seekerPrompt: "e.g., Kowloon, Island Line, Southern District.", icon: ScanLine }
];

export const CURSE_DICE_OPTIONS: CurseRule[] = [
  { number: 1, name: "William Tell Curse", description: "Seekers must knock an apple off their partner's head from 3m.", effect: "Seekers must perform the William Tell task.", icon: ShieldAlert, requiresSeekerAction: 'confirmation' },
  { number: 2, name: "Curse of the Lemon Phylactery", description: "Seekers must find and affix a lemon. Lost lemon = +30 mins for hider.", effect: "Seekers must find and carry lemons.", icon: Citrus, requiresSeekerAction: 'confirmation' },
  { number: 3, name: "Curse of the Gambler's Feet", description: "For 10 mins, seekers roll die for steps.", effect: "Seekers movement restricted by die rolls.", icon: Footprints, durationMinutes: 10 },
  { number: 4, name: "Curse of the Luxury Car", description: "Hider takes/shows a photo of a car. Seekers must find and photograph a car they believe is more expensive.", effect: "Seekers must find and photograph a more expensive car.", icon: Car, requiresSeekerAction: 'photo' },
  { number: 5, name: "Curse of the Right Turn", description: "For 15 mins, seekers only turn right. Dead end allows 180.", effect: "Seekers movement restricted to right turns.", icon: Route, durationMinutes: 15 },
  { number: 6, name: "Curse of the Zoologist", description: "Hider specifies an animal category (e.g., bird, insect, mammal). Seekers must photograph a wild animal of that category.", effect: "Seekers must find and photograph a similar wild animal.", icon: Bird, requiresSeekerAction: 'photo', requiresHiderTextInput: true }
];

export const INITIAL_COINS_HIDER_START = 0;
export const HIDING_PHASE_DURATION_MINUTES = 60;
export const SEEKING_PHASE_DURATION_MINUTES = 120;
export const CHALLENGE_PENALTY_MINUTES = 15;
export const CURSE_DICE_COST = 50;
export const MAX_CURSES_PER_ROUND = 2;

export const NAVIGATION_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/seeker", label: "Seeker", icon: Search },
  { href: "/hider", label: "Hider", icon: Eye },
  { href: "/rules", label: "Rules", icon: ScrollText },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export const MTR_LINES_EXAMPLE = ["Tsuen Wan Line", "Island Line", "Kwun Tong Line", "Tung Chung Line", "East Rail Line"];
export const DISTRICTS_EXAMPLE = ["Central & Western", "Wan Chai", "Eastern", "Southern", "Yau Tsim Mong", "Sham Shui Po", "Kowloon City", "Wong Tai Sin", "Kwun Tong", "Kwai Tsing", "Tsuen Wan", "Tuen Mun", "Yuen Long", "North", "Tai Po", "Sha Tin", "Sai Kung", "Islands"];
