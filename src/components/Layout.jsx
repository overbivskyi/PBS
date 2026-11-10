import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession, useAsync } from '../lib/hooks.js'
import { logOut, setView, listPhotographers, resetDemo } from '../lib/store.js'

export const SERVICE_NAME = 'Snaply' // working name (open question 6)

export default function Layout() {
  const { user, view, photographerId } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
    setAccountOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Logged-in photographers and the team's photographer view go to the bookings page.
  const forPhotographers = photographerId ? '/photographer/bookings' : '/signup?role=photographer'

  return (
    <div className="app">
      <header className="header">
        <div className="container header-row">
          <Link to="/" className="logo">
            <span className="logo-mark" aria-hidden>◉</span> {SERVICE_NAME}
          </Link>
          <button className="menu-btn" aria-expanded={menuOpen} aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? '×' : '☰'}
          </button>
          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            <NavLink to="/search">Find a photographer</NavLink>
            <NavLink to={forPhotographers}>For photographers</NavLink>
            <RoleSwitch view={view} disabled={!!user} />
            {user ? (
              <div className="account">
                <button className="btn btn-ghost" onClick={() => setAccountOpen((o) => !o)} aria-expanded={accountOpen}>
                  {user.firstName} ▾
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
              <div className="account">
                <Link className="btn btn-ghost" to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}>Log in</Link>
                <Link className="btn btn-primary" to="/signup">Sign up</Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-row">
          <p>Course demo: generated profiles and real testers. No real payments.</p>
          <div className="footer-links">
            <Link to="/terms">Terms of service</Link>
            <Link to="/privacy">Privacy policy</Link>
            <button className="link" onClick={() => { if (confirm('Delete all accounts, bookings and edits made in this browser?')) { resetDemo(); navigate('/') } }}>
              Reset demo data
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Team tool for debugging (spec section 3). In this prototype it is visible to everyone
// while nobody is logged in; with the server it will show only for team accounts.
function RoleSwitch({ view, disabled }) {
  const navigate = useNavigate()
  const { data: photographers } = useAsync(() => listPhotographers(), [])
  if (disabled) return null
  return (
    <div className="role-switch" title="Team tool for debugging">
      <span className="role-label">Team view</span>
      <div className="segmented">
        {['client', 'photographer'].map((r) => (
          <button
            key={r}
            className={view.role === r ? 'on' : ''}
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
              {p.firstName} {p.lastName} {p.userType === 'tester' ? '(tester)' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
