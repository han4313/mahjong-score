import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcWin, nextDealer, dealerTai } from '../src/scoring.js'

const settings = { base: 30, perTai: 10, tsumoTai: 1, drawAddsLian: true }
const sum = (a) => a.reduce((x, y) => x + y, 0)

test('莊家台：連 N 拉 N = 1 + 2N', () => {
  assert.equal(dealerTai(0), 1)
  assert.equal(dealerTai(1), 3)
  assert.equal(dealerTai(2), 5)
})

test('閒家放槍給閒家：不加莊家台', () => {
  // 莊 0，閒 1 胡 2 放槍，3 台 → 30 + 3*10 = 60
  const { deltas } = calcWin({ settings, dealer: 0, lian: 0, winner: 1, type: 'ron', loser: 2, tai: 3 })
  assert.deepEqual(deltas, [0, 60, -60, 0])
})

test('閒家放槍給閒家：莊家不付錢', () => {
  const { deltas } = calcWin({ settings, dealer: 0, lian: 2, winner: 1, type: 'ron', loser: 2, tai: 3 })
  assert.equal(deltas[0], 0)
  assert.equal(deltas[2], -60)
})

test('莊家放槍：加莊家台（連一 = 3 台）', () => {
  // 閒 1 胡，莊 0 放槍，2 台 + 3 莊台 = 5 台 → 30 + 50 = 80
  const { deltas } = calcWin({ settings, dealer: 0, lian: 1, winner: 1, type: 'ron', loser: 0, tai: 2 })
  assert.deepEqual(deltas, [-80, 80, 0, 0])
})

test('莊家胡牌放槍：加莊家台', () => {
  // 莊 0 胡，3 放槍，2 台 + 1 莊台 = 3 台 → 60
  const { deltas } = calcWin({ settings, dealer: 0, lian: 0, winner: 0, type: 'ron', loser: 3, tai: 2 })
  assert.deepEqual(deltas, [60, 0, 0, -60])
})

test('閒家自摸：莊家多付莊家台，總和為零', () => {
  // 閒 2 自摸，1 台 + 自摸 1 = 2 台；閒家各付 50，莊家再加 1 莊台 → 60
  const { deltas } = calcWin({ settings, dealer: 0, lian: 0, winner: 2, type: 'tsumo', tai: 1 })
  assert.deepEqual(deltas, [-60, -50, 160, -50])
  assert.equal(sum(deltas), 0)
})

test('莊家自摸：三家都付，各加莊家台', () => {
  // 莊 0 自摸，0 台 + 自摸 1 + 莊 1 = 2 台 → 各付 50
  const { deltas } = calcWin({ settings, dealer: 0, lian: 0, winner: 0, type: 'tsumo', tai: 0 })
  assert.deepEqual(deltas, [150, -50, -50, -50])
})

test('門清一摸三：含自摸台，不重複加', () => {
  // 閒 2 自摸，門清一摸三 3 台（skipTsumo）；各付 30 + 3*10 = 60，莊家多 1 莊台 → 70
  const { deltas, taiTotal } = calcWin({ settings, dealer: 0, lian: 0, winner: 2, type: 'tsumo', tai: 3, skipTsumo: true })
  assert.equal(taiTotal, 3)
  assert.deepEqual(deltas, [-70, -60, 190, -60])
})

test('換莊與連莊', () => {
  assert.deepEqual(nextDealer({ settings, dealer: 0, lian: 0, winner: 0 }), { dealer: 0, lian: 1 })
  assert.deepEqual(nextDealer({ settings, dealer: 0, lian: 2, winner: 1 }), { dealer: 1, lian: 0 })
  assert.deepEqual(nextDealer({ settings, dealer: 3, lian: 0, winner: 1 }), { dealer: 0, lian: 0 })
})

test('流局：依設定決定連莊數是否增加', () => {
  assert.deepEqual(nextDealer({ settings, dealer: 1, lian: 1, isDraw: true }), { dealer: 1, lian: 2 })
  const s = { ...settings, drawAddsLian: false }
  assert.deepEqual(nextDealer({ settings: s, dealer: 1, lian: 1, isDraw: true }), { dealer: 1, lian: 1 })
})
