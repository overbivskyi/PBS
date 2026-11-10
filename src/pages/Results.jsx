import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchForm from '../components/SearchForm.jsx'
import PhotographerCard from '../components/PhotographerCard.jsx'
import { Loading, ErrorState, Empty } from '../components/ui.jsx'
import { useAsync, useSearchState, isCompleteSearch, searchToQuery, toEngineSearch } from '../lib/hooks.js'
import { search as runSearch } from '../lib/store.js'

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

  const others = useMemo(() => (res.data ? [...res.data.others].sort(SORTS[sort]) : []), [res.data, sort])

  return (
    <div className="container page">
      <div className="card search-bar">
        <SearchForm key={key} ref={dateRef} initial={s} compact submitText="Update results" onSubmit={(x) => navigate(`/search?${searchToQuery(x)}`)} />
      </div>

      {!complete && <Empty>Fill in the search to see photographers who are free at your time.</Empty>}
      {complete && res.status === 'loading' && <Loading text="Finding photographers…" />}
      {complete && res.status === 'error' && <ErrorState text="We could not load the results. Try again." onRetry={res.retry} />}

      {complete && res.status === 'ready' && res.data && (
        <>
          <div className="results-head">
            <p className="result-line">
              <strong>{res.data.count}</strong> {res.data.count === 1 ? 'photographer fits' : 'photographers fit'} your search
            </p>
            {res.data.count > 1 && (
              <label className="sort">
                Sort by{' '}
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
                <button className="btn" onClick={() => dateRef.current?.focus()}>Change the date</button>
              )}
            </Empty>
          )}

          <div className="results">
            {res.data.best && <PhotographerCard key={res.data.best.photographer.id + key} result={res.data.best} search={s} best />}
            {others.map((r) => <PhotographerCard key={r.photographer.id + key} result={r} search={s} />)}
          </div>

          {res.data.alternatives.length > 0 && (
            <section className="alternatives">
              <h2>Close alternatives</h2>
              <div className="results">
                {res.data.alternatives.map((r) => (
                  <PhotographerCard key={r.photographer.id + key} result={r} search={s} missText={r.conditions[r.misses[0]].reason} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
