import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession, useAsync } from '../lib/hooks.js'
import { logOut, setView, listPhotographers, resetDemo } from '../lib/store.js'
import { Icon } from './ui.jsx'

export const SERVICE_NAME = 'Snaply' // working name (open question 6)

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark"><Icon name="camera" size={20} /></span>
      {SERVICE_NAME}
    </Link>
  )
}

export default function Layout() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app">
      <Header />
      <Outlet />
      <Footer />
    </div>
  )
}

function Header() {
  const { user, view, photographerId } = useSession()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setOpen(false)
    setAccountOpen(false)
  }, [location.pathname])

  const forPhotographers = photographerId ? '/photographer/bookings' : '/signup?role=photographer'
  const next = encodeURIComponent(location.pathname + location.search)

  return (
    <header className="header">
      <div className="nav-wrap">
        <Logo />
        <nav className={`nav-links ${open ? 'nav-open' : ''}`}>
          <NavLink to="/search">Find a photographer</NavLink>
          <NavLink to={forPhotographers}>For photographers</NavLink>
          {!user && (
            <span className="mobile-only nav-auth">
              <Link to={`/login?next=${next}`}>Log in</Link>
              <Link to="/signup">Sign up</Link>
            </span>
          )}
        </nav>
        <div className="nav-actions">
          {!user && <RoleSwitch view={view} />}
          {user ? (
            <div className="account">
              <button className="avatar-button" onClick={() => setAccountOpen((o) => !o)} aria-expanded={accountOpen}>
                <span>{user.firstName[0]}{user.lastName[0]}</span>
                <span className="desktop-only">{user.firstName}</span>
              </button>
              {accountOpen && (
                <div className="account-menu">
                  {user.role === 'photographer' && (
                    <>
                      <Link to="/photographer/bookings">My bookings</Link>
                      <Link to="/photographer/rules">Rules</Link>
                      <Link to="/photographer/profile">Profile settings</Link>
                    </>
                  )}
                  <button onClick={() => { logOut(); navigate('/') }}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="btn btn-ghost desktop-only" to={`/login?next=${next}`}>Log in</Link>
              <Link className="btn btn-primary desktop-only nav-signup" to="/signup">Sign up</Link>
            </>
          )}
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Open menu" aria-expanded={open}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  )
}

// Team tool for debugging (spec section 3). In this prototype it is visible while nobody
// is logged in; with the server it will show only for team accounts.
function RoleSwitch({ view }) {
  const navigate = useNavigate()
  const { data: photographers } = useAsync(() => listPhotographers(), [])
  return (
    <div className="team-switch" title="Team view: a debugging tool for the team">
      <div className="role-switch" aria-label="Team view">
        {['client', 'photographer'].map((r) => (
          <button
            key={r}
            className={view.role === r ? 'active' : ''}
            onClick={() => {
              setView({ role: r })
              navigate(r === 'photographer' ? '/photographer/bookings' : '/')
            }}
          >
            {r === 'client' ? 'Client' : 'Photographer'}
          </button>
        ))}
      </div>
      {view.role === 'photographer' && photographers && (
        <select aria-label="Photographer" value={view.photographerId} onChange={(e) => setView({ photographerId: e.target.value })}>
          {photographers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}{p.userType === 'tester' ? ' (tester)' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

function Footer() {
  const navigate = useNavigate()
  return (
    <footer>
      <div className="footer-inner">
        <Logo />
        <p>Course demo: generated profiles and real testers. No real payments.</p>
        <div>
          <Link to="/terms">Terms of service</Link>
          <Link to="/privacy">Privacy policy</Link>
          <button
            className="footer-reset"
            onClick={() => {
              if (confirm('Delete all accounts, bookings and edits made in this browser?')) {
                resetDemo()
                navigate('/')
              }
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>
    </footer>
  )
}
