<script setup>
import { ref, computed } from 'vue'
import { playerName } from '../../store.js'

const props = defineProps({ p: Object, me: String, g: Object, busy: Boolean, error: String })
const emit = defineEmits(['act'])

const guess = ref('')
const name = (pid) => playerName(props.g, pid)
const inRound = computed(() => props.p.players.includes(props.me))
const myTurn = computed(() => !props.p.done && props.p.turn === props.me)
const lastFirst = computed(() => [...props.p.history].reverse())

function submit() {
  const n = Number(guess.value)
  if (!Number.isInteger(n)) return
  emit('act', { guess: n })
  guess.value = ''
}
</script>

<template>
  <div>
    <div class="range">
      <small>範圍</small>
      <b>{{ p.lo + 1 }} ～ {{ p.hi - 1 }}</b>
    </div>

    <template v-if="!p.done">
      <p class="hint" style="text-align: center">
        輪到 <b>{{ name(p.turn) }}</b
        ><span v-if="p.turn === me">（你）</span>
      </p>
      <div v-if="myTurn" class="row">
        <input v-model="guess" type="number" inputmode="numeric" :placeholder="`${p.lo + 1} ～ ${p.hi - 1}`" style="flex: 2" @keyup.enter="submit" />
        <button class="btn gold" :disabled="busy || guess === ''" @click="submit">猜</button>
      </div>
      <p v-else-if="!me" class="hint">先在上面選你是誰</p>
      <p v-else-if="!inRound" class="hint">你不在這一局裡，看大家玩吧</p>
      <p v-else class="hint">等 {{ name(p.turn) }} 猜…</p>
    </template>
    <p v-else class="result">💥 <b>{{ name(p.loser) }}</b> 猜中了密碼 <b>{{ p.secret }}</b>，輸了！</p>

    <div v-if="p.history.length" class="roll-list" style="margin-top: 10px">
      <div v-for="(h, i) in lastFirst" :key="i" class="roll-row" :class="{ worst: h.hit }">
        <span>{{ name(h.pid) }}</span>
        <span>
          <b>{{ h.guess }}</b>
          <span v-if="h.hit"> 💥 猜中</span>
        </span>
      </div>
    </div>
  </div>
</template>
