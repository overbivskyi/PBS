import { useEffect, useMemo, useState } from 'react'
import { Field, Icon, Toast } from '../../components/ui.jsx'
import { useAsync } from '../../lib/hooks.js'
import { getPhotographer, listEvents, saveRules, catalog, areaName, styleName } from '../../lib/store.js'
import { daySlots } from '../../lib/matching.js'
import { addDays, weekStart } from '../../lib/time.js'
import { PhotographerGate, ProPage, ProLoading, demoToday } from './common.jsx'
import { t, plural } from '../../lib/i18n.js'

export default function Rules() {
  return <PhotographerGate>{(id) => <RulesLoader id={id} />}</PhotographerGate>
}

function RulesLoader({ id }) {
  const data = useAsync(async () => ({ p: await getPhotographer(id), events: await listEvents(id) }), [id])
  if (data.status !== 'ready') return <ProLoading state={data} text={t('We could not load your rules. Try again.')} />
  return <RulesForm key={id} photographer={data.data.p} events={data.data.events} />
}

const NUM_FIELDS = ['minShoot', 'maxShoot', 'maxPerDay', 'maxTravelMin', 'pricePerHour']
const TRANSPORT = [['walking', 'Walking'], ['public', 'Public transport'], ['car', 'Car']]

function RulesForm({ photographer: p, events }) {
  const [f, setF] = useState({ ...p.rules, pricePerHour: p.pricePerHour, styles: p.styles, homeArea: p.homeArea })
  const [saved, setSaved] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const n = (k) => Number(f[k])

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(t)
  }, [saved])

  const errors = {}
  for (const k of NUM_FIELDS) if (f[k] === '' || Number.isNaN(n(k)) || n(k) < 0) errors[k] = t('Enter a number')
  if (!errors.minShoot && n('minShoot') < 15) errors.minShoot = t('At least 15 minutes')
  if (!errors.minShoot && !errors.maxShoot && n('minShoot') > n('maxShoot')) errors.minShoot = t('The shortest shoot cannot be longer than the longest shoot')
  if (!errors.maxShoot && !errors.maxPerDay && n('maxShoot') > n('maxPerDay')) errors.maxShoot = t('The longest shoot cannot be longer than the maximum minutes per day')
  if (!errors.maxTravelMin && n('maxTravelMin') < 10) errors.maxTravelMin = t('At least 10 minutes')
  if (!errors.pricePerHour && n('pricePerHour') < 100) errors.pricePerHour = t('At least 100 UAH')
  if (f.styles.length === 0) errors.styles = t('Choose at least one style')
  const valid = Object.keys(errors).length === 0

  const rules = () => ({ breakMin: n('breakMin'), minShoot: n('minShoot'), maxShoot: n('maxShoot'), maxPerDay: n('maxPerDay'), maxTravelMin: n('maxTravelMin'), transport: f.transport })

  // Preview: free start times this week for the shortest shoot in the home area.
  const preview = useMemo(() => {
    if (!valid) return null
    const ph = { ...p, rules: rules(), homeArea: f.homeArea }
    const from = weekStart(demoToday())
    let count = 0
    for (let i = 0; i < 7; i++) {
      const date = addDays(from, i)
      count += daySlots({ photographer: ph, events: events.filter((e) => e.date === date), duration: ph.rules.minShoot, area: f.homeArea, travel: catalog.travel, step: 60 })
        .filter((s) => s.ok).length
    }
    return count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, valid])

  async function save(e) {
    e.preventDefault()
    if (!valid) return
    await saveRules(p.id, { rules: rules(), pricePerHour: n('pricePerHour'), styles: f.styles, homeArea: f.homeArea })
    setSaved(true)
  }

  const num = (k, label, { unit = 'min', step = 15, min = 0 } = {}) => (
    <Field label={t(label)} error={errors[k]}>
      <div className="budget-input">
        <input type="number" inputMode="numeric" min={min} step={step} value={f[k]} onChange={(e) => set(k, e.target.value)} />
        <span>{t(unit)}</span>
      </div>
    </Field>
  )

  return (
    <ProPage
      title={t('Rules & settings')}
      subtitle={`${p.firstName} ${p.lastName} · ${t('These rules decide which free times clients can book.')}`}
      aside={preview != null && (
        <div className="availability-preview" aria-live="polite">
          <strong>{preview}</strong>
          <span>{plural(preview, ['free start time this week', 'free start times this week'], ['вільний старт цього тижня', 'вільні старти цього тижня', 'вільних стартів цього тижня']).replace(String(preview), '').trim()}</span>
        </div>
      )}
    >
      <form onSubmit={save} noValidate>
        <div className="settings-grid">
          <section className="form-card">
            <div className="setting-title">
              <span className="setting-icon"><Icon name="clock" /></span>
              <div>
                <h2>{t('Timing rules')}</h2>
                <p>{t('Control your pace and daily workload.')}</p>
              </div>
            </div>
            <div className="two-col">
              <Field label={t('Break between shoots')}>
                <select value={f.breakMin} onChange={(e) => set('breakMin', Number(e.target.value))}>
                  {[0, 15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{t('{n} min', { n: m })}</option>)}
                </select>
              </Field>
              {num('maxPerDay', 'Maximum minutes per day')}
              {num('minShoot', 'Shortest shoot', { min: 15 })}
              {num('maxShoot', 'Longest shoot')}
            </div>
          </section>

          <section className="form-card">
            <div className="setting-title">
              <span className="setting-icon"><Icon name="location" /></span>
              <div>
                <h2>{t('Travel & area')}</h2>
                <p>{t('Clients in areas further away than this do not see you.')}</p>
              </div>
            </div>
            <div className="two-col">
              <Field label={t('Home area')}>
                <select value={f.homeArea} onChange={(e) => set('homeArea', e.target.value)}>
                  {catalog.areas.map((a) => <option key={a.id} value={a.id}>{areaName(a.id)}</option>)}
                </select>
              </Field>
              {num('maxTravelMin', 'Travel distance', { step: 5 })}
            </div>
            <div className="field">
              <span>{t('Transport')}</span>
              <div className="segmented" role="radiogroup" aria-label={t('Transport')}>
                {TRANSPORT.map(([v, label]) => (
                  <button type="button" key={v} role="radio" aria-checked={f.transport === v} className={f.transport === v ? 'active' : ''} onClick={() => set('transport', v)}>
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="form-card wide">
            <div className="setting-title">
              <span className="setting-icon"><Icon name="camera" /></span>
              <div>
                <h2>{t('Services & price')}</h2>
                <p>{t('Choose what you shoot and your price per hour.')}</p>
              </div>
            </div>
            {num('pricePerHour', 'Price per hour', { unit: 'UAH', step: 50, min: 100 })}
            <div className={`field ${errors.styles ? 'has-error' : ''}`}>
              <span>{t('Styles')}</span>
              <div className="select-tags">
                {catalog.styles.map((s) => {
                  const on = f.styles.includes(s.id)
                  return (
                    <button type="button" key={s.id} className={on ? 'active' : ''} aria-pressed={on}
                      onClick={() => set('styles', on ? f.styles.filter((x) => x !== s.id) : [...f.styles, s.id])}>
                      {on && <Icon name="check" size={14} />} {styleName(s.id)}
                    </button>
                  )
                })}
              </div>
              {errors.styles && <em className="field-error">{errors.styles}</em>}
            </div>
          </section>
        </div>

        <div className="sticky-save">
          <span>{valid ? t('Changes apply to new bookings. The search uses them at once.') : t('Fix the fields marked in red to save.')}</span>
          <button className="btn btn-primary" disabled={!valid}>{t('Save rules')}</button>
        </div>
      </form>
      {saved && <Toast>{t('Rules saved. New bookings follow them.')}</Toast>}
    </ProPage>
  )
}
