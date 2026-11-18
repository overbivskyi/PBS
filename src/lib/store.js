// Data layer for the demo. It works in two modes:
// - Server mode (VITE_API_URL is set at build time): everything goes to the team's API (server/).
// - Browser mode (no VITE_API_URL): the generated data comes from src/data/*.json and anything
//   created in the demo is kept in this browser's localStorage.
// The pages call the same functions in both modes.

import areas from '../data/areas.json'
import styles from '../data/styles.json'
import travel from '../data/travel.json'
import meta from '../data/meta.json'
import seedPhotographers from '../data/photographers.json'
import seedEvents from '../data/events.json'
import seedReviews from '../data/reviews.json'
import { rankSearch, daySlots, checkSlot } from './matching.js'
import { addDays, toMin } from './time.js'
import { d, getLang } from './i18n.js'

const API = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')
export const usingServer = !!API

const KEY = 'pbs.v1.'
const LATENCY = 120

function read(name, fallback) {
  try {
    const raw = localStorage.getItem(KEY + name)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(name, value) {
  localStorage.setItem(KEY + name, JSON.stringify(value))
  window.dispatchEvent(new Event('pbs-store'))
}
const wait = (v) => new Promise((resolve) => setTimeout(() => resolve(v), LATENCY))

export class StoreError extends Error {
  constructor(code, message, extra = {}) {
    super(message)
    this.code = code
    Object.assign(this, extra)
  }
}

// ---------- server calls ----------

async function call(method, path, body) {
  const session = read('apiSession', null)
  let res
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Lang': getLang(),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new StoreError('network', 'The server is not available. Try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && session) write('apiSession', null) // expired session
    const { code, message, ...extra } = data
    throw new StoreError(code ?? 'server_error', message ?? 'Server error', extra)
  }
  return data
}
const changed = (v) => {
  window.dispatchEvent(new Event('pbs-store'))
  return v
}

// ---------- catalog (sync, static) ----------

export const catalog = { areas, styles, travel, meta }
export const areaName = (id) => d(areas.find((a) => a.id === id)?.name ?? id)
export const styleName = (id) => d(styles.find((s) => s.id === id)?.name ?? id)
export const styleGroup = (id) => d(styles.find((s) => s.id === id)?.group ?? '')

// Generated data is stored in English; in Ukrainian it is shown translated (src/lib/i18n.js).
// What testers type stays as typed.
function localizePhotographer(p) {
  return {
    ...p,
    firstName: d(p.firstName),
    lastName: d(p.lastName),
    about: d(p.about),
    skills: p.skills.map(d),
    gear: p.gear.map(d),
  }
}
function localizeEvent(e) {
  return { ...e, clientName: d(e.clientName), title: d(e.title), address: d(e.address) }
}
// server mode: only the generated data is translated
const fromServer = (p) => (p.userType === 'generated' ? localizePhotographer(p) : p)
const eventFromServer = (e) => (e.source === 'generated' ? localizeEvent(e) : e)
const resultFromServer = (r) => ({ ...r, photographer: fromServer(r.photographer) })

// ---------- photographers ----------

function allPhotographersSync() {
  const overrides = read('overrides', {})
  const testers = read('photographers', [])
  return [...seedPhotographers.map(localizePhotographer), ...testers].map((p) => {
    const o = overrides[p.id]
    return o ? { ...p, ...o, rules: { ...p.rules, ...o.rules } } : p
  })
}

function eventsSync(photographerId) {
  const all = [...seedEvents.map(localizeEvent), ...read('events', [])]
  return photographerId ? all.filter((e) => e.photographerId === photographerId) : all
}

export async function listPhotographers() {
  if (API) return (await call('GET', '/api/photographers')).map(fromServer)
  return wait(allPhotographersSync())
}

