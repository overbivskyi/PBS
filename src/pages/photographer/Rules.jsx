import { useMemo, useState } from 'react'
import { Field, Loading, ErrorState } from '../../components/ui.jsx'
import { useAsync } from '../../lib/hooks.js'
import { getPhotographer, listEvents, saveRules, catalog } from '../../lib/store.js'
import { daySlots } from '../../lib/matching.js'
import { addDays, weekStart } from '../../lib/time.js'
import { PhotographerGate, PhotographerTabs, demoToday } from './common.jsx'

export default function Rules() {
  return <PhotographerGate>{(id) => <RulesLoader id={id} />}</PhotographerGate>
}

function RulesLoader({ id }) {
  const data = useAsync(async () => ({ p: await getPhotographer(id), events: await listEvents(id) }), [id])
  if (data.status === 'loading') return <div className="container page"><Loading /></div>
  if (data.status === 'error') return <div className="container page"><ErrorState text="We could not load your rules. Try again." onRetry={data.retry} /></div>
  return <RulesForm key={id} photographer={data.data.p} events={data.data.events} />
}

const NUM_FIELDS = ['minShoot', 'maxShoot', 'maxPerDay', 'maxTravelMin', 'pricePerHour']

function RulesForm({ photographer: p, events }) {
  const [f, setF] = useState({
    ...p.rules,
    pricePerHour: p.pricePerHour,
    styles: p.styles,
    homeArea: p.homeArea,
  })
  const [saved, setSaved] = useState(false)
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setSaved(false) }
  const n = (k) => Number(f[k])

  const errors = {}
  for (const k of NUM_FIELDS) if (f[k] === '' || Number.isNaN(n(k)) || n(k) < 0) errors[k] = 'Enter a number'
  if (!errors.minShoot && n('minShoot') < 15) errors.minShoot = 'At least 15 minutes'
  if (!errors.minShoot && !errors.maxShoot && n('minShoot') > n('maxShoot')) errors.minShoot = 'The shortest shoot cannot be longer than the longest shoot'
  if (!errors.maxShoot && !errors.maxPerDay && n('maxShoot') > n('maxPerDay')) errors.maxShoot = 'The longest shoot cannot be longer than the maximum minutes per day'
  if (!errors.maxTravelMin && n('maxTravelMin') < 10) errors.maxTravelMin = 'At least 10 minutes'
  if (!errors.pricePerHour && n('pricePerHour') < 100) errors.pricePerHour = 'At least 100 UAH'
  if (f.styles.length === 0) errors.styles = 'Choose at least one style'
  const valid = Object.keys(errors).length === 0

  // Preview: free start times this week for the shortest shoot in the home area.
  const preview = useMemo(() => {
    if (!valid) return null
    const rules = { breakMin: n('breakMin'), minShoot: n('minShoot'), maxShoot: n('maxShoot'), maxPerDay: n('maxPerDay'), maxTravelMin: n('maxTravelMin') }
    const ph = { ...p, rules, homeArea: f.homeArea }
    const from = weekStart(demoToday())
    let count = 0
    for (let i = 0; i < 7; i++) {
      const date = addDays(from, i)
      count += daySlots({ photographer: ph, events: events.filter((e) => e.date === date), duration: rules.minShoot, area: f.homeArea, travel: catalog.travel, step: 60 })
        .filter((s) => s.ok).length
    }
    return count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, valid])

  async function save(e) {
    e.preventDefault()
    if (!valid) return
    await saveRules(p.id, {
      rules: { breakMin: n('breakMin'), minShoot: n('minShoot'), maxShoot: n('maxShoot'), maxPerDay: n('maxPerDay'), maxTravelMin: n('maxTravelMin'), transport: f.transport },
      pricePerHour: n('pricePerHour'),
      styles: f.styles,
      homeArea: f.homeArea,
    })
    setSaved(true)
  }

  const num = (k, label, extra = {}) => (
    <Field label={label} error={errors[k]} hint={extra.hint}>
      <input type="number" inputMode="numeric" min={extra.min ?? 0} step={extra.step ?? 15} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  )

  return (
    <div className="container page narrow">
      <PhotographerTabs />
      <h1>Rules · {p.firstName} {p.lastName}</h1>
      <form className="card form" onSubmit={save} noValidate>
        <div className="grid-2">
          <Field label="Break between shoots">
            <select value={f.breakMin} onChange={(e) => set('breakMin', Number(e.target.value))}>
              {[0, 15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Field>
          {num('maxPerDay', 'Maximum minutes per day')}
          {num('minShoot', 'Shortest shoot (min)', { min: 15 })}
          {num('maxShoot', 'Longest shoot (min)')}
        </div>
        <div className="grid-2">
          <Field label="Home area">
            <select value={f.homeArea} onChange={(e) => set('homeArea', e.target.value)}>
              {catalog.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {num('maxTravelMin', 'Travel distance (minutes from home area)', { step: 5, hint: 'Clients in areas further than this do not see you' })}
          <Field label="Transport">
            <select value={f.transport} onChange={(e) => set('transport', e.target.value)}>
              <option value="car">Car</option>
              <option value="public">Public transport</option>
              <option value="walking">Walking</option>
            </select>
          </Field>
          {num('pricePerHour', 'Price per hour (UAH)', { step: 50, min: 100 })}
        </div>
        <div className={`field ${errors.styles ? 'has-error' : ''}`}>
          <span className="field-label">Styles</span>
          <div className="chips">
            {catalog.styles.map((s) => {
              const on = f.styles.includes(s.id)
              return (
                <button type="button" key={s.id} className={`chip ${on ? 'chip-on' : ''}`} aria-pressed={on}
                  onClick={() => set('styles', on ? f.styles.filter((x) => x !== s.id) : [...f.styles, s.id])}>
                  {s.name}
                </button>
              )
            })}
          </div>
          {errors.styles && <span className="field-error">{errors.styles}</span>}
        </div>

        {preview != null && <p className="preview">With these rules, you have <strong>{preview}</strong> free start times this week</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={!valid}>Save rules</button>
        {saved && <p className="success" role="status">Rules saved. New bookings follow them.</p>}
      </form>
    </div>
  )
}
