import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Field, Loading, ErrorState, Modal } from '../components/ui.jsx'
import { useAsync, useSession, useSearchState, searchToQuery, isCompleteSearch } from '../lib/hooks.js'
import { getPhotographer, createBooking, nearestFree, areaName, styleName } from '../lib/store.js'
import { formatDate, toHHMM, toMin, uah } from '../lib/time.js'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_RE = /^\+?[\d\s()-]{10,}$/

export default function Booking() {
  const [params] = useSearchParams()
  const pid = params.get('pid')
  const s = useSearchState()
  const { user } = useSession()
  const location = useLocation()
  const p = useAsync(() => getPhotographer(pid), [pid])

  if (!pid || !isCompleteSearch(s)) return <div className="container page"><ErrorState text="This booking link is not complete." /></div>
  if (p.status === 'loading') return <div className="container page"><Loading /></div>
  if (p.status === 'error') return <div className="container page"><ErrorState text="We could not load this photographer. Try again." onRetry={p.retry} /></div>

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return (
      <div className="container page narrow">
        <div className="card center">
          <h1>Log in or sign up to book</h1>
          <p className="muted">Your photographer, date and time stay selected.</p>
          <div className="actions center">
            <Link className="btn btn-primary" to={`/signup?role=client&next=${next}`}>Sign up</Link>
            <Link className="btn" to={`/login?next=${next}`}>Log in</Link>
          </div>
        </div>
      </div>
    )
  }

  return <BookingForm photographer={p.data} search={s} user={user} />
}

function BookingForm({ photographer: ph, search, user }) {
  const navigate = useNavigate()
  const start = toMin(search.time)
  const duration = Number(search.duration)
  const total = Math.round((ph.pricePerHour * duration) / 60)
  const deposit = Math.round(total * 0.3)
  const style = search.styles.find((x) => ph.styles.includes(x)) ?? ph.styles[0] ?? search.styles[0]

  const [f, setF] = useState({ address: '', name: `${user.firstName} ${user.lastName}`, phone: user.phone, email: user.email, note: '', terms: false })
  const [tried, setTried] = useState(false)
  const [paying, setPaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState(null) // nearest free times when the slot is gone
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const errors = {
    address: !f.address.trim() ? 'Fill in this field' : null,
    name: !f.name.trim() ? 'Fill in this field' : null,
    phone: !f.phone.trim() ? 'Fill in this field' : !PHONE_RE.test(f.phone) ? 'Enter a phone number like +380 67 123 45 67' : null,
    email: !f.email.trim() ? 'Fill in this field' : !EMAIL_RE.test(f.email) ? 'Enter an email like name@example.com' : null,
    terms: !f.terms ? 'Please agree to continue' : null,
  }
  const err = (k) => (tried ? errors[k] : null)
  const valid = Object.values(errors).every((x) => !x)

  async function confirmPayment() {
    setBusy(true)
    try {
      const b = await createBooking({
        photographerId: ph.id, date: search.date, start, duration, area: search.area, address: f.address.trim(),
        clientName: f.name.trim().split(' ')[0], clientFullName: f.name.trim(), clientPhone: f.phone, clientEmail: f.email,
        clientUserId: user.id, style, note: f.note.trim(),
      })
      navigate(`/confirmation/${b.id}`)
    } catch (e) {
      setPaying(false)
      if (e.code === 'slot_taken') {
        setTaken(await nearestFree({ photographerId: ph.id, date: search.date, start, duration, area: search.area }))
      } else {
        alert('Something went wrong. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const changeTime = `/photographer/${ph.id}?${searchToQuery(search)}`

  return (
    <div className="container page narrow">
      <h1>Book your shoot</h1>

      <section className="card summary">
        <Avatar person={ph} size={64} />
        <div>
          <strong>{ph.firstName} {ph.lastName}</strong>
          <div className="muted">{styleName(style)} · {areaName(search.area)}</div>
          <div>
            {formatDate(search.date, { weekday: 'long', day: 'numeric', month: 'long' })}, {search.time}–{toHHMM(start + duration)} ({duration} min)
          </div>
          <Link to={changeTime} className="link">Change time</Link>
        </div>
      </section>

      {taken && (
        <div className="card alert">
          <strong>This time is no longer free</strong>
          {taken.length ? (
            <div className="time-chips">
              {taken.map((x) => (
                <button key={x.time} className="chip chip-time" onClick={() => { setTaken(null); navigate(`/book?pid=${ph.id}&${searchToQuery({ ...search, time: x.time })}`, { replace: true }) }}>
                  {x.time}
                </button>
              ))}
            </div>
          ) : (
            <p>No free times left on this day. <Link to={changeTime}>Pick another day</Link></p>
          )}
        </div>
      )}

      <form className="card form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (valid) setPaying(true) }} noValidate>
        <Field label="Exact meeting place" error={err('address')}>
          <input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, building, landmark" />
        </Field>

        <div className="price-block">
          <div className="row"><span>{uah(ph.pricePerHour)}/h × {duration} min / 60</span><strong>{uah(total)}</strong></div>
          <div className="row accent"><span>Pay now: 30% deposit</span><strong>{uah(deposit)}</strong></div>
          <div className="row muted"><span>Pay after the shoot: 70%</span><span>{uah(total - deposit)}</span></div>
        </div>

        <div className="grid-2">
          <Field label="Name" error={err('name')}><input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></Field>
          <Field label="Phone" error={err('phone')}><input value={f.phone} onChange={(e) => set('phone', e.target.value)} type="tel" autoComplete="tel" /></Field>
        </div>
        <Field label="Email" error={err('email')}><input value={f.email} onChange={(e) => set('email', e.target.value)} type="email" autoComplete="email" /></Field>
        <Field label="Anything the photographer should know (optional)">
          <textarea rows="3" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </Field>

        <label className={`check ${err('terms') ? 'has-error' : ''}`}>
          <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
          <span>I agree to the <Link to="/terms" target="_blank">terms</Link> and the cancellation rules</span>
        </label>
        {err('terms') && <span className="field-error">{err('terms')}</span>}

        <button className="btn btn-primary btn-lg btn-block" type="submit">Pay deposit {uah(deposit)}</button>
        <p className="muted small center">Your deposit is held safely and goes to the photographer only after the shoot.</p>
      </form>

      {paying && (
        <Modal title="Demo payment" onClose={() => !busy && setPaying(false)}>
          <p>Demo payment, no money is charged.</p>
          <p className="big">{uah(deposit)}</p>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={confirmPayment}>
            {busy ? 'Checking the time…' : 'Confirm payment'}
          </button>
        </Modal>
      )}
    </div>
  )
}
