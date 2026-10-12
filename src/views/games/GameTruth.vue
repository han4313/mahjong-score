<script setup>
import { playerName } from '../../store.js'

const props = defineProps({ p: Object, me: String, g: Object, busy: Boolean })
const emit = defineEmits(['act'])
const name = (pid) => playerName(props.g, pid)
</script>

<template>
  <div>
    <div v-if="p.card" class="truth-card" :class="p.card.kind">
      <small>{{ p.card.kind === 'truth' ? '真心話' : '大冒險' }}・{{ name(p.card.by) }} 抽的</small>
      <b>{{ p.card.text }}</b>
    </div>
    <p v-else class="hint" style="text-align: center">按下面的按鈕抽題目，大家的畫面會同時出現同一張</p>

    <div v-if="me" class="row" style="margin-top: 12px">
      <button class="btn gold" :disabled="busy" @click="emit('act', { kind: 'truth' })">抽真心話</button>
      <button class="btn" :disabled="busy" @click="emit('act', { kind: 'dare' })">抽大冒險</button>
    </div>
    <p v-else class="hint">先在上面選你是誰</p>
  </div>
</template>
