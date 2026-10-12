<script setup>
import { ref } from 'vue'
import { state, commit, shareGame, leaveRoom, clearHands, deleteGame, resetTaiItems } from '../store.js'

const props = defineProps({ g: Object })
const emit = defineEmits(['left'])

const error = ref('')
const copied = ref('')
const busy = ref(false)

async function share() {
  error.value = ''
  busy.value = true
  try {
    await shareGame(props.g)
  } catch (e) {
    error.value = e.message === 'Failed to fetch' ? '連不到伺服器，無法建立房號' : e.message
  } finally {
    busy.value = false
  }
}

const link = () => `${location.origin}${location.pathname}?room=${props.g.room.code}`

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = `已複製${label}`
  } catch {
    copied.value = '無法自動複製，請長按手動複製'
  }
  setTimeout(() => (copied.value = ''), 2000)
}

function leave() {
  if (confirm('退出房號後，這份牌局只留在這支手機，不再和別人同步。確定？')) leaveRoom(props.g)
}

function addItem() {
  state.taiItems.push({ id: `c${Date.now()}`, group: '自訂', name: '新台型', tai: 1, max: 1 })
}
function removeItem(i) {
  state.taiItems.splice(i, 1)
}
function clear() {
  if (confirm('清除這個牌局的所有紀錄（玩家保留）？')) clearHands(props.g)
}
function del() {
  if (confirm(`刪除「${props.g.name}」？${props.g.room ? '只會刪除這支手機上的，別人的不受影響。' : '刪除後無法復原。'}`)) {
    deleteGame(props.g)
    emit('left')
  }
}
function resetRules() {
  if (confirm('把台數表還原成預設值？')) resetTaiItems()
}
</script>

<template>
  <section>
    <h2>一起看同一份</h2>
    <div class="card">
      <template v-if="!g.room">
        <p style="margin: 0 0 10px">目前只有你這支手機看得到。產生房號後，朋友輸入房號就能看同一份戰績、一起記分。</p>
        <button class="btn gold block" :disabled="busy" @click="share">產生房號</button>
        <p v-if="error" class="notice">{{ error }}</p>
      </template>
      <template v-else>
        <div class="muted">房號（知道房號的人都能修改，請只給牌友）</div>
        <div class="room-code">{{ g.room.code }}</div>
        <div class="row">
          <button class="btn" @click="copy(g.room.code, '房號')">複製房號</button>
          <button class="btn" @click="copy(link(), '連結')">複製連結</button>
        </div>
        <p v-if="copied" class="muted" style="margin: 8px 0 0">{{ copied }}</p>
        <button class="btn block danger" style="margin-top: 10px" @click="leave">退出房號（改回只存這支手機）</button>
      </template>
    </div>

    <template v-if="g.mode === 'party'">
      <h2>房間名稱</h2>
      <div class="card">
        <input v-model="g.name" maxlength="16" @change="commit(g)" />
      </div>
    </template>

    <template v-if="g.mode !== 'party'">
    <h2>牌局設定</h2>
    <div class="card">
      <div class="grid2">
        <label class="field" style="grid-column: 1 / -1">
          牌局名稱
          <input v-model="g.name" maxlength="16" @change="commit(g)" />
        </label>
        <label class="field">
          底
          <input v-model.number="g.settings.base" type="number" min="0" @change="commit(g)" />
        </label>
        <label class="field">
          每台
          <input v-model.number="g.settings.perTai" type="number" min="0" @change="commit(g)" />
        </label>
        <label class="field">
          自摸加幾台
          <input v-model.number="g.settings.tsumoTai" type="number" min="0" @change="commit(g)" />
        </label>
        <label class="checkline" style="align-self: end; min-height: 44px">
          <input v-model="g.settings.drawAddsLian" type="checkbox" @change="commit(g)" />
          流局連莊數 +1
        </label>
      </div>
    </div>

    <h2>台數表（只存在這支手機）</h2>
    <p class="muted">預設為常見版本，請依你們的玩法調整。莊家台（連 N 拉 N = 2N+1）與自摸台由系統自動加。</p>
    <div class="list">
      <div v-for="(it, i) in state.taiItems" :key="it.id" class="list-item">
        <input v-model="it.name" style="background: #fff" />
        <input v-model.number="it.tai" type="number" min="0" class="tai-input" />
        <span class="muted">台</span>
        <button class="btn small" @click="removeItem(i)">✕</button>
      </div>
    </div>
    <div class="row" style="margin-top: 10px">
      <button class="btn" @click="addItem">新增台型</button>
      <button class="btn" @click="resetRules">還原預設</button>
    </div>

    </template>

    <h2>危險區</h2>
    <div class="row">
      <button v-if="g.mode !== 'party'" class="btn danger" @click="clear">清除戰績</button>
      <button class="btn danger" @click="del">{{ g.mode === 'party' ? '刪除房間' : '刪除牌局' }}</button>
    </div>
  </section>
</template>
