<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { newBoard, findPath, findAnyPair, reshuffle, remaining } from '../games/lianliankan.js'

defineEmits(['back'])

const ROWS = 8
const COLS = 8
// 16 種牌，每種 4 張，剛好 64 張
const FACES = [
  { n: '一', s: '萬', c: 'red' },
  { n: '五', s: '萬', c: 'red' },
  { n: '九', s: '萬', c: 'red' },
  { n: '一', s: '筒', c: 'blue' },
  { n: '三', s: '筒', c: 'blue' },
  { n: '五', s: '筒', c: 'blue' },
  { n: '七', s: '筒', c: 'blue' },
  { n: '九', s: '筒', c: 'blue' },
  { n: '一', s: '條', c: 'green' },
  { n: '三', s: '條', c: 'green' },
  { n: '五', s: '條', c: 'green' },
  { n: '七', s: '條', c: 'green' },
  { n: '九', s: '條', c: 'green' },
  { n: '東', s: '', c: '' },
  { n: '中', s: '', c: 'red' },
  { n: '發', s: '', c: 'green' },
]

const BEST_KEY = 'mahjong-lianliankan-best'
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || null
  } catch {
    return null
  }
}

const grid = ref(newBoard(ROWS, COLS, FACES.length))
const selected = ref(null)
const line = ref(null) // 連線的像素座標字串，給 SVG polyline 用
const lineBox = ref({ w: 0, h: 0 })
const boardEl = ref(null)
const hint = ref(null)
const shuffles = ref(3)
const hints = ref(5)
const seconds = ref(0)
const pairs = ref(0)
const status = ref('ready') // ready | playing | won
const message = ref('')
const best = ref(loadBest())
const newBest = ref(false)

let timer = null
let lineTimer = null
let hintTimer = null

function startTimer() {
  if (timer) return
  status.value = 'playing'
  timer = setInterval(() => seconds.value++, 1000)
}
function stopTimer() {
  clearInterval(timer)
  timer = null
}
onBeforeUnmount(() => {
  stopTimer()
  clearTimeout(lineTimer)
  clearTimeout(hintTimer)
})

function restart() {
  stopTimer()
  grid.value = newBoard(ROWS, COLS, FACES.length)
  selected.value = null
  line.value = null
  hint.value = null
  shuffles.value = 3
  hints.value = 5
  seconds.value = 0
  pairs.value = 0
  status.value = 'ready'
  message.value = ''
  newBest.value = false
}

function ensureMoves() {
  if (remaining(grid.value) === 0 || findAnyPair(grid.value)) return
  grid.value = reshuffle(grid.value)
  message.value = '沒有可以消的牌了，已自動重新洗牌'
}

function tap(r, c) {
  if (status.value === 'won' || !grid.value[r][c]) return
  startTimer()
  message.value = ''
  hint.value = null
  const cur = selected.value
  if (!cur) {
    selected.value = { r, c }
    return
  }
  if (cur.r === r && cur.c === c) {
    selected.value = null
    return
  }
  const path = findPath(grid.value, cur, { r, c })
  if (!path) {
    selected.value = { r, c }
    return
  }
  drawLine(path)
  selected.value = null
  const a = cur
  const b = { r, c }
  clearTimeout(lineTimer)
  lineTimer = setTimeout(() => {
    grid.value[a.r][a.c] = 0
    grid.value[b.r][b.c] = 0
    line.value = null
    pairs.value++
    if (remaining(grid.value) === 0) win()
    else ensureMoves()
  }, 300)
}

