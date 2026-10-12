<script setup>
import { ref, computed } from 'vue'
import { state, createGame, joinRoom, seatName, shareGame, setMe } from '../store.js'

import { SPONSOR_URL } from '../config.js'

defineProps({ toast: String })
const emit = defineEmits(['open', 'arcade', 'clear-toast'])

const creating = ref(false)
const gameName = ref('')
const names = ref(['', '', '', ''])
const code = ref('')
const error = ref('')
const busy = ref(false)

// 常用玩家：從所有牌局的玩家名單蒐集，輸入時可選
const known = computed(() => [...new Set(state.games.flatMap((g) => g.players.map((p) => p.name)))])

function startCreate() {
  gameName.value = ''
  names.value = ['', '', '', '']
  creating.value = true
}

function create() {
  const g = createGame({ name: gameName.value, playerNames: names.value })
  creating.value = false
  emit('open', g)
}

// 遊戲房：不記分，開好房間直接玩遊戲。建立時就產生房號，朋友馬上能加入。
const partying = ref(false)
const partyName = ref('')
const myName = ref('')
async function createParty() {
  error.value = ''
  busy.value = true
  const g = createGame({ mode: 'party', name: partyName.value, playerNames: [myName.value] })
  try {
    await shareGame(g)
    setMe(g, g.players[0].id)
  } catch (e) {
    error.value = e.message === 'Failed to fetch' ? '連不到伺服器，房號還沒產生，可以稍後到「設定」再產生' : e.message
  } finally {
    busy.value = false
  }
  partying.value = false
  emit('open', g)
}

async function join() {
  error.value = ''
  busy.value = true
  try {
    emit('open', await joinRoom(code.value))
    code.value = ''
  } catch (e) {
    error.value = e.message === 'Failed to fetch' ? '連不到伺服器' : e.message
  } finally {
    busy.value = false
  }
}

// 分享 App 本身（不是某個房號）：手機走系統分享選單，電腦就複製網址
const shareMsg = ref('')
async function shareApp() {
  const url = location.origin + location.pathname
  const data = { title: '麻將記分', text: '麻將記分＋朋友小遊戲，免安裝、免註冊，一起來玩：', url }
  try {
    if (navigator.share) {
      await navigator.share(data)
      return
    }
    await navigator.clipboard.writeText(url)
    shareMsg.value = '已複製網址，貼給朋友就能開'
  } catch (e) {
    if (e?.name === 'AbortError') return // 使用者自己關掉分享選單
    shareMsg.value = `請手動複製：${url}`
  }
  setTimeout(() => (shareMsg.value = ''), 3000)
}

function summary(g) {
  return g.mode === 'party' ? g.players.map((p) => p.name).join('・') : g.seats.map((_, i) => seatName(g, i)).join('・')
}
</script>

<template>
  <div class="screen">
    <div class="brand">
      <span class="tile">麻</span>
      <h1>麻將記分</h1>
    </div>
    <p class="muted" style="margin: 4px 0 0">資料只存在這支手機；想一起看同一份，就分享房號。</p>

    <div v-if="toast" class="notice" @click="$emit('clear-toast')">{{ toast }}</div>

    <h2>我的牌局</h2>
    <div class="game-list">
      <p v-if="!state.games.length" class="muted">還沒有牌局，開一桌吧。</p>
      <button v-for="g in state.games" :key="g.id" class="card game-item" @click="$emit('open', g)">
        <span class="title">
          {{ g.name }}
          <span v-if="g.mode === 'party'" class="pill warn">遊戲房</span>
          <span v-if="g.room" class="pill" :class="{ err: g.room.dirty }">房號 {{ g.room.code }}</span>
        </span>
        <span class="muted">{{ summary(g) }}</span>
        <span v-if="g.mode === 'party'" class="muted">共 {{ g.players.length }} 位玩家</span>
        <span v-else class="muted">已打 {{ g.hands.length }} 把・共 {{ g.players.length }} 位玩家</span>
      </button>
    </div>
    <div class="row" style="margin-top: 14px">
      <button class="btn gold" @click="startCreate">＋ 新牌局（記分）</button>
      <button class="btn" @click="partying = true">🎉 開遊戲房</button>
    </div>
    <p class="muted" style="margin: 6px 0 0">遊戲房不用記分，開好房間把房號給朋友，就能一起玩骰子、猜拳、誰是臥底…</p>

    <h2>加入朋友的房號</h2>
    <div class="row">
      <input v-model="code" placeholder="輸入房號，例如 K7M2QX" maxlength="8" style="flex: 2; text-transform: uppercase" @keyup.enter="join" />
      <button class="btn" :disabled="!code.trim() || busy" @click="join">加入</button>
    </div>
    <p v-if="error" class="notice">{{ error }}</p>

    <h2>小遊戲</h2>
    <button class="arcade-card" @click="$emit('arcade')">
      <span class="tiles">
        <span class="tile" style="color: #c0392b">中</span>
        <span class="tile" style="color: #1e7a46">發</span>
        <span class="tile">白</span>
      </span>
      <span>
        <b>麻將連連看</b><br />
        <span class="muted">兩張一樣的牌，兩個彎以內連得起來就消掉</span>
      </span>
    </button>

    <h2>喜歡的話</h2>
    <div class="row">
      <button class="btn" @click="shareApp">📤 分享給朋友</button>
      <a v-if="SPONSOR_URL" class="btn gold" :href="SPONSOR_URL" target="_blank" rel="noopener" style="text-decoration: none; text-align: center">☕ 請作者喝杯咖啡</a>
    </div>
    <p v-if="shareMsg" class="muted" style="margin: 6px 0 0">{{ shareMsg }}</p>

    <!-- 遊戲房 -->
    <div v-if="partying" class="overlay" @click.self="partying = false">
      <div class="sheet">
        <h3>開遊戲房</h3>
        <div class="label">房間名稱（可不填）</div>
        <input v-model="partyName" placeholder="例如：週末聚會" maxlength="16" />
        <div class="label">你的名字</div>
        <input v-model="myName" placeholder="朋友會看到這個名字" maxlength="8" list="known-players" @keyup.enter="myName.trim() && createParty()" />
        <datalist id="known-players">
          <option v-for="n in known" :key="n" :value="n" />
        </datalist>
        <p style="color: var(--muted); font-size: 13px">開好之後會給你房號，朋友在首頁輸入房號就能加入，自己再輸入名字就好。</p>
        <div class="row">
          <button class="btn" @click="partying = false">取消</button>
          <button class="btn gold" :disabled="!myName.trim() || busy" @click="createParty">開房</button>
        </div>
      </div>
    </div>

    <!-- 新牌局 -->
    <div v-if="creating" class="overlay" @click.self="creating = false">
      <div class="sheet">
        <h3>新牌局</h3>
        <div class="label">名稱（可不填）</div>
        <input v-model="gameName" placeholder="例如：週五麻將夜" maxlength="16" />
        <div class="label">一開始的四位玩家（之後可以隨時換人、新增）</div>
        <div class="list">
          <input
            v-for="(_, i) in 4"
            :key="i"
            v-model="names[i]"
            :placeholder="`玩家${i + 1}`"
            list="known-players"
            maxlength="8"
          />
        </div>
        <datalist id="known-players">
          <option v-for="n in known" :key="n" :value="n" />
        </datalist>
        <div class="row">
          <button class="btn" @click="creating = false">取消</button>
          <button class="btn gold" @click="create">開始</button>
        </div>
      </div>
    </div>
  </div>
</template>
