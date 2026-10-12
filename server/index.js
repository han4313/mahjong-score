// 麻將記分的房號同步伺服器（無外部套件）
// 房號 = 一份共用的牌局（8 碼隨機）。知道房號的人都能讀寫，所以房號不要亂貼。
// 放到 Render 等代理後面時設 TRUST_PROXY=1（Render 會自動偵測），限流才會用真實 IP。
//   POST /api/rooms            建立房間 { game }            -> { code, rev }
//   GET  /api/rooms/:code?rev= 取得房間（rev 相同回 changed:false）
//   PUT  /api/rooms/:code      更新 { baseRev, game }       -> { rev } 或 409 + 最新內容
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { GAMES, viewOf, startGame, actInGame } from './games.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(here, '..', 'dist')
const DATA_DIR = process.env.DATA_DIR || path.join(here, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'rooms.json')
const PORT = Number(process.env.PORT) || 3001
const MAX_BODY = 512 * 1024
const MAX_ROOMS = 3000
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || Boolean(process.env.RENDER) // 在 Render 等代理後面時，真實 IP 在 X-Forwarded-For
const ROOM_TTL_MS = 60 * 24 * 3600 * 1000
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

// ---- 儲存 ----
let rooms = {}
try {
  rooms = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
} catch {
  rooms = {}
}

let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      const tmp = DATA_FILE + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(rooms))
      fs.renameSync(tmp, DATA_FILE)
    } catch (e) {
      console.error('儲存失敗', e)
    }
  }, 500)
}

function cleanup() {
  const now = Date.now()
  let removed = 0
  for (const [code, r] of Object.entries(rooms)) {
    if (now - r.updatedAt > ROOM_TTL_MS) {
      delete rooms[code]
      removed++
    }
  }
  if (removed) scheduleSave()
}
cleanup()
setInterval(cleanup, 6 * 3600 * 1000).unref()

function newCode() {
  for (;;) {
    let c = ''
    for (let i = 0; i < 8; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]
    if (!rooms[c]) return c
  }
}

// ---- 驗證 ----
function validGame(g) {
  return (
    g &&
    typeof g === 'object' &&
    typeof g.name === 'string' &&
    g.settings && typeof g.settings === 'object' &&
    Array.isArray(g.players) && g.players.length <= 30 &&
    Array.isArray(g.seats) && g.seats.length <= 8 &&
    Array.isArray(g.hands) && g.hands.length <= 3000
  )
}

// ---- 簡單限流（防止暴力猜房號）----
const hits = new Map()
function limited(ip, cost = 1) {
  const now = Date.now()
  let h = hits.get(ip)
  if (!h || now > h.reset) h = { n: 0, reset: now + 60_000 }
  h.n += cost
  hits.set(ip, h)
  return h.n > 600 // 同一個 Wi-Fi 的一桌人會共用 IP，所以抓寬一點
}
// 限制每個 IP 每小時能建幾個房間，避免被灌爆
const created = new Map()
function createLimited(ip) {
  const now = Date.now()
  let c = created.get(ip)
  if (!c || now > c.reset) c = { n: 0, reset: now + 3600_000 }
  c.n += 1
  created.set(ip, c)
  return c.n > 30
}
setInterval(() => {
  hits.clear()
  created.clear()
}, 60 * 60_000).unref()

// 放在代理（Render、Cloudflare）後面時，socket 看到的都是代理的 IP，要改讀 X-Forwarded-For 最後一段
function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',')
    const last = xff[xff.length - 1].trim()
    if (last) return last
  }
  return req.socket.remoteAddress || 'x'
}

// ---- HTTP ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
}

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'))
      } catch {
        reject(new Error('bad json'))
      }
    })
    req.on('error', reject)
  })
}

