<script setup>
import { ref, computed } from 'vue'
import { state, dealerState, seatName, recordWin } from '../store.js'
import { calcWin } from '../scoring.js'

const props = defineProps({ g: Object })
const emit = defineEmits(['close'])

const winner = ref(null)
const type = ref('ron')
const loser = ref(null)
const counts = ref({}) // 台型 id -> 選了幾個

const dealer = computed(() => dealerState(props.g))

// 依「放槍／自摸」決定哪些台型要顯示
const visible = (it) => !(it.includesTsumo && type.value !== 'tsumo') && !(it.hideOnTsumo && type.value === 'tsumo')

const groups = computed(() => {
  const map = new Map()
  for (const it of state.taiItems.filter(visible)) {
    if (!map.has(it.group)) map.set(it.group, [])
    map.get(it.group).push(it)
  }
  return [...map.entries()]
})

const chosen = computed(() => state.taiItems.filter((it) => counts.value[it.id]))
const selectedTai = computed(() => chosen.value.reduce((s, it) => s + counts.value[it.id] * it.tai, 0))
const skipTsumo = computed(() => type.value === 'tsumo' && chosen.value.some((it) => it.includesTsumo))
const labels = computed(() =>
  chosen.value.map((it) => (it.max > 1 ? `${it.name.replace(/（.*）/, '')}×${counts.value[it.id]}` : it.name)),
)

const canSubmit = computed(
  () => winner.value !== null && (type.value === 'tsumo' || (loser.value !== null && loser.value !== winner.value)),
)

const preview = computed(() => {
  if (!canSubmit.value) return null
  return calcWin({
    settings: props.g.settings,
    dealer: dealer.value.dealer,
    lian: dealer.value.lian,
    winner: winner.value,
    type: type.value,
    loser: loser.value,
    tai: selectedTai.value,
    skipTsumo: skipTsumo.value,
  })
})

function setType(t) {
  type.value = t
  // 被藏起來的台型要一併取消勾選，避免算進看不到的台數
  for (const it of state.taiItems) if (!visible(it)) counts.value[it.id] = 0
  if (t === 'tsumo') loser.value = null
}

function setWinner(i) {
  winner.value = i
  if (loser.value === i) loser.value = null
}

function toggle(it) {
  const on = !counts.value[it.id]
  counts.value[it.id] = on ? 1 : 0
}

function step(it, d) {
  counts.value[it.id] = Math.min(it.max, Math.max(0, (counts.value[it.id] || 0) + d))
}

function submit() {
  if (!canSubmit.value) return
  recordWin(props.g, {
    winner: winner.value,
    type: type.value,
    loser: loser.value,
    tai: selectedTai.value,
    labels: labels.value,
    skipTsumo: skipTsumo.value,
  })
  emit('close')
}

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="sheet">
      <h3>登記胡牌</h3>

      <div class="label">誰胡牌</div>
      <div class="chips">
        <button v-for="i in 4" :key="i" class="chip" :class="{ on: winner === i - 1, zhuang: dealer.dealer === i - 1 }" @click="setWinner(i - 1)">
          {{ seatName(g, i - 1) }}
        </button>
      </div>

      <div class="label">怎麼胡</div>
      <div class="chips">
        <button class="chip" :class="{ on: type === 'ron' }" @click="setType('ron')">放槍</button>
        <button class="chip" :class="{ on: type === 'tsumo' }" @click="setType('tsumo')">自摸</button>
      </div>

      <template v-if="type === 'ron'">
        <div class="label">誰放槍</div>
        <div class="chips">
          <button
            v-for="i in 4"
            :key="i"
            class="chip"
            :class="{ on: loser === i - 1, zhuang: dealer.dealer === i - 1 }"
            :disabled="winner === i - 1"
            @click="loser = i - 1"
          >
            {{ seatName(g, i - 1) }}
          </button>
        </div>
      </template>

      <div v-for="[grp, items] in groups" :key="grp">
        <div class="label">{{ grp }}</div>
        <div class="chips">
          <template v-for="it in items" :key="it.id">
            <button
              v-if="it.max === 1"
              class="chip"
              :class="{ on: counts[it.id] }"
              @click="toggle(it)"
            >
              {{ it.name }}<small>{{ it.tai }}台</small>
            </button>
            <span v-else class="stepper" :class="{ on: counts[it.id] }">
              <button @click="step(it, -1)">−</button>
              <span>{{ it.name }} {{ counts[it.id] || 0 }}</span>
              <button @click="step(it, 1)">＋</button>
            </span>
          </template>
        </div>
      </div>

      <div class="summary">
        <div>
          勾選 <b>{{ selectedTai }}</b> 台
          <span v-if="type === 'tsumo' && !skipTsumo">＋ 自摸 {{ g.settings.tsumoTai }} 台</span>
          <span v-if="skipTsumo" class="neutral">（已含自摸）</span>
          <span class="neutral">・莊家台自動計算</span>
        </div>
        <div v-if="preview" class="deltas">
          <span v-for="(d, i) in preview.deltas" :key="i" :class="{ pos: d > 0, neg: d < 0 }">
            {{ seatName(g, i) }} {{ fmt(d) }}
          </span>
        </div>
        <div class="row">
          <button class="btn" @click="emit('close')">取消</button>
          <button class="btn gold" :disabled="!canSubmit" @click="submit">確定</button>
        </div>
      </div>
    </div>
  </div>
</template>
