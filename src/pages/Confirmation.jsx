import { Link, useParams } from 'react-router-dom'
import { Icon, Loading, ErrorState, Photo, Rating } from '../components/ui.jsx'
import { useAsync } from '../lib/hooks.js'
import { getBooking, getPhotographer } from '../lib/store.js'
import { formatDate, toHHMM, uah } from '../lib/time.js'

export default function Confirmation() {
  const { id } = useParams()
  const data = useAsync(async () => {
    const b = await getBooking(id)
    return { b, p: await getPhotographer(b.photographerId) }
  }, [id])

  if (data.status === 'loading') return <main className="page-alt confirmation"><Loading /></main>
  if (data.status === 'error') return <main className="page-alt confirmation"><ErrorState text="We could not find this booking." /></main>
  const { b, p } = data.data

  // Google Calendar link with the shoot prefilled (P1, no API needed)
  const stamp = (min) => `${b.date.replace(/-/g, '')}T${toHHMM(min).replace(':', '')}00`
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Photo shoot with ${p.firstName} ${p.lastName}`)}&dates=${stamp(b.start)}/${stamp(b.start + b.duration)}&ctz=Europe/Kyiv&location=${encodeURIComponent(b.address)}`

  return (
    <main className="page-alt confirmation">
      <div className="confirmation-card">
        <span className="success-icon"><Icon name="check" size={32} /></span>
        <span className="kicker">Booking #{b.id.toUpperCase()}</span>
        <h1>Your shoot is booked</h1>
        <p>The deposit is paid. {p.firstName} has the shoot in the calendar.</p>
        <div className="confirmed-person">
          <Photo photographer={p} width={160} />
          <div>
            <span>Photographer</span>
            <h3>{p.firstName} {p.lastName}</h3>
            <Rating value={p.rating} />
          </div>
        </div>
        <div className="confirmation-grid">
          <div>
            <Icon name="calendar" />
            <span>Date & time<strong>{formatDate(b.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {toHHMM(b.start)}–{toHHMM(b.start + b.duration)}</strong></span>
          </div>
          <div>
            <Icon name="location" />
            <span>Address<strong>{b.address}</strong></span>
          </div>
          <div>
            <Icon name="check" />
            <span>Deposit paid<strong>{uah(b.deposit)}</strong></span>
          </div>
          <div>
            <Icon name="clock" />
            <span>Left to pay<strong>{uah(b.total - b.deposit)} after the shoot</strong></span>
          </div>
        </div>
        <div className="calendar-note">
          <Icon name="calendar" />
          <div>
            <strong>Added to the photographer's calendar</strong>
            <span>Your time is reserved.</span>
          </div>
        </div>
        <div className="confirmation-actions">
          <a className="btn btn-primary" href={gcal} target="_blank" rel="noreferrer">Add to my calendar</a>
          <Link className="btn btn-secondary" to="/">Back to home</Link>
        </div>
      </div>
    </main>
  )
}
