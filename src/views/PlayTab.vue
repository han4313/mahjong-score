<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { addPlayer, getMe, setMe } from '../store.js'
import { GAME_INFO, getPlay, newRound, act as sendAct } from '../play.js'
import GameDice from './games/GameDice.vue'
import GameRps from './games/GameRps.vue'
import GameDraw from './games/GameDraw.vue'
import GameUltimate from './games/GameUltimate.vue'
import GameUndercover from './games/GameUndercover.vue'
import GameTruth from './games/GameTruth.vue'

const props = defineProps({ g: Object, active: Boolean })

const COMPONENTS = {
  dice: GameDice,
  rps: GameRps,
  draw: GameDraw,
  ultimate: GameUltimate,
  undercover: GameUndercover,
  truth: GameTruth,
}

const play = ref({ type: null, round: 0, players: [] })
const me = ref(null)
const myName = ref('')
const error = ref('')
const busy = ref(false)
const choosing = ref(false) // true：在選遊戲；false：在看進行中的遊戲
const picked = ref([]) // 這一局要玩的人

const info = computed(() => GAME_INFO.find((x) => x.type === play.value.type))
const nameOf = (pid) => props.g.players.find((p) => p.id === pid)?.name ?? '?'

// ---------- 我是誰 ----------
function loadMe() {
  me.value = getMe(props.g)
}
function chooseMe(pid) {
  me.value = pid
  setMe(props.g, pid)
  refresh()
}
function joinAsNew() {
  const id = addPlayer(props.g, myName.value)
  if (id) {
    myName.value = ''
    chooseMe(id)
    if (!picked.value.includes(id)) picked.value.push(id)
  }
}

// ---------- 這一局的玩家 ----------
function defaultPicked() {
  return props.g.mode === 'party' ? props.g.players.map((p) => p.id) : [...props.g.seats]
}
function togglePick(pid) {
  picked.value = picked.value.includes(pid) ? picked.value.filter((x) => x !== pid) : [...picked.value, pid]
}
watch(
  () => props.g.players.length,
  (now, before) => {
    // 派對房新加入的人，預設就一起玩
    if (props.g.mode === 'party' && now > before) {
      const known = new Set(picked.value)
      for (const p of props.g.players) if (!known.has(p.id)) picked.value.push(p.id)
    }
  },
)

// ---------- 連線 ----------
async function refresh() {
  if (!props.g.room) return
  try {
    const first = !play.value.type && !choosing.value
    play.value = await getPlay(props.g.room.code, me.value)
    error.value = ''
    if (first && !play.value.type) choosing.value = true
  } catch (e) {
    handleError(e)
  }
}

function handleError(e) {
  if (e.state?.type) play.value = e.state // 規則提醒時，順便更新成最新狀態
  error.value = e.message === 'Failed to fetch' ? '連不到伺服器' : e.message
}

let timer = null
function startPolling() {
  stopPolling()
  refresh()
  timer = setInterval(refresh, 1500)
}
function stopPolling() {
  clearInterval(timer)
  timer = null
}
watch(
  () => props.active,
  (on) => (on ? (loadMe(), startPolling()) : stopPolling()),
)
onMounted(() => {
  loadMe()
  picked.value = defaultPicked()
  if (props.active) startPolling()
})
onBeforeUnmount(stopPolling)

async function run(fn) {
  busy.value = true
  error.value = ''
  try {
    play.value = await fn()
  } catch (e) {
    handleError(e)
  } finally {
    busy.value = false
  }
}

function start(type, players = picked.value) {
  return run(async () => {
    const r = await newRound(props.g.room.code, type, players)
    choosing.value = false
    return r
  })
}
const doAct = (body) => run(() => sendAct(props.g.room.code, me.value, body))

const again = () => start(play.value.type, play.value.players)
const canAgain = computed(() => play.value.type === 'truth' || play.value.done)

function pickError(game) {
  const n = picked.value.length
  if (n < game.min) return `至少要 ${game.min} 位`
  if (n > game.max) return `最多 ${game.max} 位`
  return ''
}
</script>

<template>
  <section>
    <div v-if="!g.room" class="card" style="margin-top: 16px">
      <b>需要先產生房號</b>
      <p style="margin: 6px 0 0">
        一起玩的遊戲要大家連到同一個房間。到「設定」按「產生房號」，朋友輸入房號加入後就能一起玩。
      </p>
    </div>

    <template v-else>
      <!-- 你是誰 -->
      <h2>你是誰？</h2>
      <div class="chips-dark">
        <button v-for="p in g.players" :key="p.id" class="chip-d" :class="{ on: me === p.id }" @click="chooseMe(p.id)">
          {{ p.name }}
        </button>
      </div>
      <div class="row" style="margin-top: 8px">
        <input v-model="myName" placeholder="不在名單？輸入你的名字" maxlength="8" style="flex: 2" @keyup.enter="joinAsNew" />
        <button class="btn" :disabled="!myName.trim()" @click="joinAsNew">加入</button>
      </div>
      <p class="muted" style="margin: 6px 0 0">選一次就會記住，之後不用再選。</p>

      <p v-if="error" class="notice">{{ error }}</p>

      <!-- 進行中的遊戲 -->
      <template v-if="play.type && !choosing && info">
        <h2>{{ info.icon }} {{ info.name }}・第 {{ play.round }} 局</h2>
        <div class="card play-card">
          <component :is="COMPONENTS[play.type]" :p="play" :me="me" :g="g" :busy="busy" @act="doAct" />
        </div>
        <div class="row" style="margin-top: 10px">
          <button v-if="canAgain" class="btn gold" :disabled="busy" @click="again">再玩一局</button>
          <button class="btn" @click="choosing = true">換遊戲／換人</button>
        </div>
      </template>

      <!-- 選遊戲 -->
      <template v-else>
        <div v-if="play.type && info" class="notice" style="background: rgba(224, 176, 74, 0.2); border-color: var(--gold)">
          {{ info.icon }} 有一局「{{ info.name }}」正在進行
          <button class="btn small" style="margin-left: 8px" @click="choosing = false">回去看</button>
        </div>

        <h2>這一局誰要玩？</h2>
        <div class="chips-dark">
          <button v-for="p in g.players" :key="p.id" class="chip-d" :class="{ on: picked.includes(p.id) }" @click="togglePick(p.id)">
            {{ p.name }}
          </button>
        </div>
        <p class="muted" style="margin: 6px 0 0">共 {{ picked.length }} 人。開新局會取代正在進行的那一局。</p>

        <h2>選一款遊戲</h2>
        <div class="game-grid">
          <button v-for="game in GAME_INFO" :key="game.type" class="game-card" :disabled="busy || Boolean(pickError(game))" @click="start(game.type)">
            <span class="gicon">{{ game.icon }}</span>
            <b>{{ game.name }}</b>
            <span class="gdesc">{{ game.desc }}</span>
            <span class="gcount">{{ pickError(game) || `${game.min}～${game.max} 人` }}</span>
          </button>
        </div>
      </template>
    </template>
  </section>
</template>
