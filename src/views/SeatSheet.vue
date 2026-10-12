<script setup>
import { ref } from 'vue'
import { addPlayer, setSeat, setStartDealer, totalsOf, seatName } from '../store.js'

const props = defineProps({ g: Object, seat: Number })
const emit = defineEmits(['close'])

const newName = ref('')
const totals = totalsOf(props.g)
const WINDS = ['東', '南', '西', '北']

function sit(pid) {
  setSeat(props.g, props.seat, pid)
  emit('close')
}

function addAndSit() {
  const id = addPlayer(props.g, newName.value)
  if (id) sit(id)
}

function makeDealer() {
  setStartDealer(props.g, props.seat)
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="sheet">
      <h3>{{ WINDS[seat] }}位　現在是 {{ seatName(g, seat) }}</h3>
      <p class="muted" style="color: var(--muted); margin: 0">選一位玩家坐到這個位子。已在座的人會跟這個位子互換。</p>

      <div class="label">玩家</div>
      <div class="chips">
        <button v-for="p in g.players" :key="p.id" class="chip" :class="{ on: g.seats[seat] === p.id }" @click="sit(p.id)">
          {{ p.name }}
          <small v-if="g.seats.includes(p.id) && g.seats[seat] !== p.id">在座</small>
        </button>
      </div>

      <div class="label">新增玩家（會直接坐到這個位子）</div>
      <div class="row" style="margin-top: 0">
        <input v-model="newName" placeholder="名字" maxlength="8" style="flex: 2" @keyup.enter="addAndSit" />
        <button class="btn gold" :disabled="!newName.trim()" @click="addAndSit">新增並入座</button>
      </div>

      <div v-if="!g.hands.length" style="margin-top: 14px">
        <button class="btn block" @click="makeDealer">設為起莊</button>
      </div>
      <button class="btn block" style="margin-top: 10px" @click="emit('close')">關閉</button>
    </div>
  </div>
</template>
