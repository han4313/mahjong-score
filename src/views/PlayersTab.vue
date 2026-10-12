<script setup>
import { ref } from 'vue'
import { addPlayer, renamePlayer, removePlayer, canRemovePlayer, totalsOf } from '../store.js'

const props = defineProps({ g: Object })
const newName = ref('')

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)

function add() {
  if (addPlayer(props.g, newName.value)) newName.value = ''
}
</script>

<template>
  <section>
    <h2>玩家名單</h2>
    <p class="muted">戰績是依「人」累計的，換人坐位子也不會算錯。改名會同步更新所有紀錄。</p>
    <div class="list">
      <div v-for="p in g.players" :key="p.id" class="card list-item">
        <input :value="p.name" maxlength="8" @change="renamePlayer(g, p.id, $event.target.value)" />
        <span class="muted" style="min-width: 56px; text-align: right">{{ fmt(totalsOf(g)[p.id] ?? 0) }}</span>
        <button v-if="canRemovePlayer(g, p.id)" class="btn small danger" @click="removePlayer(g, p.id)">移除</button>
        <span v-else class="muted">{{ g.seats.includes(p.id) ? '在座' : '有紀錄' }}</span>
      </div>
    </div>

    <h2>新增玩家</h2>
    <div class="row">
      <input v-model="newName" placeholder="名字" maxlength="8" style="flex: 2" @keyup.enter="add" />
      <button class="btn gold" :disabled="!newName.trim()" @click="add">新增</button>
    </div>
  </section>
</template>
