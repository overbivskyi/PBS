import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SearchForm from '../components/SearchForm.jsx'
import PhotographerCard from '../components/PhotographerCard.jsx'
import { Icon, Loading, ErrorState, Empty } from '../components/ui.jsx'
import { useAsync, useSearchState, isCompleteSearch, searchToQuery, toEngineSearch } from '../lib/hooks.js'
import { search as runSearch, areaName, styleName } from '../lib/store.js'
import { formatDate } from '../lib/time.js'

const SORTS = {
  fit: (a, b) => b.score - a.score,
  price: (a, b) => a.photographer.pricePerHour - b.photographer.pricePerHour,
  rating: (a, b) => b.photographer.rating - a.photographer.rating,
}

export default function Results() {
  const s = useSearchState()
  const navigate = useNavigate()
  const dateRef = useRef(null)
  const [sort, setSort] = useState('fit')
  const complete = isCompleteSearch(s)
  const key = searchToQuery(s)
  const res = useAsync(() => (complete ? runSearch(toEngineSearch(s)) : Promise.resolve(null)), [key])

  // The best match stays first; sorting applies to the other matches.
  const others = useMemo(() => (res.data ? [...res.data.others].sort(SORTS[sort]) : []), [res.data, sort])

  return (
    <main className="page-alt">
      <section className="container results-head">
        <Link className="back-link" to="/"><Icon name="arrow" size={18} /> Back to home</Link>
        <h1>Photographers for your shoot</h1>
        {complete && (
          <p>
            {s.styles.map(styleName).join(', ')} in {areaName(s.area)} · {formatDate(s.date, { day: 'numeric', month: 'short' })} at {s.time} · {s.duration} minutes
          </p>
        )}
        <SearchForm key={key} ref={dateRef} initial={s} compact submitText="Update results" onSubmit={(x) => navigate(`/search?${searchToQuery(x)}`)} />
      </section>

      <section className="container results-content">
        {!complete && <Empty>Fill in the search to see photographers who are free at your time.</Empty>}
        {complete && res.status === 'loading' && <Loading text="Finding photographers…" />}
        {complete && res.status === 'error' && <ErrorState text="We could not load the results. Try again." onRetry={res.retry} />}

        {complete && res.status === 'ready' && res.data && (
          <>
            <div className="results-toolbar">
              <div>
                <strong>{res.data.count} {res.data.count === 1 ? 'photographer fits' : 'photographers fit'}</strong> your search
                {res.data.count > 0 && <span>All free at {s.time} and within budget</span>}
              </div>
              {res.data.count > 2 && (
                <label>
                  Sort by
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="fit">Fit score</option>
                    <option value="price">Price</option>
                    <option value="rating">Rating</option>
                  </select>
                </label>
              )}
            </div>

            {res.data.count === 0 && (
              <Empty>
                <p>No photographer is free at this time.</p>
                {res.data.alternatives.length === 0 && (
                  <button className="btn btn-secondary" onClick={() => dateRef.current?.focus()}>Change the date</button>
                )}
              </Empty>
            )}

            {res.data.best && <PhotographerCard key={res.data.best.photographer.id + key} result={res.data.best} search={s} best />}
            {others.length > 0 && (
              <div className="result-list">
                {others.map((r) => <PhotographerCard key={r.photographer.id + key} result={r} search={s} />)}
              </div>
            )}

            {res.data.alternatives.length > 0 && (
              <>
                <div className="close-heading">
                  <div>
                    <span className="kicker">More options</span>
                    <h2>Close alternatives</h2>
                  </div>
                  <p>Almost a fit. Each card shows the one thing that differs from your search.</p>
                </div>
                <div className="result-list alternatives">
                  {res.data.alternatives.map((r) => (
                    <PhotographerCard key={r.photographer.id + key} result={r} search={s} missText={r.conditions[r.misses[0]].reason} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  )
}
