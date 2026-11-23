// PBS demo API. Plain Node, no packages: node:http + node:sqlite.
// Run: npm run server   (PORT, HOST, DB_PATH, ALLOWED_ORIGINS can be set in the environment)
// The matching logic is the same file the site uses: src/lib/matching.js.
// Security: every input is checked in server/security.js, requests are rate limited,
// passwords use scrypt, session tokens are stored only as SHA-256 hashes and expire.

import { createServer } from 'node:http'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { openDb, loadJson, seedGenerated } from './db.js'
import { rankSearch, daySlots, checkSlot } from '../src/lib/matching.js'
import { setRequestLang, t } from '../src/lib/i18n.js'
import { addDays, toMin } from '../src/lib/time.js'
import {
  HttpError, fail, clientIp, limit, isLimited, securityHeaders,
  text, int, oneOf, email, phone, password, date, hhmm, area, style, styleList, id, minutesOfDay, duration, imageSrc,
} from './security.js'

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1' // only localhost: Tailscale Funnel forwards to it
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://overbivskyi.github.io,http://localhost:5173,http://localhost:5174,http://localhost:4173').split(',')
const MAX_BODY = 32 * 1024 // normal requests
const MAX_PROFILE_BODY = 9 * 1024 * 1024 // profile with up to 13 photos
const SESSION_DAYS = 14
const MAX_SESSIONS_PER_USER = 10

const styles = loadJson('styles')
const travel = loadJson('travel')
const firstArea = loadJson('areas')[0].id
const db = openDb()
if (db.prepare('SELECT COUNT(*) AS n FROM photographers').get().n === 0) {
  console.log('Empty database, loading demo data:', seedGenerated(db))
}

// ---------- helpers ----------

const parse = (row) => (row ? JSON.parse(row.data) : null)
const newId = (prefix) => prefix + randomBytes(5).toString('hex')
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`
}
// Same work for unknown emails, so response time does not tell which emails have accounts.
const DUMMY_HASH = hashPassword(randomBytes(12).toString('hex'))
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':')
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(pw, salt, 32)
  return a.length === b.length && timingSafeEqual(a, b)
}

const publicUser = (u) => u && ({
  id: u.id, role: u.role, firstName: u.first_name, lastName: u.last_name, email: u.email,
  phone: u.phone, photographerId: u.photographer_id, userType: u.user_type,
})

// Sessions: the browser keeps the token, the database keeps only its hash.
// Older plain tokens are converted once on start.
for (const s of db.prepare('SELECT token FROM sessions WHERE length(token) <> 64').all()) {
  db.prepare('UPDATE sessions SET token = ? WHERE token = ?').run(sha256(s.token), s.token)
}
db.prepare(`DELETE FROM sessions WHERE created_at < datetime('now', ?)`).run(`-${SESSION_DAYS} days`)

function bearer(req) {
  const m = /^Bearer ([A-Za-z0-9_-]{20,64})$/.exec(req.headers.authorization || '')
  return m ? m[1] : null
}
function authUser(req) {
  const token = bearer(req)
  if (!token) return null
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.created_at > datetime('now', ?)`).get(sha256(token), `-${SESSION_DAYS} days`) ?? null
}
function newSession(userId) {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(sha256(token), userId)
  // keep only the newest sessions of this user
  db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token NOT IN
    (SELECT token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)`).run(userId, userId, MAX_SESSIONS_PER_USER)
  return token
}
function requireUser(req) {
  return authUser(req) ?? fail(401, 'unauthorized', 'Log in to continue')
}
// The photographer themself, or a team account (spec section 3, role switch).
function requireEditor(req, photographerId) {
  const u = requireUser(req)
  if (u.role === 'team' || u.photographer_id === photographerId) return u
  fail(403, 'forbidden', 'You cannot change this photographer')
}

function getPhotographer(pid) {
  id(pid, 'photographer')
  return parse(db.prepare('SELECT data FROM photographers WHERE id = ?').get(pid)) ?? fail(404, 'not_found', 'Photographer not found')
}
function savePhotographer(p) {
  db.prepare('UPDATE photographers SET data = ? WHERE id = ?').run(JSON.stringify(p), p.id)
}
const allPhotographers = () => db.prepare('SELECT data FROM photographers ORDER BY id').all().map(parse)
const eventsOf = (pid, day) => (day
  ? db.prepare('SELECT data FROM events WHERE photographer_id = ? AND date = ?').all(pid, day)
  : db.prepare('SELECT data FROM events WHERE photographer_id = ?').all(pid)).map(parse)
const allEvents = () => db.prepare('SELECT data FROM events').all().map(parse)

// ---------- routes ----------

const routes = []
const route = (method, pattern, handler, opts = {}) =>
  routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler, ...opts })

route('GET', '/api/health', () => ({ ok: true }))

// accounts
route('POST', '/api/auth/signup', ({ body, ip }) => {
  limit(`signup:${ip}`, 10, 60 * 60_000)
  const role = oneOf(body.role, 'role', ['client', 'photographer'])
  const firstName = text(body.firstName, 'firstName', { min: 1, max: 60 })
  const lastName = text(body.lastName, 'lastName', { min: 1, max: 60 })
  const mail = email(body.email)
  const tel = phone(body.phone)
  const pw = password(body.password)
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail)) fail(409, 'email_used', 'This email already has an account')
  const uid = newId('u')
  let photographerId = null
  db.exec('BEGIN')
  try {
    if (role === 'photographer') {
      photographerId = newId('t')
      const p = {
        id: photographerId, userType: 'tester', firstName, lastName, photo: null, portfolio: [],
        styles: [], homeArea: firstArea, pricePerHour: 1000, rating: 0, completedShoots: 0, about: '', skills: [], gear: [],
        rules: { breakMin: 30, minShoot: 30, maxShoot: 180, maxPerDay: 480, maxTravelMin: 40, transport: 'car' },
        profileDone: false, rulesDone: false, calendarConnected: false,
      }
      db.prepare('INSERT INTO photographers (id, user_type, data) VALUES (?, ?, ?)').run(photographerId, 'tester', JSON.stringify(p))
    }
    db.prepare(`INSERT INTO users (id, role, first_name, last_name, email, phone, password_hash, photographer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, role, firstName, lastName, mail, tel, hashPassword(pw), photographerId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid)
  return { token: newSession(uid), user: publicUser(user) }
})

