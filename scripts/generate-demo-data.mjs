// Generates the demo data in src/data/*.json.
// Run: npm run data
// The output is deterministic (seeded), so re-running gives the same files.
// The first photographers are hand-made for the demo scenario (see README).

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
mkdirSync(OUT, { recursive: true })

// ---------- seeded random ----------
let seed = 20261113
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
const shuffle = (arr) => [...arr].sort(() => rand() - 0.5)

// ---------- demo calendar ----------
// 3 demo weeks, Monday 16 Nov to Sunday 6 Dec 2026.
const DEMO_START = '2026-11-16'
const DEMO_DAYS = 21

function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------- areas (one city, no geo API) ----------
// Travel time between areas is a fixed table in minutes, by car.
// The x/y numbers are only a rough sketch of the city used to fill the table.
const AREAS = [
  { id: 'podil', name: 'Podil', x: 0, y: 2 },
  { id: 'center', name: 'City Center', x: 0, y: 0 },
  { id: 'pechersk', name: 'Pechersk', x: 2, y: -1 },
  { id: 'obolon', name: 'Obolon', x: -1, y: 7 },
  { id: 'holosiiv', name: 'Holosiiv', x: -1, y: -6 },
  { id: 'solomianka', name: 'Solomianka', x: -4, y: -2 },
  { id: 'livyi-bereh', name: 'Livyi Bereh', x: 7, y: 1 },
  { id: 'darnytsia', name: 'Darnytsia', x: 8, y: -4 },
  { id: 'troieshchyna', name: 'Troieshchyna', x: 8, y: 8 },
]

const travel = {}
for (const a of AREAS) {
  travel[a.id] = {}
  for (const b of AREAS) {
    if (a.id === b.id) {
      travel[a.id][b.id] = 10
      continue
    }
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const crossesRiver = (a.x > 5) !== (b.x > 5)
    const minutes = 10 + dist * 2.6 + (crossesRiver ? 10 : 0)
    travel[a.id][b.id] = Math.round(minutes / 5) * 5
  }
}

// ---------- styles and style tree ----------
const STYLES = [
  { id: 'portrait', name: 'Portrait', group: 'People', close: ['family', 'love-story'], related: ['event'] },
  { id: 'family', name: 'Family', group: 'People', close: ['portrait', 'love-story'], related: ['event'] },
  { id: 'love-story', name: 'Love story', group: 'People', close: ['portrait', 'family'], related: ['wedding'] },
  { id: 'wedding', name: 'Wedding', group: 'Events', close: ['event'], related: ['love-story', 'family'] },
  { id: 'event', name: 'Event', group: 'Events', close: ['wedding'], related: ['portrait'] },
  { id: 'product', name: 'Product', group: 'Commercial', close: [], related: [] },
]

// ---------- photographers ----------
const FIRST = ['Olena', 'Andrii', 'Iryna', 'Taras', 'Sofiia', 'Maksym', 'Kateryna', 'Dmytro', 'Yuliia', 'Bohdan',
  'Nataliia', 'Oleksandr', 'Mariia', 'Roman', 'Viktoriia', 'Serhii', 'Anastasiia', 'Yurii', 'Daryna', 'Ostap']
const LAST = ['Kovalenko', 'Melnyk', 'Bondar', 'Shevchuk', 'Lysenko', 'Tkachenko', 'Kravets', 'Moroz', 'Savchuk', 'Oliinyk',
  'Polishchuk', 'Rudenko', 'Marchenko', 'Hnatiuk', 'Zinchenko', 'Pavlenko', 'Kostenko', 'Levchenko', 'Tymoshenko', 'Danyliuk']

const SKILLS = {
  portrait: ['Natural light', 'Posing guidance', 'Retouching'],
  family: ['Working with kids', 'Outdoor sessions', 'Candid moments'],
  'love-story': ['Couple posing', 'Golden hour', 'Storytelling'],
  wedding: ['Full-day coverage', 'Ceremony timing', 'Group photos'],
  event: ['Fast reportage', 'Low light', 'Same-day previews'],
  product: ['Studio lighting', 'Flat lay', 'Clean backgrounds'],
}
const GEAR = ['Sony A7 IV', 'Canon EOS R6', 'Nikon Z6 II', 'Fujifilm X-T5', '35mm f/1.4', '50mm f/1.8', '85mm f/1.8',
  '24-70mm f/2.8', '70-200mm f/2.8', 'Godox V1 flash', 'Reflector 5-in-1', 'Softbox kit']
