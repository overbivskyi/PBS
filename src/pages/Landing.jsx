import { Link, useNavigate } from 'react-router-dom'
import SearchForm from '../components/SearchForm.jsx'
import { Icon, Photo, Rating, Loading } from '../components/ui.jsx'
import { defaultSearch, scenarioSearch, searchToQuery, useAsync } from '../lib/hooks.js'
import { listPhotographers, styleName, areaName } from '../lib/store.js'
import { PHOTOS, unsplash, portfolioSrc } from '../lib/photos.js'
import { uah } from '../lib/time.js'

const STEPS = [
  ['01', 'Tell us what you need', 'Choose your style, place, time and budget. It takes less than a minute.', 'edit'],
  ['02', 'Pick the best match', 'Compare photographers who are free and can get there on time.', 'user'],
  ['03', 'Pay 30% and the shoot is in both calendars', 'The deposit books the time. You pay the rest after the shoot.', 'calendar'],
]

export default function Landing() {
  const navigate = useNavigate()
  const all = useAsync(() => listPhotographers(), [])
  const generated = all.data?.filter((p) => p.userType === 'generated') ?? []
  const featured = [...generated].sort((a, b) => b.rating - a.rating).slice(0, 3)
  const avgRating = generated.length ? generated.reduce((s, p) => s + p.rating, 0) / generated.length : 0
  const shoots = generated.reduce((s, p) => s + p.completedShoots, 0)
  const demo = scenarioSearch()

  return (
    <main>
      <section className="hero">
        <div className="hero-blur hero-blur-one" />
        <div className="hero-blur hero-blur-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="pulse" /> Photographers ready across Kyiv</span>
            <h1>Book a photographer <span>in two taps</span></h1>
            <p>Tell us what you need. We show only photographers who are free and can get there on time.</p>
            {generated.length > 0 && (
              <div className="trust-row">
                <div className="faces">
                  {generated.slice(0, 4).map((p) => <Photo key={p.id} photographer={p} width={80} alt="" />)}
                </div>
                <div>
                  <strong>{avgRating.toFixed(1)} average rating</strong>
                  <span>From {shoots.toLocaleString('en-US')} completed shoots</span>
                </div>
              </div>
            )}
            <button className="text-link demo-link" onClick={() => navigate(`/search?${searchToQuery(demo)}`)}>
              Try the demo search <Icon name="chevron" size={18} />
            </button>
          </div>
          <div className="hero-collage">
            <img className="hero-img-main" src={unsplash(PHOTOS.couple, 1200)} alt="Couple photographed in warm natural light" />
            <img className="hero-img-side" src={unsplash(PHOTOS.family, 600)} alt="Family portrait outdoors" />
            <div className="floating-card">
              <span className="floating-check"><Icon name="check" size={18} /></span>
              <div>
                <strong>Best match found</strong>
                <span>Free at {demo.time} in {areaName(demo.area)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="container search-float">
          <SearchForm initial={defaultSearch()} submitText="Find photographers" onSubmit={(s) => navigate(`/search?${searchToQuery(s)}`)} />
        </div>
      </section>

      <section className="section how-section">
        <div className="container">
          <div className="section-heading">
            <span className="kicker">How it works</span>
            <h2>From idea to booked in minutes</h2>
            <p>No endless messages. No schedule clashes. Just the right person at the right time.</p>
          </div>
          <div className="steps">
            {STEPS.map(([n, t, d, i]) => (
              <div className="step" key={n}>
                <span className="step-number">{n}</span>
                <div className="step-icon"><Icon name={i} size={25} /></div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section featured">
        <div className="container">
          <div className="section-top">
            <div>
              <span className="kicker">Top in Kyiv</span>
              <h2>Photographers clients love</h2>
            </div>
            <Link className="text-link" to="/search">View all photographers <Icon name="chevron" size={18} /></Link>
          </div>
          {all.status === 'loading' && <Loading />}
          <div className="featured-grid">
            {featured.map((p) => (
              <Link className="featured-card" key={p.id} to={`/photographer/${p.id}`}>
                <div className="featured-image">
                  <img src={portfolioSrc(p, p.portfolio[0] ?? {}, 0, 800)} alt={`${p.firstName} ${p.lastName} portfolio`} loading="lazy" />
                  <span>{areaName(p.homeArea)}</span>
                </div>
                <div className="featured-body">
                  <div>
                    <h3>{p.firstName} {p.lastName}</h3>
                    <Rating value={p.rating} shoots={p.completedShoots} />
                  </div>
                  <p>{p.styles.map(styleName).join(' · ')}</p>
                  <div className="card-bottom">
                    <span><strong>{uah(p.pricePerHour)}</strong>/h</span>
                    <span className="card-arrow"><Icon name="chevron" size={18} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container pro-cta">
        <div className="pro-visual">
          <img src={unsplash(PHOTOS.editorial, 1000)} alt="Photographer at work" loading="lazy" />
        </div>
        <div className="pro-copy">
          <span className="kicker light">For photographers</span>
          <h2>Get prepaid bookings without schedule clashes</h2>
          <p>Set your rules once. We show clients only the times you can really make, and the deposit is paid before every shoot.</p>
          <ul>
            <li><Icon name="check" size={18} /> You control your prices and availability</li>
            <li><Icon name="check" size={18} /> 30% deposit before every shoot</li>
            <li><Icon name="check" size={18} /> Travel and break times counted for you</li>
          </ul>
          <Link className="btn btn-secondary" to="/signup?role=photographer">I am a photographer <Icon name="chevron" size={18} /></Link>
        </div>
      </section>
    </main>
  )
}
