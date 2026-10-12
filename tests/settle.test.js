import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settle, settlementText } from '../src/settle.js'

const p = (name, total) => ({ id: name, name, total })

// 檢查：每個人轉出去的 - 收進來的 = 他的輸贏
function net(transfers) {
  const n = {}
  for (const t of transfers) {
    n[t.from] = (n[t.from] ?? 0) - t.amount
    n[t.to] = (n[t.to] ?? 0) + t.amount
  }
  return n
}

test('一人贏三人輸：三筆轉帳', () => {
  const players = [p('A', 300), p('B', -100), p('C', -120), p('D', -80)]
  const t = settle(players)
  assert.equal(t.length, 3)
  const n = net(t)
  for (const x of players) assert.equal(n[x.name] ?? 0, x.total)
})

test('兩贏兩輸：最多 3 筆，且每人淨額正確', () => {
  const players = [p('A', 200), p('B', 100), p('C', -150), p('D', -150)]
  const t = settle(players)
  assert.ok(t.length <= 3)
  const n = net(t)
  for (const x of players) assert.equal(n[x.name] ?? 0, x.total)
})

test('剛好兩兩抵銷只要兩筆', () => {
  const t = settle([p('A', 100), p('B', 50), p('C', -100), p('D', -50)])
  assert.equal(t.length, 2)
})

test('全部 0 不用轉帳', () => {
  assert.deepEqual(settle([p('A', 0), p('B', 0)]), [])
})

test('超過四人也可以', () => {
  const players = [p('A', 90), p('B', 10), p('C', -40), p('D', -30), p('E', -30)]
  const n = net(settle(players))
  for (const x of players) assert.equal(n[x.name] ?? 0, x.total)
})

test('結算文字', () => {
  const t = settle([p('A', 100), p('B', -100)])
  const s = settlementText('週五', [p('A', 100), p('B', -100)], t)
  assert.ok(s.includes('A　+100'))
  assert.ok(s.includes('B → A　100'))
})
