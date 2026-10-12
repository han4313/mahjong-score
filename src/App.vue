<script setup>
import { ref, onMounted } from 'vue'
import { state, joinRoom, currentGame } from './store.js'
import Home from './views/Home.vue'
import GameScreen from './views/GameScreen.vue'
import Arcade from './views/Arcade.vue'
import { startHeartbeat } from './stats.js'

const view = ref('home')
const toast = ref('')

function open(g) {
  state.currentId = g.id
  view.value = 'game'
}

function back() {
  state.currentId = null
  view.value = 'home'
}

// 用分享連結（?room=ABC123）打開時自動加入
onMounted(async () => {
  startHeartbeat()
  const code = new URLSearchParams(location.search).get('room')
  if (!code) return
  try {
    open(await joinRoom(code))
  } catch (e) {
    toast.value = `加入房號失敗：${e.message}`
  }
  history.replaceState(null, '', location.pathname)
})
</script>

<template>
  <Home v-if="view === 'home'" :toast="toast" @open="open" @arcade="view = 'arcade'" @clear-toast="toast = ''" />
  <GameScreen v-else-if="view === 'game' && currentGame()" :g="currentGame()" @back="back" />
  <Arcade v-else-if="view === 'arcade'" @back="back" />
</template>
