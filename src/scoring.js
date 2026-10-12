// 台灣麻將計分：金額 = 底 + 台數 × 每台金額
// 莊家台 = 1 + 2 × 連莊數（連 N 拉 N）
// 放槍：只有放槍者付錢；自摸：另外三家都付錢（自摸另加 tsumoTai 台）
// 莊家參與時（莊家胡、或莊家是付錢的人）才加莊家台。

export function dealerTai(lian) {
  return 1 + 2 * lian
}

/**
 * 計算一把胡牌的各家輸贏
 * @returns {{ deltas: number[], taiTotal: number }} deltas 為四家輸贏（贏為正）
 */
export function calcWin({ settings, dealer, lian, winner, type, loser, tai, skipTsumo = false }) {
  const { base, perTai, tsumoTai } = settings
  const zhuang = dealerTai(lian)
  // 門清一摸三這類台型已經含自摸台，不重複加
  const baseTai = tai + (type === 'tsumo' && !skipTsumo ? tsumoTai : 0)
  const deltas = [0, 0, 0, 0]

  const payers = type === 'ron' ? [loser] : [0, 1, 2, 3].filter((p) => p !== winner)
  for (const p of payers) {
    const extra = winner === dealer || p === dealer ? zhuang : 0
    const amount = base + (baseTai + extra) * perTai
    deltas[p] -= amount
    deltas[winner] += amount
  }
  // taiTotal 不含莊家台（莊家台依付錢的人不同）
  return { deltas, taiTotal: baseTai }
}

/** 下一把的莊家與連莊數 */
export function nextDealer({ settings, dealer, lian, winner, isDraw }) {
  if (isDraw) {
    return { dealer, lian: settings.drawAddsLian ? lian + 1 : lian }
  }
  if (winner === dealer) return { dealer, lian: lian + 1 }
  return { dealer: (dealer + 1) % 4, lian: 0 }
}
