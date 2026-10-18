export interface MTRLine {
  id: string;
  name: string;
  nameZh: string;
  color: string;
  stationIds: string[];
}

export type LabelPlacement = 'angle-top-right' | 'left' | 'right' | 'top' | 'bottom' | 'angle-bottom-right';

export interface MTRStation {
  id: string;
  name: string;
  nameZh: string;
  lines: string[];
  isInterchange: boolean;
  x: number;
  y: number;
  district: string;
  labelPlacement: LabelPlacement;
  labelDx?: number;
  labelDy?: number;
}

export const MTR_LINES: Record<string, MTRLine> = {
  ISL: {
    id: 'ISL',
    name: 'Island Line',
    nameZh: '港島綫',
    color: '#0071CE',
    stationIds: [
      'kennedy-town', 'hku', 'sai-ying-pun', 'sheung-wan', 'central', 'admiralty',
      'wan-chai', 'causeway-bay', 'tin-hau', 'fortress-hill', 'north-point',
      'quarry-bay', 'tai-koo', 'sai-wan-ho', 'shau-kei-wan', 'heng-fa-chuen', 'chai-wan'
    ]
  },
  TWL: {
    id: 'TWL',
    name: 'Tsuen Wan Line',
    nameZh: '荃灣綫',
    color: '#ED1D24',
    stationIds: [
      'tsuen-wan', 'tai-wo-hau', 'kwai-hing', 'kwai-fong', 'lai-king', 'mei-foo',
      'lai-chi-kok', 'cheung-sha-wan', 'sham-shui-po', 'prince-edward', 'mong-kok',
      'yau-ma-tei', 'jordan', 'tsim-sha-tsui', 'admiralty', 'central'
    ]
  },
  KTL: {
    id: 'KTL',
    name: 'Kwun Tong Line',
    nameZh: '觀塘綫',
    color: '#00A040',
    stationIds: [
      'whampoa', 'ho-man-tin', 'yau-ma-tei', 'mong-kok', 'prince-edward', 'shek-kip-mei',
      'kowloon-tong', 'lok-fu', 'wong-tai-sin', 'diamond-hill', 'choi-hung',
      'kowloon-bay', 'ngau-tau-kok', 'kwun-tong', 'lam-tin', 'yau-tong', 'tiu-keng-leng'
    ]
  },
  EAL: {
    id: 'EAL',
    name: 'East Rail Line',
    nameZh: '東鐵綫',
    color: '#53B7E8',
    stationIds: [
      'lo-wu', 'sheung-shui', 'fanling', 'tai-wo', 'tai-po-market', 'university',
      'fo-tan', 'sha-tin', 'tai-wai', 'kowloon-tong', 'mong-kok-east', 'hung-hom',
      'exhibition-centre', 'admiralty'
    ]
  },
  TML: {
    id: 'TML',
    name: 'Tuen Ma Line',
    nameZh: '屯馬綫',
    color: '#925F00',
    stationIds: [
      'tuen-mun', 'siu-hong', 'tin-shui-wai', 'long-ping', 'yuen-long', 'kam-sheung-road',
      'tsuen-wan-west', 'mei-foo', 'nam-cheong', 'austin', 'east-tsim-sha-tsui',
      'hung-hom', 'ho-man-tin', 'to-kwa-wan', 'sung-wong-toi', 'kai-tak', 'diamond-hill',
      'hin-kheng', 'tai-wai', 'che-kung-temple', 'sha-tin-wai', 'city-one',
      'shek-mun', 'tai-shui-hang', 'heng-on', 'ma-on-shan', 'wu-kai-sha'
    ]
  },
  TCL: {
    id: 'TCL',
    name: 'Tung Chung Line',
    nameZh: '東涌綫',
    color: '#F7943E',
    stationIds: [
      'tung-chung', 'sunny-bay', 'tsing-yi', 'lai-king', 'nam-cheong', 'olympic', 'kowloon', 'hong-kong'
    ]
  },
  AEL: {
    id: 'AEL',
    name: 'Airport Express',
    nameZh: '機場快綫',
    color: '#007A78',
    stationIds: [
      'asiaworld-expo', 'airport', 'tsing-yi', 'kowloon', 'hong-kong'
    ]
  },
  SIL: {
    id: 'SIL',
    name: 'South Island Line',
    nameZh: '南港島綫',
    color: '#B6BD00',
    stationIds: [
      'admiralty', 'ocean-park', 'wong-chuk-hang', 'lei-tung', 'south-horizons'
    ]
  },
  TKL: {
    id: 'TKL',
    name: 'Tseung Kwan O Line',
    nameZh: '將軍澳綫',
    color: '#6B208B',
    stationIds: [
      'north-point', 'quarry-bay', 'yau-tong', 'tiu-keng-leng', 'tseung-kwan-o',
      'hang-hau', 'po-lam', 'lohas-park'
    ]
  },
  DRL: {
    id: 'DRL',
    name: 'Disneyland Resort Line',
    nameZh: '迪士尼綫',
    color: '#F173AC',
    stationIds: [
      'sunny-bay', 'disneyland-resort'
    ]
  }
};

