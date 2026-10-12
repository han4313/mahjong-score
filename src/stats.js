// 使用統計：用一組隨機的匿名編號（存在這支手機上）定期通知伺服器「我還在」，
// 伺服器只計算人數，不知道你是誰。
import { reactive } from 'vue'

export const live = reactive({ ready: false, online: 0, today: { visitors: 0, roomsCreated: 0 }, rooms: { total: 0, mahjong: 0, party: 0, activeLastHour: 0 } })

function clientId() {
  try {
    let id = localStorage.getItem('mahjong-cid')
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20)
      localStorage.setItem('mahjong-cid', id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2, 12).padEnd(10, '0') // 無法儲存時，每次開啟算一位
  }
}

async function ping() {
  if (document.visibilityState !== 'visible') return
  try {
    await fetch('/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: clientId() }) })
  } catch {
    // 連不到伺服器就算了
  }
}

export async function refreshStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return
    const s = await res.json()
    Object.assign(live, { ready: true, online: s.online, today: s.today, rooms: s.rooms })
  } catch {
    live.ready = false
  }
}

let started = false
export function startHeartbeat() {
  if (started) return
  started = true
  ping().then(refreshStats)
  setInterval(ping, 60_000)
}