const ABOUT = {
  portrait: 'I help people feel calm in front of the camera and look like themselves.',
  family: 'I photograph families as they are: busy, loud and happy.',
  'love-story': 'I tell the story of a couple with light, places and small gestures.',
  wedding: 'I cover the whole day so the couple can forget about the camera.',
  event: 'I shoot events fast and quietly, and send the first photos the same evening.',
  product: 'I make clean product photos for shops, menus and social media.',
}

// Hand-made photographers for the demo scenario:
// Portrait · Podil · Fri 20 Nov 2026 · 14:00 · 90 min · 1500 UAH/h
const SCENARIO = [
  { styles: ['portrait', 'family'], home: 'podil', price: 1200, rating: 4.9, shoots: 132 },   // best match
  { styles: ['portrait', 'event'], home: 'center', price: 1400, rating: 4.7, shoots: 88 },    // fits all
  { styles: ['portrait', 'love-story'], home: 'center', price: 1300, rating: 4.8, shoots: 104 }, // travel-blocked at 14:00
  { styles: ['portrait'], home: 'pechersk', price: 1800, rating: 4.9, shoots: 210 },          // over budget
  { styles: ['family', 'love-story'], home: 'podil', price: 1100, rating: 4.6, shoots: 61 },  // similar style
  { styles: ['wedding', 'event'], home: 'obolon', price: 2000, rating: 4.8, shoots: 150 },
]

const photographers = []
const COUNT = 20
for (let i = 0; i < COUNT; i++) {
  const [firstName, lastName] = [FIRST[i], LAST[(i * 7) % LAST.length]]
  const s = SCENARIO[i]
  let styles, home, price
  if (s) {
    ;({ styles, home, price } = s)
  } else {
    styles = shuffle(STYLES.map((x) => x.id)).slice(0, int(1, 3))
    home = pick(AREAS).id
    // keep the demo search small: other People photographers are over its budget
    const people = styles.some((x) => ['portrait', 'family', 'love-story'].includes(x))
    price = people ? int(16, 25) * 100 : int(8, 25) * 100
  }
  const main = styles[0]
  const minShoot = s ? 30 : pick([15, 30, 30, 45, 60])
  const id = 'p' + String(i + 1).padStart(2, '0')
  photographers.push({
    id,
    userType: 'generated',
    firstName,
    lastName,
    photo: null,
    portfolio: Array.from({ length: int(9, 12) }, (_, k) => ({ id: `${id}-${k + 1}`, src: null, style: pick(styles) })),
    styles,
    homeArea: home,
    pricePerHour: price,
    rating: s ? s.rating : Math.round((4.3 + rand() * 0.7) * 10) / 10,
    completedShoots: s ? s.shoots : int(15, 240),
    about: `${ABOUT[main]} ${pick(['Based in Kyiv for 6 years.', 'I shoot in any weather.', 'Photos ready in 5 days.', 'I studied photography in Lviv.'])}`,
    skills: [...new Set(styles.flatMap((x) => SKILLS[x]))].slice(0, 4),
    gear: shuffle(GEAR).slice(0, int(3, 5)),
    rules: {
      breakMin: s ? 15 : pick([0, 15, 15, 30, 30, 45, 60]),
      minShoot,
      maxShoot: s ? 240 : pick([120, 180, 240, 300, 480]),
      maxPerDay: s ? 480 : pick([300, 360, 420, 480, 600]),
      maxTravelMin: s ? 50 : pick([30, 40, 45, 50, 60]),
      transport: 'car',
    },
    profileDone: true,
    rulesDone: true,
  })
}

// ---------- calendars ----------
const CLIENTS = ['Anna', 'Ivan', 'Oksana', 'Petro', 'Halyna', 'Mykhailo', 'Liudmyla', 'Vasyl', 'Tetiana', 'Artem', 'Alina', 'Denys']
const STREETS = ['Khreshchatyk St', 'Sahaidachnoho St', 'Obolonska Embankment', 'Lesi Ukrainky Blvd', 'Holosiivskyi Ave',
  'Povitroflotskyi Ave', 'Dniprovska Embankment', 'Kharkivske Hwy', 'Zakrevskoho St', 'Kontraktova Sq', 'Velyka Vasylkivska St']