// 直接量每張牌在畫面上的實際位置來畫線（不靠比例推算，才不會偏）。
// 外圈（牌以外的空白）的座標取「第一張牌的邊」和「盤面邊」的中間。
function drawLine(path) {
  const el = boardEl.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const tile = (r, c) => el.querySelector(`[data-r="${r}"][data-c="${c}"]`).getBoundingClientRect()
  const first = tile(1, 1)
  const last = tile(ROWS, COLS)
  const x = (c) => {
    if (c === 0) return (first.left - box.left) / 2
    if (c === COLS + 1) return (last.right - box.left + box.width) / 2
    const t = tile(1, c)
    return (t.left + t.right) / 2 - box.left
  }
  const y = (r) => {
    if (r === 0) return (first.top - box.top) / 2
    if (r === ROWS + 1) return (last.bottom - box.top + box.height) / 2
    const t = tile(r, 1)
    return (t.top + t.bottom) / 2 - box.top
  }
  lineBox.value = { w: box.width, h: box.height }
  line.value = path.map((p) => `${x(p.c)},${y(p.r)}`).join(' ')
}

function win() {
  stopTimer()
  status.value = 'won'
  if (!best.value || seconds.value < best.value) {
    best.value = seconds.value
    newBest.value = true
    try {
      localStorage.setItem(BEST_KEY, String(seconds.value))
    } catch {
      // 無法儲存最佳成績也沒關係
    }
  }
}

function showHint() {
  if (hints.value <= 0 || status.value === 'won') return
  const p = findAnyPair(grid.value)
  if (!p) return
  hints.value--
  hint.value = [p.a, p.b]
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => (hint.value = null), 1500)
}

function useShuffle() {
  if (shuffles.value <= 0 || status.value === 'won') return
  shuffles.value--
  selected.value = null
  grid.value = reshuffle(grid.value)
}

const isSel = (r, c) => selected.value?.r === r && selected.value?.c === c
const isHint = (r, c) => hint.value?.some((h) => h.r === r && h.c === c)

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <button class="back" aria-label="返回" @click="$emit('back')">←</button>
      <div class="title">麻將連連看</div>
    </div>

    <div class="stats">
      <div>{{ mmss(seconds) }}<small>時間</small></div>
      <div>{{ remaining(grid) }}<small>剩餘牌數</small></div>
      <div>{{ best ? mmss(best) : '—' }}<small>最佳</small></div>
    </div>

    <div v-if="status === 'won'" class="win-box">
      <b>全部消完！</b>
      <div>用時 {{ mmss(seconds) }}<span v-if="newBest">　🎉 新紀錄</span></div>
    </div>
    <p v-else-if="message" class="muted" style="text-align: center; margin: 4px 0">{{ message }}</p>
    <p v-else-if="status === 'ready'" class="muted" style="text-align: center; margin: 4px 0">
      點兩張一樣的牌，連線轉彎不超過兩次就能消掉
    </p>

    <div class="board-wrap">
      <div
        ref="boardEl"
        class="board"
        :style="{
          gridTemplateColumns: `10px repeat(${COLS}, 1fr) 10px`,
          gridTemplateRows: `10px repeat(${ROWS}, auto) 10px`,
        }"
      >
        <template v-for="(row, r) in grid" :key="r">
          <template v-for="(v, c) in row" :key="c">
            <div v-if="r === 0 || c === 0 || r === ROWS + 1 || c === COLS + 1" />
            <button
              v-else
              class="gtile"
              :class="[FACES[v - 1]?.c, { empty: !v, sel: isSel(r, c), hint: isHint(r, c) }]"
              :data-r="r"
              :data-c="c"
              :disabled="!v"
              @click="tap(r, c)"
            >
              <template v-if="v">
                <span>{{ FACES[v - 1].n }}</span>
                <span v-if="FACES[v - 1].s" class="s">{{ FACES[v - 1].s }}</span>
              </template>
            </button>
          </template>
        </template>

        <svg v-if="line" class="line-layer" :viewBox="`0 0 ${lineBox.w} ${lineBox.h}`">
          <polyline
            :points="line"
            fill="none"
            stroke="#ffd45e"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <div class="row">
      <button class="btn" :disabled="hints <= 0 || status === 'won'" @click="showHint">提示（{{ hints }}）</button>
      <button class="btn" :disabled="shuffles <= 0 || status === 'won'" @click="useShuffle">重新洗牌（{{ shuffles }}）</button>
      <button class="btn gold" @click="restart">重新開始</button>
    </div>
  </div>
</template>
