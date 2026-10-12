<script setup>
import { computed } from 'vue'
import { playerName, setStartDealer } from '../../store.js'

const props = defineProps({ p: Object, me: String, g: Object, busy: Boolean })
const emit = defineEmits(['act'])

const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const name = (pid) => playerName(props.g, pid)
const inRound = computed(() => props.p.players.includes(props.me))
const iRolled = computed(() => Boolean(props.p.rolled?.[props.me]))
const waiting = computed(() => props.p.players.filter((x) => !props.p.rolled[x]))

const res = computed(() => {
  if (!props.p.done || !props.p.rolls) return null
  const entries = Object.entries(props.p.rolls)
    .map(([pid, dice]) => ({ pid, dice, total: dice.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
  const max = entries[0].total
  const min = entries[entries.length - 1].total
  return {
    entries,
    winners: entries.filter((e) => e.total === max).map((e) => e.pid),
    losers: entries.filter((e) => e.total === min).map((e) => e.pid),
  }
})

// 打麻將的房間：還沒開打時，贏的人可以直接當起莊
const canSetDealer = computed(
  () => props.g.mode !== 'party' && !props.g.hands.length && res.value?.winners.length === 1 && props.g.seats.includes(res.value.winners[0]),
)
function makeDealer() {
  setStartDealer(props.g, props.g.seats.indexOf(res.value.winners[0]))
}
</script>

<template>
  <div>
    <template v-if="!p.done">
      <div class="roll-list">
        <div v-for="pid in p.players" :key="pid" class="roll-row">
          <span>{{ name(pid) }}<span v-if="pid === me" class="tag">你</span></span>
          <span :class="p.rolled[pid] ? 'ok' : 'wait'">{{ p.rolled[pid] ? '✔ 已搖' : '…還沒搖' }}</span>
        </div>
      </div>
      <button v-if="me && inRound && !iRolled" class="btn gold block big-btn" :disabled="busy" @click="emit('act', {})">🎲 搖骰子</button>
      <p v-else-if="!me" class="hint">先在上面選你是誰</p>
      <p v-else-if="!inRound" class="hint">你不在這一局裡，看大家玩吧</p>
      <p v-else class="hint">已搖好，等 {{ waiting.map(name).join('、') }}…</p>
    </template>

    <template v-else-if="res">
      <div class="roll-list">
        <div
          v-for="e in res.entries"
          :key="e.pid"
          class="roll-row"
          :class="{ best: res.winners.includes(e.pid), worst: res.losers.includes(e.pid) && res.winners.length !== res.entries.length }"
        >
          <span>{{ name(e.pid) }}<span v-if="e.pid === me" class="tag">你</span></span>
          <span class="dice">
            <span v-for="(d, i) in e.dice" :key="i">{{ FACES[d] }}</span>
            <b>{{ e.total }}</b>
          </span>
        </div>
      </div>
      <p v-if="res.winners.length === res.entries.length" class="result"><b>全部平手！</b></p>
      <p v-else-if="res.winners.length > 1" class="result"><b>{{ res.winners.map(name).join('、') }}</b> 同分</p>
      <p v-else class="result">🏆 <b>{{ name(res.winners[0]) }}</b> 最大，<b>{{ res.losers.map(name).join('、') }}</b> 最小</p>
      <button v-if="canSetDealer" class="btn gold block" style="margin-top: 10px" @click="makeDealer">{{ name(res.winners[0]) }} 設為起莊</button>
    </template>
  </div>
</template>
