// 朋友一起玩的小遊戲。所有隨機和祕密（骰子、鬼牌、臥底的詞）都只在伺服器上，玩家作不了弊。
//
// 每款遊戲提供：
//   min / max        人數限制
//   init(players)    開新局時建立資料
//   act(play, pid, body) -> 錯誤訊息或 null    玩家動作（直接改 play.data）
//   view(play, viewer)   -> 給某位玩家看的畫面資料（viewer 看不到的祕密不能出現在這裡）
import crypto from 'node:crypto'

const rnd = (lo, hi) => crypto.randomInt(lo, hi) // [lo, hi)
const pick = (arr) => arr[rnd(0, arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const WORD_PAIRS = [
  ['牛奶', '豆漿'], ['包子', '饅頭'], ['泡麵', '拉麵'], ['滷肉飯', '雞肉飯'], ['鹽酥雞', '炸雞'],
  ['麻將', '撲克牌'], ['機車', '腳踏車'], ['捷運', '公車'], ['火車', '高鐵'], ['籃球', '排球'],
  ['手機', '平板'], ['咖啡', '紅茶'], ['西瓜', '哈密瓜'], ['口香糖', '軟糖'], ['洗髮精', '沐浴乳'],
  ['筷子', '湯匙'], ['電風扇', '冷氣'], ['雨傘', '雨衣'], ['鉛筆', '原子筆'], ['醫生', '護理師'],
  ['老師', '教授'], ['臭豆腐', '豆乾'], ['火鍋', '燒烤'], ['夜市', '百貨公司'], ['便利商店', '超市'],
  ['電影', '電視劇'], ['歌手', '演員'], ['蚊子', '蒼蠅'], ['牙膏', '牙粉'], ['珍珠奶茶', '布丁奶茶'],
  ['鳳梨酥', '太陽餅'], ['蚵仔煎', '大腸包小腸'], ['雞排', '豬排'], ['摩天輪', '雲霄飛車'], ['海邊', '泳池'],
]

const TRUTHS = [
  '你做過最丟臉的事是什麼？',
  '你最近一次說謊是什麼時候？說了什麼？',
  '你手機裡最不想被人看到的 app 是什麼？',
  '如果可以和在座一個人交換人生一天，你選誰？為什麼？',
  '你最討厭朋友的哪個習慣？',
  '你這輩子最後悔的一件事是什麼？',
  '你最常對家人說的謊是什麼？',
  '你覺得自己最大的缺點是什麼？',
  '你最怕的東西是什麼？',
  '你收過最奇怪的禮物是什麼？',
  '說出你的一個奇怪的小習慣。',
  '你人生中最想重來的一天是哪天？',
  '你上一次在別人面前出糗是什麼時候？',
  '你有偷偷看過誰的手機嗎？',
  '如果中了一千萬，你第一件事會做什麼？',
  '你最近一次哭是因為什麼？',
]

const DARES = [
  '用台語唱一首歌的副歌。',
  '模仿在座的一個人，讓大家猜是誰。',
  '做 10 下伏地挺身（做不到就做幾下算幾下）。',
  '用最誇張的表情自拍一張給大家看。',
  '說一個冷笑話，沒人笑就要再說一個。',
  '用五個字形容你左邊的人。',
  '跟著想像中的音樂跳 15 秒的舞。',
  '學三種動物的叫聲。',
  '對你對面的人說一句最肉麻的情話。',
  '閉上眼睛，說出桌上有哪三樣東西。',
  '用鼻子在空中寫出自己的名字。',
  '用一種口音說完下一句話。',
  '說出在座每個人的一個優點。',
  '用 30 秒推銷你手邊的一樣東西。',
]

const PLAYER_ID_OK = (s) => typeof s === 'string' && s.length > 0 && s.length <= 24
const allIn = (players, obj) => players.every((p) => obj[p] !== undefined)

export const GAMES = {
  // 🎲 搖骰子比大小
  dice: {
    min: 2,
    max: 10,
    init: () => ({ rolls: {} }),
    act(play, pid) {
      if (!play.data.rolls[pid]) play.data.rolls[pid] = Array.from({ length: 3 }, () => rnd(1, 7))
      return null
    },
    view(play) {
      const { rolls } = play.data
      const done = allIn(play.players, rolls)
      return {
        done,
        rolled: Object.fromEntries(play.players.map((p) => [p, Boolean(rolls[p])])),
        rolls: done ? rolls : null,
      }
    },
  },

  // ✊ 猜拳：全部人出完才揭曉
  rps: {
    min: 2,
    max: 10,
    init: () => ({ picks: {} }),
    act(play, pid, body) {
      if (!['rock', 'paper', 'scissors'].includes(body.choice)) return '請選剪刀、石頭或布'
      if (!play.data.picks[pid]) play.data.picks[pid] = body.choice
      return null
    },
    view(play) {
      const { picks } = play.data
      const done = allIn(play.players, picks)
      const out = {
        done,
        rolled: Object.fromEntries(play.players.map((p) => [p, Boolean(picks[p])])),
        picks: done ? picks : null,
      }
      if (done) {
        const kinds = new Set(Object.values(picks))
        const beats = { rock: 'scissors', scissors: 'paper', paper: 'rock' }
        let winType = null
        if (kinds.size === 2) {
          const [a, b] = [...kinds]
          winType = beats[a] === b ? a : b
        }
        out.winners = winType ? play.players.filter((p) => picks[p] === winType) : []
        out.losers = winType ? play.players.filter((p) => picks[p] !== winType) : []
        out.draw = !winType
      }
      return out
    },
  },

  // 🎴 抽籤：每人挑一張蓋著的牌，其中一張是「鬼」
  draw: {
    min: 2,
    max: 10,
    init: (players) => ({ ghost: rnd(0, players.length), taken: {} }), // taken: 位置 -> 玩家
    act(play, pid, body) {
      const n = play.players.length
      const { taken } = play.data
      if (Object.values(taken).includes(pid)) return '你已經抽過了'
      const slot = body.slot
      if (!Number.isInteger(slot) || slot < 0 || slot >= n) return '沒有這張牌'
      if (taken[slot]) return '這張被別人抽走了'
      taken[slot] = pid
      return null
    },
    view(play) {
      const { taken, ghost } = play.data
      const done = Object.keys(taken).length === play.players.length
      return {
        done,
        slots: play.players.length,
        taken,
        ghost: done ? ghost : null,
        loser: done ? taken[ghost] : null,
      }
    },
  },

  // 🔢 終極密碼：輪流猜，猜中的人輸
  ultimate: {
    min: 2,
    max: 10,
    init: () => ({ lo: 0, hi: 100, secret: rnd(1, 100), turn: 0, history: [], loser: null }),
    act(play, pid, body) {
      const d = play.data
      if (d.loser) return '這一局已經結束'
      if (play.players[d.turn] !== pid) return '還沒輪到你'
      const g = body.guess
      if (!Number.isInteger(g) || g <= d.lo || g >= d.hi) return `請猜 ${d.lo + 1} 到 ${d.hi - 1} 之間的數字`
      if (g === d.secret) {
        d.loser = pid
        d.history.push({ pid, guess: g, hit: true })
      } else {
        if (g < d.secret) d.lo = g
        else d.hi = g
        d.history.push({ pid, guess: g, hit: false })
        d.turn = (d.turn + 1) % play.players.length
      }
      return null
    },
    view(play) {
      const d = play.data
      return {
        done: Boolean(d.loser),
        lo: d.lo,
        hi: d.hi,
        turn: d.loser ? null : play.players[d.turn],
        history: d.history,
        loser: d.loser,
        secret: d.loser ? d.secret : null,
      }
    },
  },

  // 🕵️ 誰是臥底：大家的詞一樣，只有臥底的不同
  undercover: {
    min: 3,
    max: 10,
    init(players) {
      const [a, b] = shuffle(pick(WORD_PAIRS))
      const count = players.length >= 7 ? 2 : 1
      const spies = shuffle(players).slice(0, count)
      const words = Object.fromEntries(players.map((p) => [p, spies.includes(p) ? b : a]))
      return { words, spies, phase: 'talk', votes: {}, ties: 0, eliminated: null, winner: null }
    },
    act(play, pid, body) {
      const d = play.data
      if (d.phase === 'done') return '這一局已經結束'
      if (body.kind === 'startVote') {
        if (d.phase === 'talk') d.phase = 'vote'
        return null
      }
      if (body.kind === 'vote') {
        if (d.phase !== 'vote') return '還沒開始投票'
        if (d.votes[pid]) return '你已經投過了'
        if (!play.players.includes(body.target) || body.target === pid) return '不能投這個人'
        d.votes[pid] = body.target
        if (Object.keys(d.votes).length === play.players.length) {
          const tally = {}
          for (const t of Object.values(d.votes)) tally[t] = (tally[t] ?? 0) + 1
          const top = Math.max(...Object.values(tally))
          const leaders = Object.keys(tally).filter((k) => tally[k] === top)
          if (leaders.length > 1) {
            d.ties++
            d.lastVotes = d.votes
            d.votes = {} // 平票：重新投票
          } else {
            d.eliminated = leaders[0]
            d.winner = d.spies.includes(leaders[0]) ? 'civilians' : 'spies'
            d.phase = 'done'
          }
        }
        return null
      }
      return '未知的動作'
    },
    view(play, viewer) {
      const d = play.data
      const done = d.phase === 'done'
      return {
        done,
        phase: d.phase,
        ties: d.ties,
        myWord: play.players.includes(viewer) ? d.words[viewer] : null,
        voted: Object.fromEntries(play.players.map((p) => [p, Boolean(d.votes[p])])),
        spyCount: d.spies.length,
        ...(done && {
          words: d.words,
          spies: d.spies,
          eliminated: d.eliminated,
          winner: d.winner,
          votes: d.votes,
        }),
      }
    },
  },

  // 🃏 真心話大冒險：抽一張，大家看到同一張
  truth: {
    min: 1,
    max: 10,
    init: () => ({ card: null }),
    act(play, pid, body) {
      if (!['truth', 'dare'].includes(body.kind)) return '請選真心話或大冒險'
      play.data.card = { kind: body.kind, text: pick(body.kind === 'truth' ? TRUTHS : DARES), by: pid, n: (play.data.card?.n ?? 0) + 1 }
      return null
    },
    view: (play) => ({ done: false, card: play.data.card }),
  },
}

/** 給某位玩家看的完整狀態（沒有進行中的遊戲則回傳空狀態） */
export function viewOf(play, viewer) {
  if (!play) return { type: null, round: 0, players: [], done: false }
  return { type: play.type, round: play.round, players: play.players, ...GAMES[play.type].view(play, viewer) }
}

/** 開新局。回傳錯誤訊息或 null */
export function startGame(room, { type, players }) {
  const game = GAMES[type]
  if (!game) return '沒有這款遊戲'
  if (!Array.isArray(players) || !players.every(PLAYER_ID_OK)) return '玩家資料錯誤'
  const unique = [...new Set(players)]
  if (unique.length < game.min || unique.length > game.max) return `這款遊戲需要 ${game.min} 到 ${game.max} 位玩家`
  const play = { type, round: (room.play?.round ?? 0) + 1, players: unique, data: null }
  play.data = game.init(unique)
  room.play = play
  return null
}

/** 玩家動作。回傳 { status, error } */
export function actInGame(room, pid, body) {
  const play = room.play
  if (!play) return { status: 400, error: '還沒有開局' }
  if (!PLAYER_ID_OK(pid) || !play.players.includes(pid)) return { status: 400, error: '你不在這一局裡' }
  const game = GAMES[play.type]
  if (play.type !== 'truth' && game.view(play, pid).done) return { status: 409, error: '這一局已經結束了' }
  const error = game.act(play, pid, body ?? {})
  return error ? { status: 400, error } : { status: 200 }
}
