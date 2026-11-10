import { useState, forwardRef } from 'react'
import { catalog } from '../lib/store.js'
import { TIME_OPTIONS, DURATION_OPTIONS, formatDuration } from '../lib/time.js'
import { isCompleteSearch } from '../lib/hooks.js'
import { Field } from './ui.jsx'

const REQUIRED = 'Fill in this field'

// The 6 search fields (spec 4.1 and 4.2). All are required.
const SearchForm = forwardRef(function SearchForm({ initial, onSubmit, submitText, compact = false }, dateRef) {
  const [s, setS] = useState(initial)
  const [tried, setTried] = useState(false)
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }))
  const err = (k) => (tried && (k === 'styles' ? s.styles.length === 0 : !s[k]) ? REQUIRED : null)

  function toggleStyle(id) {
    setS((x) => {
      if (x.styles.includes(id)) return { ...x, styles: x.styles.filter((y) => y !== id) }
      if (x.styles.length >= 3) return x
      return { ...x, styles: [...x.styles, id] }
    })
  }

  function submit(e) {
    e.preventDefault()
    setTried(true)
    if (isCompleteSearch(s)) onSubmit(s)
  }

  return (
    <form className={`search-form ${compact ? 'compact' : ''}`} onSubmit={submit} noValidate>
      <div className={`field field-styles ${err('styles') ? 'has-error' : ''}`}>
        <span className="field-label">Styles <span className="muted">(choose 1 to 3)</span></span>
        <div className="chips">
          {catalog.styles.map((st) => (
            <button
              type="button"
              key={st.id}
              className={`chip ${s.styles.includes(st.id) ? 'chip-on' : ''}`}
              aria-pressed={s.styles.includes(st.id)}
              disabled={!s.styles.includes(st.id) && s.styles.length >= 3}
              onClick={() => toggleStyle(st.id)}
            >
              {st.name}
            </button>
          ))}
        </div>
        {err('styles') && <span className="field-error">{err('styles')}</span>}
      </div>

      <div className="search-grid">
        <Field label="Area" error={err('area')}>
          <select value={s.area} onChange={(e) => set('area', e.target.value)}>
            <option value="">Choose an area</option>
            {catalog.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Date" error={err('date')}>
          <input ref={dateRef} type="date" value={s.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Start time" error={err('time')}>
          <select value={s.time} onChange={(e) => set('time', e.target.value)}>
            <option value="">--:--</option>
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Duration" error={err('duration')}>
          <select value={s.duration} onChange={(e) => set('duration', e.target.value)}>
            <option value="">Choose</option>
            {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} min ({formatDuration(d)})</option>)}
          </select>
        </Field>
        <Field label="Budget per hour (UAH)" error={err('budget')}>
          <input type="number" min="100" step="100" inputMode="numeric" placeholder="e.g. 1500" value={s.budget} onChange={(e) => set('budget', e.target.value)} />
        </Field>
      </div>

      <button className="btn btn-primary btn-lg" type="submit">{submitText}</button>
    </form>
  )
})

export default SearchForm
