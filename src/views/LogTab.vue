<script setup>
import { computed } from 'vue'
import { playerName } from '../store.js'

const props = defineProps({ g: Object })

const hands = computed(() => [...props.g.hands].reverse())
const total = computed(() => props.g.hands.length)

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)

function describe(h) {
  if (h.kind === 'draw') return '流局'
  const w = playerName(props.g, h.seats[h.winner])
  return h.type === 'tsumo' ? `${w} 自摸` : `${w} 胡・${playerName(props.g, h.seats[h.loser])} 放槍`
}
</script>

<template>
  <section>
    <p v-if="!total" class="muted" style="text-align: center; margin-top: 40px">還沒有紀錄</p>
    <div class="log">
      <div v-for="(h, idx) in hands" :key="h.id" class="card">
        <div class="head">
          <b>第 {{ total - idx }} 把</b>
          <span>{{ describe(h) }}</span>
          <span v-if="h.kind === 'win'" class="tai">{{ h.taiTotal }} 台</span>
        </div>
        <div v-if="h.labels?.length" class="muted" style="margin-top: 4px">{{ h.labels.join('、') }}</div>
        <div v-if="h.kind === 'win'" class="deltas">
          <span v-for="(d, i) in h.deltas" :key="i" :class="{ pos: d > 0, neg: d < 0, neutral: d === 0 }">
            {{ playerName(g, h.seats[i]) }} {{ fmt(d) }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