export async function getPhotographer(id) {
  if (API) return fromServer(await call('GET', `/api/photographers/${id}`))
  const p = allPhotographersSync().find((x) => x.id === id)
  if (!p) throw new StoreError('not_found', 'Photographer not found')
  return wait(p)
}

export async function getReviews(photographerId) {
  if (API) return (await call('GET', `/api/photographers/${photographerId}/reviews`)).map((r) => ({ ...r, clientName: d(r.clientName), text: d(r.text) }))
  return wait(seedReviews.filter((r) => r.photographerId === photographerId).slice(0, 5).map((r) => ({ ...r, clientName: d(r.clientName), text: d(r.text) })))
}

export async function listEvents(photographerId) {
  if (API) return (await call('GET', `/api/photographers/${photographerId}/events`)).map(eventFromServer)
  return wait(eventsSync(photographerId).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start))
}

// ---------- search and availability ----------

export async function search(params) {
  if (API) {
    const r = await call('POST', '/api/search', params)
    return { ...r, best: r.best && resultFromServer(r.best), others: r.others.map(resultFromServer), alternatives: r.alternatives.map(resultFromServer) }
  }
  const photographers = allPhotographersSync().filter((p) => p.profileDone && p.rulesDone)
  return wait(rankSearch({ photographers, events: eventsSync(), search: params, styles, travel }))
}

// 7 days of start times for the profile calendar.
// `extra` ('HH:MM') adds one more start time to every day, e.g. the searched time.
export async function weekAvailability({ photographerId, from, duration, area, step = 30, extra = null }) {
  if (API) return call('POST', `/api/photographers/${photographerId}/week`, { from, duration, area, step, extra })
  const p = allPhotographersSync().find((x) => x.id === photographerId)
  const events = eventsSync(photographerId)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i)
    const dayEvents = events.filter((e) => e.date === date)
    const slots = daySlots({ photographer: p, events: dayEvents, duration, area, travel, step })
    if (extra && !slots.some((x) => x.time === extra)) {
      const start = toMin(extra)
      slots.push({ start, time: extra, ...checkSlot({ photographer: p, events: dayEvents, start, duration, area, travel }) })
      slots.sort((a, b) => a.start - b.start)
    }
    return { date, slots }
  })
  return wait(days)
}

export async function nearestFree({ photographerId, date, start, duration, area, count = 3 }) {
  if (API) return call('POST', `/api/photographers/${photographerId}/nearest`, { date, start, duration, area, count })
  const p = allPhotographersSync().find((x) => x.id === photographerId)
  const events = eventsSync(photographerId).filter((e) => e.date === date)
  return wait(
    daySlots({ photographer: p, events, duration, area, travel })
      .filter((s) => s.ok)
      .sort((a, b) => Math.abs(a.start - start) - Math.abs(b.start - start))
      .slice(0, count)
      .sort((a, b) => a.start - b.start),
  )
}

// ---------- bookings ----------

export async function createBooking(input) {
  if (API) return changed(await call('POST', '/api/bookings', input))
  const p = allPhotographersSync().find((x) => x.id === input.photographerId)
  const events = eventsSync(p.id).filter((e) => e.date === input.date)
  // check the slot again right before payment (spec 4.4)
  const check = checkSlot({ photographer: p, events, start: input.start, duration: input.duration, area: input.area, travel })
  if (!check.ok) throw new StoreError('slot_taken', 'This time is no longer free', { reason: check.reason })

  const own = read('events', [])
  const total = Math.round((p.pricePerHour * input.duration) / 60)
  const booking = {
    id: 'b' + (5000 + own.length + 1) + Math.floor(Math.random() * 90 + 10),
    kind: 'booking',
    source: 'demo',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    ...input,
    total,
    deposit: Math.round(total * 0.3),
  }
  write('events', [...own, booking])
  return wait(booking)
}

export async function getBooking(id) {
  if (API) return eventFromServer(await call('GET', `/api/bookings/${id}`))
  const b = eventsSync().find((e) => e.id === id)
  if (!b) throw new StoreError('not_found', 'Booking not found')
  return wait(b)
}

