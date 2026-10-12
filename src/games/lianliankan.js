// 麻將連連看：兩張相同的牌，若能用不超過 2 次轉彎的線連起來（線不能穿過其他牌）就消除。
// grid 是含外圈空白的二維陣列，0 代表空格。

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** 回傳連線經過的格子（含頭尾），不能連則回傳 null */
export function findPath(grid, a, b) {
  if (a.r === b.r && a.c === b.c) return null
  if (!grid[a.r][a.c] || grid[a.r][a.c] !== grid[b.r][b.c]) return null
  const R = grid.length
  const C = grid[0].length
  const best = Array.from({ length: R }, () => Array.from({ length: C }, () => [9, 9, 9, 9]))
  const queue = [{ r: a.r, c: a.c, d: -1, t: 0, path: [{ r: a.r, c: a.c }] }]
  while (queue.length) {
    const cur = queue.shift()
    for (let nd = 0; nd < 4; nd++) {
      const nt = cur.d === -1 || cur.d === nd ? cur.t : cur.t + 1
      if (nt > 2) continue
      const nr = cur.r + DIRS[nd][0]
      const nc = cur.c + DIRS[nd][1]
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue
      if (nr === b.r && nc === b.c) return [...cur.path, { r: nr, c: nc }]
      if (grid[nr][nc] !== 0) continue
      if (best[nr][nc][nd] <= nt) continue
      best[nr][nc][nd] = nt
      queue.push({ r: nr, c: nc, d: nd, t: nt, path: [...cur.path, { r: nr, c: nc }] })
    }
  }
  return null
}

/** 找出盤面上任一可消除的一對，沒有則回傳 null */
export function findAnyPair(grid) {
  const cells = []
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++) if (grid[r][c]) cells.push({ r, c })
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++) {
      const path = findPath(grid, cells[i], cells[j])
      if (path) return { a: cells[i], b: cells[j], path }
    }
  return null
}

export function remaining(grid) {
  return grid.flat().filter(Boolean).length
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** 建立 rows × cols 的盤面（外圈多一格空白）。kinds 種牌，每種 4 張（rows*cols 必須是 4 的倍數） */
export function newBoard(rows, cols, kinds) {
  const tiles = []
  for (let t = 1; t <= kinds; t++) for (let k = 0; k < 4; k++) tiles.push(t)
  const total = rows * cols
  const pool = shuffle(tiles).slice(0, total)
  const grid = Array.from({ length: rows + 2 }, () => Array(cols + 2).fill(0))
  let i = 0
  for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) grid[r][c] = pool[i++]
  return grid
}

/** 把剩下的牌重新洗牌（位置打亂），並確保至少有一對可消除 */
export function reshuffle(grid) {
  const pos = []
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++) if (grid[r][c]) pos.push({ r, c })
  const values = pos.map((p) => grid[p.r][p.c])
  for (let tries = 0; tries < 50; tries++) {
    shuffle(values)
    const next = grid.map((row) => row.map(() => 0))
    pos.forEach((p, i) => (next[p.r][p.c] = values[i]))
    if (pos.length === 0 || findAnyPair(next)) return next
  }
  return grid
}