// ---- 朋友一起玩的小遊戲（規則在 games.js）----
async function handlePlay(req, res, room, url) {
  // 舊版留下、格式不同的遊戲狀態直接丟掉
  if (room.play && !GAMES[room.play.type]) room.play = null

  if (req.method === 'GET') return send(res, 200, viewOf(room.play, url.searchParams.get('pid')))
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })

  const body = await readBody(req)
  if (body?.action === 'new') {
    const error = startGame(room, body)
    if (error) return send(res, 400, { error })
  } else if (body?.action === 'act') {
    const r = actInGame(room, body.pid, body)
    if (r.error) return send(res, r.status, { error: r.error, ...viewOf(room.play, body.pid) })
  } else {
    return send(res, 400, { error: '未知的動作' })
  }
  room.updatedAt = Date.now()
  scheduleSave()
  return send(res, 200, viewOf(room.play, body.pid))
}

async function handleApi(req, res, url) {
  const ip = clientIp(req)
  if (limited(ip)) return send(res, 429, { error: '請求太頻繁，請稍後再試' })

  const m = url.pathname.match(/^\/api\/rooms(?:\/([A-Za-z0-9]{4,8})(\/play)?)?$/)
  if (!m) return send(res, 404, { error: 'not found' })
  const code = m[1]?.toUpperCase()
  const isPlay = Boolean(m[2])

  try {
    if (req.method === 'POST' && !code) {
      const body = await readBody(req)
      if (!validGame(body?.game)) return send(res, 400, { error: '資料格式錯誤' })
      if (createLimited(ip)) return send(res, 429, { error: '建立房間太頻繁，請稍後再試' })
      if (Object.keys(rooms).length >= MAX_ROOMS) return send(res, 503, { error: '伺服器房間已滿' })
      // 伺服器重啟、資料遺失時，原本的房間可以用同一個房號重建（只接受沒人用的 8 碼房號）
      const want = typeof body.restore === 'string' ? body.restore.toUpperCase() : ''
      if (want && (!/^[A-Z0-9]{8}$/.test(want) || rooms[want])) return send(res, 409, { error: '房號無法重建' })
      const c = want || newCode()
      rooms[c] = { rev: 1, game: body.game, updatedAt: Date.now() }
      scheduleSave()
      return send(res, 200, { code: c, rev: 1 })
    }

    if (!code) return send(res, 405, { error: 'method not allowed' })
    const room = rooms[code]
    if (!room) {
      limited(ip, 10) // 猜錯房號加重計數
      return send(res, 404, { error: '找不到這個房號' })
    }

    if (isPlay) return await handlePlay(req, res, room, url)

    if (req.method === 'GET') {
      const rev = Number(url.searchParams.get('rev'))
      if (rev === room.rev) return send(res, 200, { changed: false, rev: room.rev })
      return send(res, 200, { changed: true, rev: room.rev, game: room.game })
    }

    if (req.method === 'PUT') {
      const body = await readBody(req)
      if (!validGame(body?.game)) return send(res, 400, { error: '資料格式錯誤' })
      if (body.baseRev !== room.rev) return send(res, 409, { rev: room.rev, game: room.game })
      room.rev += 1
      room.game = body.game
      room.updatedAt = Date.now()
      scheduleSave()
      return send(res, 200, { rev: room.rev })
    }

    return send(res, 405, { error: 'method not allowed' })
  } catch (e) {
    return send(res, e.message === 'too large' ? 413 : 400, { error: e.message })
  }
}

function serveStatic(req, res, url) {
  let rel
  try {
    rel = decodeURIComponent(url.pathname)
  } catch {
    res.writeHead(400).end()
    return
  }
  if (rel.endsWith('/')) rel += 'index.html'
  const file = path.resolve(DIST, '.' + rel)
  if (!file.startsWith(DIST + path.sep)) {
    res.writeHead(403).end()
    return
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found（請先執行 npm run build）')
      return
    }
    // dist/assets 的檔名帶雜湊，可以長期快取；其他（index.html）每次都重新檢查
    const hashed = rel.startsWith('/assets/')
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      ...SECURITY,
    })
    res.end(data)
  })
}

const server = http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/healthz') return send(res, 200, { ok: true })
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url)
    return serveStatic(req, res, url)
  })
  .listen(PORT, '0.0.0.0', () => console.log(`麻將伺服器已啟動：http://localhost:${PORT}`))

// 平台重啟或關機時，先把還沒寫入的資料存起來
function shutdown() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(rooms))
  } catch (e) {
    console.error('關機前儲存失敗', e)
  }
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)