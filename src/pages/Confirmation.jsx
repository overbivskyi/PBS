import { Link, useParams } from 'react-router-dom'
import { Loading, ErrorState } from '../components/ui.jsx'
import { useAsync } from '../lib/hooks.js'
import { getBooking, getPhotographer } from '../lib/store.js'
import { formatDate, toHHMM, uah } from '../lib/time.js'

export default function Confirmation() {
  const { id } = useParams()
  const data = useAsync(async () => {
    const b = await getBooking(id)
    return { b, p: await getPhotographer(b.photographerId) }
  }, [id])

  if (data.status === 'loading') return <div className="container page"><Loading /></div>
  if (data.status === 'error') return <div className="container page"><ErrorState text="We could not find this booking." /></div>
  const { b, p } = data.data

  // Google Calendar link with the shoot prefilled (P1, no API needed)
  const stamp = (min) => `${b.date.replace(/-/g, '')}T${toHHMM(min).replace(':', '')}00`
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Photo shoot with ${p.firstName} ${p.lastName}`)}&dates=${stamp(b.start)}/${stamp(b.start + b.duration)}&ctz=Europe/Kyiv&location=${encodeURIComponent(b.address)}`

  return (
    <div className="container page narrow">
      <div className="card center confirm">
        <div className="confirm-icon" aria-hidden>✓</div>
        <h1>Your shoot is booked</h1>
        <dl className="details">
          <dt>Booking number</dt><dd>{b.id.toUpperCase()}</dd>
          <dt>Photographer</dt><dd>{p.firstName} {p.lastName}</dd>
          <dt>Date</dt><dd>{formatDate(b.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          <dt>Time</dt><dd>{toHHMM(b.start)}–{toHHMM(b.start + b.duration)} ({b.duration} min)</dd>
          <dt>Address</dt><dd>{b.address}</dd>
          <dt>Deposit paid</dt><dd>{uah(b.deposit)}</dd>
          <dt>Left to pay after the shoot</dt><dd>{uah(b.total - b.deposit)}</dd>
        </dl>
        <p className="calendar-line">✓ Added to the photographer's calendar</p>
        <div className="actions center">
          <a className="btn" href={gcal} target="_blank" rel="noreferrer">Add to my calendar</a>
          <Link className="btn" to="/">Back to home</Link>
        </div>
      </div>
    </div>
  )
}
