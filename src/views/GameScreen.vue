<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { sync, pull } from '../store.js'
import TableTab from './TableTab.vue'
import LogTab from './LogTab.vue'
import PlayersTab from './PlayersTab.vue'
import PlayTab from './PlayTab.vue'
import SettingsTab from './SettingsTab.vue'

const props = defineProps({ g: Object })
defineEmits(['back'])

const party = props.g.mode === 'party' // 遊戲房：沒有牌桌和紀錄
const tab = ref(party ? 'play' : 'table')
const TABS = party
  ? [
      ['play', '遊戲'],
      ['players', '玩家'],
      ['settings', '設定'],
    ]
  : [
      ['table', '牌桌'],
      ['log', '紀錄'],
      ['players', '玩家'],
      ['play', '遊戲'],
      ['settings', '設定'],
    ]

// 共用牌局每 3 秒向伺服器拿一次最新資料
let timer = null
const onVisible = () => document.visibilityState === 'visible' && pull(props.g)
onMounted(() => {
  pull(props.g)
  timer = setInterval(() => pull(props.g), 3000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})

const syncLabel = computed(() => {
  if (!props.g.room) return null
  return { ok: '已同步', syncing: '同步中…', error: '離線', conflict: '已更新', idle: '連線中…' }[sync.status] ?? '已同步'
})
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <button class="back" aria-label="返回" @click="$emit('back')">←</button>
      <div class="title">{{ g.name }}</div>
      <span v-if="g.room" class="sync" :class="sync.status">{{ g.room.code }}・{{ syncLabel }}</span>
    </div>

    <div v-if="g.room && (sync.status === 'error' || sync.status === 'conflict')" class="notice" @click="sync.status = 'ok'">
      {{ sync.message }}
    </div>

    <TableTab v-if="!party" v-show="tab === 'table'" :g="g" />
    <LogTab v-if="!party" v-show="tab === 'log'" :g="g" />
    <PlayersTab v-show="tab === 'players'" :g="g" />
    <PlayTab v-show="tab === 'play'" :g="g" :active="tab === 'play'" />
    <SettingsTab v-show="tab === 'settings'" :g="g" @left="$emit('back')" />

    <nav class="tabs">
      <div class="tabs-inner">
        <button v-for="[k, label] in TABS" :key="k" :class="{ on: tab === k }" @click="tab = k">{{ label }}</button>
      </div>
    </nav>
  </div>
</template>
