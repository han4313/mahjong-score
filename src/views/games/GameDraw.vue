<script setup>
import { computed } from 'vue'
import { playerName } from '../../store.js'

const props = defineProps({ p: Object, me: String, g: Object, busy: Boolean })
const emit = defineEmits(['act'])

const name = (pid) => playerName(props.g, pid)
const inRound = computed(() => props.p.players.includes(props.me))
const iPicked = computed(() => Object.values(props.p.taken).includes(props.me))
const left = computed(() => props.p.slots - Object.keys(props.p.taken).length)
</script>

<template>
  <div>
    <p class="hint" style="margin-top: 0">
      <template v-if="p.done">全部抽完了</template>
      <template v-else-if="!me">先在上面選你是誰</template>
      <template v-else-if="!inRound">你不在這一局裡，看大家玩吧</template>
      <template v-else-if="iPicked">你抽好了，還剩 {{ left }} 位沒抽</template>
      <template v-else>挑一張牌，裡面有一張是「鬼」</template>
    </p>

    <div class="slots">
      <button
        v-for="i in p.slots"
        :key="i"
        class="slot"
        :class="{ taken: p.taken[i - 1], ghost: p.done && p.ghost === i - 1, safe: p.done && p.ghost !== i - 1 }"
        :disabled="busy || p.done || Boolean(p.taken[i - 1]) || iPicked || !inRound || !me"
        @click="emit('act', { slot: i - 1 })"
      >
        <span class="face">{{ p.done ? (p.ghost === i - 1 ? '👻' : '😌') : p.taken[i - 1] ? '✔' : '🀫' }}</span>
        <span class="who">{{ p.taken[i - 1] ? name(p.taken[i - 1]) : `第 ${i} 張` }}</span>
      </button>
    </div>

    <p v-if="p.done" class="result">👻 <b>{{ name(p.loser) }}</b> 抽到鬼，請客！</p>
  </div>
</template>
