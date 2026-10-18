import { ChallengeCard } from './types';

export const HK_CHALLENGE_DECK: ChallengeCard[] = [
  // --- EASY TIER (15 - 25 Coins) ---
  {
    id: 'hk_c_mosaic',
    title: 'MTR Mosaic Wall Selfie',
    description: 'Find the iconic coloured mosaic tile wall of your current station and take a selfie clearly showing the Chinese calligraphy station name.',
    difficulty: 'easy',
    coinsReward: 20,
    timeLimitMinutes: 10,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_vitasoy',
    title: '7-Eleven Vitasoy Refresh',
    description: 'Find a station 7-Eleven or Circle K and purchase a classic Vitasoy or Hong Kong-style Lemon Tea. Both seekers must take a sip.',
    difficulty: 'easy',
    coinsReward: 20,
    timeLimitMinutes: 12,
    category: 'food',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_minibus',
    title: 'Green Minibus Sighting',
    description: 'Exit to the street or pedestrian footbridge and photograph a green New Territories / Kowloon public light bus (minibus) with its route destination sign clearly readable.',
    difficulty: 'easy',
    coinsReward: 25,
    timeLimitMinutes: 10,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_exit_letter',
    title: 'Initial Exit Hunter',
    description: 'Find an MTR exit whose letter matches the first letter of either seeker’s first name (e.g. Exit A, B, C, D...). Photograph the exit letter sign.',
    difficulty: 'easy',
    coinsReward: 15,
    timeLimitMinutes: 8,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_bilingual_ad',
    title: 'Bilingual Word Play',
    description: 'Find a commercial advertisement inside the station concourse that features both Chinese characters and English text. Read the slogan aloud.',
    difficulty: 'easy',
    coinsReward: 15,
    timeLimitMinutes: 8,
    category: 'culture',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_station_map',
    title: 'You Are Here',
    description: 'Find an official tactile station directory or "You Are Here" concourse map and take a photo pointing directly at your current location.',
    difficulty: 'easy',
    coinsReward: 20,
    timeLimitMinutes: 8,
    category: 'transit',
    requiresPhotoProof: true,
  },

  // --- MEDIUM TIER (40 - 65 Coins) ---
  {
    id: 'hk_c_egg_tart',
    title: 'Classic Cha Chaan Teng Snack',
    description: 'Buy and eat an authentic Hong Kong egg tart, pineapple bun (bolo bao), or curry fishball skewer from a bakery or street stall near the station.',
    difficulty: 'medium',
    coinsReward: 50,
    timeLimitMinutes: 20,
    category: 'food',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_taxi_count',
    title: 'Footbridge Taxi Tracker',
    description: 'Stand on a public footbridge or street corner and film 10 red urban taxis (or 10 green New Territories taxis) passing beneath you within 90 seconds.',
    difficulty: 'medium',
    coinsReward: 45,
    timeLimitMinutes: 15,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_double_decker',
    title: 'Full-Wrap Double Decker',
    description: 'Spot and photograph a KMB, Citybus, or Long Win double-decker bus that has a 100% full-body commercial advertisement wrap covering the sides.',
    difficulty: 'medium',
    coinsReward: 40,
    timeLimitMinutes: 15,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_colonial_street',
    title: 'Colonial Street Hunter',
    description: 'Find and photograph a Hong Kong T-shaped street sign bearing an English royal or colonial name (e.g., Queen’s Road, King’s Road, Nathan Road, Prince Edward, Victoria, Salisbury, Waterloo).',
    difficulty: 'medium',
    coinsReward: 55,
    timeLimitMinutes: 20,
    category: 'culture',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_ding_ding',
    title: 'Ding Ding Tram Glimpse',
    description: 'Capture a photo or 3-second video of an iconic Hong Kong Island double-decker "Ding Ding" tram in motion (or the MTR Light Rail if in the New Territories).',
    difficulty: 'medium',
    coinsReward: 50,
    timeLimitMinutes: 20,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_skyline_frame',
    title: 'Urban Density Snapshot',
    description: 'Step outside the station and take a photo looking straight up between at least three high-rise residential or commercial towers framing the sky.',
    difficulty: 'medium',
    coinsReward: 45,
    timeLimitMinutes: 15,
    category: 'culture',
    requiresPhotoProof: true,
  },

  // --- HARD TIER (80 - 120 Coins) ---
  {
    id: 'hk_c_star_ferry',
    title: 'Victoria Harbour Ferry Voyage',
    description: 'Board and cross Victoria Harbour on the Star Ferry between Tsim Sha Tsui and Central / Wan Chai. Photograph the harbour view from the upper deck.',
    difficulty: 'hard',
    coinsReward: 100,
    timeLimitMinutes: 35,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_tram_ride',
    title: 'Ding Ding Tram Commute',
    description: 'Board a Hong Kong double-decker tram on Hong Kong Island and ride it for at least 3 consecutive stops. Photograph the view from the top front window.',
    difficulty: 'hard',
    coinsReward: 90,
    timeLimitMinutes: 30,
    category: 'transit',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_memory_recitation',
    title: 'MTR Line Memory Master',
    description: 'Without looking at any map or phone, one seeker must recite all stations on their current MTR line in order from memory within 45 seconds while their partner films them.',
    difficulty: 'hard',
    coinsReward: 85,
    timeLimitMinutes: 10,
    category: 'transit',
    requiresPhotoProof: false,
  },
  {
    id: 'hk_c_rooftop_panorama',
    title: 'High-Altitude Footbridge Network',
    description: 'Navigate through a shopping mall or elevated pedestrian walkway network connected to an MTR station up to at least the 4th level or outdoor podium, photographing the panoramic streetscape.',
    difficulty: 'hard',
    coinsReward: 95,
    timeLimitMinutes: 25,
    category: 'stealth',
    requiresPhotoProof: true,
  },
  {
    id: 'hk_c_tai_chi',
    title: 'Synchronized Station Tai Chi',
    description: 'Both seekers must stand outside an MTR entrance and execute a graceful 30-second synchronized Tai Chi sequence together without breaking character.',
    difficulty: 'hard',
    coinsReward: 80,
    timeLimitMinutes: 15,
    category: 'physical',
    requiresPhotoProof: true,
  },
];

/**
 * Draw random challenge cards from the deck
 */
export function drawRandomChallenges(count: number = 2, excludeIds: string[] = []): ChallengeCard[] {
  const available = HK_CHALLENGE_DECK.filter(c => !excludeIds.includes(c.id));
  const pool = available.length >= count ? available : HK_CHALLENGE_DECK;
  
  // Shuffle pool using Fisher-Yates
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
