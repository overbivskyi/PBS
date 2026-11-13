import { useEffect, useRef, useState, forwardRef } from 'react'
import { catalog, styleName } from '../lib/store.js'
import { TIME_OPTIONS, DURATION_OPTIONS } from '../lib/time.js'
import { isCompleteSearch } from '../lib/hooks.js'
import { Field, Icon } from './ui.jsx'

const REQUIRED = 'Fill in this field'

// The 6 search fields (spec 4.1 and 4.2). All are required.
const SearchForm = forwardRef(function SearchForm({ initial, onSubmit, submitText, compact = false }, dateRef) {
  const [s, setS] = useState(initial)
  const [tried, setTried] = useState(false)
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }))
  const err = (k) => (tried && (k === 'styles' ? s.styles.length === 0 : !s[k]) ? REQUIRED : null)

  function submit(e) {
    e.preventDefault()
    setTried(true)
    if (isCompleteSearch(s)) onSubmit(s)
  }

  return (
    <form className={`search-form ${compact ? 'search-compact' : ''}`} onSubmit={submit} noValidate>
      <StylePicker value={s.styles} onChange={(v) => set('styles', v)} error={err('styles')} />
      <Field label="Area" icon="location" error={err('area')}>
        <select value={s.area} onChange={(e) => set('area', e.target.value)}>
          <option value="">Choose</option>
          {catalog.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Date" icon="calendar" error={err('date')}>
        <input ref={dateRef} type="date" value={s.date} onChange={(e) => set('date', e.target.value)} />
      </Field>
      <Field label="Start time" icon="clock" error={err('time')}>
        <select value={s.time} onChange={(e) => set('time', e.target.value)}>
          <option value="">--:--</option>
          {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Duration" error={err('duration')}>
        <select value={s.duration} onChange={(e) => set('duration', e.target.value)}>
          <option value="">Choose</option>
          {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
        </select>
      </Field>
      <Field label="Budget per hour" error={err('budget')}>
        <div className="budget-input">
          <input type="number" min="100" step="100" inputMode="numeric" placeholder="1500" value={s.budget} onChange={(e) => set('budget', e.target.value)} />
          <span>UAH</span>
        </div>
      </Field>
      <button className="btn btn-primary" type="submit">
        {submitText} <Icon name="chevron" size={18} />
      </button>
    </form>
  )
})

export default SearchForm

// Styles: choose 1 to 3, in a dropdown so the form keeps the design's one-line layout.
function StylePicker({ value, onChange, error }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function toggle(id) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else if (value.length < 3) onChange([...value, id])
  }

  return (
    <div className={`field style-picker ${error ? 'has-error' : ''}`} ref={ref}>
      <span>Styles <small>1 to 3</small></span>
      <button type="button" className="field-control picker-button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="camera" size={18} />
        <span className={value.length ? '' : 'placeholder'}>{value.length ? value.map(styleName).join(', ') : 'Choose'}</span>
        <Icon name="down" size={16} />
      </button>
      {open && (
        <div className="picker-menu" role="listbox" aria-multiselectable="true">
          {catalog.styles.map((st) => {
            const on = value.includes(st.id)
            return (
              <button type="button" key={st.id} role="option" aria-selected={on} className={on ? 'active' : ''}
                disabled={!on && value.length >= 3} onClick={() => toggle(st.id)}>
                <span className="picker-check">{on && <Icon name="check" size={14} />}</span>
                {st.name}
                <small>{st.group}</small>
              </button>
            )
          })}
        </div>
      )}
      {error && <em className="field-error">{error}</em>}
    </div>
  )
}
