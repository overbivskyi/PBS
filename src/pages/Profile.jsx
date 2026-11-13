import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon, Photo, Rating, StyleTags, Loading, ErrorState, Empty } from '../components/ui.jsx'
import { useAsync, useSearchState, searchToQuery, isCompleteSearch } from '../lib/hooks.js'
import { getPhotographer, getReviews, weekAvailability, nearestFree, areaName, styleName, catalog } from '../lib/store.js'
import { portfolioSrc } from '../lib/photos.js'
import { addDays, formatDate, toMin, uah } from '../lib/time.js'

const GRID_PHOTOS = 8 // the design's mosaic holds 8 photos; the rest open in the large view

export default function Profile() {
  const { id } = useParams()
  const s = useSearchState()
  const fromSearch = isCompleteSearch(s)
  const p = useAsync(() => getPhotographer(id), [id])
  const reviews = useAsync(() => getReviews(id), [id])

  if (p.status === 'loading') return <main className="container profile-page"><Loading /></main>
  if (p.status === 'error') return <main className="container profile-page"><ErrorState text="We could not load this profile. Try again." onRetry={p.retry} /></main>
  const ph = p.data

  return (
    <main>
      <div className="container profile-page">
        {fromSearch && <Link className="back-link" to={`/search?${searchToQuery(s)}`}><Icon name="arrow" size={18} /> Back to results</Link>}

        <section className="profile-hero">
          <Photo photographer={ph} width={500} />
          <div className="profile-intro">
            <span className="available"><span /> Kyiv · {areaName(ph.homeArea)}</span>
            <h1>{ph.firstName} {ph.lastName}</h1>
            <Rating value={ph.rating} shoots={ph.completedShoots} />
            <StyleTags styles={ph.styles} highlight={s.styles} />
            <div className="profile-meta">
              <span><Icon name="location" size={18} /> {areaName(ph.homeArea)}</span>
              <span><Icon name="distance" size={18} /> Travels up to {ph.rules.maxTravelMin} min</span>
            </div>
          </div>
          <div className="profile-price">
            <span>Price</span>
            <strong>{uah(ph.pricePerHour)}<span> / hour</span></strong>
            <button className="btn btn-primary" onClick={() => document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' })}>
              Check availability
            </button>
          </div>
        </section>

        <Portfolio photographer={ph} />

        <div className="profile-columns">
          <section className="profile-section about">
            <span className="kicker">Meet {ph.firstName}</span>
            <h2>About</h2>
            <p>{ph.about || 'No description yet.'}</p>
            {ph.skills.length > 0 && (
              <>
                <h3>Skills</h3>
                <div className="tag-row">{ph.skills.map((x) => <span className="tag" key={x}>{x}</span>)}</div>
              </>
            )}
            {ph.gear.length > 0 && (
              <>
                <h3>Gear</h3>
                <p>{ph.gear.join(' · ')}</p>
              </>
            )}
          </section>
          <section className="profile-section reviews">
            <div className="section-top">
              <div>
                <span className="kicker">Client stories</span>
                <h2>Reviews</h2>
              </div>
              {ph.rating > 0 && <Rating value={ph.rating} />}
            </div>
            {reviews.status === 'loading' && <Loading />}
            {reviews.status === 'error' && <ErrorState text="We could not load the reviews." onRetry={reviews.retry} />}
            {reviews.data?.length === 0 && <Empty>No reviews yet.</Empty>}
            {reviews.data?.map((r) => (
              <div className="review" key={r.id}>
                <div>
                  <strong>{r.clientName}</strong>
                  <span>{formatDate(r.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <Rating value={r.stars} />
                <p>{r.text}</p>
                <small><Icon name="shield" size={14} /> Verified booking</small>
              </div>
            ))}
          </section>
        </div>

        <Availability photographer={ph} search={s} fromSearch={fromSearch} />
      </div>
    </main>
  )
}

function Portfolio({ photographer }) {
  const [open, setOpen] = useState(null)
  const photos = photographer.portfolio
  const src = (i, w) => portfolioSrc(photographer, photos[i], i, w)

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

  return (
    <section className="profile-section">
      <div className="section-top">
        <div>
          <span className="kicker">Selected work</span>
          <h2>Portfolio</h2>
        </div>
        <span className="muted">{photos.length} photos</span>
      </div>
      {photos.length === 0 ? (
        <Empty>No photos yet.</Empty>
      ) : (
        <div className="portfolio-grid">
          {photos.slice(0, GRID_PHOTOS).map((ph, i) => (
            <button key={ph.id} onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
              <img src={src(i, i === 0 ? 1200 : 600)} alt={ph.style ? `${styleName(ph.style)} photo` : `Photo ${i + 1}`} loading="lazy" />
              <span>
                {i === GRID_PHOTOS - 1 && photos.length > GRID_PHOTOS ? <b>+{photos.length - GRID_PHOTOS}</b> : <Icon name="image" />}
              </span>
            </button>
          ))}
        </div>
      )}
      {open != null && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <button aria-label="Close" onClick={() => setOpen(null)}><Icon name="close" /></button>
          <button className="lb-nav lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length) }}>
            <Icon name="arrow" />
          </button>
          <img src={src(open, 1600)} alt="Large portfolio view" onClick={(e) => e.stopPropagation()} />
          <button className="lb-nav lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length) }}>
            <Icon name="chevron" />
          </button>
          <div>{open + 1} / {photos.length}</div>
        </div>
      )}
    </section>
  )
}

function Availability({ photographer, search, fromSearch }) {
  const navigate = useNavigate()
  const duration = fromSearch ? Number(search.duration) : Math.max(photographer.rules.minShoot, 60)
  const area = fromSearch ? search.area : photographer.homeArea
  const [from, setFrom] = useState(fromSearch ? search.date : catalog.meta.scenario.date)
  const [picked, setPicked] = useState(null) // { date, time }
  const [why, setWhy] = useState(null)

  // hourly chips keep the 7-day grid short; the searched time is added when it is not on the hour
  const extra = fromSearch ? search.time : null
  const week = useAsync(
    () => weekAvailability({ photographerId: photographer.id, from, duration, area, step: 60, extra }),
    [photographer.id, from, duration, area, extra],
  )
  const nearest = useAsync(
    () => (fromSearch ? nearestFree({ photographerId: photographer.id, date: search.date, start: toMin(search.time), duration, area }) : Promise.resolve([])),
    [photographer.id, search.date, search.time, duration, area],
  )

  // preselect the searched time when it is free
  const searchedSlot = week.data?.find((d) => d.date === search.date)?.slots.find((x) => x.time === search.time)
  const searchedFree = searchedSlot?.ok
  useEffect(() => {
    if (fromSearch && searchedFree && !picked) setPicked({ date: search.date, time: search.time })
  }, [fromSearch, searchedFree, picked, search.date, search.time])

  const style = search.styles.find((x) => photographer.styles.includes(x)) ?? photographer.styles[0]
  const total = Math.round((photographer.pricePerHour * duration) / 60)

  function book() {
    const q = searchToQuery({
      styles: search.styles.length ? search.styles : [style].filter(Boolean),
      area, date: picked.date, time: picked.time, duration: String(duration), budget: search.budget || String(photographer.pricePerHour),
    })
    navigate(`/book?pid=${photographer.id}&${q}`)
  }

  const isPicked = (date, time) => picked?.date === date && picked?.time === time

  return (
    <section className="profile-section availability" id="availability">
      <div className="section-top">
        <div>
          <span className="kicker">{formatDate(from, { day: 'numeric', month: 'short' })} – {formatDate(addDays(from, 6), { day: 'numeric', month: 'short' })}</span>
          <h2>Choose a free time</h2>
        </div>
        <div className="week-arrows">
          <button aria-label="Previous 7 days" onClick={() => setFrom(addDays(from, -7))}><Icon name="arrow" /></button>
          <button aria-label="Next 7 days" onClick={() => setFrom(addDays(from, 7))}><Icon name="arrow" /></button>
        </div>
      </div>
      <p>Start times for a {duration}-minute shoot in {areaName(area)}. Free times already include {photographer.firstName}’s travel and break rules.</p>

      {fromSearch && searchedFree === false && (
        <div className="nearest">
          <div>
            <strong>{search.time} is not free</strong>
            <span>{searchedSlot?.reason}</span>
          </div>
          {nearest.data?.length > 0 && (
            <div className="nearest-times">
              <span>Nearest free times</span>
              {nearest.data.map((x) => (
                <button key={x.time} className={`time ${isPicked(search.date, x.time) ? 'active' : ''}`} onClick={() => setPicked({ date: search.date, time: x.time })}>
                  {x.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {week.status === 'loading' && <Loading />}
      {week.status === 'error' && <ErrorState text="We could not load the free times. Try again." onRetry={week.retry} />}
      {week.data && (
        <div className="days">
          {week.data.map((d) => {
            const anyFree = d.slots.some((x) => x.ok)
            return (
              <div key={d.date} className={`day ${d.date === search.date ? 'today' : ''}`}>
                <strong>{formatDate(d.date)}</strong>
                {!anyFree && <em className="day-empty">{d.slots[0]?.code === 'daily' ? 'Fully booked on this day' : 'No free times'}</em>}
                {anyFree && d.slots.map((x) =>
                  x.ok ? (
                    <button key={x.time} className={isPicked(d.date, x.time) ? 'active' : ''} onClick={() => setPicked({ date: d.date, time: x.time })}>
                      {x.time}
                    </button>
                  ) : (
                    <button key={x.time} className="blocked" title={x.reason} aria-label={`${x.time}: ${x.reason}`} onClick={() => setWhy(`${formatDate(d.date)}, ${x.time}: ${x.reason}`)}>
                      {x.time}
                    </button>
                  ),
                )}
              </div>
            )
          })}
        </div>
      )}
      {why && <p className="why" role="status"><Icon name="clock" size={16} /> {why}</p>}

      <div className="booking-bar">
        <div>
          <span>Your selected time</span>
          <strong>{picked ? `${formatDate(picked.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${picked.time}` : 'Pick a free time above'}</strong>
        </div>
        <div>
          <span>{duration} min{style ? ` · ${styleName(style)}` : ''}</span>
          <strong>{uah(total)}</strong>
        </div>
        <button className="btn btn-primary" disabled={!picked} onClick={book}>Book this time</button>
      </div>
    </section>
  )
}
