// PBS demo API. Plain Node, no packages: node:http + node:sqlite.
// Run: npm run server   (PORT, DB_PATH, ALLOWED_ORIGINS can be set in the environment)
// The matching logic is the same file the site uses: src/lib/matching.js.

import { createServer } from 'node:http'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { openDb, loadJson, seedGenerated } from './db.js'
import { rankSearch, daySlots, checkSlot } from '../src/lib/matching.js'
import { setRequestLang, t } from '../src/lib/i18n.js'
import { addDays, toMin } from '../src/lib/time.js'

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1' // only localhost: Tailscale Funnel forwards to it
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://overbivskyi.github.io,http://localhost:5173,http://localhost:5174,http://localhost:4173').split(',')
const MAX_BODY = 12 * 1024 * 1024 // profile photos travel as data URLs

const styles = loadJson('styles')
const travel = loadJson('travel')
const db = openDb()
if (db.prepare('SELECT COUNT(*) AS n FROM photographers').get().n === 0) {
  console.log('Empty database, loading demo data:', seedGenerated(db))
}

// ---------- helpers ----------

class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    Object.assign(this, { status, code, extra })
  }
}
const fail = (status, code, message, extra) => { throw new HttpError(status, code, message, extra) }

const parse = (row) => (row ? JSON.parse(row.data) : null)
const newId = (prefix) => prefix + randomBytes(5).toString('hex')

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(password, salt, 32)
  return a.length === b.length && timingSafeEqual(a, b)
}

const publicUser = (u) => u && ({
  id: u.id, role: u.role, firstName: u.first_name, lastName: u.last_name, email: u.email,
  phone: u.phone, photographerId: u.photographer_id, userType: u.user_type,
})

function authUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  if (!m) return null
  return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(m[1]) ?? null
}
function newSession(userId) {
  const token = randomBytes(24).toString('base64url')
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId)
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

function getPhotographer(id) {
  return parse(db.prepare('SELECT data FROM photographers WHERE id = ?').get(id)) ?? fail(404, 'not_found', 'Photographer not found')
}
function savePhotographer(p) {
  db.prepare('UPDATE photographers SET data = ? WHERE id = ?').run(JSON.stringify(p), p.id)
}
const allPhotographers = () => db.prepare('SELECT data FROM photographers ORDER BY id').all().map(parse)
const eventsOf = (id, date) => (date
  ? db.prepare('SELECT data FROM events WHERE photographer_id = ? AND date = ?').all(id, date)
  : db.prepare('SELECT data FROM events WHERE photographer_id = ?').all(id)).map(parse)
const allEvents = () => db.prepare('SELECT data FROM events').all().map(parse)

// Only time, place and kind leave the server for the public; client details stay private.
const busyOnly = (e) => ({ id: e.id, kind: e.kind, photographerId: e.photographerId, date: e.date, start: e.start, duration: e.duration, area: e.area })

const req_ = (body, keys) => {
  for (const k of keys) if (body[k] === undefined || body[k] === '') fail(400, 'bad_request', `Missing field: ${k}`)
}

// ---------- routes ----------

const routes = []
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler })

route('GET', '/api/health', () => ({ ok: true }))