route('POST', '/api/auth/login', ({ body, ip }) => {
  limit(`login-ip:${ip}`, 20, 15 * 60_000)
  const mail = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  const pw = typeof body.password === 'string' ? body.password.slice(0, 128) : ''
  // too many wrong passwords for one account: wait, whoever tries
  if (isLimited(`login-fail:${mail}`, 8)) fail(429, 'too_many_requests', 'Too many attempts. Try again later.')
  const user = mail ? db.prepare('SELECT * FROM users WHERE email = ?').get(mail) : null
  const ok = checkPassword(pw, user ? user.password_hash : DUMMY_HASH) && !!user
  if (!ok) {
    try { limit(`login-fail:${mail}`, 8, 15 * 60_000) } catch { /* the next attempt is refused */ }
    fail(401, 'wrong_login', 'Wrong email or password')
  }
  return { token: newSession(user.id), user: publicUser(user) }
})

route('POST', '/api/auth/logout', ({ req }) => {
  const token = bearer(req)
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(sha256(token))
  return { ok: true }
})

route('GET', '/api/auth/me', ({ req }) => ({ user: publicUser(authUser(req)) }))

// photographers
route('GET', '/api/photographers', () => allPhotographers())
route('GET', '/api/photographers/:id', ({ params }) => getPhotographer(params.id))
route('GET', '/api/photographers/:id/reviews', ({ params }) =>
  db.prepare('SELECT data FROM reviews WHERE photographer_id = ?').all(id(params.id, 'photographer')).map(parse)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))

// full calendar with client details: only for the photographer and the team
route('GET', '/api/photographers/:id/events', ({ req, params }) => {
  requireEditor(req, id(params.id, 'photographer'))
  return eventsOf(params.id).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
})

const BREAKS = [0, 15, 30, 45, 60, 90]
const TRANSPORT = ['walking', 'public', 'car']

route('PUT', '/api/photographers/:id/rules', ({ req, params, body, user }) => {
  requireEditor(req, params.id)
  limit(`write:${user.id}`, 120, 60 * 60_000)
  const p = getPhotographer(params.id)
  const r = body.rules ?? {}
  const rules = {
    breakMin: oneOf(r.breakMin, 'breakMin', BREAKS),
    minShoot: int(r.minShoot, 'minShoot', { min: 15, max: 480 }),
    maxShoot: int(r.maxShoot, 'maxShoot', { min: 15, max: 480 }),
    maxPerDay: int(r.maxPerDay, 'maxPerDay', { min: 15, max: 720 }),
    maxTravelMin: int(r.maxTravelMin, 'maxTravelMin', { min: 10, max: 180 }),
    transport: oneOf(r.transport ?? 'car', 'transport', TRANSPORT),
  }
  if (rules.minShoot > rules.maxShoot || rules.maxShoot > rules.maxPerDay) fail(400, 'bad_request', 'Rules are not valid')
  Object.assign(p, {
    rules,
    pricePerHour: int(body.pricePerHour, 'pricePerHour', { min: 100, max: 100_000 }),
    styles: styleList(body.styles, 'styles', { min: 1, max: styles.length }),
    homeArea: area(body.homeArea),
    rulesDone: true,
  })
  savePhotographer(p)
  return p
})

