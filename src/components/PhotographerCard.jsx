import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { areaName } from '../lib/store.js'
import { searchToQuery } from '../lib/hooks.js'
import { uah, toMin } from '../lib/time.js'
import { Icon, Photo, Rating, StyleTags } from './ui.jsx'

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
    <article className={`result-card ${best ? 'best-card' : ''}`}>
      {best && <span className="best-badge">Best match</span>}
      <Link to={`/photographer/${p.id}?${query}`} className="result-avatar-link">
        <Photo photographer={p} width={400} className="result-avatar" />
      </Link>
      <div className="result-info">
        <div className="result-title">
          <div>
            <h3><Link to={`/photographer/${p.id}?${query}`}>{p.firstName} {p.lastName}</Link></h3>
            <Rating value={p.rating} shoots={p.completedShoots} />
          </div>
          <button className="fit-score" onClick={() => setShowFit((v) => !v)} aria-expanded={showFit} title="Why this score">
            <strong>{result.score}%</strong>
            <span>fit</span>
          </button>
        </div>
        {showFit && (
          <ul className="fit-checks">
            {PARTS.map(([k, label]) => (
              <li key={k} className={result.conditions[k].ok ? 'ok' : 'no'}>
                <Icon name={result.conditions[k].ok ? 'check' : 'close'} size={14} />
                {label}
                {!result.conditions[k].ok && <span>{result.conditions[k].reason}</span>}
              </li>
            ))}
          </ul>
        )}
        <StyleTags styles={p.styles} highlight={search.styles} />
        <div className="meta-row">
          <span><Icon name="location" size={17} />{areaName(p.homeArea)}</span>
          <span><Icon name="distance" size={17} />Travels up to {p.rules.maxTravelMin} min</span>
        </div>
        {missText && (
          <div className="reason"><Icon name="clock" size={17} />{missText}</div>
        )}
        {chips.length > 0 && (
          <div className="times">
            <span>Free start times</span>
            <div>
              {chips.map((t) => (
                <button key={t} className={`time ${t === time ? 'active' : ''}`} onClick={() => setTime(t)}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="result-action">
        <div>
          <span>{uah(p.pricePerHour)}/h</span>
          <strong>{uah(result.total)} total</strong>
        </div>
        <button className="btn btn-primary" disabled={!time} onClick={() => navigate(`/book?pid=${p.id}&${query}`)}>Book</button>
        <Link className="btn btn-secondary" to={`/photographer/${p.id}?${query}`}>View profile</Link>
      </div>
    </article>
  )
}

// Free start times closest to the chosen time, shown in time order.
function nearbyChips(freeTimes, chosen, count = 5) {
  const c = toMin(chosen)
  return [...freeTimes]
    .sort((a, b) => Math.abs(toMin(a) - c) - Math.abs(toMin(b) - c))
    .slice(0, count)
    .sort()
}
