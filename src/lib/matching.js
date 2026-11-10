// Availability checks and fit score (spec section 6).
// Pure functions: they get all data as arguments, so the same code can later run on the server.

import { DAY_START, DAY_END, toHHMM, formatShift } from './time.js'

export const POINTS = { style: 25, area: 25, time: 25, price: 25 }
export const STYLE_MATCH = { same: 1, close: 0.6, related: 0.3, none: 0 }

export const REASONS = {
  busy: 'Busy: another shoot at this time',
  break: 'Needs a break after the previous shoot',
  travel: 'Finishing another shoot across town',
  daily: 'Fully booked on this day',
  duration: (min, max) => `Takes shoots of ${min} to ${max} minutes`,
  area: 'Does not travel to this area',
  price: (over) => `${over} UAH/h over your budget`,
  similar: (has, wanted) => `Similar style: ${has.toLowerCase()} instead of ${wanted.toLowerCase()}`,
  style: 'Does not shoot this style',
  hours: 'Outside working hours',
}

// ---------- style ----------

// Best match of one wanted style against the photographer's styles.
export function styleMatch(wantedId, photographerStyles, styles) {
  const wanted = styles.find((s) => s.id === wantedId)
  if (photographerStyles.includes(wantedId)) return { level: 'same', score: STYLE_MATCH.same, via: wantedId }
  const close = wanted?.close.find((id) => photographerStyles.includes(id))
  if (close) return { level: 'close', score: STYLE_MATCH.close, via: close }
  const related = wanted?.related.find((id) => photographerStyles.includes(id))
  if (related) return { level: 'related', score: STYLE_MATCH.related, via: related }
  return { level: 'none', score: STYLE_MATCH.none, via: null }
}

export function styleCheck(wantedIds, photographerStyles, styles) {
  const matches = wantedIds.map((id) => ({ wanted: id, ...styleMatch(id, photographerStyles, styles) }))
  const score = matches.reduce((sum, m) => sum + m.score, 0) / Math.max(matches.length, 1)
  const exact = matches.some((m) => m.level === 'same')
  const name = (id) => styles.find((s) => s.id === id)?.name ?? id
  let reason = null
  if (!exact) {
    const best = [...matches].sort((a, b) => b.score - a.score)[0]
    reason = best && best.level !== 'none' ? REASONS.similar(name(best.via), name(best.wanted)) : REASONS.style
  }
  return { score, exact, any: score > 0, reason, matches }
}

// ---------- availability ----------

// Checks one start time. Returns { ok: true } or { ok: false, code, reason }.
// `events` are the photographer's bookings and calendar events on that date.
export function checkSlot({ photographer, events, start, duration, area, travel }) {
  const r = photographer.rules
  const end = start + duration

  if (start < DAY_START || end > DAY_END) return fail('hours', REASONS.hours)

  // 1. duration in range
  if (duration < r.minShoot || duration > r.maxShoot) return fail('duration', REASONS.duration(r.minShoot, r.maxShoot))

  // 5. area inside the travel distance (here: travel time from the home area)
  if (travel[photographer.homeArea][area] > r.maxTravelMin) return fail('area', REASONS.area)

  // 2. daily limit
  const booked = events.reduce((sum, e) => sum + e.duration, 0)
  if (booked + duration > r.maxPerDay) return fail('daily', REASONS.daily)

  // 3. no overlap
  if (events.some((e) => start < e.start + e.duration && e.start < end)) return fail('busy', REASONS.busy)

  // 4. break, then 6. travel from the previous shoot and to the next one
  const prev = events.filter((e) => e.start + e.duration <= start).sort((a, b) => b.start - a.start)[0]
  const next = events.filter((e) => e.start >= end).sort((a, b) => a.start - b.start)[0]
  if (prev && prev.start + prev.duration + r.breakMin > start) return fail('break', REASONS.break)
  if (next && end + r.breakMin > next.start) return fail('break', REASONS.break)
  if (prev && prev.start + prev.duration + r.breakMin + travelTime(travel, prev.area, area) > start)
    return fail('travel', REASONS.travel)
  if (next && end + r.breakMin + travelTime(travel, area, next.area) > next.start) return fail('travel', REASONS.travel)

  return { ok: true }
}

function travelTime(travel, from, to) {
  return travel[from ?? to]?.[to] ?? 0
}

function fail(code, reason) {
  return { ok: false, code, reason }
}