route('PUT', '/api/photographers/:id/profile', ({ req, params, body, user }) => {
  requireEditor(req, params.id)
  limit(`write:${user.id}`, 120, 60 * 60_000)
  const p = getPhotographer(params.id)
  if (!Array.isArray(body.portfolio) || body.portfolio.length < 3 || body.portfolio.length > 12) fail(400, 'bad_request', 'Add at least 3 photos')
  const list = (v, name, maxItems, maxLen) => {
    if (!Array.isArray(v) || v.length > maxItems) fail(400, 'bad_request', `Wrong value: ${name}`)
    return v.map((x) => text(x, name, { min: 1, max: maxLen }))
  }
  Object.assign(p, {
    photo: imageSrc(body.photo, 'photo'),
    firstName: text(body.firstName, 'firstName', { min: 1, max: 60 }),
    lastName: text(body.lastName, 'lastName', { max: 60 }),
    about: text(body.about, 'about', { max: 400, multiline: true }),
    skills: list(body.skills ?? [], 'skills', 15, 40),
    gear: list(body.gear ?? [], 'gear', 20, 80),
    portfolio: body.portfolio.map((ph, i) => ({
      id: typeof ph?.id === 'string' && /^[\w-]{1,80}$/.test(ph.id) ? ph.id : `${p.id}-${i}`,
      src: imageSrc(ph?.src, 'portfolio'),
      ...(ph?.style ? { style: style(ph.style) } : {}),
    })),
    profileDone: true,
  })
  savePhotographer(p)
  return p
}, { maxBody: MAX_PROFILE_BODY })

route('PUT', '/api/photographers/:id/calendar', ({ req, params, body }) => {
  requireEditor(req, params.id)
  const p = getPhotographer(params.id)
  p.calendarConnected = body.connected === true
  savePhotographer(p)
  return p
})

// search and availability
route('POST', '/api/search', ({ body }) => {
  const search = {
    styles: styleList(body.styles, 'styles', { min: 1, max: 3 }),
    area: area(body.area),
    date: date(body.date),
    start: minutesOfDay(body.start, 'start'),
    duration: duration(body.duration),
    budget: int(body.budget, 'budget', { min: 0, max: 1_000_000 }),
  }
  const photographers = allPhotographers().filter((p) => p.profileDone && p.rulesDone)
  return rankSearch({ photographers, events: allEvents(), search, styles, travel })
})

route('POST', '/api/photographers/:id/week', ({ params, body }) => {
  const p = getPhotographer(params.id)
  const from = date(body.from, 'from')
  const dur = duration(body.duration)
  const where = area(body.area)
  const step = oneOf(body.step ?? 30, 'step', [15, 30, 60])
  const extra = body.extra == null ? null : hhmm(body.extra, 'extra')
  const events = eventsOf(p.id)
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(from, i)
    const dayEvents = events.filter((e) => e.date === day)
    const slots = daySlots({ photographer: p, events: dayEvents, duration: dur, area: where, travel, step })
    if (extra && !slots.some((x) => x.time === extra)) {
      const start = toMin(extra)
      slots.push({ start, time: extra, ...checkSlot({ photographer: p, events: dayEvents, start, duration: dur, area: where, travel }) })
      slots.sort((a, b) => a.start - b.start)
    }
    return { date: day, slots }
  })
})

route('POST', '/api/photographers/:id/nearest', ({ params, body }) => {
  const p = getPhotographer(params.id)
  const start = minutesOfDay(body.start, 'start')
  return daySlots({ photographer: p, events: eventsOf(p.id, date(body.date)), duration: duration(body.duration), area: area(body.area), travel })
    .filter((s) => s.ok)
    .sort((a, b) => Math.abs(a.start - start) - Math.abs(b.start - start))
    .slice(0, int(body.count ?? 3, 'count', { min: 1, max: 10 }))
    .sort((a, b) => a.start - b.start)
})

