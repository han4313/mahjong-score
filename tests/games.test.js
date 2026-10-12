import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GAMES, startGame, actInGame, viewOf } from '../server/games.js'

const start = (type, players) => {
  const room = {}
  assert.equal(startGame(room, { type, players }), null)
  return room
}

test('人數限制與未知遊戲', () => {
  assert.match(startGame({}, { type: 'dice', players: ['a'] }), /2/)
  assert.match(startGame({}, { type: 'undercover', players: ['a', 'b'] }), /3/)
  assert.match(startGame({}, { type: 'nope', players: ['a', 'b'] }), /沒有/)
  assert.ok(startGame({}, { type: 'dice', players: [1, 2] }))
})

test('局數會遞增', () => {
  const room = start('dice', ['a', 'b'])
  assert.equal(viewOf(room.play).round, 1)
  startGame(room, { type: 'rps', players: ['a', 'b'] })
  assert.equal(viewOf(room.play).round, 2)
})

test('骰子：全部搖完前看不到點數，重搖不會改點數', () => {
  const room = start('dice', ['a', 'b', 'c'])
  actInGame(room, 'a', {})
  const first = [...room.play.data.rolls.a]
  actInGame(room, 'a', {})
  assert.deepEqual(room.play.data.rolls.a, first)
  actInGame(room, 'b', {})
  let v = viewOf(room.play, 'a')
  assert.equal(v.done, false)
  assert.equal(v.rolls, null)
  assert.ok(!JSON.stringify(v).includes(JSON.stringify(first)), '不應洩漏點數')
  actInGame(room, 'c', {})
  v = viewOf(room.play, 'a')
  assert.equal(v.done, true)
  assert.equal(Object.keys(v.rolls).length, 3)
  for (const d of Object.values(v.rolls).flat()) assert.ok(d >= 1 && d <= 6)
})

test('猜拳：勝負判定', () => {
  const run = (picks) => {
    const room = start('rps', Object.keys(picks))
    for (const [p, c] of Object.entries(picks)) actInGame(room, p, { choice: c })
    return viewOf(room.play, 'a')
  }
  let v = run({ a: 'rock', b: 'scissors' })
  assert.deepEqual(v.winners, ['a'])
  v = run({ a: 'paper', b: 'scissors', c: 'scissors' })
  assert.deepEqual(v.winners.sort(), ['b', 'c'])
  assert.deepEqual(v.losers, ['a'])
  assert.equal(run({ a: 'rock', b: 'rock' }).draw, true)
  assert.equal(run({ a: 'rock', b: 'paper', c: 'scissors' }).draw, true)
  assert.equal(actInGame(start('rps', ['a', 'b']), 'a', { choice: 'lizard' }).status, 400)
})

test('抽籤：鬼在哪裡要等全部抽完才知道；不能重抽、不能搶別人的牌', () => {
  const room = start('draw', ['a', 'b', 'c'])
  assert.equal(actInGame(room, 'a', { slot: 1 }).status, 200)
  assert.equal(actInGame(room, 'a', { slot: 2 }).status, 400) // 已抽過
  assert.equal(actInGame(room, 'b', { slot: 1 }).status, 400) // 被抽走
  assert.equal(actInGame(room, 'b', { slot: 9 }).status, 400) // 沒這張
  let v = viewOf(room.play, 'a')
  assert.equal(v.done, false)
  assert.equal(v.ghost, null)
  assert.equal(v.loser, null)
  actInGame(room, 'b', { slot: 0 })
  actInGame(room, 'c', { slot: 2 })
  v = viewOf(room.play, 'a')
  assert.equal(v.done, true)
  assert.equal(v.loser, v.taken[v.ghost])
})

