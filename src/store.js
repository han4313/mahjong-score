import { reactive, watch } from 'vue'
import { DEFAULT_SETTINGS, DEFAULT_TAI_ITEMS } from './defaults.js'
import { calcWin, nextDealer } from './scoring.js'

// 每支手機各自存自己的牌局。只有「分享」過的牌局（有房號）才會和別人同步。
const KEY = 'mahjong-v2'
const uid = () => Math.random().toString(36).slice(2, 9)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // 讀不到就用預設值
  }
  return null
}

// 舊版存下來的台數表可能缺少新增的旗標，依 id 補上（不動使用者改過的名稱與台數）
function migrateTaiItems(items) {
  const defaults = new Map(DEFAULT_TAI_ITEMS.map((d) => [d.id, d]))
  for (const it of items) {
    const d = defaults.get(it.id)
    if (!d) continue
    delete it.excludes
    if (d.hideOnTsumo) it.hideOnTsumo = true
    if (d.includesTsumo) it.includesTsumo = true
  }
  // 新增的「門清一摸三」補進舊資料；其他預設台型若被使用者刪掉就不加回來
  const menqing3 = DEFAULT_TAI_ITEMS.find((d) => d.id === 'menqing3')
  if (!items.some((it) => it.id === menqing3.id)) items.push(structuredClone(menqing3))
  return items
}

const saved = load()
if (saved?.taiItems) migrateTaiItems(saved.taiItems)
export const state = reactive({
  games: saved?.games ?? [],
  taiItems: saved?.taiItems ?? structuredClone(DEFAULT_TAI_ITEMS),
  currentId: null,
})

watch(
  () => [state.games, state.taiItems],
  () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ games: state.games, taiItems: state.taiItems }))
    } catch {
      // 隱私模式等情況無法儲存，不影響使用
    }
  },
  { deep: true },
)

export const currentGame = () => state.games.find((g) => g.id === state.currentId) ?? null

// ---------- 查詢 ----------
export function dealerState(g) {
  const last = g.hands[g.hands.length - 1]
  return last ? { dealer: last.dealerAfter, lian: last.lianAfter } : { dealer: g.startDealer, lian: 0 }
}

export const playerName = (g, pid) => g.players.find((p) => p.id === pid)?.name ?? '?'
export const seatName = (g, i) => playerName(g, g.seats[i])

export function totalsOf(g) {
  const t = {}
  for (const p of g.players) t[p.id] = 0
  for (const h of g.hands) h.seats.forEach((pid, i) => (t[pid] = (t[pid] ?? 0) + h.deltas[i]))
  return t
}

// ---------- 牌局 ----------
/** mode: 'mahjong'（計分牌局）或 'party'（只玩遊戲的房間，不計分） */
export function createGame({ name, playerNames, mode = 'mahjong' }) {
  const party = mode === 'party'
  const players = playerNames.map((n, i) => ({ id: uid(), name: n.trim() || `玩家${i + 1}` }))
  const g = {
    id: uid(),
    mode,
    name: name.trim() || (party ? '遊戲房' : new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) + ' 牌局'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    players,
    seats: party ? [] : players.map((p) => p.id),
    startDealer: 0,
    hands: [],
    history: [], // 已結算歸檔的紀錄
    room: null,
  }
  state.games.unshift(g)
  return g
}

export function deleteGame(g) {
  state.games = state.games.filter((x) => x.id !== g.id)
  if (state.currentId === g.id) state.currentId = null
}

// ---------- 玩家與座位 ----------
export function addPlayer(g, name) {
  const n = name.trim().slice(0, 8)
  if (!n) return null
  const p = { id: uid(), name: n }
  g.players.push(p)
  commit(g)
  return p.id
}

export function renamePlayer(g, pid, name) {
  const p = g.players.find((x) => x.id === pid)
  const n = name.trim().slice(0, 8)
  if (p && n) {
    p.name = n
    commit(g)
  }
}

