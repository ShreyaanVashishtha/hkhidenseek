export interface MTRLine {
  id: string;
  name: string;
  nameZh: string;
  color: string;
  stationIds: string[];
}

export interface MTRStation {
  id: string;
  name: string;
  nameZh: string;
  lines: string[];
  isInterchange: boolean;
  x: number;
  y: number;
  district: string;
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
      'central', 'admiralty', 'tsim-sha-tsui', 'jordan', 'yau-ma-tei', 'mong-kok',
      'prince-edward', 'sham-shui-po', 'cheung-sha-wan', 'lai-chi-kok', 'mei-foo',
      'lai-king', 'kwai-fong', 'kwai-hing', 'tai-wo-hau', 'tsuen-wan'
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
      'admiralty', 'exhibition-centre', 'hung-hom', 'mong-kok-east', 'kowloon-tong',
      'tai-wai', 'sha-tin', 'fo-tan', 'university', 'tai-po-market',
      'tai-wo', 'fanling', 'sheung-shui', 'lo-wu', 'lok-ma-chau'
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
      'hong-kong', 'kowloon', 'olympic', 'nam-cheong', 'lai-king', 'tsing-yi', 'sunny-bay', 'tung-chung'
    ]
  },
  AEL: {
    id: 'AEL',
    name: 'Airport Express',
    nameZh: '機場快綫',
    color: '#007A78',
    stationIds: [
      'hong-kong', 'kowloon', 'tsing-yi', 'airport', 'asiaworld-expo'
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

export const MTR_STATIONS: Record<string, MTRStation> = {
  // Island Line
  'kennedy-town': { id: 'kennedy-town', name: 'Kennedy Town', nameZh: '堅尼地城', lines: ['ISL'], isInterchange: false, x: 210, y: 730, district: 'Central & Western' },
  'hku': { id: 'hku', name: 'HKU', nameZh: '香港大學', lines: ['ISL'], isInterchange: false, x: 260, y: 730, district: 'Central & Western' },
  'sai-ying-pun': { id: 'sai-ying-pun', name: 'Sai Ying Pun', nameZh: '西營盤', lines: ['ISL'], isInterchange: false, x: 310, y: 730, district: 'Central & Western' },
  'sheung-wan': { id: 'sheung-wan', name: 'Sheung Wan', nameZh: '上環', lines: ['ISL'], isInterchange: false, x: 360, y: 730, district: 'Central & Western' },
  'central': { id: 'central', name: 'Central', nameZh: '中環', lines: ['ISL', 'TWL', 'TCL', 'AEL'], isInterchange: true, x: 420, y: 730, district: 'Central & Western' },
  'admiralty': { id: 'admiralty', name: 'Admiralty', nameZh: '金鐘', lines: ['ISL', 'TWL', 'SIL', 'EAL'], isInterchange: true, x: 500, y: 730, district: 'Central & Western' },
  'wan-chai': { id: 'wan-chai', name: 'Wan Chai', nameZh: '灣仔', lines: ['ISL'], isInterchange: false, x: 570, y: 730, district: 'Wan Chai' },
  'causeway-bay': { id: 'causeway-bay', name: 'Causeway Bay', nameZh: '銅鑼灣', lines: ['ISL'], isInterchange: false, x: 630, y: 730, district: 'Wan Chai' },
  'tin-hau': { id: 'tin-hau', name: 'Tin Hau', nameZh: '天后', lines: ['ISL'], isInterchange: false, x: 690, y: 730, district: 'Eastern' },
  'fortress-hill': { id: 'fortress-hill', name: 'Fortress Hill', nameZh: '炮台山', lines: ['ISL'], isInterchange: false, x: 750, y: 730, district: 'Eastern' },
  'north-point': { id: 'north-point', name: 'North Point', nameZh: '北角', lines: ['ISL', 'TKL'], isInterchange: true, x: 810, y: 730, district: 'Eastern' },
  'quarry-bay': { id: 'quarry-bay', name: 'Quarry Bay', nameZh: '鰂魚涌', lines: ['ISL', 'TKL'], isInterchange: true, x: 870, y: 730, district: 'Eastern' },
  'tai-koo': { id: 'tai-koo', name: 'Tai Koo', nameZh: '太古', lines: ['ISL'], isInterchange: false, x: 930, y: 730, district: 'Eastern' },
  'sai-wan-ho': { id: 'sai-wan-ho', name: 'Sai Wan Ho', nameZh: '西灣河', lines: ['ISL'], isInterchange: false, x: 990, y: 730, district: 'Eastern' },
  'shau-kei-wan': { id: 'shau-kei-wan', name: 'Shau Kei Wan', nameZh: '筲箕灣', lines: ['ISL'], isInterchange: false, x: 1050, y: 730, district: 'Eastern' },
  'heng-fa-chuen': { id: 'heng-fa-chuen', name: 'Heng Fa Chuen', nameZh: '杏花邨', lines: ['ISL'], isInterchange: false, x: 1110, y: 760, district: 'Eastern' },
  'chai-wan': { id: 'chai-wan', name: 'Chai Wan', nameZh: '柴灣', lines: ['ISL'], isInterchange: false, x: 1150, y: 800, district: 'Eastern' },

  // South Island Line
  'ocean-park': { id: 'ocean-park', name: 'Ocean Park', nameZh: '海洋公園', lines: ['SIL'], isInterchange: false, x: 530, y: 800, district: 'Southern' },
  'wong-chuk-hang': { id: 'wong-chuk-hang', name: 'Wong Chuk Hang', nameZh: '黃竹坑', lines: ['SIL'], isInterchange: false, x: 490, y: 840, district: 'Southern' },
  'lei-tung': { id: 'lei-tung', name: 'Lei Tung', nameZh: '利東', lines: ['SIL'], isInterchange: false, x: 440, y: 860, district: 'Southern' },
  'south-horizons': { id: 'south-horizons', name: 'South Horizons', nameZh: '海怡半島', lines: ['SIL'], isInterchange: false, x: 390, y: 860, district: 'Southern' },

  // Tsuen Wan Line & Kowloon Corridor
  'tsim-sha-tsui': { id: 'tsim-sha-tsui', name: 'Tsim Sha Tsui', nameZh: '尖沙咀', lines: ['TWL', 'TML'], isInterchange: true, x: 500, y: 640, district: 'Yau Tsim Mong' },
  'jordan': { id: 'jordan', name: 'Jordan', nameZh: '佐敦', lines: ['TWL'], isInterchange: false, x: 500, y: 580, district: 'Yau Tsim Mong' },
  'yau-ma-tei': { id: 'yau-ma-tei', name: 'Yau Ma Tei', nameZh: '油麻地', lines: ['TWL', 'KTL'], isInterchange: true, x: 500, y: 520, district: 'Yau Tsim Mong' },
  'mong-kok': { id: 'mong-kok', name: 'Mong Kok', nameZh: '旺角', lines: ['TWL', 'KTL'], isInterchange: true, x: 500, y: 460, district: 'Yau Tsim Mong' },
  'prince-edward': { id: 'prince-edward', name: 'Prince Edward', nameZh: '太子', lines: ['TWL', 'KTL'], isInterchange: true, x: 500, y: 400, district: 'Yau Tsim Mong' },
  'sham-shui-po': { id: 'sham-shui-po', name: 'Sham Shui Po', nameZh: '深水埗', lines: ['TWL'], isInterchange: false, x: 450, y: 350, district: 'Sham Shui Po' },
  'cheung-sha-wan': { id: 'cheung-sha-wan', name: 'Cheung Sha Wan', nameZh: '長沙灣', lines: ['TWL'], isInterchange: false, x: 410, y: 310, district: 'Sham Shui Po' },
  'lai-chi-kok': { id: 'lai-chi-kok', name: 'Lai Chi Kok', nameZh: '荔枝角', lines: ['TWL'], isInterchange: false, x: 370, y: 270, district: 'Sham Shui Po' },
  'mei-foo': { id: 'mei-foo', name: 'Mei Foo', nameZh: '美孚', lines: ['TWL', 'TML'], isInterchange: true, x: 330, y: 240, district: 'Sham Shui Po' },
  'lai-king': { id: 'lai-king', name: 'Lai King', nameZh: '荔景', lines: ['TWL', 'TCL'], isInterchange: true, x: 280, y: 200, district: 'Kwai Tsing' },
  'kwai-fong': { id: 'kwai-fong', name: 'Kwai Fong', nameZh: '葵芳', lines: ['TWL'], isInterchange: false, x: 280, y: 160, district: 'Kwai Tsing' },
  'kwai-hing': { id: 'kwai-hing', name: 'Kwai Hing', nameZh: '葵興', lines: ['TWL'], isInterchange: false, x: 280, y: 125, district: 'Kwai Tsing' },
  'tai-wo-hau': { id: 'tai-wo-hau', name: 'Tai Wo Hau', nameZh: '大窩口', lines: ['TWL'], isInterchange: false, x: 280, y: 90, district: 'Tsuen Wan' },
  'tsuen-wan': { id: 'tsuen-wan', name: 'Tsuen Wan', nameZh: '荃灣', lines: ['TWL'], isInterchange: false, x: 280, y: 55, district: 'Tsuen Wan' },

  // Kwun Tong Line
  'whampoa': { id: 'whampoa', name: 'Whampoa', nameZh: '黃埔', lines: ['KTL'], isInterchange: false, x: 620, y: 560, district: 'Kowloon City' },
  'ho-man-tin': { id: 'ho-man-tin', name: 'Ho Man Tin', nameZh: '何文田', lines: ['KTL', 'TML'], isInterchange: true, x: 570, y: 520, district: 'Kowloon City' },
  'shek-kip-mei': { id: 'shek-kip-mei', name: 'Shek Kip Mei', nameZh: '石硤尾', lines: ['KTL'], isInterchange: false, x: 550, y: 380, district: 'Sham Shui Po' },
  'kowloon-tong': { id: 'kowloon-tong', name: 'Kowloon Tong', nameZh: '九龍塘', lines: ['KTL', 'EAL'], isInterchange: true, x: 610, y: 380, district: 'Kowloon City' },
  'lok-fu': { id: 'lok-fu', name: 'Lok Fu', nameZh: '樂富', lines: ['KTL'], isInterchange: false, x: 670, y: 380, district: 'Wong Tai Sin' },
  'wong-tai-sin': { id: 'wong-tai-sin', name: 'Wong Tai Sin', nameZh: '黃大仙', lines: ['KTL'], isInterchange: false, x: 730, y: 380, district: 'Wong Tai Sin' },
  'diamond-hill': { id: 'diamond-hill', name: 'Diamond Hill', nameZh: '鑽石山', lines: ['KTL', 'TML'], isInterchange: true, x: 790, y: 380, district: 'Wong Tai Sin' },
  'choi-hung': { id: 'choi-hung', name: 'Choi Hung', nameZh: '彩虹', lines: ['KTL'], isInterchange: false, x: 840, y: 400, district: 'Wong Tai Sin' },
  'kowloon-bay': { id: 'kowloon-bay', name: 'Kowloon Bay', nameZh: '九龍灣', lines: ['KTL'], isInterchange: false, x: 890, y: 430, district: 'Kwun Tong' },
  'ngau-tau-kok': { id: 'ngau-tau-kok', name: 'Ngau Tau Kok', nameZh: '牛頭角', lines: ['KTL'], isInterchange: false, x: 930, y: 460, district: 'Kwun Tong' },
  'kwun-tong': { id: 'kwun-tong', name: 'Kwun Tong', nameZh: '觀塘', lines: ['KTL'], isInterchange: false, x: 970, y: 490, district: 'Kwun Tong' },
  'lam-tin': { id: 'lam-tin', name: 'Lam Tin', nameZh: '藍田', lines: ['KTL'], isInterchange: false, x: 1010, y: 520, district: 'Kwun Tong' },
  'yau-tong': { id: 'yau-tong', name: 'Yau Tong', nameZh: '油塘', lines: ['KTL', 'TKL'], isInterchange: true, x: 1010, y: 580, district: 'Kwun Tong' },
  'tiu-keng-leng': { id: 'tiu-keng-leng', name: 'Tiu Keng Leng', nameZh: '調景嶺', lines: ['KTL', 'TKL'], isInterchange: true, x: 1060, y: 580, district: 'Sai Kung' },

  // Tseung Kwan O Line
  'tseung-kwan-o': { id: 'tseung-kwan-o', name: 'Tseung Kwan O', nameZh: '將軍澳', lines: ['TKL'], isInterchange: true, x: 1110, y: 580, district: 'Sai Kung' },
  'hang-hau': { id: 'hang-hau', name: 'Hang Hau', nameZh: '坑口', lines: ['TKL'], isInterchange: false, x: 1160, y: 540, district: 'Sai Kung' },
  'po-lam': { id: 'po-lam', name: 'Po Lam', nameZh: '寶琳', lines: ['TKL'], isInterchange: false, x: 1200, y: 500, district: 'Sai Kung' },
  'lohas-park': { id: 'lohas-park', name: 'LOHAS Park', nameZh: '康城', lines: ['TKL'], isInterchange: false, x: 1160, y: 630, district: 'Sai Kung' },

  // East Rail Line
  'exhibition-centre': { id: 'exhibition-centre', name: 'Exhibition Centre', nameZh: '會展', lines: ['EAL'], isInterchange: false, x: 540, y: 690, district: 'Wan Chai' },
  'hung-hom': { id: 'hung-hom', name: 'Hung Hom', nameZh: '紅磡', lines: ['EAL', 'TML'], isInterchange: true, x: 570, y: 600, district: 'Yau Tsim Mong' },
  'mong-kok-east': { id: 'mong-kok-east', name: 'Mong Kok East', nameZh: '旺角東', lines: ['EAL'], isInterchange: false, x: 570, y: 440, district: 'Yau Tsim Mong' },
  'tai-wai': { id: 'tai-wai', name: 'Tai Wai', nameZh: '大圍', lines: ['EAL', 'TML'], isInterchange: true, x: 610, y: 280, district: 'Sha Tin' },
  'sha-tin': { id: 'sha-tin', name: 'Sha Tin', nameZh: '沙田', lines: ['EAL'], isInterchange: false, x: 610, y: 230, district: 'Sha Tin' },
  'fo-tan': { id: 'fo-tan', name: 'Fo Tan', nameZh: '火炭', lines: ['EAL'], isInterchange: false, x: 610, y: 190, district: 'Sha Tin' },
  'university': { id: 'university', name: 'University', nameZh: '大學', lines: ['EAL'], isInterchange: false, x: 640, y: 155, district: 'Sha Tin' },
  'tai-po-market': { id: 'tai-po-market', name: 'Tai Po Market', nameZh: '大埔墟', lines: ['EAL'], isInterchange: false, x: 670, y: 120, district: 'Tai Po' },
  'tai-wo': { id: 'tai-wo', name: 'Tai Wo', nameZh: '太和', lines: ['EAL'], isInterchange: false, x: 670, y: 85, district: 'Tai Po' },
  'fanling': { id: 'fanling', name: 'Fanling', nameZh: '粉嶺', lines: ['EAL'], isInterchange: false, x: 670, y: 55, district: 'North' },
  'sheung-shui': { id: 'sheung-shui', name: 'Sheung Shui', nameZh: '上水', lines: ['EAL'], isInterchange: false, x: 670, y: 25, district: 'North' },
  'lo-wu': { id: 'lo-wu', name: 'Lo Wu', nameZh: '羅湖', lines: ['EAL'], isInterchange: false, x: 640, y: 5, district: 'North' },
  'lok-ma-chau': { id: 'lok-ma-chau', name: 'Lok Ma Chau', nameZh: '落馬洲', lines: ['EAL'], isInterchange: false, x: 590, y: 5, district: 'Yuen Long' },

  // Tuen Ma Line (East & Central segments)
  'east-tsim-sha-tsui': { id: 'east-tsim-sha-tsui', name: 'East Tsim Sha Tsui', nameZh: '尖東', lines: ['TML', 'TWL'], isInterchange: true, x: 530, y: 640, district: 'Yau Tsim Mong' },
  'austin': { id: 'austin', name: 'Austin', nameZh: '柯士甸', lines: ['TML'], isInterchange: false, x: 450, y: 590, district: 'Yau Tsim Mong' },
  'to-kwa-wan': { id: 'to-kwa-wan', name: 'To Kwa Wan', nameZh: '土瓜灣', lines: ['TML'], isInterchange: false, x: 650, y: 490, district: 'Kowloon City' },
  'sung-wong-toi': { id: 'sung-wong-toi', name: 'Sung Wong Toi', nameZh: '宋皇臺', lines: ['TML'], isInterchange: false, x: 700, y: 460, district: 'Kowloon City' },
  'kai-tak': { id: 'kai-tak', name: 'Kai Tak', nameZh: '啟德', lines: ['TML'], isInterchange: false, x: 750, y: 430, district: 'Kowloon City' },
  'hin-kheng': { id: 'hin-kheng', name: 'Hin Kheng', nameZh: '顯徑', lines: ['TML'], isInterchange: false, x: 670, y: 310, district: 'Sha Tin' },
  'che-kung-temple': { id: 'che-kung-temple', name: 'Che Kung Temple', nameZh: '車公廟', lines: ['TML'], isInterchange: false, x: 670, y: 270, district: 'Sha Tin' },
  'sha-tin-wai': { id: 'sha-tin-wai', name: 'Sha Tin Wai', nameZh: '沙田圍', lines: ['TML'], isInterchange: false, x: 710, y: 250, district: 'Sha Tin' },
  'city-one': { id: 'city-one', name: 'City One', nameZh: '第一城', lines: ['TML'], isInterchange: false, x: 750, y: 230, district: 'Sha Tin' },
  'shek-mun': { id: 'shek-mun', name: 'Shek Mun', nameZh: '石門', lines: ['TML'], isInterchange: false, x: 790, y: 210, district: 'Sha Tin' },
  'tai-shui-hang': { id: 'tai-shui-hang', name: 'Tai Shui Hang', nameZh: '大水坑', lines: ['TML'], isInterchange: false, x: 830, y: 190, district: 'Sha Tin' },
  'heng-on': { id: 'heng-on', name: 'Heng On', nameZh: '恆安', lines: ['TML'], isInterchange: false, x: 870, y: 170, district: 'Sha Tin' },
  'ma-on-shan': { id: 'ma-on-shan', name: 'Ma On Shan', nameZh: '馬鞍山', lines: ['TML'], isInterchange: false, x: 910, y: 150, district: 'Sha Tin' },
  'wu-kai-sha': { id: 'wu-kai-sha', name: 'Wu Kai Sha', nameZh: '烏溪沙', lines: ['TML'], isInterchange: false, x: 950, y: 130, district: 'Sha Tin' },

  // Tuen Ma Line (West segment)
  'tsuen-wan-west': { id: 'tsuen-wan-west', name: 'Tsuen Wan West', nameZh: '荃灣西', lines: ['TML'], isInterchange: false, x: 270, y: 260, district: 'Tsuen Wan' },
  'kam-sheung-road': { id: 'kam-sheung-road', name: 'Kam Sheung Road', nameZh: '錦上路', lines: ['TML'], isInterchange: false, x: 230, y: 220, district: 'Yuen Long' },
  'yuen-long': { id: 'yuen-long', name: 'Yuen Long', nameZh: '元朗', lines: ['TML'], isInterchange: false, x: 190, y: 180, district: 'Yuen Long' },
  'long-ping': { id: 'long-ping', name: 'Long Ping', nameZh: '朗屏', lines: ['TML'], isInterchange: false, x: 155, y: 150, district: 'Yuen Long' },
  'tin-shui-wai': { id: 'tin-shui-wai', name: 'Tin Shui Wai', nameZh: '天水圍', lines: ['TML'], isInterchange: false, x: 120, y: 120, district: 'Yuen Long' },
  'siu-hong': { id: 'siu-hong', name: 'Siu Hong', nameZh: '兆康', lines: ['TML'], isInterchange: false, x: 100, y: 160, district: 'Tuen Mun' },
  'tuen-mun': { id: 'tuen-mun', name: 'Tuen Mun', nameZh: '屯門', lines: ['TML'], isInterchange: false, x: 100, y: 200, district: 'Tuen Mun' },

  // Tung Chung Line & Airport Express
  'hong-kong': { id: 'hong-kong', name: 'Hong Kong', nameZh: '香港', lines: ['TCL', 'AEL', 'ISL', 'TWL'], isInterchange: true, x: 400, y: 700, district: 'Central & Western' },
  'kowloon': { id: 'kowloon', name: 'Kowloon', nameZh: '九龍', lines: ['TCL', 'AEL'], isInterchange: true, x: 410, y: 590, district: 'Yau Tsim Mong' },
  'olympic': { id: 'olympic', name: 'Olympic', nameZh: '奧運', lines: ['TCL'], isInterchange: false, x: 410, y: 490, district: 'Yau Tsim Mong' },
  'nam-cheong': { id: 'nam-cheong', name: 'Nam Cheong', nameZh: '南昌', lines: ['TCL', 'TML'], isInterchange: true, x: 370, y: 410, district: 'Sham Shui Po' },
  'tsing-yi': { id: 'tsing-yi', name: 'Tsing Yi', nameZh: '青衣', lines: ['TCL', 'AEL'], isInterchange: true, x: 210, y: 310, district: 'Kwai Tsing' },
  'sunny-bay': { id: 'sunny-bay', name: 'Sunny Bay', nameZh: '欣澳', lines: ['TCL', 'DRL'], isInterchange: true, x: 150, y: 360, district: 'Tsuen Wan' },
  'tung-chung': { id: 'tung-chung', name: 'Tung Chung', nameZh: '東涌', lines: ['TCL'], isInterchange: false, x: 90, y: 420, district: 'Islands' },
  'airport': { id: 'airport', name: 'Airport', nameZh: '機場', lines: ['AEL'], isInterchange: false, x: 70, y: 340, district: 'Islands' },
  'asiaworld-expo': { id: 'asiaworld-expo', name: 'AsiaWorld-Expo', nameZh: '博覽館', lines: ['AEL'], isInterchange: false, x: 50, y: 290, district: 'Islands' },
  'disneyland-resort': { id: 'disneyland-resort', name: 'Disneyland Resort', nameZh: '迪士尼', lines: ['DRL'], isInterchange: false, x: 150, y: 440, district: 'Tsuen Wan' },
};