test('終極密碼：輪流、範圍縮小、猜中的人輸、答案結束前不外洩', () => {
  const room = start('ultimate', ['a', 'b'])
  const secret = room.play.data.secret
  assert.equal(actInGame(room, 'b', { guess: 50 }).status, 400) // 還沒輪到
  assert.equal(actInGame(room, 'a', { guess: 0 }).status, 400) // 超出範圍
  assert.equal(actInGame(room, 'a', { guess: 100 }).status, 400)
  const g1 = secret === 50 ? 49 : 50
  assert.equal(actInGame(room, 'a', { guess: g1 }).status, 200)
  let v = viewOf(room.play, 'b')
  assert.equal(v.turn, 'b')
  if (g1 < secret) assert.equal(v.lo, g1)
  else assert.equal(v.hi, g1)
  assert.equal(v.secret, null)
  assert.ok(!JSON.stringify(v).includes(`"secret"`) || v.secret === null)
  assert.equal(actInGame(room, 'b', { guess: secret }).status, 200)
  v = viewOf(room.play, 'a')
  assert.equal(v.done, true)
  assert.equal(v.loser, 'b')
  assert.equal(v.secret, secret)
  assert.equal(actInGame(room, 'a', { guess: 10 }).status, 409)
})

test('誰是臥底：只看得到自己的詞，投票、平票重投、揭曉', () => {
  const room = start('undercover', ['a', 'b', 'c', 'd'])
  const { words, spies } = room.play.data
  assert.equal(spies.length, 1)
  assert.equal(new Set(Object.values(words)).size, 2)

  const va = viewOf(room.play, 'a')
  assert.equal(va.myWord, words.a)
  const other = JSON.stringify(va)
  const spyWord = words[spies[0]]
  const civWord = Object.values(words).find((w) => w !== spyWord)
  // 看自己的詞可以，但不能出現「另一個詞」，也不能知道誰是臥底
  const myOther = words.a === spyWord ? civWord : spyWord
  assert.ok(!other.includes(myOther), '不應洩漏另一個詞')
  assert.equal(va.spies, undefined)
  assert.equal(viewOf(room.play, 'zzz').myWord, null)

  assert.equal(actInGame(room, 'a', { kind: 'vote', target: 'b' }).status, 400) // 還沒開始投票
  assert.equal(actInGame(room, 'a', { kind: 'startVote' }).status, 200)
  assert.equal(actInGame(room, 'a', { kind: 'vote', target: 'a' }).status, 400) // 不能投自己

  // 平票（2:2）
  actInGame(room, 'a', { kind: 'vote', target: 'b' })
  actInGame(room, 'b', { kind: 'vote', target: 'a' })
  actInGame(room, 'c', { kind: 'vote', target: 'a' })
  assert.equal(actInGame(room, 'a', { kind: 'vote', target: 'c' }).status, 400) // 已投過
  actInGame(room, 'd', { kind: 'vote', target: 'b' })
  let v = viewOf(room.play, 'a')
  assert.equal(v.phase, 'vote')
  assert.equal(v.ties, 1)
  assert.equal(Object.values(v.voted).some(Boolean), false)

  // 全部投給臥底 → 平民贏（臥底自己要投別人）
  const spy = spies[0]
  for (const p of ['a', 'b', 'c', 'd']) {
    actInGame(room, p, { kind: 'vote', target: p === spy ? (spy === 'a' ? 'b' : 'a') : spy })
  }
  v = viewOf(room.play, 'a')
  assert.equal(v.done, true)
  assert.equal(v.eliminated, spy)
  assert.equal(v.winner, 'civilians')
  assert.deepEqual(v.spies, spies)
})

test('真心話大冒險：抽到的題目大家看到一樣，可以一直抽', () => {
  const room = start('truth', ['a'])
  assert.equal(viewOf(room.play, 'a').card, null)
  assert.equal(actInGame(room, 'a', { kind: 'dare' }).status, 200)
  const c1 = viewOf(room.play, 'a').card
  assert.equal(c1.kind, 'dare')
  assert.deepEqual(viewOf(room.play, 'zzz').card, c1)
  assert.equal(actInGame(room, 'a', { kind: 'truth' }).status, 200)
  assert.equal(viewOf(room.play, 'a').card.n, 2)
  assert.equal(actInGame(room, 'a', { kind: 'x' }).status, 400)
})

test('不在這一局的人不能操作', () => {
  const room = start('rps', ['a', 'b'])
  assert.equal(actInGame(room, 'zzz', { choice: 'rock' }).status, 400)
  assert.equal(actInGame({}, 'a', {}).status, 400)
})

test('每款遊戲都有完整定義', () => {
  for (const [name, g] of Object.entries(GAMES)) {
    for (const k of ['min', 'max', 'init', 'act', 'view']) assert.ok(g[k] !== undefined, `${name}.${k}`)
  }
})
