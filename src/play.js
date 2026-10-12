// 朋友一起玩的小遊戲：連線函式與遊戲清單（規則與隨機都在伺服器）

export const GAME_INFO = [
  { type: 'dice', icon: '🎲', name: '搖骰子比大小', min: 2, max: 10, desc: '每人搖 3 顆骰子，全部搖完一起揭曉，點數大的贏' },
  { type: 'rps', icon: '✊', name: '猜拳', min: 2, max: 10, desc: '大家同時出拳，全部出完才揭曉，不能偷看' },
  { type: 'draw', icon: '🎴', name: '抽籤（誰請客）', min: 2, max: 10, desc: '每人挑一張蓋著的牌，其中一張是「鬼」，抽到的人請客' },
  { type: 'ultimate', icon: '🔢', name: '終極密碼', min: 2, max: 10, desc: '輪流猜數字，範圍越縮越小，猜中的人輸' },
  { type: 'undercover', icon: '🕵️', name: '誰是臥底', min: 3, max: 10, desc: '每人拿到一個詞，臥底的詞不一樣，聊天找出他' },
  { type: 'truth', icon: '🃏', name: '真心話大冒險', min: 1, max: 10, desc: '抽題目，大家看到同一張' },
]

async function call(code, query, opts) {
  const res = await fetch(`/api/rooms/${code}/play${query}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  let body = null
  try {
    body = await res.json()
  } catch {
    // 非 JSON 回應
  }
  // 400/409 是遊戲規則的提醒（例如「還沒輪到你」），帶著最新狀態回來
  if (res.status === 400 || res.status === 409) {
    const err = new Error(body?.error || '操作失敗')
    err.state = body
    throw err
  }
  if (!res.ok) throw new Error(body?.error || '連線失敗')
  return body
}

export const getPlay = (code, pid) => call(code, `?pid=${encodeURIComponent(pid ?? '')}`, {})
export const newRound = (code, type, players) =>
  call(code, '', { method: 'POST', body: JSON.stringify({ action: 'new', type, players }) })
export const act = (code, pid, body) =>
  call(code, '', { method: 'POST', body: JSON.stringify({ action: 'act', pid, ...body }) })
