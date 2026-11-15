import { Link, useParams } from 'react-router-dom'
import { Icon, Loading, ErrorState, Photo, Rating } from '../components/ui.jsx'
import { useAsync } from '../lib/hooks.js'
import { getBooking, getPhotographer } from '../lib/store.js'
import { formatDate, toHHMM, uah } from '../lib/time.js'
import { t } from '../lib/i18n.js'

export default function Confirmation() {
  const { id } = useParams()
  const data = useAsync(async () => {
    const b = await getBooking(id)
    return { b, p: await getPhotographer(b.photographerId) }
  }, [id])

  if (data.status === 'loading') return <main className="page-alt confirmation"><Loading /></main>
  if (data.status === 'error') return <main className="page-alt confirmation"><ErrorState text={t('We could not find this booking.')} /></main>
  const { b, p } = data.data

  // Google Calendar link with the shoot prefilled (P1, no API needed)
  const stamp = (min) => `${b.date.replace(/-/g, '')}T${toHHMM(min).replace(':', '')}00`
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t('Photo shoot with {name}', { name: `${p.firstName} ${p.lastName}` }))}&dates=${stamp(b.start)}/${stamp(b.start + b.duration)}&ctz=Europe/Kyiv&location=${encodeURIComponent(b.address)}`

  return (
    <main className="page-alt confirmation">
      <div className="confirmation-card">
        <span className="success-icon"><Icon name="check" size={32} /></span>
        <span className="kicker">{t('Booking #{id}', { id: b.id.toUpperCase() })}</span>
        <h1>{t('Your shoot is booked')}</h1>
        <p>{t('The deposit is paid. {name} has the shoot in the calendar.', { name: p.firstName })}</p>
        <div className="confirmed-person">
          <Photo photographer={p} width={160} />
          <div>
            <span>{t('Photographer')}</span>
            <h3>{p.firstName} {p.lastName}</h3>
            <Rating value={p.rating} />
          </div>
        </div>
        <div className="confirmation-grid">
          <div>
            <Icon name="calendar" />
            <span>{t('Date & time')}<strong>{formatDate(b.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {toHHMM(b.start)}–{toHHMM(b.start + b.duration)}</strong></span>
          </div>
          <div>
            <Icon name="location" />
            <span>{t('Address')}<strong>{b.address}</strong></span>
          </div>
          <div>
            <Icon name="check" />
            <span>{t('Deposit paid')}<strong>{uah(b.deposit)}</strong></span>
          </div>
          <div>
            <Icon name="clock" />
            <span>{t('Left to pay')}<strong>{t('{amount} after the shoot', { amount: uah(b.total - b.deposit) })}</strong></span>
          </div>
        </div>
        <div className="calendar-note">
          <Icon name="calendar" />
          <div>
            <strong>{t("Added to the photographer's calendar")}</strong>
            <span>{t('Your time is reserved.')}</span>
          </div>
        </div>
        <div className="confirmation-actions">
          <a className="btn btn-primary" href={gcal} target="_blank" rel="noreferrer">{t('Add to my calendar')}</a>
          <Link className="btn btn-secondary" to="/">{t('Back to home')}</Link>
        </div>
      </div>
    </main>
  )
}
