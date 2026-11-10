import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, ErrorState, Empty, Modal } from '../../components/ui.jsx'
import { useAsync, useStoreVersion } from '../../lib/hooks.js'
import { getPhotographer, listEvents, isCalendarConnected, setCalendarConnected, areaName, styleName } from '../../lib/store.js'
import { addDays, weekStart, formatDate, toHHMM, uah, DAY_START, DAY_END } from '../../lib/time.js'
import { PhotographerGate, PhotographerTabs, demoToday } from './common.jsx'

export default function Bookings() {
  return <PhotographerGate>{(id) => <BookingsPage id={id} />}</PhotographerGate>
}

function BookingsPage({ id }) {
  const version = useStoreVersion()
  const data = useAsync(async () => ({ p: await getPhotographer(id), events: await listEvents(id) }), [id, version])
  const [from, setFrom] = useState(weekStart(demoToday()))
  const [open, setOpen] = useState(null)

  if (data.status === 'loading') return <div className="container page"><Loading /></div>
  if (data.status === 'error') return <div className="container page"><ErrorState text="We could not load your bookings. Try again." onRetry={data.retry} /></div>
  const { p, events } = data.data
  const connected = isCalendarConnected(id)
  const today = demoToday()
  const bookings = events.filter((e) => e.kind === 'booking')
  const upcoming = bookings.filter((e) => e.date >= today)
  const week = events.filter((e) => e.date >= from && e.date < addDays(from, 7))
  const weekBookings = week.filter((e) => e.kind === 'booking')

  return (
    <div className="container page">
      <PhotographerTabs />
      <div className="page-head">
        <h1>Bookings · {p.firstName} {p.lastName}</h1>
        {connected ? (
          <span className="status-ok">✓ Google Calendar connected</span>
        ) : (
          <button className="btn" onClick={() => setCalendarConnected(id, true)}>Connect Google Calendar</button>
        )}
      </div>

      <div className="summary-tiles">
        <div className="tile"><span>Bookings this week</span><strong>{weekBookings.length}</strong></div>
        <div className="tile"><span>Minutes booked</span><strong>{weekBookings.reduce((s, e) => s + e.duration, 0)}</strong></div>
        <div className="tile"><span>Deposits received</span><strong>{uah(weekBookings.reduce((s, e) => s + e.deposit, 0))}</strong></div>
      </div>

      <section className="card">
        <div className="week-nav">
          <button className="icon-btn" aria-label="Previous week" onClick={() => setFrom(addDays(from, -7))}>‹</button>
          <span>{formatDate(from)} – {formatDate(addDays(from, 6))}</span>
          <button className="icon-btn" aria-label="Next week" onClick={() => setFrom(addDays(from, 7))}>›</button>
        </div>
        <WeekCalendar from={from} events={week} breakMin={p.rules.breakMin} onOpen={setOpen} />
        <div className="legend">
          <span><i className="ev-booking" /> Booking from the service</span>
          <span><i className="ev-calendar" /> Other calendar event</span>
          <span><i className="ev-break" /> Break after a shoot</span>
        </div>
      </section>

      <section className="card">
        <h2>Upcoming bookings</h2>
        {upcoming.length === 0 ? (
          <Empty>
            <p>No bookings yet. Clients see your free times as soon as your rules are set.</p>
            <Link className="btn btn-primary" to="/photographer/rules">Set my rules</Link>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Client</th><th>Date</th><th>Time</th><th>Duration</th><th>Area</th><th>Address</th><th>Style</th><th>Deposit paid</th><th>Left</th><th>Status</th></tr>
              </thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id} onClick={() => setOpen(b)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(b)}>
                    <td>{b.clientName}</td>
                    <td>{formatDate(b.date)}</td>
                    <td>{toHHMM(b.start)}</td>
                    <td>{b.duration} min</td>
                    <td>{areaName(b.area)}</td>
                    <td>{b.address}</td>
                    <td>{styleName(b.style)}</td>
                    <td>{uah(b.deposit)}</td>
                    <td>{uah(b.total - b.deposit)}</td>
                    <td><span className="status-ok">Confirmed, deposit paid</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <Modal title={open.kind === 'booking' ? `Booking ${open.id.toUpperCase()}` : open.title} onClose={() => setOpen(null)}>
          {open.kind === 'booking' ? (
            <dl className="details">
              <dt>Client</dt><dd>{open.clientFullName ?? open.clientName}</dd>
              {open.clientPhone && <><dt>Phone</dt><dd>{open.clientPhone}</dd></>}
              <dt>Date</dt><dd>{formatDate(open.date, { weekday: 'long', day: 'numeric', month: 'long' })}</dd>
              <dt>Time</dt><dd>{toHHMM(open.start)}–{toHHMM(open.start + open.duration)} ({open.duration} min)</dd>
              <dt>Area</dt><dd>{areaName(open.area)}</dd>
              <dt>Address</dt><dd>{open.address}</dd>
              <dt>Style</dt><dd>{styleName(open.style)}</dd>
              <dt>Deposit paid</dt><dd>{uah(open.deposit)}</dd>
              <dt>Left to pay</dt><dd>{uah(open.total - open.deposit)}</dd>
              <dt>Status</dt><dd>Confirmed, deposit paid</dd>
              <dt>Client's note</dt><dd>{open.note || '—'}</dd>
            </dl>
          ) : (
            <p>{formatDate(open.date)}, {toHHMM(open.start)}–{toHHMM(open.start + open.duration)}. Event from your Google Calendar.</p>
          )}
          <button className="btn btn-block" onClick={() => setOpen(null)}>Close</button>
        </Modal>
      )}
    </div>
  )
}

const HOUR_PX = 40

function WeekCalendar({ from, events, breakMin, onOpen }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START + i * 60)
  const y = (min) => ((min - DAY_START) / 60) * HOUR_PX
  return (
    <div className="week-cal-wrap">
      <div className="week-cal" style={{ '--h': `${HOUR_PX}px` }}>
        <div className="wc-times">
          <div className="wc-head" />
          {hours.map((h) => <div key={h} className="wc-hour">{toHHMM(h)}</div>)}
        </div>
        {days.map((d) => (
          <div key={d} className="wc-day">
            <div className="wc-head">{formatDate(d)}</div>
            <div className="wc-body" style={{ height: hours.length * HOUR_PX }}>
              {events.filter((e) => e.date === d).map((e) => (
                <div key={e.id}>
                  {e.kind === 'booking' && breakMin > 0 && (
                    <div className="ev ev-break" style={{ top: y(e.start + e.duration), height: (breakMin / 60) * HOUR_PX }} />
                  )}
                  <button className={`ev ev-${e.kind}`} style={{ top: y(e.start), height: (e.duration / 60) * HOUR_PX }} onClick={() => onOpen(e)}>
                    <strong>{toHHMM(e.start)}</strong> {e.kind === 'booking' ? `${e.clientName} · ${areaName(e.area)}` : e.title}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
