// 預設設定。台數表為坊間常見版本，各地規則不同，請在「設定」頁依牌友習慣調整。

export const DEFAULT_SETTINGS = {
  names: ['東家', '南家', '西家', '北家'],
  base: 30,
  perTai: 10,
  tsumoTai: 1, // 自摸自動加的台數
  drawAddsLian: true, // 流局時莊家連莊數是否 +1
}

// max > 1 的項目可以選數量（例如花牌）
export const DEFAULT_TAI_ITEMS = [
  // 放槍才有單純的「門清」；自摸時改成「門清一摸三」，所以自摸時隱藏門清
  { id: 'menqing', group: '基本', name: '門清', tai: 1, max: 1, hideOnTsumo: true },
  // 門清＋自摸＋不求人共 3 台；includesTsumo 表示已含自摸台，只在自摸時出現
  { id: 'menqing3', group: '基本', name: '門清一摸三', tai: 3, max: 1, includesTsumo: true },
  { id: 'single', group: '基本', name: '獨聽', tai: 1, max: 1 },
  { id: 'flower', group: '基本', name: '花牌（每張）', tai: 1, max: 8 },
  { id: 'robkong', group: '基本', name: '搶槓', tai: 1, max: 1 },
  { id: 'kongwin', group: '基本', name: '槓上開花', tai: 1, max: 1 },
  { id: 'sea', group: '基本', name: '海底撈月', tai: 1, max: 1 },
  { id: 'river', group: '基本', name: '河底撈魚', tai: 1, max: 1 },

  { id: 'roundwind', group: '風牌・三元牌', name: '圈風', tai: 1, max: 1 },
  { id: 'seatwind', group: '風牌・三元牌', name: '門風', tai: 1, max: 1 },
  { id: 'dragon', group: '風牌・三元牌', name: '中發白刻子（每組）', tai: 1, max: 3 },

  { id: 'pinghu', group: '牌型', name: '平胡', tai: 2, max: 1 },
  { id: 'quanqiu', group: '牌型', name: '全求', tai: 2, max: 1 },
  { id: 'three_conceal', group: '牌型', name: '三暗刻', tai: 2, max: 1 },
  { id: 'pengpeng', group: '牌型', name: '碰碰胡', tai: 4, max: 1 },
  { id: 'hunyise', group: '牌型', name: '混一色', tai: 4, max: 1 },
  { id: 'four_conceal', group: '牌型', name: '四暗刻', tai: 5, max: 1 },
  { id: 'qingyise', group: '牌型', name: '清一色', tai: 8, max: 1 },
  { id: 'five_conceal', group: '牌型', name: '五暗刻', tai: 8, max: 1 },

  { id: 'small_dragon', group: '大牌', name: '小三元', tai: 4, max: 1 },
  { id: 'big_dragon', group: '大牌', name: '大三元', tai: 8, max: 1 },
  { id: 'small_wind', group: '大牌', name: '小四喜', tai: 8, max: 1 },
  { id: 'big_wind', group: '大牌', name: '大四喜', tai: 16, max: 1 },
  { id: 'honors', group: '大牌', name: '字一色', tai: 16, max: 1 },
  { id: 'eight_flowers', group: '大牌', name: '八仙過海', tai: 8, max: 1 },
  { id: 'seven_rob_one', group: '大牌', name: '七搶一', tai: 8, max: 1 },
  { id: 'heaven', group: '大牌', name: '天胡', tai: 24, max: 1 },
  { id: 'earth', group: '大牌', name: '地胡', tai: 16, max: 1 },
  { id: 'human', group: '大牌', name: '人胡', tai: 8, max: 1 },
]
