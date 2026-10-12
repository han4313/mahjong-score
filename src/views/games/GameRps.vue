<script setup>
import { computed } from 'vue'
import { playerName } from '../../store.js'

const props = defineProps({ p: Object, me: String, g: Object, busy: Boolean })
const emit = defineEmits(['act'])

const HAND = { rock: '✊', paper: '✋', scissors: '✌️' }
const LABEL = { rock: '石頭', paper: '布', scissors: '剪刀' }
const name = (pid) => playerName(props.g, pid)
const inRound = computed(() => props.p.players.includes(props.me))
const iPicked = computed(() => Boolean(props.p.rolled?.[props.me]))
const waiting = computed(() => props.p.players.filter((x) => !props.p.rolled[x]))
</script>

<template>
  <div>
    <template v-if="!p.done">
      <div class="roll-list">
        <div v-for="pid in p.players" :key="pid" class="roll-row">
          <span>{{ name(pid) }}<span v-if="pid === me" class="tag">你</span></span>
          <span :class="p.rolled[pid] ? 'ok' : 'wait'">{{ p.rolled[pid] ? '✔ 已出' : '…還沒出' }}</span>
        </div>
      </div>
      <div v-if="me && inRound && !iPicked" class="rps-row">
        <button v-for="(h, k) in HAND" :key="k" class="rps-btn" :disabled="busy" @click="emit('act', { choice: k })">
          <span class="rps-emoji">{{ h }}</span>
          {{ LABEL[k] }}
        </button>
      </div>
      <p v-else-if="!me" class="hint">先在上面選你是誰</p>
      <p v-else-if="!inRound" class="hint">你不在這一局裡，看大家玩吧</p>
      <p v-else class="hint">已出拳，等 {{ waiting.map(name).join('、') }}…</p>
    </template>

    <template v-else>
      <div class="roll-list">
        <div
          v-for="pid in p.players"
          :key="pid"
          class="roll-row"
          :class="{ best: p.winners.includes(pid), worst: p.losers.includes(pid) }"
        >
          <span>{{ name(pid) }}<span v-if="pid === me" class="tag">你</span></span>
          <span class="rps-emoji small">{{ HAND[p.picks[pid]] }}</span>
        </div>
      </div>
      <p v-if="p.draw" class="result"><b>平手！</b>要嘛大家出一樣，要嘛三種都有，再來一局吧</p>
      <p v-else class="result">🏆 <b>{{ p.winners.map(name).join('、') }}</b> 贏了</p>
    </template>
  </div>
</template>
