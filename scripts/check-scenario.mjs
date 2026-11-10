// Prints the demo scenario search, to check the generated data.
// Run: npm run check
import { readFileSync } from 'node:fs'
import { rankSearch, evaluate } from '../src/lib/matching.js'
import { toMin } from '../src/lib/time.js'

const load = (n) => JSON.parse(readFileSync(new URL(`../src/data/${n}.json`, import.meta.url)))
const [photographers, events, styles, travel, meta] = ['photographers', 'events', 'styles', 'travel', 'meta'].map(load)
const sc = meta.scenario
const search = { ...sc, start: toMin(sc.time) }
const res = rankSearch({ photographers, events, search, styles, travel })
const line = (r) => `${r.photographer.id} ${r.photographer.firstName} ${r.score}% misses=${r.misses.join(',') || '-'} ` +
  r.misses.map((m) => r.conditions[m].reason).join(' | ')
console.log(`${res.count} fit. best:`, res.best && line(res.best))
res.others.forEach((r) => console.log('  other', line(r)))
res.alternatives.forEach((r) => console.log('  alt  ', line(r)))
const p3 = evaluate({ photographer: photographers[2], events: events.filter((e) => e.photographerId === 'p03'), search, styles, travel })
console.log('p03 at 14:00:', p3.conditions.time.blockedReason)
