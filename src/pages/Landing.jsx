import { Link, useNavigate } from 'react-router-dom'
import SearchForm from '../components/SearchForm.jsx'
import { Avatar, Stars, StyleTags, Loading } from '../components/ui.jsx'
import { defaultSearch, scenarioSearch, searchToQuery, useAsync } from '../lib/hooks.js'
import { listPhotographers } from '../lib/store.js'
import { uah } from '../lib/time.js'

export default function Landing() {
  const navigate = useNavigate()
  const featured = useAsync(() => listPhotographers().then((all) => all.filter((p) => p.userType === 'generated').sort((a, b) => b.rating - a.rating).slice(0, 3)), [])

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <h1>Book a photographer in two taps</h1>
            <p className="lead">Tell us what you need. We show only photographers who are free and can get there on time.</p>
            <button className="link demo-fill" onClick={() => navigate(`/search?${searchToQuery(scenarioSearch())}`)}>
              Try the demo search →
            </button>
          </div>
          <div className="card hero-form">
            <SearchForm initial={defaultSearch()} submitText="Find photographers" onSubmit={(s) => navigate(`/search?${searchToQuery(s)}`)} />
          </div>
        </div>
      </section>

      <section className="container section">
        <h2>How it works</h2>
        <ol className="steps">
          <li><span>1</span>Tell us what you need</li>
          <li><span>2</span>Pick the best match</li>
          <li><span>3</span>Pay 30% and the shoot is in both calendars</li>
        </ol>
      </section>

      <section className="container section">
        <div className="card safe">
          <h2>Safe payment</h2>
          <p>You pay a 30% deposit to book. The photographer gets it only after the shoot happens. You pay the other 70% after the shoot.</p>
        </div>
      </section>

      <section className="container section">
        <h2>Featured photographers</h2>
        {featured.status === 'loading' && <Loading />}
        {featured.data && (
          <div className="featured">
            {featured.data.map((p) => (
              <Link key={p.id} to={`/photographer/${p.id}`} className="card featured-card">
                <Avatar person={p} size={64} />
                <div>
                  <strong>{p.firstName} {p.lastName}</strong>
                  <Stars value={p.rating} />
                  <StyleTags styles={p.styles} />
                  <div>{uah(p.pricePerHour)}/h</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container section">
        <div className="card for-photographers">
          <h2>Get prepaid bookings without schedule clashes</h2>
          <Link to="/signup?role=photographer" className="btn btn-primary">I am a photographer</Link>
        </div>
      </section>
    </>
  )
}