export function canRemovePlayer(g, pid) {
  return !g.seats.includes(pid) && !g.hands.some((h) => h.seats.includes(pid))
}

export function removePlayer(g, pid) {
  if (!canRemovePlayer(g, pid)) return
  g.players = g.players.filter((p) => p.id !== pid)
  commit(g)
}

/** 讓某位玩家坐到某個座位；若他已在別的座位就互換 */
export function setSeat(g, seatIdx, pid) {
  const other = g.seats.indexOf(pid)
  if (other >= 0 && other !== seatIdx) g.seats[other] = g.seats[seatIdx]
  g.seats[seatIdx] = pid
  commit(g)
}

export function setStartDealer(g, seatIdx) {
  if (g.hands.length) return
  g.startDealer = seatIdx
  commit(g)
}

// ---------- 計分 ----------
export function recordWin(g, { winner, type, loser, tai, labels, skipTsumo }) {
  const { dealer, lian } = dealerState(g)
  const { deltas, taiTotal } = calcWin({ settings: g.settings, dealer, lian, winner, type, loser, tai, skipTsumo })
  const next = nextDealer({ settings: g.settings, dealer, lian, winner })
  g.hands.push({
    id: uid(),
    kind: 'win',
    ts: Date.now(),
    seats: [...g.seats],
    winner,
    type,
    loser: type === 'ron' ? loser : null,
    dealer,
    lian,
    taiTotal,
    labels,
    deltas,
    dealerAfter: next.dealer,
    lianAfter: next.lian,
  })
  commit(g)
}

export function recordDraw(g) {
  const { dealer, lian } = dealerState(g)
  const next = nextDealer({ settings: g.settings, dealer, lian, isDraw: true })
  g.hands.push({
    id: uid(),
    kind: 'draw',
    ts: Date.now(),
    seats: [...g.seats],
    dealer,
    lian,
    deltas: [0, 0, 0, 0],
    dealerAfter: next.dealer,
    lianAfter: next.lian,
  })
  commit(g)
}

export function undoLast(g) {
  g.hands.pop()
  commit(g)
}

export function clearHands(g) {
  g.hands = []
  g.startDealer = 0
  commit(g)
}

/** 結算完畢：把目前的輸贏與轉帳存進歷史，然後清零開始下一輪 */
export function archiveSettlement(g, transfers) {
  if (!g.hands.length) return
  const totals = totalsOf(g)
  g.history = g.history ?? []
  g.history.unshift({
    id: uid(),
    ts: Date.now(),
    hands: g.hands.length,
    results: g.players.map((p) => ({ name: p.name, total: totals[p.id] ?? 0 })).filter((r) => r.total !== 0),
    transfers,
  })
  g.hands = []
  g.startDealer = 0
  commit(g)
}

export function resetTaiItems() {
  state.taiItems = structuredClone(DEFAULT_TAI_ITEMS)
}

// ---------- 房號同步 ----------
export const sync = reactive({ status: 'idle', message: '' })

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  let body = null
  try {
    body = await res.json()
  } catch {
    // 非 JSON 回應
  }
  return { status: res.status, body }
}

const payload = (g) => ({
  mode: g.mode ?? 'mahjong',
  name: g.name,
  settings: g.settings,
  players: g.players,
  seats: g.seats,
  startDealer: g.startDealer,
  hands: g.hands,
  history: g.history ?? [],
})

function applyRemote(g, remote, rev) {
  g.mode = remote.mode ?? 'mahjong'
  g.name = remote.name
  g.settings = remote.settings
  g.players = remote.players
  g.seats = remote.seats
  g.startDealer = remote.startDealer ?? 0
  g.hands = remote.hands
  g.history = remote.history ?? []
  g.room.rev = rev
  g.room.dirty = false
}

const pushing = new Map()

