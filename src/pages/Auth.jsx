import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Field } from '../components/ui.jsx'
import { signUp, logIn } from '../lib/store.js'
import { EMAIL_RE, PHONE_RE } from './Booking.jsx'

function useNext() {
  const [params] = useSearchParams()
  const next = params.get('next')
  return next && next.startsWith('/') ? next : null
}

export function SignUp() {
  const [params] = useSearchParams()
  const next = useNext()
  const navigate = useNavigate()
  const [f, setF] = useState({
    role: params.get('role') === 'photographer' ? 'photographer' : 'client',
    firstName: '', lastName: '', email: '', phone: '', password: '', consent: false,
  })
  const [tried, setTried] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const errors = {
    firstName: !f.firstName.trim() ? 'Fill in this field' : null,
    lastName: !f.lastName.trim() ? 'Fill in this field' : null,
    email: !f.email.trim() ? 'Fill in this field' : !EMAIL_RE.test(f.email) ? 'Enter an email like name@example.com' : serverError,
    phone: !f.phone.trim() ? 'Fill in this field' : !PHONE_RE.test(f.phone) ? 'Enter a phone number like +380 67 123 45 67' : null,
    password: f.password.length < 8 ? 'Use at least 8 characters' : null,
    consent: !f.consent ? 'Please agree to continue' : null,
  }
  const err = (k) => (tried ? errors[k] : null)

  async function submit(e) {
    e.preventDefault()
    setTried(true)
    if (Object.entries(errors).some(([k, v]) => v && !(k === 'email' && v === serverError))) return
    setBusy(true)
    try {
      const user = await signUp({ ...f, firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim() })
      navigate(user.role === 'photographer' ? '/photographer/profile' : next || '/')
    } catch (e2) {
      setServerError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page narrow">
      <form className="card form" onSubmit={submit} noValidate>
        <h1>Create an account</h1>
        <div className="role-choice" role="radiogroup" aria-label="Account type">
          {[['client', 'I want to book a photographer'], ['photographer', 'I am a photographer']].map(([r, label]) => (
            <button type="button" key={r} role="radio" aria-checked={f.role === r} className={`role-option ${f.role === r ? 'on' : ''}`} onClick={() => set('role', r)}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid-2">
          <Field label="First name" error={err('firstName')}><input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="given-name" /></Field>
          <Field label="Last name" error={err('lastName')}><input value={f.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="family-name" /></Field>
        </div>
        <Field label="Email" error={err('email')}>
          <input type="email" value={f.email} onChange={(e) => { set('email', e.target.value); setServerError(null) }} autoComplete="email" />
        </Field>
        <Field label="Phone" error={err('phone')}><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="+380" /></Field>
        <Field label="Password" error={err('password')} hint="At least 8 characters">
          <input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
        </Field>
        <label className={`check ${err('consent') ? 'has-error' : ''}`}>
          <input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>
            I agree to the <Link to="/terms" target="_blank">terms of service</Link> and the <Link to="/privacy" target="_blank">privacy policy</Link>. I understand this is a course demo.
          </span>
        </label>
        {err('consent') && <span className="field-error">{err('consent')}</span>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>Create account</button>
        <p className="center"><Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>I already have an account</Link></p>
      </form>
    </div>
  )
}

export function LogIn() {
  const next = useNext()
  const navigate = useNavigate()
  const [f, setF] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await logIn(f)
      navigate(user.role === 'photographer' ? '/photographer/bookings' : next || '/')
    } catch (e2) {
      setError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page narrow">
      <form className="card form" onSubmit={submit}>
        <h1>Log in</h1>
        <Field label="Email"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
        <Field label="Password"><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></Field>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>Log in</button>
        {error && <p className="field-error center" role="alert">{error}</p>}
        <p className="center"><Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></p>
        <p className="muted small center">Demo: accounts are saved only in this browser until the team's server is ready.</p>
      </form>
    </div>
  )
}