const events = []
let bookingNo = 1001
function overlaps(list, date, start, end, gap) {
  return list.some((e) => e.date === date && start < e.start + e.duration + gap && e.start < end + gap)
}

// Scenario: photographer 3 finishes a shoot in Darnytsia at 13:30 on 20 Nov,
// so 14:00 in Podil is blocked by travel, and 15:00 is the first free start.
events.push({
  id: 'b' + bookingNo++, kind: 'booking', photographerId: 'p03', date: '2026-11-20', start: 11 * 60 + 30, duration: 120,
  area: 'darnytsia', address: '12 Kharkivske Hwy', clientName: 'Oksana', style: 'portrait', note: '',
  status: 'confirmed', source: 'generated',
})
// Scenario: photographer 1 has a morning shoot that day, so the day looks real.
events.push({
  id: 'b' + bookingNo++, kind: 'booking', photographerId: 'p01', date: '2026-11-20', start: 9 * 60, duration: 90,
  area: 'podil', address: '4 Kontraktova Sq', clientName: 'Ivan', style: 'family', note: '',
  status: 'confirmed', source: 'generated',
})

for (const p of photographers) {
  const own = events.filter((e) => e.photographerId === p.id)
  const target = int(3, 8)
  let guard = 0
  while (own.length < target && guard++ < 200) {
    const date = addDays(DEMO_START, int(0, DEMO_DAYS - 1))
    if (date === '2026-11-20' && ['p01', 'p02', 'p03', 'p04', 'p05'].includes(p.id)) continue
    const duration = Math.max(p.rules.minShoot, Math.min(p.rules.maxShoot, pick([60, 90, 120, 120, 180])))
    const start = int(18, 38) * 30 // 09:00 to 19:00
    if (start + duration > 21 * 60) continue
    if (overlaps(own, date, start, start + duration, p.rules.breakMin + 30)) continue
    const isCalendar = rand() < 0.25
    const e = isCalendar
      ? { id: 'c' + bookingNo++, kind: 'calendar', photographerId: p.id, date, start, duration,
          area: p.homeArea, title: pick(['Personal event', 'Studio rent', 'Editing day', 'Doctor']), source: 'generated' }
      : { id: 'b' + bookingNo++, kind: 'booking', photographerId: p.id, date, start, duration,
          area: pick(AREAS).id, address: `${int(1, 120)} ${pick(STREETS)}`, clientName: pick(CLIENTS),
          style: pick(p.styles), note: '', status: 'confirmed', source: 'generated' }
    own.push(e)
    events.push(e)
  }
}
for (const e of events) {
  if (e.kind === 'booking') {
    const p = photographers.find((x) => x.id === e.photographerId)
    e.total = Math.round((p.pricePerHour * e.duration) / 60)
    e.deposit = Math.round(e.total * 0.3)
  }
}

// ---------- reviews (linked to past demo bookings) ----------
const REVIEW_TEXT = [
  'Very calm and kind, the photos came out natural.',
  'Came on time, knew the best spots, photos in 4 days.',
  'Our kids loved the session. Great colors.',
  'Clear communication and beautiful light work.',
  'Exactly the style we wanted. Will book again.',
  'Fast, friendly and very professional.',
  'Helped us relax, the photos feel alive.',
]
const reviews = []
for (const p of photographers) {
  const n = int(3, 5)
  for (let k = 0; k < n; k++) {
    const date = addDays('2026-10-01', int(0, 40))
    const bookingId = 'past-' + bookingNo++
    reviews.push({
      id: 'r-' + bookingId,
      photographerId: p.id,
      bookingId,
      clientName: pick(CLIENTS),
      date,
      stars: rand() < 0.75 ? 5 : 4,
      text: pick(REVIEW_TEXT),
    })
  }
  reviews.sort((a, b) => b.date.localeCompare(a.date))
}

// ---------- write ----------
const write = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n')
write('areas.json', AREAS.map(({ id, name }) => ({ id, name })))
write('travel.json', travel)
write('styles.json', STYLES)
write('photographers.json', photographers)
write('events.json', events)
write('reviews.json', reviews)
write('meta.json', {
  city: 'Kyiv',
  demoStart: DEMO_START,
  demoDays: DEMO_DAYS,
  scenario: { styles: ['portrait'], area: 'podil', date: '2026-11-20', time: '14:00', duration: 90, budget: 1500 },
})
console.log(`photographers: ${photographers.length}, events: ${events.length}, reviews: ${reviews.length}`)
