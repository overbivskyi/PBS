import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Art, Avatar, Stars, StyleTags, Loading, ErrorState, Empty } from '../components/ui.jsx'
import { useAsync, useSearchState, searchToQuery, isCompleteSearch } from '../lib/hooks.js'
import { getPhotographer, getReviews, weekAvailability, nearestFree, areaName, styleName, catalog } from '../lib/store.js'
import { addDays, formatDate, toMin, uah } from '../lib/time.js'

export default function Profile() {
  const { id } = useParams()
  const s = useSearchState()
  const fromSearch = isCompleteSearch(s)
  const p = useAsync(() => getPhotographer(id), [id])
  const reviews = useAsync(() => getReviews(id), [id])

  if (p.status === 'loading') return <div className="container page"><Loading /></div>
  if (p.status === 'error') return <div className="container page"><ErrorState text="We could not load this profile. Try again." onRetry={p.retry} /></div>
  const ph = p.data

  return (
    <div className="container page profile">
      {fromSearch && <Link className="back" to={`/search?${searchToQuery(s)}`}>← Back to results</Link>}

      <header className="card profile-head">
        <Avatar person={ph} size={96} />
        <div>
          <h1>{ph.firstName} {ph.lastName}</h1>
          <div className="meta">
            <Stars value={ph.rating} count={ph.completedShoots} />
            <span>· {areaName(ph.homeArea)}</span>
            <span>· Travels up to {ph.rules.maxTravelMin} min</span>
          </div>
          <StyleTags styles={ph.styles} highlight={s.styles} />
        </div>
        <div className="profile-price"><strong>{uah(ph.pricePerHour)}</strong>/h</div>
      </header>

      <div className="profile-grid">
        <div>
          <Portfolio photographer={ph} />
          <section className="card">
            <h2>About</h2>
            <p>{ph.about || <span className="muted">No description yet.</span>}</p>
            {ph.skills.length > 0 && <><h3>Skills</h3><StyleTagsText items={ph.skills} /></>}
            {ph.gear.length > 0 && <><h3>Gear</h3><ul className="gear">{ph.gear.map((g) => <li key={g}>{g}</li>)}</ul></>}
          </section>
          <section className="card">
            <h2>Reviews</h2>
            {reviews.status === 'loading' && <Loading />}
            {reviews.status === 'error' && <ErrorState text="We could not load the reviews." onRetry={reviews.retry} />}
            {reviews.data?.length === 0 && <Empty>No reviews yet.</Empty>}
            {reviews.data?.map((r) => (
              <div key={r.id} className="review">
                <div className="review-head">
                  <strong>{r.clientName}</strong>
                  <span className="muted">{formatDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="stars">{'★'.repeat(r.stars)}<span className="muted">{'★'.repeat(5 - r.stars)}</span></span>
                  <span className="verified">✓ Verified booking</span>
                </div>
                <p>{r.text}</p>
              </div>
            ))}
          </section>
        </div>
        <Availability photographer={ph} search={s} fromSearch={fromSearch} />
      </div>
    </div>
  )
}

function StyleTagsText({ items }) {
  return <span className="tags">{items.map((x) => <span key={x} className="tag">{x}</span>)}</span>
}

function Portfolio({ photographer }) {
  const [open, setOpen] = useState(null)
  const photos = photographer.portfolio
  useEffect(() => {
    if (open == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos.length])

  if (!photos.length) return <section className="card"><h2>Portfolio</h2><Empty>No photos yet.</Empty></section>
  return (
    <section className="card">
      <h2>Portfolio</h2>
      <div className="portfolio">
        {photos.map((ph, i) => (
          <button key={ph.id} className="portfolio-item" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
            <Art seed={ph.id} src={ph.src} label={ph.style ? styleName(ph.style) : ''} />
          </button>
        ))}
      </div>
      {open != null && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <button className="lb-nav lb-prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length) }}>‹</button>
          <div className="lb-img" onClick={(e) => e.stopPropagation()}>
            <Art seed={photos[open].id} src={photos[open].src} label={`${open + 1} / ${photos.length}`} />
          </div>
          <button className="lb-nav lb-next" aria-label="Next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length) }}>›</button>
          <button className="lb-close" aria-label="Close" onClick={() => setOpen(null)}>×</button>
        </div>
      )}
    </section>
  )
}

function Availability({ photographer, search, fromSearch }) {
  const navigate = useNavigate()
  const duration = fromSearch ? Number(search.duration) : Math.max(photographer.rules.minShoot, 60)
  const area = fromSearch ? search.area : photographer.homeArea
  const startDate = fromSearch ? search.date : catalog.meta.scenario.date
  const [from, setFrom] = useState(startDate)
  const [picked, setPicked] = useState(null) // { date, time }
  const [why, setWhy] = useState(null)

  const week = useAsync(() => weekAvailability({ photographerId: photographer.id, from, duration, area }), [photographer.id, from, duration, area])
  const nearest = useAsync(
    () => (fromSearch ? nearestFree({ photographerId: photographer.id, date: search.date, start: toMin(search.time), duration, area }) : Promise.resolve([])),
    [photographer.id, search.date, search.time, duration, area],
  )

  // preselect the searched time when it is free
  const searchedFree = week.data?.find((d) => d.date === search.date)?.slots.find((x) => x.time === search.time)?.ok
  useEffect(() => {
    if (fromSearch && searchedFree && !picked) setPicked({ date: search.date, time: search.time })
  }, [fromSearch, searchedFree, picked, search.date, search.time])

  function book() {
    const q = searchToQuery({
      styles: search.styles.length ? search.styles : [photographer.styles[0]].filter(Boolean),
      area, date: picked.date, time: picked.time, duration: String(duration), budget: search.budget || String(photographer.pricePerHour),
    })
    navigate(`/book?pid=${photographer.id}&${q}`)
  }

  return (
    <aside className="card availability">
      <h2>Availability</h2>
      <p className="muted small">
        Start times for a {duration}-minute shoot in {areaName(area)}.
      </p>

      {fromSearch && searchedFree === false && nearest.data?.length > 0 && (
        <div className="nearest">
          <strong>Nearest free times</strong>
          <div className="time-chips">
            {nearest.data.map((x) => (
              <button key={x.time} className={`chip chip-time ${picked?.date === search.date && picked?.time === x.time ? 'chip-on' : ''}`} onClick={() => setPicked({ date: search.date, time: x.time })}>
                {x.time}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="week-nav">
        <button className="icon-btn" aria-label="Previous 7 days" onClick={() => setFrom(addDays(from, -7))}>‹</button>
        <span>{formatDate(from)} – {formatDate(addDays(from, 6))}</span>
        <button className="icon-btn" aria-label="Next 7 days" onClick={() => setFrom(addDays(from, 7))}>›</button>
      </div>

      {week.status === 'loading' && <Loading />}
      {week.status === 'error' && <ErrorState text="We could not load the free times. Try again." onRetry={week.retry} />}
      {week.data && (
        <div className="days">
          {week.data.map((d) => {
            const anyFree = d.slots.some((x) => x.ok)
            return (
              <div key={d.date} className="day">
                <div className={`day-name ${d.date === search.date ? 'is-searched' : ''}`}>{formatDate(d.date)}</div>
                {!anyFree && <div className="muted small">{d.slots[0]?.reason === 'Fully booked on this day' ? 'Fully booked on this day' : 'No free times'}</div>}
                <div className="time-chips">
                  {d.slots.map((x) =>
                    x.ok ? (
                      <button key={x.time} className={`chip chip-time ${picked?.date === d.date && picked?.time === x.time ? 'chip-on' : ''}`} onClick={() => setPicked({ date: d.date, time: x.time })}>
                        {x.time}
                      </button>
                    ) : (
                      anyFree && (
                        <button key={x.time} className="chip chip-time chip-off" title={x.reason} onClick={() => setWhy(`${formatDate(d.date)}, ${x.time}: ${x.reason}`)}>
                          {x.time}
                        </button>
                      )
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {why && <p className="why" role="status">{why}</p>}

      <div className="sticky-book">
        {picked && <p className="small">Selected: <strong>{formatDate(picked.date)}, {picked.time}</strong></p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={!picked} onClick={book}>Book this time</button>
      </div>
    </aside>
  )
}
