<script setup>
import { ref, computed } from 'vue'
import { dealerState, seatName, totalsOf, recordDraw, undoLast } from '../store.js'
import { dealerTai } from '../scoring.js'
import HandSheet from './HandSheet.vue'
import SeatSheet from './SeatSheet.vue'
import SettleSheet from './SettleSheet.vue'

const props = defineProps({ g: Object })

const WINDS = ['東', '南', '西', '北']
const dealer = computed(() => dealerState(props.g))
const totals = computed(() => totalsOf(props.g))
const seatTotal = (i) => totals.value[props.g.seats[i]] ?? 0
const wind = (i) => WINDS[(i - dealer.value.dealer + 4) % 4]

const ranking = computed(() =>
  [...props.g.players].sort((a, b) => totals.value[b.id] - totals.value[a.id]),
)

const showHand = ref(false)
const showSettle = ref(false)
const pickSeat = ref(null)

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)
const cls = (n) => ({ pos: n > 0, neg: n < 0 })

function draw() {
  if (confirm('確定記錄流局？')) recordDraw(props.g)
}
</script>

<template>
  <section>
    <div class="table">
      <button
        v-for="i in 4"
        :key="i"
        class="seat"
        :class="[`s${i - 1}`, { dealer: dealer.dealer === i - 1 }]"
        @click="pickSeat = i - 1"
      >
        <span class="wind">{{ wind(i - 1) }}</span>
        <div class="sname">{{ seatName(g, i - 1) }}</div>
        <div class="sscore" :class="cls(seatTotal(i - 1))">{{ fmt(seatTotal(i - 1)) }}</div>
      </button>

      <div class="mid">
        <div class="big">{{ seatName(g, dealer.dealer) }}</div>
        <div class="small">莊{{ dealer.lian ? `・連 ${dealer.lian}` : '' }}</div>
        <div class="small">莊家 {{ dealerTai(dealer.lian) }} 台</div>
        <div class="small">第 {{ g.hands.length + 1 }} 把</div>
      </div>
    </div>
    <p class="muted" style="text-align: center; margin: 0 0 12px">點座位可以換人</p>

    <button class="btn gold block" style="min-height: 56px; font-size: 18px" @click="showHand = true">登記胡牌</button>
    <div class="row" style="margin-top: 10px">
      <button class="btn" @click="draw">流局</button>
      <button class="btn" :disabled="!g.hands.length" @click="undoLast(g)">復原上一把</button>
      <button class="btn" @click="showSettle = true">結算</button>
    </div>

    <h2>總戰績</h2>
    <div class="rank">
      <div v-for="(p, i) in ranking" :key="p.id" class="rank-item">
        <span class="no">{{ i + 1 }}</span>
        <span class="nm">
          {{ p.name }}<span v-if="g.seats.includes(p.id)" class="tag">在座</span>
        </span>
        <span class="amt" :class="cls(totals[p.id])">{{ fmt(totals[p.id]) }}</span>
      </div>
    </div>

    <HandSheet v-if="showHand" :g="g" @close="showHand = false" />
    <SettleSheet v-if="showSettle" :g="g" @close="showSettle = false" />
    <SeatSheet v-if="pickSeat !== null" :g="g" :seat="pickSeat" @close="pickSeat = null" />
  </section>
</template>
