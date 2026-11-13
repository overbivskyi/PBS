// Data layer for the demo.
// The generated data comes from src/data/*.json (in git). Anything created in the demo
// (accounts, bookings, edited rules and profiles) is kept in this browser's localStorage.
// Every function is async, so this file can later be swapped for calls to the team's server
// without changing the pages.

import areas from '../data/areas.json'
import styles from '../data/styles.json'
import travel from '../data/travel.json'
import meta from '../data/meta.json'
import seedPhotographers from '../data/photographers.json'
import seedEvents from '../data/events.json'
import seedReviews from '../data/reviews.json'
import { rankSearch, daySlots, checkSlot } from './matching.js'
import { addDays, toMin } from './time.js'

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

// ---------- catalog (sync, static) ----------

export const catalog = { areas, styles, travel, meta }
export const areaName = (id) => areas.find((a) => a.id === id)?.name ?? id
export const styleName = (id) => styles.find((s) => s.id === id)?.name ?? id

// ---------- photographers ----------

function allPhotographersSync() {
  const overrides = read('overrides', {})
  const testers = read('photographers', [])
  return [...seedPhotographers, ...testers].map((p) => {
    const o = overrides[p.id]
    return o ? { ...p, ...o, rules: { ...p.rules, ...o.rules } } : p
  })
}

function eventsSync(photographerId) {
  const all = [...seedEvents, ...read('events', [])]
  return photographerId ? all.filter((e) => e.photographerId === photographerId) : all
}

export async function listPhotographers() {
  return wait(allPhotographersSync())
}

export async function getPhotographer(id) {
  const p = allPhotographersSync().find((x) => x.id === id)
  if (!p) throw new StoreError('not_found', 'Photographer not found')
  return wait(p)
}

export async function getReviews(photographerId) {
  return wait(seedReviews.filter((r) => r.photographerId === photographerId).slice(0, 5))
}

export async function listEvents(photographerId) {
  return wait(eventsSync(photographerId).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start))
}

// ---------- search and availability ----------

export async function search(params) {
  const photographers = allPhotographersSync().filter((p) => p.profileDone && p.rulesDone)
  return wait(rankSearch({ photographers, events: eventsSync(), search: params, styles, travel }))
}

// 7 days of start times for the profile calendar.
// `extra` ('HH:MM') adds one more start time to every day, e.g. the searched time.
export async function weekAvailability({ photographerId, from, duration, area, step = 30, extra = null }) {
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
  saveOverride(id, { rules, pricePerHour, styles: chosen, homeArea, rulesDone: true })
  return wait(true)
}

export async function saveProfile(id, profile) {
  saveOverride(id, { ...profile, profileDone: true })
  return wait(true)
}

export async function setCalendarConnected(id, connected) {
  const cal = read('calendar', {})
  write('calendar', { ...cal, [id]: connected })
  return wait(connected)
}
export const isCalendarConnected = (id) => !!read('calendar', {})[id] || id.startsWith('p')

// ---------- accounts ----------
// Demo only: accounts live in this browser. Generated users cannot log in.

async function hash(text) {
  const data = new TextEncoder().encode('pbs-demo:' + text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function currentUser() {
  const session = read('session', null)
  return session ? read('users', []).find((u) => u.id === session.userId) ?? null : null
}

export async function signUp({ role, firstName, lastName, email, phone, password }) {
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
  const users = read('users', [])
  const h = await hash(password)
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === h)
  if (!user) throw new StoreError('wrong_login', 'Wrong email or password')
  write('session', { userId: user.id })
  return wait(user)
}

export function logOut() {
  write('session', null)
}

// ---------- team view (role switch) ----------

export function getView() {
  return read('view', { role: 'client', photographerId: 'p01' })
}
export function setView(view) {
  write('view', { ...getView(), ...view })
}

// Clears everything created in this browser.
export function resetDemo() {
  Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k))
  window.dispatchEvent(new Event('pbs-store'))
}
