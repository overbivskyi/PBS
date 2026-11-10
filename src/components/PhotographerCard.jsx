import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { areaName } from '../lib/store.js'
import { searchToQuery } from '../lib/hooks.js'
import { uah, toMin } from '../lib/time.js'
import { Avatar, Stars, StyleTags } from './ui.jsx'

const PARTS = [
  ['style', 'Style'],
  ['area', 'Area'],
  ['time', 'Time'],
  ['price', 'Price'],
]

// Result card (spec 4.2). `result` comes from the matching engine.
export default function PhotographerCard({ result, search, best = false, missText = null }) {
  const p = result.photographer
  const navigate = useNavigate()
  const chips = nearbyChips(result.freeTimes, search.time)
  const [time, setTime] = useState(result.chosenFree ? search.time : chips[0])
  const [showFit, setShowFit] = useState(false)

  const query = searchToQuery({ ...search, time: time || search.time })

  return (
    <article className={`card result ${best ? 'result-best' : ''}`}>
      {best && <div className="badge">Best match</div>}
      <div className="result-top">
        <Avatar person={p} size={best ? 72 : 60} />
        <div className="result-main">
          <h3>
            <Link to={`/photographer/${p.id}?${searchToQuery(search)}`}>{p.firstName} {p.lastName}</Link>
          </h3>
          <div className="meta">
            <Stars value={p.rating} count={p.completedShoots} />
            <span>· {areaName(p.homeArea)}</span>
          </div>
          <StyleTags styles={p.styles} highlight={search.styles} />
        </div>
        <div className="fit">
          <button className="fit-score" onClick={() => setShowFit((v) => !v)} aria-expanded={showFit} title="Why this score">
            {result.score}%
            <span>fit</span>
          </button>
        </div>
      </div>

      {missText && <p className="miss">{missText}</p>}

      {showFit && (
        <ul className="fit-checks">
          {PARTS.map(([k, label]) => (
            <li key={k} className={result.conditions[k].ok ? 'ok' : 'no'}>
              <span aria-hidden>{result.conditions[k].ok ? '✓' : '✕'}</span> {label}
              {!result.conditions[k].ok && <span className="muted"> — {result.conditions[k].reason}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="price-row">
        <span><strong>{uah(p.pricePerHour)}</strong>/h</span>
        <span className="muted">Total for {search.duration} min: <strong>{uah(result.total)}</strong></span>
      </div>

      {chips.length > 0 && (
        <div className="time-chips" role="group" aria-label="Free start times">
          {chips.map((t) => (
            <button key={t} className={`chip chip-time ${t === time ? 'chip-on' : ''}`} onClick={() => setTime(t)}>{t}</button>
          ))}
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={!time} onClick={() => navigate(`/book?pid=${p.id}&${query}`)}>Book</button>
        <Link className="btn" to={`/photographer/${p.id}?${query}`}>View profile</Link>
      </div>
    </article>
  )
}

// Free start times closest to the chosen time, shown in time order.
function nearbyChips(freeTimes, chosen, count = 6) {
  const c = toMin(chosen)
  return [...freeTimes]
    .sort((a, b) => Math.abs(toMin(a) - c) - Math.abs(toMin(b) - c))
    .slice(0, count)
    .sort()
}
