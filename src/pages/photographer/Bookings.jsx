import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Icon } from '../../components/ui.jsx'
import { useAsync, useStoreVersion } from '../../lib/hooks.js'
import { getPhotographer, listEvents, isCalendarConnected, setCalendarConnected, areaName, styleName } from '../../lib/store.js'
import { addDays, weekStart, formatDate, formatDuration, toHHMM, uah, DAY_START, DAY_END } from '../../lib/time.js'
import { PhotographerGate, ProPage, ProLoading, demoToday } from './common.jsx'

export default function Bookings() {
  return <PhotographerGate>{(id) => <BookingsPage id={id} />}</PhotographerGate>
}

function BookingsPage({ id }) {
  const version = useStoreVersion()
  const data = useAsync(async () => ({ p: await getPhotographer(id), events: await listEvents(id) }), [id, version])
  const [from, setFrom] = useState(weekStart(demoToday()))

  if (data.status !== 'ready') return <ProLoading state={data} text="We could not load your bookings. Try again." />
  const { p, events } = data.data
  const connected = isCalendarConnected(id)
  const today = demoToday()
  const upcoming = events.filter((e) => e.kind === 'booking' && e.date >= today)
  const week = events.filter((e) => e.date >= from && e.date < addDays(from, 7))
  const weekBookings = week.filter((e) => e.kind === 'booking')
  const minutes = weekBookings.reduce((s, e) => s + e.duration, 0)

  return (
    <ProPage
      title="Bookings & calendar"
      subtitle={`${p.firstName} ${p.lastName} · ${formatDate(from, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(from, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`}
      aside={
        connected ? (
          <div className="connected">
            <span />
            <div><strong>Google Calendar connected</strong><small>Demo calendar</small></div>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => setCalendarConnected(id, true)}><Icon name="calendar" size={18} /> Connect Google Calendar</button>
        )
      }
    >
      <div className="week-summary">
        <div><span>Bookings this week</span><strong>{weekBookings.length}</strong></div>
        <div><span>Minutes booked</span><strong>{minutes} min</strong></div>
        <div><span>Deposits received</span><strong>{uah(weekBookings.reduce((s, e) => s + e.deposit, 0))}</strong></div>
        <div><span>Expected after shoots</span><strong>{uah(weekBookings.reduce((s, e) => s + e.total - e.deposit, 0))}</strong></div>
      </div>

      <section className="calendar-card">
        <div className="calendar-top">
          <div className="calendar-title">
            <h2>Your week</h2>
            <div className="week-arrows">
              <button aria-label="Previous week" onClick={() => setFrom(addDays(from, -7))}><Icon name="arrow" /></button>
              <button aria-label="Next week" onClick={() => setFrom(addDays(from, 7))}><Icon name="arrow" /></button>
            </div>
          </div>
          <div className="legend">
            <span><i className="primary-dot" />Booking from the service</span>
            <span><i />Other calendar event</span>
            <span><i className="break-dot" />Break after a shoot</span>
          </div>
        </div>
        <WeekCalendar from={from} events={week} breakMin={p.rules.breakMin} onOpen={(e) => document.getElementById(`row-${e.id}`)?.setAttribute('open', '')} />
      </section>

      <section className="upcoming">
        <div className="section-top">
          <div>
            <span className="kicker">Next up</span>
            <h2>Upcoming bookings</h2>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <Empty>
            <p>No bookings yet. Clients see your free times as soon as your rules are set.</p>
            <Link className="btn btn-primary" to="/photographer/rules">Set my rules</Link>
          </Empty>
        ) : (
          upcoming.map((b) => <BookingRow key={b.id} b={b} />)
        )}
      </section>
    </ProPage>
  )
}

function BookingRow({ b }) {
  const [day, month] = formatDate(b.date, { day: 'numeric', month: 'short' }).split(' ')
  return (
    <details className="booking-row" id={`row-${b.id}`}>
      <summary>
        <span className="booking-date">{day}<small>{month}</small></span>
        <div>
          <strong>{b.clientName} · {styleName(b.style)}</strong>
          <span>{formatDate(b.date)} · {toHHMM(b.start)}–{toHHMM(b.start + b.duration)} · {b.duration} min</span>
        </div>
        <div className="booking-location"><Icon name="location" size={17} />{areaName(b.area)}</div>
        <span className="status">Confirmed, deposit paid</span>
        <strong>{uah(b.deposit)}</strong>
        <Icon name="chevron" />
      </summary>
      <div className="booking-detail">
        <p><b>Booking:</b> {b.id.toUpperCase()}</p>
        <p><b>Client:</b> {b.clientFullName ?? b.clientName}{b.clientPhone ? ` · ${b.clientPhone}` : ''}</p>
        <p><b>Address:</b> {b.address}, {areaName(b.area)}</p>
        <p><b>Deposit paid:</b> {uah(b.deposit)} · <b>Left to pay:</b> {uah(b.total - b.deposit)}</p>
        <p><b>Client note:</b> {b.note || '—'}</p>
      </div>
    </details>
  )
}

function WeekCalendar({ from, events, breakMin, onOpen }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60)
  const pct = (min) => `${((min - DAY_START) / (DAY_END - DAY_START)) * 100}%`
  const span = (min) => `${(min / (DAY_END - DAY_START)) * 100}%`
  return (
    <div className="week-calendar week-7">
      <div className="hours">{hours.map((h) => <span key={h}>{toHHMM(h)}</span>)}</div>
      {days.map((d) => (
        <div className="calendar-day" key={d}>
          <strong>{formatDate(d)}</strong>
          <div className="day-grid">
            {events.filter((e) => e.date === d).map((e) => (
              <div key={e.id}>
                {e.kind === 'booking' && breakMin > 0 && (
                  <span className="break-event" style={{ top: pct(e.start + e.duration), height: span(breakMin) }} />
                )}
                <button
                  className={`event ${e.kind === 'booking' ? 'primary-event' : 'other-event'}`}
                  style={{ top: pct(e.start), height: span(e.duration) }}
                  title={e.kind === 'booking' ? `${e.clientName}, ${areaName(e.area)}` : e.title}
                  onClick={() => e.kind === 'booking' && onOpen(e)}
                >
                  <b>{e.kind === 'booking' ? `${styleName(e.style)} · ${e.clientName}` : e.title}</b>
                  <span>{toHHMM(e.start)}–{toHHMM(e.start + e.duration)} · {formatDuration(e.duration)}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
