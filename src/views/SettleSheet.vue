<script setup>
import { ref, computed } from 'vue'
import { totalsOf, archiveSettlement } from '../store.js'
import { settle, settlementText } from '../settle.js'

const props = defineProps({ g: Object })
const emit = defineEmits(['close'])

const results = computed(() => {
  const t = totalsOf(props.g)
  return props.g.players
    .map((p) => ({ id: p.id, name: p.name, total: t[p.id] ?? 0 }))
    .sort((a, b) => b.total - a.total)
})
const transfers = computed(() => settle(results.value))
const text = computed(() => settlementText(props.g.name, results.value, transfers.value))

const showHistory = ref(false)
const copied = ref('')
const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    copied.value = '已複製，可以貼到 LINE'
  } catch {
    copied.value = '無法自動複製，請長按下方文字手動複製'
  }
  setTimeout(() => (copied.value = ''), 2500)
}

function finish() {
  if (confirm('結算完畢？目前的戰績會存進歷史並清零，從 0 開始下一輪。')) {
    archiveSettlement(props.g, transfers.value)
    emit('close')
  }
}

const when = (ts) => new Date(ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="sheet">
      <h3>結算</h3>
      <p v-if="!g.hands.length" style="color: var(--muted); margin: 0">這一輪還沒有紀錄。</p>

      <template v-else>
        <div class="label">最終輸贏（共 {{ g.hands.length }} 把）</div>
        <div class="rank">
          <div v-for="r in results" :key="r.id" class="rank-item" style="background: #fff">
            <span class="nm">{{ r.name }}</span>
            <span class="amt" :class="{ pos: r.total > 0, neg: r.total < 0 }">{{ fmt(r.total) }}</span>
          </div>
        </div>

        <div class="label">誰付給誰</div>
        <p v-if="!transfers.length" style="margin: 0">大家打平，不用轉帳 🎉</p>
        <div v-else class="list">
          <div v-for="(t, i) in transfers" :key="i" class="transfer">
            <b>{{ t.from }}</b>
            <span class="arrow">→</span>
            <b>{{ t.to }}</b>
            <span class="amt">{{ t.amount }}</span>
          </div>
        </div>
        <p v-if="transfers.length" style="color: var(--muted); font-size: 12px; margin: 8px 0 0">
          已用最少的轉帳次數算好，照著付就能全部結清。
        </p>

        <div class="row">
          <button class="btn" @click="copy">複製結算文字</button>
          <button class="btn gold" @click="finish">結算完畢，清零</button>
        </div>
        <p v-if="copied" style="margin: 8px 0 0; color: var(--muted)">{{ copied }}</p>
      </template>

      <template v-if="g.history?.length">
        <button class="btn block" style="margin-top: 12px" @click="showHistory = !showHistory">
          {{ showHistory ? '收起' : '看' }}過去的結算（{{ g.history.length }}）
        </button>
        <div v-if="showHistory" class="list" style="margin-top: 10px">
          <div v-for="h in g.history" :key="h.id" class="card" style="background: #fff">
            <div style="display: flex; justify-content: space-between">
              <b>{{ when(h.ts) }}</b>
              <span class="muted">{{ h.hands }} 把</span>
            </div>
            <div class="deltas">
              <span v-for="r in h.results" :key="r.name" :class="{ pos: r.total > 0, neg: r.total < 0 }">
                {{ r.name }} {{ fmt(r.total) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <button class="btn block" style="margin-top: 12px" @click="emit('close')">關閉</button>
    </div>
  </div>
</template>
