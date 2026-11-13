import { styleName } from '../lib/store.js'
import { avatarSrc } from '../lib/photos.js'

// Line icons from the Figma design.
const PATHS = {
  arrow: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" /><circle cx="12" cy="13" r="3.5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  distance: <><path d="M5 19 19 5" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></>,
  edit: <><path d="m14 5 5 5L8 21H3v-5L14 5Z" /><path d="m12 7 5 5" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 15-5-5L5 20" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  star: <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
}

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

export function Photo({ photographer, width, className = '', alt }) {
  return <img className={className} src={avatarSrc(photographer, width)} alt={alt ?? `${photographer.firstName} ${photographer.lastName}`} loading="lazy" />
}

export function Rating({ value, shoots }) {
  if (!value) return <span className="rating"><span className="new-badge">New</span></span>
  return (
    <span className="rating">
      <span className="star"><Icon name="star" size={15} /></span>
      <strong>{value.toFixed(1)}</strong>
      {shoots != null && <span>· {shoots} shoots</span>}
    </span>
  )
}

export function StyleTags({ styles, highlight = [] }) {
  return (
    <div className="tag-row">
      {styles.map((s) => (
        <span key={s} className={`tag ${highlight.includes(s) ? 'selected' : ''}`}>{styleName(s)}</span>
      ))}
    </div>
  )
}

export function Loading({ text = 'Loading…' }) {
  return <div className="state" role="status"><span className="spinner" /> {text}</div>
}

export function ErrorState({ text, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>{text}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="state state-empty">{children}</div>
}

// Label + control, like the design's Field, plus the error text under it.
export function Field({ label, note, icon, error, hint, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span>{label}{note && <small>{note}</small>}</span>
      {icon ? <div className="field-control"><Icon name={icon} size={18} />{children}</div> : children}
      {hint && !error && <em className="field-hint">{hint}</em>}
      {error && <em className="field-error">{error}</em>}
    </label>
  )
}

export function Modal({ title, icon, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        {icon && <span className="modal-icon"><Icon name={icon} size={28} /></span>}
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Toast({ children }) {
  return <div className="toast" role="status"><Icon name="check" /> {children}</div>
}
