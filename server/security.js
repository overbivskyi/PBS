// Security helpers for the API: rate limits, input checks and response headers.
// Every value from the outside goes through these checks before it reaches the database or the matching code.

import { loadJson } from './db.js'

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    Object.assign(this, { status, code, extra })
  }
}
export const fail = (status, code, message, extra) => { throw new HttpError(status, code, message, extra) }
const bad = (message) => fail(400, 'bad_request', message)

// ---------- client address ----------

// The API listens on localhost only, so every request comes through Tailscale Funnel / serve,
// which adds the visitor's address as the last X-Forwarded-For entry. Earlier entries can be faked.
export function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean)
  return fwd.at(-1) || req.socket.remoteAddress || 'unknown'
}

// ---------- rate limits (in memory, fixed windows) ----------

const buckets = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k)
}, 60_000).unref()

// Counts one hit; throws 429 when the limit for this key is used up.
export function limit(key, max, windowMs) {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + windowMs }
    buckets.set(key, b)
  }
  b.count++
  if (b.count > max) {
    const retry = Math.ceil((b.reset - now) / 1000)
    console.warn(`rate limit: ${key.replace(/:[^:]*@[^:]*$/, ':<email>')} (${b.count}/${max})`)
    fail(429, 'too_many_requests', 'Too many attempts. Try again later.', { retryAfter: retry })
  }
}
// Only checks, does not count (used before a login attempt, counted on failure).
export function isLimited(key, max) {
  const b = buckets.get(key)
  return !!b && b.reset > Date.now() && b.count >= max
}

// ---------- input checks ----------

const AREAS = new Set(loadJson('areas').map((a) => a.id))
const STYLES = new Set(loadJson('styles').map((s) => s.id))
// control characters except tab and newline
const CONTROL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]')

export function text(v, name, { min = 0, max, multiline = false } = {}) {
  if (v === undefined || v === null) v = ''
  if (typeof v !== 'string') bad(`Wrong value: ${name}`)
  const s = v.trim()
  if (s.length < min) bad(min === 1 ? `Missing field: ${name}` : `Too short: ${name}`)
  if (s.length > max) bad(`Too long: ${name}`)
  if (CONTROL.test(s) || (!multiline && /[\r\n]/.test(s))) bad(`Wrong characters: ${name}`)
  return s
}

export function int(v, name, { min, max, step = 1 } = {}) {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max || v % step !== 0) bad(`Wrong value: ${name}`)
  return v
}

export function oneOf(v, name, allowed) {
  const ok = allowed instanceof Set ? allowed.has(v) : allowed.includes(v)
  if (!ok) bad(`Wrong value: ${name}`)
  return v
}

export const email = (v) => {
  const s = text(v, 'email', { min: 3, max: 254 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) bad('Enter an email like name@example.com')
  return s
}
export const phone = (v, name = 'phone') => {
  const s = text(v, name, { min: 10, max: 20 })
  if (!/^\+?[\d\s()-]{10,20}$/.test(s)) bad('Enter a phone number like +380 67 123 45 67')
  return s
}
export const password = (v) => {
  if (typeof v !== 'string' || v.length < 8) bad('Use at least 8 characters')
  if (v.length > 128) bad('Too long: password')
  return v
}
export const date = (v, name = 'date') => {
  if (typeof v !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(v) || Number.isNaN(Date.parse(v + 'T00:00:00Z'))) bad(`Wrong value: ${name}`)
  return v
}
export const hhmm = (v, name) => {
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) bad(`Wrong value: ${name}`)
  return v
}
export const area = (v) => oneOf(v, 'area', AREAS)
export const style = (v) => oneOf(v, 'style', STYLES)
export function styleList(v, name, { min, max }) {
  if (!Array.isArray(v) || v.length < min || v.length > max) bad(`Wrong value: ${name}`)
  return [...new Set(v.map(style))]
}
export const id = (v, name) => {
  if (typeof v !== 'string' || !/^[a-z0-9]{2,24}$/i.test(v)) bad(`Wrong value: ${name}`)
  return v
}

export const minutesOfDay = (v, name) => int(v, name, { min: 0, max: 1439, step: 5 })
export const duration = (v) => int(v, 'duration', { min: 15, max: 480, step: 15 })

// Images: only our own uploads (JPEG/PNG data URLs, resized in the browser) or the design's Unsplash photos.
const MAX_IMAGE_CHARS = 900_000 // about 650 KB of image data
export function imageSrc(v, name) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string') bad(`Wrong value: ${name}`)
  if (/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)) {
    if (v.length > MAX_IMAGE_CHARS) bad('The photo is too large')
    return v
  }
  if (/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?[\w=&.%-]{0,200}$/.test(v)) return v
  bad(`Wrong value: ${name}`)
}

// ---------- response headers ----------

export function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
}
