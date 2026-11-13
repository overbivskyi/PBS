import { Link, NavLink } from 'react-router-dom'
import { useSession } from '../../lib/hooks.js'
import { catalog } from '../../lib/store.js'
import { Icon, Loading, ErrorState } from '../../components/ui.jsx'
import { addDays } from '../../lib/time.js'

// The demo runs on fixed dates. "Today" is the real date while it is inside the demo weeks,
// otherwise the first demo day.
export function demoToday() {
  const today = new Date().toISOString().slice(0, 10)
  const { demoStart, demoDays } = catalog.meta
  return today >= demoStart && today < addDays(demoStart, demoDays) ? today : demoStart
}

// Wraps photographer pages: needs a logged-in photographer or the team role switch.
export function PhotographerGate({ children }) {
  const { photographerId } = useSession()
  if (!photographerId) {
    return (
      <main className="page-alt confirmation">
        <div className="confirmation-card gate">
          <span className="success-icon gate-icon"><Icon name="camera" size={30} /></span>
          <h1>For photographers</h1>
          <p>Log in as a photographer to see your bookings and rules.</p>
          <div className="confirmation-actions">
            <Link className="btn btn-primary" to="/signup?role=photographer">Sign up</Link>
            <Link className="btn btn-secondary" to="/login">Log in</Link>
          </div>
        </div>
      </main>
    )
  }
  return children(photographerId)
}

// Page frame of the photographer workspace: heading, side element and the tabs.
export function ProPage({ title, subtitle, aside, children }) {
  return (
    <main className="page-alt">
      <div className="container pro-page">
        <div className="pro-heading">
          <div>
            <span className="kicker">Photographer workspace</span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {aside}
        </div>
        <nav className="pro-tabs">
          <NavLink to="/photographer/bookings">Bookings & calendar</NavLink>
          <NavLink to="/photographer/rules">Rules & settings</NavLink>
          <NavLink to="/photographer/profile">Profile settings</NavLink>
        </nav>
        {children}
      </div>
    </main>
  )
}

export function ProLoading({ state, text }) {
  return (
    <main className="page-alt">
      <div className="container pro-page">
        {state.status === 'loading' ? <Loading /> : <ErrorState text={text} onRetry={state.retry} />}
      </div>
    </main>
  )
}

// Downscales an uploaded image so it fits in browser storage.
export function readImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) return reject(new Error('Use a JPG or PNG file'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read the image'))
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k)
        c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.72))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