/**
 * Clean Octolinear HK MTR Map Coordinates (Canvas 1920 x 1150)
 * Designed with proportional spacing, dedicated label orientations, and 0/45/90 degree track geometry.
 */
export const MTR_STATIONS: Record<string, MTRStation> = {
  // ==========================================
  // Island Line (Bottom Horizontal East-West Spine, y = 920)
  // All labels angled at -45 deg to prevent horizontal collision
  // ==========================================
  'kennedy-town': { id: 'kennedy-town', name: 'Kennedy Town', nameZh: '堅尼地城', lines: ['ISL'], isInterchange: false, x: 200, y: 920, district: 'Central & Western', labelPlacement: 'angle-top-right' },
  'hku': { id: 'hku', name: 'HKU', nameZh: '香港大學', lines: ['ISL'], isInterchange: false, x: 280, y: 920, district: 'Central & Western', labelPlacement: 'angle-top-right' },
  'sai-ying-pun': { id: 'sai-ying-pun', name: 'Sai Ying Pun', nameZh: '西營盤', lines: ['ISL'], isInterchange: false, x: 360, y: 920, district: 'Central & Western', labelPlacement: 'angle-top-right' },
  'sheung-wan': { id: 'sheung-wan', name: 'Sheung Wan', nameZh: '上環', lines: ['ISL'], isInterchange: false, x: 440, y: 920, district: 'Central & Western', labelPlacement: 'angle-top-right' },
  'central': { id: 'central', name: 'Central', nameZh: '中環', lines: ['ISL', 'TWL', 'TCL', 'AEL'], isInterchange: true, x: 530, y: 920, district: 'Central & Western', labelPlacement: 'angle-top-right' },
  'admiralty': { id: 'admiralty', name: 'Admiralty', nameZh: '金鐘', lines: ['ISL', 'TWL', 'SIL', 'EAL'], isInterchange: true, x: 640, y: 920, district: 'Central & Western', labelPlacement: 'bottom', labelDy: 16 },
  'wan-chai': { id: 'wan-chai', name: 'Wan Chai', nameZh: '灣仔', lines: ['ISL'], isInterchange: false, x: 740, y: 920, district: 'Wan Chai', labelPlacement: 'angle-top-right' },
  'causeway-bay': { id: 'causeway-bay', name: 'Causeway Bay', nameZh: '銅鑼灣', lines: ['ISL'], isInterchange: false, x: 830, y: 920, district: 'Wan Chai', labelPlacement: 'angle-top-right' },
  'tin-hau': { id: 'tin-hau', name: 'Tin Hau', nameZh: '天后', lines: ['ISL'], isInterchange: false, x: 920, y: 920, district: 'Eastern', labelPlacement: 'angle-top-right' },
  'fortress-hill': { id: 'fortress-hill', name: 'Fortress Hill', nameZh: '炮台山', lines: ['ISL'], isInterchange: false, x: 1010, y: 920, district: 'Eastern', labelPlacement: 'angle-top-right' },
  'north-point': { id: 'north-point', name: 'North Point', nameZh: '北角', lines: ['ISL', 'TKL'], isInterchange: true, x: 1100, y: 920, district: 'Eastern', labelPlacement: 'bottom', labelDy: 16 },
  'quarry-bay': { id: 'quarry-bay', name: 'Quarry Bay', nameZh: '鰂魚涌', lines: ['ISL', 'TKL'], isInterchange: true, x: 1190, y: 920, district: 'Eastern', labelPlacement: 'bottom', labelDy: 16 },
  'tai-koo': { id: 'tai-koo', name: 'Tai Koo', nameZh: '太古', lines: ['ISL'], isInterchange: false, x: 1280, y: 920, district: 'Eastern', labelPlacement: 'angle-top-right' },
  'sai-wan-ho': { id: 'sai-wan-ho', name: 'Sai Wan Ho', nameZh: '西灣河', lines: ['ISL'], isInterchange: false, x: 1370, y: 920, district: 'Eastern', labelPlacement: 'angle-top-right' },
  'shau-kei-wan': { id: 'shau-kei-wan', name: 'Shau Kei Wan', nameZh: '筲箕灣', lines: ['ISL'], isInterchange: false, x: 1460, y: 920, district: 'Eastern', labelPlacement: 'angle-top-right' },
  'heng-fa-chuen': { id: 'heng-fa-chuen', name: 'Heng Fa Chuen', nameZh: '杏花邨', lines: ['ISL'], isInterchange: false, x: 1540, y: 960, district: 'Eastern', labelPlacement: 'angle-top-right' },
  'chai-wan': { id: 'chai-wan', name: 'Chai Wan', nameZh: '柴灣', lines: ['ISL'], isInterchange: false, x: 1600, y: 1020, district: 'Eastern', labelPlacement: 'right', labelDx: 12 },

  // ==========================================
  // South Island Line (Dropping South from Admiralty)
  // ==========================================
  'ocean-park': { id: 'ocean-park', name: 'Ocean Park', nameZh: '海洋公園', lines: ['SIL'], isInterchange: false, x: 640, y: 1000, district: 'Southern', labelPlacement: 'right', labelDx: 12 },
  'wong-chuk-hang': { id: 'wong-chuk-hang', name: 'Wong Chuk Hang', nameZh: '黃竹坑', lines: ['SIL'], isInterchange: false, x: 600, y: 1060, district: 'Southern', labelPlacement: 'bottom', labelDy: 14 },
  'lei-tung': { id: 'lei-tung', name: 'Lei Tung', nameZh: '利東', lines: ['SIL'], isInterchange: false, x: 520, y: 1060, district: 'Southern', labelPlacement: 'bottom', labelDy: 14 },
  'south-horizons': { id: 'south-horizons', name: 'South Horizons', nameZh: '海怡半島', lines: ['SIL'], isInterchange: false, x: 440, y: 1060, district: 'Southern', labelPlacement: 'left', labelDx: -12 },

  // ==========================================
  // Tsuen Wan Line (Nathan Road Vertical Spine & West Kowloon)
  // Nathan Road stations have labels on the LEFT to avoid overlapping East Rail
  // ==========================================
  'tsim-sha-tsui': { id: 'tsim-sha-tsui', name: 'Tsim Sha Tsui', nameZh: '尖沙咀', lines: ['TWL', 'TML'], isInterchange: true, x: 640, y: 780, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -16 },
  'jordan': { id: 'jordan', name: 'Jordan', nameZh: '佐敦', lines: ['TWL'], isInterchange: false, x: 640, y: 710, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -14 },
  'yau-ma-tei': { id: 'yau-ma-tei', name: 'Yau Ma Tei', nameZh: '油麻地', lines: ['TWL', 'KTL'], isInterchange: true, x: 640, y: 640, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -16 },
  'mong-kok': { id: 'mong-kok', name: 'Mong Kok', nameZh: '旺角', lines: ['TWL', 'KTL'], isInterchange: true, x: 640, y: 570, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -16 },
  'prince-edward': { id: 'prince-edward', name: 'Prince Edward', nameZh: '太子', lines: ['TWL', 'KTL'], isInterchange: true, x: 640, y: 500, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -16 },
  'sham-shui-po': { id: 'sham-shui-po', name: 'Sham Shui Po', nameZh: '深水埗', lines: ['TWL'], isInterchange: false, x: 570, y: 440, district: 'Sham Shui Po', labelPlacement: 'left', labelDx: -14 },
  'cheung-sha-wan': { id: 'cheung-sha-wan', name: 'Cheung Sha Wan', nameZh: '長沙灣', lines: ['TWL'], isInterchange: false, x: 510, y: 390, district: 'Sham Shui Po', labelPlacement: 'left', labelDx: -14 },
  'lai-chi-kok': { id: 'lai-chi-kok', name: 'Lai Chi Kok', nameZh: '荔枝角', lines: ['TWL'], isInterchange: false, x: 450, y: 340, district: 'Sham Shui Po', labelPlacement: 'left', labelDx: -14 },
  'mei-foo': { id: 'mei-foo', name: 'Mei Foo', nameZh: '美孚', lines: ['TWL', 'TML'], isInterchange: true, x: 390, y: 290, district: 'Sham Shui Po', labelPlacement: 'top', labelDy: -14 },
  'lai-king': { id: 'lai-king', name: 'Lai King', nameZh: '荔景', lines: ['TWL', 'TCL'], isInterchange: true, x: 320, y: 240, district: 'Kwai Tsing', labelPlacement: 'left', labelDx: -14 },
  'kwai-fong': { id: 'kwai-fong', name: 'Kwai Fong', nameZh: '葵芳', lines: ['TWL'], isInterchange: false, x: 320, y: 190, district: 'Kwai Tsing', labelPlacement: 'left', labelDx: -14 },
  'kwai-hing': { id: 'kwai-hing', name: 'Kwai Hing', nameZh: '葵興', lines: ['TWL'], isInterchange: false, x: 320, y: 140, district: 'Kwai Tsing', labelPlacement: 'left', labelDx: -14 },
  'tai-wo-hau': { id: 'tai-wo-hau', name: 'Tai Wo Hau', nameZh: '大窩口', lines: ['TWL'], isInterchange: false, x: 320, y: 90, district: 'Tsuen Wan', labelPlacement: 'left', labelDx: -14 },
  'tsuen-wan': { id: 'tsuen-wan', name: 'Tsuen Wan', nameZh: '荃灣', lines: ['TWL'], isInterchange: false, x: 320, y: 40, district: 'Tsuen Wan', labelPlacement: 'top', labelDy: -14 },

  // ==========================================
  // East Rail Line (Vertical Corridor on the East, x = 860)
  // Labels placed on the RIGHT to cleanly separate from Nathan Road
  // ==========================================
  'exhibition-centre': { id: 'exhibition-centre', name: 'Exhibition Centre', nameZh: '會展', lines: ['EAL'], isInterchange: false, x: 700, y: 880, district: 'Wan Chai', labelPlacement: 'angle-top-right' },
  'hung-hom': { id: 'hung-hom', name: 'Hung Hom', nameZh: '紅磡', lines: ['EAL', 'TML'], isInterchange: true, x: 800, y: 760, district: 'Yau Tsim Mong', labelPlacement: 'right', labelDx: 16 },
  'mong-kok-east': { id: 'mong-kok-east', name: 'Mong Kok East', nameZh: '旺角東', lines: ['EAL'], isInterchange: false, x: 800, y: 570, district: 'Yau Tsim Mong', labelPlacement: 'right', labelDx: 14 },
  'kowloon-tong': { id: 'kowloon-tong', name: 'Kowloon Tong', nameZh: '九龍塘', lines: ['EAL', 'KTL'], isInterchange: true, x: 800, y: 500, district: 'Kowloon City', labelPlacement: 'top', labelDy: -16 },
  'tai-wai': { id: 'tai-wai', name: 'Tai Wai', nameZh: '大圍', lines: ['EAL', 'TML'], isInterchange: true, x: 800, y: 400, district: 'Sha Tin', labelPlacement: 'left', labelDx: -16 },
  'sha-tin': { id: 'sha-tin', name: 'Sha Tin', nameZh: '沙田', lines: ['EAL'], isInterchange: false, x: 800, y: 330, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'fo-tan': { id: 'fo-tan', name: 'Fo Tan', nameZh: '火炭', lines: ['EAL'], isInterchange: false, x: 800, y: 270, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'university': { id: 'university', name: 'University', nameZh: '大學', lines: ['EAL'], isInterchange: false, x: 800, y: 210, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'tai-po-market': { id: 'tai-po-market', name: 'Tai Po Market', nameZh: '大埔墟', lines: ['EAL'], isInterchange: false, x: 800, y: 150, district: 'Tai Po', labelPlacement: 'right', labelDx: 14 },
  'tai-wo': { id: 'tai-wo', name: 'Tai Wo', nameZh: '太和', lines: ['EAL'], isInterchange: false, x: 800, y: 100, district: 'Tai Po', labelPlacement: 'right', labelDx: 14 },
  'fanling': { id: 'fanling', name: 'Fanling', nameZh: '粉嶺', lines: ['EAL'], isInterchange: false, x: 800, y: 60, district: 'North', labelPlacement: 'right', labelDx: 14 },
  'sheung-shui': { id: 'sheung-shui', name: 'Sheung Shui', nameZh: '上水', lines: ['EAL'], isInterchange: false, x: 800, y: 20, district: 'North', labelPlacement: 'right', labelDx: 14 },
  'lo-wu': { id: 'lo-wu', name: 'Lo Wu', nameZh: '羅湖', lines: ['EAL'], isInterchange: false, x: 740, y: -20, district: 'North', labelPlacement: 'top', labelDy: -12 },
  'lok-ma-chau': { id: 'lok-ma-chau', name: 'Lok Ma Chau', nameZh: '落馬洲', lines: ['EAL'], isInterchange: false, x: 680, y: -20, district: 'Yuen Long', labelPlacement: 'top', labelDy: -12 },

  // ==========================================
  // Kwun Tong Line (East Kowloon Arch, y = 500 & East Kowloon Spine)
  // ==========================================
  'whampoa': { id: 'whampoa', name: 'Whampoa', nameZh: '黃埔', lines: ['KTL'], isInterchange: false, x: 880, y: 720, district: 'Kowloon City', labelPlacement: 'right', labelDx: 14 },
  'ho-man-tin': { id: 'ho-man-tin', name: 'Ho Man Tin', nameZh: '何文田', lines: ['KTL', 'TML'], isInterchange: true, x: 880, y: 640, district: 'Kowloon City', labelPlacement: 'right', labelDx: 16 },
  'shek-kip-mei': { id: 'shek-kip-mei', name: 'Shek Kip Mei', nameZh: '石硤尾', lines: ['KTL'], isInterchange: false, x: 720, y: 500, district: 'Sham Shui Po', labelPlacement: 'top', labelDy: -14 },
  'lok-fu': { id: 'lok-fu', name: 'Lok Fu', nameZh: '樂富', lines: ['KTL'], isInterchange: false, x: 890, y: 500, district: 'Wong Tai Sin', labelPlacement: 'top', labelDy: -14 },
  'wong-tai-sin': { id: 'wong-tai-sin', name: 'Wong Tai Sin', nameZh: '黃大仙', lines: ['KTL'], isInterchange: false, x: 980, y: 500, district: 'Wong Tai Sin', labelPlacement: 'top', labelDy: -14 },
  'diamond-hill': { id: 'diamond-hill', name: 'Diamond Hill', nameZh: '鑽石山', lines: ['KTL', 'TML'], isInterchange: true, x: 1080, y: 500, district: 'Wong Tai Sin', labelPlacement: 'top', labelDy: -16 },
  'choi-hung': { id: 'choi-hung', name: 'Choi Hung', nameZh: '彩虹', lines: ['KTL'], isInterchange: false, x: 1180, y: 500, district: 'Wong Tai Sin', labelPlacement: 'top', labelDy: -14 },
  'kowloon-bay': { id: 'kowloon-bay', name: 'Kowloon Bay', nameZh: '九龍灣', lines: ['KTL'], isInterchange: false, x: 1260, y: 560, district: 'Kwun Tong', labelPlacement: 'right', labelDx: 14 },
  'ngau-tau-kok': { id: 'ngau-tau-kok', name: 'Ngau Tau Kok', nameZh: '牛頭角', lines: ['KTL'], isInterchange: false, x: 1260, y: 620, district: 'Kwun Tong', labelPlacement: 'right', labelDx: 14 },
  'kwun-tong': { id: 'kwun-tong', name: 'Kwun Tong', nameZh: '觀塘', lines: ['KTL'], isInterchange: false, x: 1260, y: 680, district: 'Kwun Tong', labelPlacement: 'right', labelDx: 14 },
  'lam-tin': { id: 'lam-tin', name: 'Lam Tin', nameZh: '藍田', lines: ['KTL'], isInterchange: false, x: 1260, y: 740, district: 'Kwun Tong', labelPlacement: 'right', labelDx: 14 },
  'yau-tong': { id: 'yau-tong', name: 'Yau Tong', nameZh: '油塘', lines: ['KTL', 'TKL'], isInterchange: true, x: 1260, y: 810, district: 'Kwun Tong', labelPlacement: 'left', labelDx: -16 },
  'tiu-keng-leng': { id: 'tiu-keng-leng', name: 'Tiu Keng Leng', nameZh: '調景嶺', lines: ['KTL', 'TKL'], isInterchange: true, x: 1350, y: 810, district: 'Sai Kung', labelPlacement: 'top', labelDy: -16 },

  // ==========================================
  // Tseung Kwan O Line
  // ==========================================
  'tseung-kwan-o': { id: 'tseung-kwan-o', name: 'Tseung Kwan O', nameZh: '將軍澳', lines: ['TKL'], isInterchange: true, x: 1450, y: 810, district: 'Sai Kung', labelPlacement: 'bottom', labelDy: 16 },
  'hang-hau': { id: 'hang-hau', name: 'Hang Hau', nameZh: '坑口', lines: ['TKL'], isInterchange: false, x: 1530, y: 760, district: 'Sai Kung', labelPlacement: 'right', labelDx: 14 },
  'po-lam': { id: 'po-lam', name: 'Po Lam', nameZh: '寶琳', lines: ['TKL'], isInterchange: false, x: 1610, y: 710, district: 'Sai Kung', labelPlacement: 'right', labelDx: 14 },
  'lohas-park': { id: 'lohas-park', name: 'LOHAS Park', nameZh: '康城', lines: ['TKL'], isInterchange: false, x: 1530, y: 860, district: 'Sai Kung', labelPlacement: 'right', labelDx: 14 },

  // ==========================================
  // Tuen Ma Line (East Section: Ma On Shan)
  // Clean 45-degree angle pointing northeast
  // ==========================================
  'hin-kheng': { id: 'hin-kheng', name: 'Hin Kheng', nameZh: '顯徑', lines: ['TML'], isInterchange: false, x: 880, y: 440, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'che-kung-temple': { id: 'che-kung-temple', name: 'Che Kung Temple', nameZh: '車公廟', lines: ['TML'], isInterchange: false, x: 920, y: 380, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'sha-tin-wai': { id: 'sha-tin-wai', name: 'Sha Tin Wai', nameZh: '沙田圍', lines: ['TML'], isInterchange: false, x: 980, y: 340, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'city-one': { id: 'city-one', name: 'City One', nameZh: '第一城', lines: ['TML'], isInterchange: false, x: 1050, y: 300, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'shek-mun': { id: 'shek-mun', name: 'Shek Mun', nameZh: '石門', lines: ['TML'], isInterchange: false, x: 1120, y: 260, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'tai-shui-hang': { id: 'tai-shui-hang', name: 'Tai Shui Hang', nameZh: '大水坑', lines: ['TML'], isInterchange: false, x: 1190, y: 220, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'heng-on': { id: 'heng-on', name: 'Heng On', nameZh: '恆安', lines: ['TML'], isInterchange: false, x: 1260, y: 180, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'ma-on-shan': { id: 'ma-on-shan', name: 'Ma On Shan', nameZh: '馬鞍山', lines: ['TML'], isInterchange: false, x: 1330, y: 140, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },
  'wu-kai-sha': { id: 'wu-kai-sha', name: 'Wu Kai Sha', nameZh: '烏溪沙', lines: ['TML'], isInterchange: false, x: 1400, y: 100, district: 'Sha Tin', labelPlacement: 'right', labelDx: 14 },

  // ==========================================
  // Tuen Ma Line (Central & Kai Tak)
  // ==========================================
  'kai-tak': { id: 'kai-tak', name: 'Kai Tak', nameZh: '啟德', lines: ['TML'], isInterchange: false, x: 1040, y: 570, district: 'Kowloon City', labelPlacement: 'bottom', labelDy: 14 },
  'sung-wong-toi': { id: 'sung-wong-toi', name: 'Sung Wong Toi', nameZh: '宋皇臺', lines: ['TML'], isInterchange: false, x: 990, y: 610, district: 'Kowloon City', labelPlacement: 'bottom', labelDy: 14 },
  'to-kwa-wan': { id: 'to-kwa-wan', name: 'To Kwa Wan', nameZh: '土瓜灣', lines: ['TML'], isInterchange: false, x: 940, y: 640, district: 'Kowloon City', labelPlacement: 'bottom', labelDy: 14 },
  'east-tsim-sha-tsui': { id: 'east-tsim-sha-tsui', name: 'East Tsim Sha Tsui', nameZh: '尖東', lines: ['TML', 'TWL'], isInterchange: true, x: 720, y: 780, district: 'Yau Tsim Mong', labelPlacement: 'bottom', labelDy: 16 },
  'austin': { id: 'austin', name: 'Austin', nameZh: '柯士甸', lines: ['TML'], isInterchange: false, x: 550, y: 740, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -14 },

  // ==========================================
  // Tuen Ma Line (West: New Territories West)
  // ==========================================
  'tsuen-wan-west': { id: 'tsuen-wan-west', name: 'Tsuen Wan West', nameZh: '荃灣西', lines: ['TML'], isInterchange: false, x: 300, y: 320, district: 'Tsuen Wan', labelPlacement: 'left', labelDx: -14 },
  'kam-sheung-road': { id: 'kam-sheung-road', name: 'Kam Sheung Road', nameZh: '錦上路', lines: ['TML'], isInterchange: false, x: 240, y: 260, district: 'Yuen Long', labelPlacement: 'left', labelDx: -14 },
  'yuen-long': { id: 'yuen-long', name: 'Yuen Long', nameZh: '元朗', lines: ['TML'], isInterchange: false, x: 190, y: 210, district: 'Yuen Long', labelPlacement: 'left', labelDx: -14 },
  'long-ping': { id: 'long-ping', name: 'Long Ping', nameZh: '朗屏', lines: ['TML'], isInterchange: false, x: 140, y: 160, district: 'Yuen Long', labelPlacement: 'left', labelDx: -14 },
  'tin-shui-wai': { id: 'tin-shui-wai', name: 'Tin Shui Wai', nameZh: '天水圍', lines: ['TML'], isInterchange: false, x: 90, y: 110, district: 'Yuen Long', labelPlacement: 'left', labelDx: -14 },
  'siu-hong': { id: 'siu-hong', name: 'Siu Hong', nameZh: '兆康', lines: ['TML'], isInterchange: false, x: 70, y: 160, district: 'Tuen Mun', labelPlacement: 'left', labelDx: -14 },
  'tuen-mun': { id: 'tuen-mun', name: 'Tuen Mun', nameZh: '屯門', lines: ['TML'], isInterchange: false, x: 70, y: 220, district: 'Tuen Mun', labelPlacement: 'left', labelDx: -14 },

  // ==========================================
  // Tung Chung Line & Airport Express (West Coast Corridor)
  // ==========================================
  'hong-kong': { id: 'hong-kong', name: 'Hong Kong', nameZh: '香港', lines: ['TCL', 'AEL', 'ISL', 'TWL'], isInterchange: true, x: 530, y: 860, district: 'Central & Western', labelPlacement: 'left', labelDx: -16 },
  'kowloon': { id: 'kowloon', name: 'Kowloon', nameZh: '九龍', lines: ['TCL', 'AEL'], isInterchange: true, x: 530, y: 700, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -16 },
  'olympic': { id: 'olympic', name: 'Olympic', nameZh: '奧運', lines: ['TCL'], isInterchange: false, x: 480, y: 590, district: 'Yau Tsim Mong', labelPlacement: 'left', labelDx: -14 },
  'nam-cheong': { id: 'nam-cheong', name: 'Nam Cheong', nameZh: '南昌', lines: ['TCL', 'TML'], isInterchange: true, x: 480, y: 500, district: 'Sham Shui Po', labelPlacement: 'left', labelDx: -16 },
  'tsing-yi': { id: 'tsing-yi', name: 'Tsing Yi', nameZh: '青衣', lines: ['TCL', 'AEL'], isInterchange: true, x: 260, y: 380, district: 'Kwai Tsing', labelPlacement: 'left', labelDx: -16 },
  'sunny-bay': { id: 'sunny-bay', name: 'Sunny Bay', nameZh: '欣澳', lines: ['TCL', 'DRL'], isInterchange: true, x: 190, y: 460, district: 'Tsuen Wan', labelPlacement: 'left', labelDx: -16 },
  'disneyland-resort': { id: 'disneyland-resort', name: 'Disneyland Resort', nameZh: '迪士尼', lines: ['DRL'], isInterchange: false, x: 190, y: 540, district: 'Tsuen Wan', labelPlacement: 'right', labelDx: 14 },
  'tung-chung': { id: 'tung-chung', name: 'Tung Chung', nameZh: '東涌', lines: ['TCL'], isInterchange: false, x: 110, y: 520, district: 'Islands', labelPlacement: 'left', labelDx: -14 },
  'airport': { id: 'airport', name: 'Airport', nameZh: '機場', lines: ['AEL'], isInterchange: false, x: 80, y: 440, district: 'Islands', labelPlacement: 'left', labelDx: -14 },
  'asiaworld-expo': { id: 'asiaworld-expo', name: 'AsiaWorld-Expo', nameZh: '博覽館', lines: ['AEL'], isInterchange: false, x: 40, y: 380, district: 'Islands', labelPlacement: 'top', labelDy: -14 }
};