// accounts
route('POST', '/api/auth/signup', ({ body }) => {
  req_(body, ['role', 'firstName', 'lastName', 'email', 'phone', 'password'])
  if (!['client', 'photographer'].includes(body.role)) fail(400, 'bad_request', 'Wrong role')
  if (String(body.password).length < 8) fail(400, 'bad_request', 'Use at least 8 characters')
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(body.email)) fail(409, 'email_used', 'This email already has an account')
  const id = newId('u')
  let photographerId = null
  db.exec('BEGIN')
  try {
    if (body.role === 'photographer') {
      photographerId = newId('t')
      const p = {
        id: photographerId, userType: 'tester', firstName: body.firstName, lastName: body.lastName, photo: null, portfolio: [],
        styles: [], homeArea: loadJson('areas')[0].id, pricePerHour: 1000, rating: 0, completedShoots: 0, about: '', skills: [], gear: [],
        rules: { breakMin: 30, minShoot: 30, maxShoot: 180, maxPerDay: 480, maxTravelMin: 40, transport: 'car' },
        profileDone: false, rulesDone: false, calendarConnected: false,
      }
      db.prepare('INSERT INTO photographers (id, user_type, data) VALUES (?, ?, ?)').run(photographerId, 'tester', JSON.stringify(p))
    }
    db.prepare(`INSERT INTO users (id, role, first_name, last_name, email, phone, password_hash, photographer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, body.role, body.firstName, body.lastName, body.email, body.phone, hashPassword(body.password), photographerId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  return { token: newSession(id), user: publicUser(user) }
})

route('POST', '/api/auth/login', ({ body }) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email ?? '')
  if (!user || !checkPassword(String(body.password ?? ''), user.password_hash)) fail(401, 'wrong_login', 'Wrong email or password')
  return { token: newSession(user.id), user: publicUser(user) }
})

route('POST', '/api/auth/logout', ({ req }) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  if (m) db.prepare('DELETE FROM sessions WHERE token = ?').run(m[1])
  return { ok: true }
})

route('GET', '/api/auth/me', ({ req }) => ({ user: publicUser(authUser(req)) }))

// photographers
route('GET', '/api/photographers', () => allPhotographers())
route('GET', '/api/photographers/:id', ({ params }) => getPhotographer(params.id))
route('GET', '/api/photographers/:id/reviews', ({ params }) =>
  db.prepare('SELECT data FROM reviews WHERE photographer_id = ?').all(params.id).map(parse)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))

// full calendar with client details: only for the photographer and the team
route('GET', '/api/photographers/:id/events', ({ req, params }) => {
  requireEditor(req, params.id)
  return eventsOf(params.id).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
})

route('PUT', '/api/photographers/:id/rules', ({ req, params, body }) => {
  requireEditor(req, params.id)
  const p = getPhotographer(params.id)
  const r = body.rules ?? {}
  if (r.minShoot < 15 || r.minShoot > r.maxShoot || r.maxShoot > r.maxPerDay) fail(400, 'bad_request', 'Rules are not valid')
  if (!Array.isArray(body.styles) || body.styles.length === 0) fail(400, 'bad_request', 'Choose at least one style')
  Object.assign(p, { rules: { ...p.rules, ...r }, pricePerHour: Number(body.pricePerHour), styles: body.styles, homeArea: body.homeArea, rulesDone: true })
  savePhotographer(p)
  return p
})

route('PUT', '/api/photographers/:id/profile', ({ req, params, body }) => {
  requireEditor(req, params.id)
  const p = getPhotographer(params.id)
  if (!String(body.firstName ?? '').trim()) fail(400, 'bad_request', 'Fill in this field')
  if (!Array.isArray(body.portfolio) || body.portfolio.length < 3 || body.portfolio.length > 12) fail(400, 'bad_request', 'Add at least 3 photos')
  for (const k of ['photo', 'firstName', 'lastName', 'about', 'skills', 'gear', 'portfolio']) if (k in body) p[k] = body[k]
  p.profileDone = true
  savePhotographer(p)
  return p
})

route('PUT', '/api/photographers/:id/calendar', ({ req, params, body }) => {
  requireEditor(req, params.id)
  const p = getPhotographer(params.id)
  p.calendarConnected = !!body.connected
  savePhotographer(p)
  return p
})

// search and availability
route('POST', '/api/search', ({ body }) => {
  const photographers = allPhotographers().filter((p) => p.profileDone && p.rulesDone)
  return rankSearch({ photographers, events: allEvents(), search: body, styles, travel })
})

route('POST', '/api/photographers/:id/week', ({ params, body }) => {
  const p = getPhotographer(params.id)
  const events = eventsOf(p.id)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(body.from, i)
    const dayEvents = events.filter((e) => e.date === date)
    const slots = daySlots({ photographer: p, events: dayEvents, duration: body.duration, area: body.area, travel, step: body.step ?? 30 })
    if (body.extra && !slots.some((x) => x.time === body.extra)) {
      const start = toMin(body.extra)
      slots.push({ start, time: body.extra, ...checkSlot({ photographer: p, events: dayEvents, start, duration: body.duration, area: body.area, travel }) })
      slots.sort((a, b) => a.start - b.start)
    }
    return { date, slots }
  })
})

route('POST', '/api/photographers/:id/nearest', ({ params, body }) => {
  const p = getPhotographer(params.id)
  return daySlots({ photographer: p, events: eventsOf(p.id, body.date), duration: body.duration, area: body.area, travel })
    .filter((s) => s.ok)
    .sort((a, b) => Math.abs(a.start - body.start) - Math.abs(b.start - body.start))
    .slice(0, body.count ?? 3)
    .sort((a, b) => a.start - b.start)
})

// bookings
route('POST', '/api/bookings', ({ req, body }) => {
  const user = requireUser(req)
  req_(body, ['photographerId', 'date', 'start', 'duration', 'area', 'address'])
  const p = getPhotographer(body.photographerId)
  // check the slot again and save in one transaction, so two clients cannot take the same time
  db.exec('BEGIN IMMEDIATE')
  try {
    const check = checkSlot({ photographer: p, events: eventsOf(p.id, body.date), start: body.start, duration: body.duration, area: body.area, travel })
    if (!check.ok) fail(409, 'slot_taken', 'This time is no longer free', { reason: check.reason })
    const total = Math.round((p.pricePerHour * body.duration) / 60)
    const booking = {
      id: newId('b'), kind: 'booking', source: 'tester', status: 'confirmed', createdAt: new Date().toISOString(),
      photographerId: p.id, date: body.date, start: body.start, duration: body.duration, area: body.area,
      address: body.address, style: body.style, note: body.note ?? '',
      clientName: body.clientName, clientFullName: body.clientFullName, clientPhone: body.clientPhone, clientEmail: body.clientEmail,
      clientUserId: user.id, total, deposit: Math.round(total * 0.3),
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
  const row = db.prepare('SELECT data FROM events WHERE id = ? AND kind = ?').get(params.id, 'booking')
  const b = parse(row) ?? fail(404, 'not_found', 'Booking not found')
  if (user.role !== 'team' && b.clientUserId !== user.id && user.photographer_id !== b.photographerId) fail(403, 'forbidden', 'Not your booking')
  return b
})

// public calendar of one photographer without client details (used by nothing yet, handy for debugging)
route('GET', '/api/photographers/:id/busy', ({ params }) => eventsOf(params.id).map(busyOnly))

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) reject(new HttpError(413, 'too_large', 'Request is too large'))
      else chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new HttpError(400, 'bad_json', 'Body is not JSON'))
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const url = new URL(req.url, 'http://x')
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
  }
  try {
    const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname))
    if (!r) return send(404, { code: 'not_found', message: 'No such endpoint' })
    const body = req.method === 'GET' ? {} : await readBody(req)
    setRequestLang(req.headers['x-lang']) // reason texts in the visitor's language
    const data = r.handler({ req, body, params: url.pathname.match(r.re).groups ?? {} })
    send(200, data)
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { code: e.code, message: t(e.message), ...e.extra })
    console.error(e)
    send(500, { code: 'server_error', message: 'Server error' })
  }
})

server.listen(PORT, HOST, () => console.log(`PBS API on http://${HOST}:${PORT} (db: ${process.env.DB_PATH || 'server/data/pbs.sqlite'})`))