// bookings
route('POST', '/api/bookings', ({ req, body }) => {
  const user = requireUser(req)
  limit(`booking:${user.id}`, 20, 60 * 60_000)
  const p = getPhotographer(body.photographerId)
  const input = {
    date: date(body.date),
    start: minutesOfDay(body.start, 'start'),
    duration: duration(body.duration),
    area: area(body.area),
    address: text(body.address, 'address', { min: 1, max: 200 }),
    style: body.style ? style(body.style) : p.styles[0] ?? null,
    note: text(body.note, 'note', { max: 1000, multiline: true }),
    clientName: text(body.clientName, 'clientName', { min: 1, max: 60 }),
    clientFullName: text(body.clientFullName ?? body.clientName, 'clientFullName', { min: 1, max: 120 }),
    clientPhone: body.clientPhone ? phone(body.clientPhone, 'clientPhone') : user.phone,
    clientEmail: body.clientEmail ? email(body.clientEmail) : user.email,
  }
  // check the slot again and save in one transaction, so two clients cannot take the same time
  db.exec('BEGIN IMMEDIATE')
  try {
    const check = checkSlot({ photographer: p, events: eventsOf(p.id, input.date), start: input.start, duration: input.duration, area: input.area, travel })
    if (!check.ok) fail(409, 'slot_taken', 'This time is no longer free', { reason: check.reason })
    const total = Math.round((p.pricePerHour * input.duration) / 60) // price comes from the server, never from the browser
    const booking = {
      id: newId('b'), kind: 'booking', source: 'tester', status: 'confirmed', createdAt: new Date().toISOString(),
      photographerId: p.id, ...input, clientUserId: user.id, total, deposit: Math.round(total * 0.3),
    }
    db.prepare('INSERT INTO events (id, photographer_id, date, kind, source, client_user_id, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(booking.id, p.id, booking.date, 'booking', 'tester', user.id, JSON.stringify(booking))
    db.exec('COMMIT')
    return booking
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
})

route('GET', '/api/bookings/:id', ({ req, params }) => {
  const user = requireUser(req)
  const row = db.prepare('SELECT data FROM events WHERE id = ? AND kind = ?').get(id(params.id, 'booking'), 'booking')
  const b = parse(row) ?? fail(404, 'not_found', 'Booking not found')
  // same answer for "not yours" and "does not exist", so ids cannot be probed
  if (user.role !== 'team' && b.clientUserId !== user.id && user.photographer_id !== b.photographerId) fail(404, 'not_found', 'Booking not found')
  return b
})

// ---------- server ----------

function cors(req, res) {
  const origin = req.headers.origin
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lang')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    res.setHeader('Access-Control-Max-Age', '600')
    // On machines inside the tailnet the API name resolves to a private 100.x address;
    // Chrome then asks the server to allow a public site to reach the private network.
    if (req.headers['access-control-request-private-network'] === 'true') {
      res.setHeader('Access-Control-Allow-Private-Network', 'true')
    }
  }
}

function readBody(req, maxBody) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/.test(req.headers['content-type'] || '')) {
      req.resume()
      return reject(new HttpError(415, 'bad_type', 'Send JSON'))
    }
    if (Number(req.headers['content-length'] || 0) > maxBody) {
      req.resume()
      return reject(new HttpError(413, 'too_large', 'Request is too large'))
    }
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > maxBody) {
        req.destroy()
        reject(new HttpError(413, 'too_large', 'Request is too large'))
      } else chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object')
        resolve(data)
      } catch {
        reject(new HttpError(400, 'bad_json', 'Body is not JSON'))
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  securityHeaders(res)
  cors(req, res)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const send = (status, data, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
    res.end(JSON.stringify(data))
  }
  // requests from other websites are refused (browsers send Origin on cross-site requests)
  if (req.headers.origin && !ORIGINS.includes(req.headers.origin)) return send(403, { code: 'forbidden', message: 'Origin not allowed' })
  const ip = clientIp(req)
  try {
    limit(`all:${ip}`, 300, 60_000)
    const url = new URL(req.url, 'http://x')
    if (url.pathname.length > 200) fail(404, 'not_found', 'No such endpoint')
    const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname))
    if (!r) fail(404, 'not_found', 'No such endpoint')
    const body = req.method === 'GET' ? {} : await readBody(req, r.maxBody ?? MAX_BODY)
    setRequestLang(req.headers['x-lang']) // reason texts in the visitor's language
    let params
    try {
      params = Object.fromEntries(Object.entries(url.pathname.match(r.re).groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)]))
    } catch {
      fail(404, 'not_found', 'No such endpoint')
    }
    const user = req.method === 'PUT' ? authUser(req) : null
    send(200, r.handler({ req, body, params, ip, user }))
  } catch (e) {
    if (e instanceof HttpError) {
      return send(e.status, { code: e.code, message: t(e.message), ...e.extra }, e.status === 429 ? { 'Retry-After': String(e.extra.retryAfter ?? 60) } : {})
    }
    console.error(e)
    send(500, { code: 'server_error', message: 'Server error' })
  }
})

// slow or stuck connections are closed
server.requestTimeout = 30_000
server.headersTimeout = 15_000
server.keepAliveTimeout = 5_000
server.maxHeadersCount = 50

server.listen(PORT, HOST, () => console.log(`PBS API on http://${HOST}:${PORT} (db: ${process.env.DB_PATH || 'server/data/pbs.sqlite'})`))