// All start times of a day with their status, in `step`-minute steps.
export function daySlots({ photographer, events, duration, area, travel, step = 15 }) {
  const slots = []
  for (let start = DAY_START; start + duration <= DAY_END; start += step) {
    slots.push({ start, time: toHHMM(start), ...checkSlot({ photographer, events, start, duration, area, travel }) })
  }
  return slots
}

// ---------- fit score ----------

function areaPoints(minutes, maxMinutes) {
  if (minutes > maxMinutes) return 0
  if (minutes <= 15) return POINTS.area
  const share = (minutes - 15) / Math.max(maxMinutes - 15, 1)
  return POINTS.area * (1 - 0.6 * share)
}

function timePoints(chosenFree, nearestDiff) {
  if (chosenFree) return POINTS.time
  if (nearestDiff == null) return 0
  return Math.max(POINTS.time * 0.2, POINTS.time - (Math.abs(nearestDiff) / 60) * 5)
}

function pricePoints(price, budget) {
  if (price <= budget) return POINTS.price
  const overShare = (price - budget) / budget
  return Math.max(0, POINTS.price * (1 - overShare * 2))
}

// Evaluates one photographer for a search.
// search: { styles: [ids], area, date, start (min), duration, budget }
export function evaluate({ photographer, events, search, styles, travel }) {
  const dayEvents = events.filter((e) => e.date === search.date)
  const style = styleCheck(search.styles, photographer.styles, styles)
  const routeMin = travel[photographer.homeArea][search.area]
  const inArea = routeMin <= photographer.rules.maxTravelMin

  const slots = daySlots({ photographer, events: dayEvents, duration: search.duration, area: search.area, travel })
  const chosen = slots.find((s) => s.start === search.start) ??
    { start: search.start, ...checkSlot({ photographer, events: dayEvents, start: search.start, duration: search.duration, area: search.area, travel }) }
  const free = slots.filter((s) => s.ok)
  const nearest = [...free].sort((a, b) => Math.abs(a.start - search.start) - Math.abs(b.start - search.start))[0]

  const priceOk = photographer.pricePerHour <= search.budget
  const timeOk = chosen.ok
  // time is only a separate miss when the area itself is reachable
  const conditions = {
    style: { ok: style.exact, reason: style.reason },
    area: { ok: inArea, reason: inArea ? null : REASONS.area },
    time: {
      ok: timeOk || !inArea, // area miss already explains the time
      reason: timeOk ? null : nearest ? `Free from ${nearest.time}, ${formatShift(nearest.start - search.start)}` : chosen.reason,
      blockedReason: timeOk ? null : chosen.reason,
    },
    price: { ok: priceOk, reason: priceOk ? null : REASONS.price(photographer.pricePerHour - search.budget) },
  }

  const points = {
    style: POINTS.style * style.score,
    area: areaPoints(routeMin, photographer.rules.maxTravelMin),
    time: inArea ? timePoints(timeOk, nearest ? nearest.start - search.start : null) : 0,
    price: pricePoints(photographer.pricePerHour, search.budget),
  }
  const score = Math.round(points.style + points.area + points.time + points.price)
  const misses = Object.entries(conditions).filter(([, c]) => !c.ok).map(([k]) => k)

  return {
    photographer,
    score,
    points,
    conditions,
    misses,
    fitsAll: misses.length === 0,
    styleAny: style.any,
    freeTimes: free.map((s) => s.time),
    chosenFree: timeOk,
    total: Math.round((photographer.pricePerHour * search.duration) / 60),
    routeMin,
  }
}

// Ranks all photographers for a search (spec 4.2).
export function rankSearch({ photographers, events, search, styles, travel }) {
  const all = photographers
    .map((p) => evaluate({ photographer: p, events: events.filter((e) => e.photographerId === p.id), search, styles, travel }))
    .filter((r) => r.styleAny)
    .sort((a, b) => b.score - a.score || b.photographer.rating - a.photographer.rating)

  const fits = all.filter((r) => r.fitsAll)
  // a close alternative misses exactly one condition and still has a free time that day
  const close = all.filter((r) => r.misses.length === 1 && r.freeTimes.length > 0)
  const alternatives = fits.length < 3 ? close.slice(0, 3) : []

  return { best: fits[0] ?? null, others: fits.slice(1), alternatives, count: fits.length }
}
