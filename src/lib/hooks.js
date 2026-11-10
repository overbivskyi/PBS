import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { currentUser, getView } from './store.js'
import { catalog } from './store.js'
import { toMin } from './time.js'

// Re-renders when anything in the store changes (login, role switch, saves).
export function useStoreVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const on = () => setV((x) => x + 1)
    window.addEventListener('pbs-store', on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener('pbs-store', on)
      window.removeEventListener('storage', on)
    }
  }, [])
  return v
}

export function useSession() {
  useStoreVersion()
  const user = currentUser()
  const view = getView()
  // The photographer whose pages are shown: the logged-in photographer, or the one picked in the role switch.
  const photographerId = user?.role === 'photographer' ? user.photographerId : view.role === 'photographer' ? view.photographerId : null
  return { user, view, photographerId }
}

// Loads async data with loading / error states. `deps` re-run the loader.
export function useAsync(loader, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, status: 'loading' }))
    loader()
      .then((data) => alive && setState({ status: 'ready', data, error: null }))
      .catch((error) => alive && setState({ status: 'error', data: null, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])
  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { ...state, retry }
}

// ---------- search params ----------

export const SEARCH_KEYS = ['styles', 'area', 'date', 'time', 'duration', 'budget']

export function defaultSearch() {
  return { styles: [], area: '', date: '', time: '', duration: '', budget: '' }
}

export function searchFromParams(params) {
  const s = defaultSearch()
  s.styles = (params.get('styles') || '').split(',').filter(Boolean)
  for (const k of ['area', 'date', 'time', 'duration', 'budget']) s[k] = params.get(k) || ''
  return s
}

export function searchToQuery(s) {
  const p = new URLSearchParams()
  if (s.styles.length) p.set('styles', s.styles.join(','))
  for (const k of ['area', 'date', 'time', 'duration', 'budget']) if (s[k] !== '' && s[k] != null) p.set(k, s[k])
  return p.toString()
}

export function isCompleteSearch(s) {
  return s.styles.length > 0 && s.area && s.date && s.time && s.duration && s.budget
}

// The search object the matching engine needs.
export function toEngineSearch(s) {
  return { styles: s.styles, area: s.area, date: s.date, start: toMin(s.time), duration: Number(s.duration), budget: Number(s.budget) }
}

export function useSearchState() {
  const [params] = useSearchParams()
  return searchFromParams(params)
}

export function scenarioSearch() {
  const sc = catalog.meta.scenario
  return { styles: sc.styles, area: sc.area, date: sc.date, time: sc.time, duration: String(sc.duration), budget: String(sc.budget) }
}
