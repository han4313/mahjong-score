import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findPath, findAnyPair, newBoard, reshuffle, remaining } from '../src/games/lianliankan.js'

// 6x6 含外圈
const empty = () => Array.from({ length: 6 }, () => Array(6).fill(0))

test('同一直線、中間無牌可連', () => {
  const g = empty()
  g[1][1] = 1
  g[1][4] = 1
  assert.ok(findPath(g, { r: 1, c: 1 }, { r: 1, c: 4 }))
})

test('中間有牌擋住，需繞路（兩次轉彎內）', () => {
  const g = empty()
  g[2][1] = 1
  g[2][4] = 1
  g[2][2] = 2 // 擋住
  const p = findPath(g, { r: 2, c: 1 }, { r: 2, c: 4 })
  assert.ok(p)
  assert.ok(p.length >= 4)
})

test('不同牌不能連', () => {
  const g = empty()
  g[1][1] = 1
  g[1][2] = 2
  assert.equal(findPath(g, { r: 1, c: 1 }, { r: 1, c: 2 }), null)
})

test('超過兩次轉彎不能連', () => {
  // B(3,3) 只有右側(3,4)能進入；A(1,1)右邊被擋，
  // 任何路線進入 B 都至少要轉 3 次
  const g = empty()
  g[1][1] = 1
  g[3][3] = 1
  for (const [r, c] of [[1, 2], [2, 3], [3, 2], [4, 3], [2, 4]]) g[r][c] = 3
  assert.equal(findPath(g, { r: 1, c: 1 }, { r: 3, c: 3 }), null)
  // 把擋住 A 右邊的牌拿掉，就只需 2 次轉彎
  g[1][2] = 0
  assert.ok(findPath(g, { r: 1, c: 1 }, { r: 3, c: 3 }))
})

test('新盤面數量正確，洗牌後仍有可消除的一對', () => {
  const g = newBoard(4, 4, 4)
  assert.equal(remaining(g), 16)
  const s = reshuffle(g)
  assert.equal(remaining(s), 16)
  assert.ok(findAnyPair(s))
})