/** 每次修改後呼叫：記錄時間，若是共用牌局就推到伺服器 */
export async function commit(g) {
  g.updatedAt = Date.now()
  if (!g.room) return
  if (pushing.has(g.id)) {
    pushing.get(g.id).again = true
    return
  }
  const slot = { again: false }
  pushing.set(g.id, slot)
  try {
    do {
      slot.again = false
      sync.status = 'syncing'
      const { status, body } = await api(`/rooms/${g.room.code}`, {
        method: 'PUT',
        body: JSON.stringify({ baseRev: g.room.rev, game: payload(g) }),
      })
      if (status === 200) {
        g.room.rev = body.rev
        g.room.dirty = false
        sync.status = 'ok'
      } else if (status === 409) {
        applyRemote(g, body.game, body.rev)
        sync.status = 'conflict'
        sync.message = '剛好有人同時更新，已載入最新內容，請確認後再操作一次'
        slot.again = false
      } else {
        if (status === 404 && (await restoreRoom(g))) break
        throw new Error(status === 404 ? '這個房間已經不存在' : '同步失敗')
      }
    } while (slot.again)
  } catch (e) {
    g.room.dirty = true
    sync.status = 'error'
    sync.message = e.message === 'Failed to fetch' ? '連不到伺服器，變更暫存在這支手機' : e.message
  } finally {
    pushing.delete(g.id)
  }
}

// 雲端伺服器重啟、房間資料不見時，用這支手機上的最新資料以同一個房號重建
async function restoreRoom(g) {
  const { status, body } = await api('/rooms', { method: 'POST', body: JSON.stringify({ game: payload(g), restore: g.room.code }) })
  if (status !== 200) return false
  g.room.rev = body.rev
  g.room.dirty = false
  sync.status = 'ok'
  return true
}

export async function pull(g) {
  if (!g?.room || pushing.has(g.id) || g.room.dirty) return
  try {
    const { status, body } = await api(`/rooms/${g.room.code}?rev=${g.room.rev}`)
    if (status === 200 && body.changed) {
      applyRemote(g, body.game, body.rev)
      sync.status = 'ok'
    } else if (status === 200) {
      if (sync.status !== 'conflict') sync.status = 'ok'
    } else if (status === 404) {
      if (!(await restoreRoom(g))) {
        sync.status = 'error'
        sync.message = '這個房間已經不存在'
      }
    }
  } catch {
    sync.status = 'error'
    sync.message = '連不到伺服器'
  }
}

export async function shareGame(g) {
  const { status, body } = await api('/rooms', { method: 'POST', body: JSON.stringify({ game: payload(g) }) })
  if (status !== 200) throw new Error(body?.error || '建立房號失敗，請確認伺服器有在執行')
  g.room = { code: body.code, rev: body.rev, dirty: false }
  sync.status = 'ok'
  return body.code
}

export async function joinRoom(rawCode) {
  const code = rawCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{4,8}$/.test(code)) throw new Error('房號格式不對')
  const existing = state.games.find((g) => g.room?.code === code)
  if (existing) return existing
  const { status, body } = await api(`/rooms/${code}`)
  if (status === 404) throw new Error('找不到這個房號')
  if (status !== 200) throw new Error(body?.error || '加入失敗')
  const g = {
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    room: { code, rev: body.rev, dirty: false },
    ...body.game,
  }
  state.games.unshift(g)
  return g
}

export function leaveRoom(g) {
  g.room = null
}

// ---------- 「我是誰」：記在這支手機上，每個房號各自記 ----------
const meKey = (g) => (g.room ? `mahjong-me-${g.room.code}` : null)

export function getMe(g) {
  try {
    const pid = meKey(g) && localStorage.getItem(meKey(g))
    return pid && g.players.some((p) => p.id === pid) ? pid : null
  } catch {
    return null
  }
}

export function setMe(g, pid) {
  try {
    if (meKey(g)) localStorage.setItem(meKey(g), pid)
  } catch {
    // 無法儲存也能玩，只是下次要再選
  }
}