// ---------- photographer settings ----------

function saveOverride(id, patch) {
  const overrides = read('overrides', {})
  const prev = overrides[id] ?? {}
  overrides[id] = { ...prev, ...patch, rules: { ...prev.rules, ...patch.rules } }
  write('overrides', overrides)
}

export async function saveRules(id, { rules, pricePerHour, styles: chosen, homeArea }) {
  if (API) return changed(await call('PUT', `/api/photographers/${id}/rules`, { rules, pricePerHour, styles: chosen, homeArea }))
  saveOverride(id, { rules, pricePerHour, styles: chosen, homeArea, rulesDone: true })
  return wait(true)
}

export async function saveProfile(id, profile) {
  if (API) return changed(await call('PUT', `/api/photographers/${id}/profile`, profile))
  saveOverride(id, { ...profile, profileDone: true })
  return wait(true)
}

export async function setCalendarConnected(id, connected) {
  if (API) return changed(await call('PUT', `/api/photographers/${id}/calendar`, { connected }))
  const cal = read('calendar', {})
  write('calendar', { ...cal, [id]: connected })
  return wait(connected)
}
export const isCalendarConnected = (id) => !!read('calendar', {})[id] || id.startsWith('p')

// ---------- accounts ----------
// Browser mode: accounts live in this browser. Server mode: the API keeps them and returns a session token.
// Generated users cannot log in.

async function hash(text) {
  const data = new TextEncoder().encode('pbs-demo:' + text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function currentUser() {
  if (API) return read('apiSession', null)?.user ?? null
  const session = read('session', null)
  return session ? read('users', []).find((u) => u.id === session.userId) ?? null : null
}

export async function signUp({ role, firstName, lastName, email, phone, password }) {
  if (API) {
    const { token, user } = await call('POST', '/api/auth/signup', { role, firstName, lastName, email, phone, password })
    write('apiSession', { token, user })
    return user
  }
  const users = read('users', [])
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    throw new StoreError('email_used', 'This email already has an account')
  const id = 'u' + Date.now()
  const user = { id, role, firstName, lastName, email, phone, passwordHash: await hash(password), userType: 'tester' }
  if (role === 'photographer') {
    const pid = 't' + Date.now()
    user.photographerId = pid
    const testers = read('photographers', [])
    write('photographers', [...testers, {
      id: pid, userType: 'tester', firstName, lastName, photo: null, portfolio: [], styles: [], homeArea: areas[0].id,
      pricePerHour: 1000, rating: 0, completedShoots: 0, about: '', skills: [], gear: [],
      rules: { breakMin: 30, minShoot: 30, maxShoot: 180, maxPerDay: 480, maxTravelMin: 40, transport: 'car' },
      profileDone: false, rulesDone: false,
    }])
  }
  write('users', [...users, user])
  write('session', { userId: id })
  return wait(user)
}

export async function logIn({ email, password }) {
  if (API) {
    const { token, user } = await call('POST', '/api/auth/login', { email, password })
    write('apiSession', { token, user })
    return user
  }
  const users = read('users', [])
  const h = await hash(password)
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === h)
  if (!user) throw new StoreError('wrong_login', 'Wrong email or password')
  write('session', { userId: user.id })
  return wait(user)
}

export function logOut() {
  if (API) {
    call('POST', '/api/auth/logout').catch(() => {})
    write('apiSession', null)
    return
  }
  write('session', null)
}

// ---------- team view (role switch) ----------

export function getView() {
  return read('view', { role: 'client', photographerId: 'p01' })
}
export function setView(view) {
  write('view', { ...getView(), ...view })
}

// Clears everything created in this browser (in server mode: only the session and the team view).
export function resetDemo() {
  Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k))
  window.dispatchEvent(new Event('pbs-store'))
}
