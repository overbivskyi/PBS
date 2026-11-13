import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Field, Icon } from '../components/ui.jsx'
import { Logo } from '../components/Layout.jsx'
import { signUp, logIn } from '../lib/store.js'
import { PHOTOS, unsplash } from '../lib/photos.js'
import { EMAIL_RE, PHONE_RE } from './Booking.jsx'

function useNext() {
  const [params] = useSearchParams()
  const next = params.get('next')
  return next && next.startsWith('/') ? next : null
}

// Sign-up and login pages have no header or footer, as in the design.
function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <div className="auth-visual">
        <img src={unsplash(PHOTOS.couple, 1200)} alt="Couple during a relaxed photo shoot" />
        <div className="auth-quote">
          <Icon name="camera" size={26} />
          <p>“The easiest way to turn a moment into something you can keep.”</p>
          <span>Real people. Right place. Right time.</span>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-logo"><Logo /></div>
        <div className="auth-form">{children}</div>
      </div>
    </main>
  )
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
    email: !f.email.trim() ? 'Fill in this field' : !EMAIL_RE.test(f.email) ? 'Enter an email like name@example.com' : null,
    phone: !f.phone.trim() ? 'Fill in this field' : !PHONE_RE.test(f.phone) ? 'Enter a phone number like +380 67 123 45 67' : null,
    password: f.password.length < 8 ? 'Use at least 8 characters' : null,
    consent: !f.consent ? 'Please agree to continue' : null,
  }
  const err = (k) => (tried ? errors[k] : null)

  async function submit(e) {
    e.preventDefault()
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
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
    <AuthLayout>
      <form onSubmit={submit} noValidate>
        <span className="kicker">Join Snaply</span>
        <h1>Create your account</h1>
        <p>One account for your bookings, or for your photo business.</p>
        <div className="role-choice" role="radiogroup" aria-label="Account type">
          <button type="button" role="radio" aria-checked={f.role === 'client'} className={f.role === 'client' ? 'active' : ''} onClick={() => set('role', 'client')}>
            <Icon name="user" />
            <span><strong>I want to book a photographer</strong><small>I’m looking for a shoot</small></span>
          </button>
          <button type="button" role="radio" aria-checked={f.role === 'photographer'} className={f.role === 'photographer' ? 'active' : ''} onClick={() => set('role', 'photographer')}>
            <Icon name="camera" />
            <span><strong>I am a photographer</strong><small>I want to get bookings</small></span>
          </button>
        </div>
        <div className="auth-fields">
          <div className="two-col">
            <Field label="First name" error={err('firstName')}><input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="given-name" placeholder="Alex" /></Field>
            <Field label="Last name" error={err('lastName')}><input value={f.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="family-name" placeholder="Morgan" /></Field>
          </div>
          <Field label="Email" error={err('email') || serverError}>
            <input type="email" value={f.email} onChange={(e) => { set('email', e.target.value); setServerError(null) }} autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Phone" error={err('phone')}><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="+380 00 000 00 00" /></Field>
          <Field label="Password" error={err('password')}>
            <input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
          </Field>
        </div>
        <label className={`consent ${err('consent') ? 'has-error' : ''}`}>
          <input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>
            I agree to the <Link to="/terms" target="_blank">terms of service</Link> and the <Link to="/privacy" target="_blank">privacy policy</Link>. I understand this is a course demo.
          </span>
        </label>
        {err('consent') && <em className="field-error">{err('consent')}</em>}
        <button className="btn btn-primary auth-submit" disabled={busy}>Create account</button>
        <p className="auth-switch">
          <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>I already have an account</Link>
        </p>
      </form>
    </AuthLayout>
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
    <AuthLayout>
      <form onSubmit={submit}>
        <span className="kicker">Welcome back</span>
        <h1>Log in to Snaply</h1>
        <p>Enter your details to continue.</p>
        <div className="auth-fields">
          <Field label="Email"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" placeholder="you@example.com" /></Field>
          <Field label="Password"><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" placeholder="Your password" /></Field>
        </div>
        <button className="btn btn-primary auth-submit" disabled={busy}>Log in</button>
        {error && <p className="field-error auth-error" role="alert">{error}</p>}
        <p className="auth-switch">
          <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
        </p>
        <p className="auth-note">Demo: accounts are saved only in this browser until the team's server is ready.</p>
      </form>
    </AuthLayout>
  )
}
