import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Field, Icon, Loading, ErrorState, Modal, Photo, Rating } from '../components/ui.jsx'
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

  const wrap = (children) => <main className="page-alt"><div className="container narrow-page">{children}</div></main>
  if (!pid || !isCompleteSearch(s)) return wrap(<ErrorState text="This booking link is not complete." />)
  if (p.status === 'loading') return wrap(<Loading />)
  if (p.status === 'error') return wrap(<ErrorState text="We could not load this photographer. Try again." onRetry={p.retry} />)

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return wrap(
      <div className="confirmation-card gate">
        <span className="success-icon gate-icon"><Icon name="user" size={30} /></span>
        <h1>Log in or sign up to book</h1>
        <p>Your photographer, date and time stay selected.</p>
        <div className="confirmation-actions">
          <Link className="btn btn-primary" to={`/signup?role=client&next=${next}`}>Sign up</Link>
          <Link className="btn btn-secondary" to={`/login?next=${next}`}>Log in</Link>
        </div>
      </div>,
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
  const [failed, setFailed] = useState(false)
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

  function pay() {
    setTried(true)
    if (valid) setPaying(true)
  }

  async function confirmPayment() {
    setBusy(true)
    setFailed(false)
    try {
      const b = await createBooking({
        photographerId: ph.id, date: search.date, start, duration, area: search.area, address: f.address.trim(),
        clientName: f.name.trim().split(' ')[0], clientFullName: f.name.trim(), clientPhone: f.phone, clientEmail: f.email,
        clientUserId: user.id, style, note: f.note.trim(),
      })
      navigate(`/confirmation/${b.id}`)
    } catch (e) {
      setPaying(false)
      if (e.code === 'slot_taken') setTaken(await nearestFree({ photographerId: ph.id, date: search.date, start, duration, area: search.area }))
      else setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const changeTime = `/photographer/${ph.id}?${searchToQuery(search)}`
  const payText = `Pay deposit ${uah(deposit)}`

  return (
    <main className="page-alt">
      <div className="container narrow-page">
        <Link className="back-link" to={changeTime}><Icon name="arrow" size={18} /> Back to profile</Link>
        <div className="checkout-head">
          <span>Last step</span>
          <h1>Book your shoot</h1>
          <p>Check the details and pay the deposit. {ph.firstName} gets the booking at once.</p>
        </div>

        {taken && (
          <div className="alert" role="alert">
            <strong>This time is no longer free</strong>
            {taken.length ? (
              <div className="nearest-times">
                <span>Nearest free times</span>
                {taken.map((x) => (
                  <button key={x.time} className="time" onClick={() => { setTaken(null); navigate(`/book?pid=${ph.id}&${searchToQuery({ ...search, time: x.time })}`, { replace: true }) }}>
                    {x.time}
                  </button>
                ))}
              </div>
            ) : (
              <p>No free times left on this day. <Link to={changeTime}>Pick another day</Link></p>
            )}
          </div>
        )}
        {failed && <div className="alert" role="alert"><strong>We could not complete the payment. Try again.</strong></div>}

        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={(e) => { e.preventDefault(); pay() }} noValidate>
            <section className="form-card">
              <div className="form-card-title">
                <span>1</span>
                <div>
                  <h2>Shoot details</h2>
                  <p>Where should {ph.firstName} meet you?</p>
                </div>
              </div>
              <Field label="Exact meeting place" error={err('address')}>
                <input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, building, or landmark" />
              </Field>
              <Field label="Anything the photographer should know" note="Optional">
                <textarea rows={4} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder={`Tell ${ph.firstName} about the mood, people, or any special requests…`} />
              </Field>
            </section>
            <section className="form-card">
              <div className="form-card-title">
                <span>2</span>
                <div>
                  <h2>Your contact details</h2>
                  <p>Filled in from your account.</p>
                </div>
              </div>
              <div className="two-col">
                <Field label="Name" error={err('name')}><input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></Field>
                <Field label="Phone" error={err('phone')}><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></Field>
              </div>
              <Field label="Email" error={err('email')}><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></Field>
            </section>
            <label className={`consent ${err('terms') ? 'has-error' : ''}`}>
              <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
              <span>I agree to the <Link to="/terms" target="_blank">terms</Link> and the cancellation rules</span>
            </label>
            {err('terms') && <em className="field-error">{err('terms')}</em>}
            <button className="btn btn-primary pay-mobile" type="submit">{payText}</button>
          </form>

          <aside className="order-card">
            <div className="order-person">
              <Photo photographer={ph} width={160} />
              <div>
                <span>Your photographer</span>
                <h3>{ph.firstName} {ph.lastName}</h3>
                <Rating value={ph.rating} />
              </div>
            </div>
            <div className="order-details">
              <span><Icon name="camera" size={18} /><b>{styleName(style)}</b></span>
              <span><Icon name="calendar" size={18} /><b>{formatDate(search.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b></span>
              <span><Icon name="clock" size={18} /><b>{search.time}–{toHHMM(start + duration)} · {duration} min</b></span>
              <span><Icon name="location" size={18} /><b>{areaName(search.area)}, Kyiv</b></span>
            </div>
            <Link className="text-link" to={changeTime}>Change time</Link>
            <div className="price-lines">
              <div><span>{uah(ph.pricePerHour)}/h × {duration} min / 60</span><b>{uah(total)}</b></div>
              <div className="deposit"><span>Pay now: 30% deposit</span><b>{uah(deposit)}</b></div>
              <div><span>Pay after the shoot: 70%</span><b>{uah(total - deposit)}</b></div>
            </div>
            <button className="btn btn-primary" onClick={pay}>{payText}</button>
            <small><Icon name="shield" size={15} /> The deposit goes to the photographer only after the shoot</small>
          </aside>
        </div>
      </div>

      {paying && (
        <Modal title="Demo payment" icon="shield" onClose={() => !busy && setPaying(false)}>
          <p>Demo payment, no money is charged.</p>
          <div className="modal-total"><span>Deposit</span><strong>{uah(deposit)}</strong></div>
          <button className="btn btn-primary" disabled={busy} onClick={confirmPayment}>{busy ? 'Checking the time…' : 'Confirm payment'}</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => setPaying(false)}>Cancel</button>
        </Modal>
      )}
    </main>
  )
}
