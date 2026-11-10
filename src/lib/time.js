// Times are minutes from midnight; dates are 'YYYY-MM-DD' strings.

export const DAY_START = 8 * 60 // first possible start time
export const DAY_END = 21 * 60 // shoots must end by this time

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function toHHMM(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function weekStart(date) {
  const d = new Date(date + 'T00:00:00Z')
  const shift = (d.getUTCDay() + 6) % 7
  return addDays(date, -shift)
}

export function formatDate(date, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts })
}

export function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

// "2 hours later", "30 min earlier"
export function formatShift(diff) {
  const abs = Math.abs(diff)
  const word = diff > 0 ? 'later' : 'earlier'
  if (abs % 60 === 0) return `${abs / 60} ${abs === 60 ? 'hour' : 'hours'} ${word}`
  return `${formatDuration(abs)} ${word}`
}

export function uah(n) {
  return `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} UAH`
}

export const TIME_OPTIONS = Array.from({ length: (DAY_END - DAY_START) / 15 }, (_, i) => toHHMM(DAY_START + i * 15))
export const DURATION_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 15) // 15 min to 8 h
