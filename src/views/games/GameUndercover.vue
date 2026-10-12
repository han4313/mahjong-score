<script setup>
import { computed } from 'vue'
import { playerName } from '../../store.js'

const props = defineProps({ p: Object, me: String, g: Object, busy: Boolean })
const emit = defineEmits(['act'])

const name = (pid) => playerName(props.g, pid)
const inRound = computed(() => props.p.players.includes(props.me))
const iVoted = computed(() => Boolean(props.p.voted?.[props.me]))
const waiting = computed(() => props.p.players.filter((x) => !props.p.voted[x]))
const voteCounts = computed(() => {
  const t = {}
  for (const target of Object.values(props.p.votes ?? {})) t[target] = (t[target] ?? 0) + 1
  return t
})
</script>

<template>
  <div>
    <!-- 看自己的詞 -->
    <div v-if="inRound" class="word-card">
      <small>你的詞</small>
      <b>{{ p.myWord }}</b>
    </div>
    <p v-else-if="!me" class="hint">先在上面選你是誰，才看得到你的詞</p>
    <p v-else class="hint">你不在這一局裡，看大家玩吧</p>

    <template v-if="p.phase === 'talk'">
      <p class="hint">
        共 {{ p.players.length }} 人，其中 <b>{{ p.spyCount }}</b> 位臥底。<br />
        你不知道自己是不是臥底！輪流用一句話描述你的詞（<b>不能直接說出來</b>），聽別人怎麼說，找出詞不一樣的人。
      </p>
      <button v-if="inRound" class="btn gold block big-btn" :disabled="busy" @click="emit('act', { kind: 'startVote' })">聊完了，開始投票</button>
    </template>

    <template v-else-if="p.phase === 'vote'">
      <p v-if="p.ties" class="notice">平票了，請重新投票（第 {{ p.ties + 1 }} 輪）</p>
      <div class="label-d">投給你覺得是臥底的人</div>
      <div class="roll-list">
        <div v-for="pid in p.players" :key="pid" class="roll-row">
          <span>{{ name(pid) }}<span v-if="pid === me" class="tag">你</span></span>
          <span v-if="!iVoted && inRound && pid !== me">
            <button class="btn small gold" :disabled="busy" @click="emit('act', { kind: 'vote', target: pid })">投他</button>
          </span>
          <span v-else :class="p.voted[pid] ? 'ok' : 'wait'">{{ p.voted[pid] ? '✔ 已投' : '…' }}</span>
        </div>
      </div>
      <p v-if="iVoted" class="hint">已投票，等 {{ waiting.map(name).join('、') }}…</p>
    </template>

    <template v-else-if="p.phase === 'done'">
      <div class="roll-list">
        <div
          v-for="pid in p.players"
          :key="pid"
          class="roll-row"
          :class="{ worst: pid === p.eliminated, best: p.spies.includes(pid) }"
        >
          <span>
            {{ name(pid) }}<span v-if="pid === me" class="tag">你</span>
            <span v-if="p.spies.includes(pid)" class="tag" style="background: #fde4e1; color: #8f2318">臥底</span>
          </span>
          <span>
            <b>{{ p.words[pid] }}</b>
            <small v-if="voteCounts[pid]"> ・{{ voteCounts[pid] }} 票</small>
          </span>
        </div>
      </div>
      <p class="result">
        被投出去的是 <b>{{ name(p.eliminated) }}</b
        >，
        <template v-if="p.winner === 'civilians'">🎉 <b>平民</b>抓到臥底，平民贏！</template>
        <template v-else>🕵️ 抓錯人了，<b>臥底</b>贏！</template>
      </p>
    </template>
  </div>
</template>
