import { styleName } from '../lib/store.js'

const PALETTE = [
  ['#f4a261', '#e76f51'], ['#2a9d8f', '#264653'], ['#e9c46a', '#f4a261'], ['#8ecae6', '#219ebc'],
  ['#cdb4db', '#a2d2ff'], ['#b5e48c', '#52b69a'], ['#ffafcc', '#cdb4db'], ['#90be6d', '#43aa8b'],
]

function hashOf(text) {
  let h = 0
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

// Placeholder art until the team adds licensed or AI-generated photos (spec section 7).
export function Art({ seed, label, src, className = '' }) {
  if (src) return <img className={`art ${className}`} src={src} alt={label || ''} loading="lazy" />
  const h = hashOf(seed)
  const [a, b] = PALETTE[h % PALETTE.length]
  const cx = 20 + (h % 60)
  const cy = 25 + ((h >> 3) % 50)
  return (
    <svg className={`art ${className}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label || 'Photo'}>
      <defs>
        <linearGradient id={`g${h}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#g${h})`} />
      <circle cx={cx} cy={cy} r={12 + (h % 10)} fill="#fff" opacity="0.35" />
      <path d={`M0 ${70 + (h % 15)} Q 30 ${55 + (h % 20)} 60 ${72} T 100 ${65 + ((h >> 2) % 20)} V100 H0 Z`} fill="#000" opacity="0.15" />
      {label && (
        <text x="6" y="94" fontSize="8" fill="#fff" opacity="0.9" fontFamily="system-ui">{label}</text>
      )}
    </svg>
  )
}

export function Avatar({ person, size = 56 }) {
  const initials = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`
  if (person.photo) return <img className="avatar" src={person.photo} alt="" style={{ width: size, height: size }} />
  const [a, b] = PALETTE[hashOf(person.id) % PALETTE.length]
  return (
    <div className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.36 }} aria-hidden>
      {initials}
    </div>
  )
}

export function Stars({ value, count }) {
  if (!value) return <span className="muted">New</span>
  return (
    <span className="stars" title={`${value} out of 5`}>
      <span aria-hidden>★</span> {value.toFixed(1)}
      {count != null && <span className="muted"> · {count} shoots</span>}
    </span>
  )
}

export function StyleTags({ styles, highlight = [] }) {
  return (
    <span className="tags">
      {styles.map((s) => (
        <span key={s} className={`tag ${highlight.includes(s) ? 'tag-on' : ''}`}>{styleName(s)}</span>
      ))}
    </span>
  )
}

export function Loading({ text = 'Loading…' }) {
  return <div className="state state-loading" role="status"><span className="spinner" /> {text}</div>
}

export function ErrorState({ text, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>{text}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="state state-empty">{children}</div>
}

export function Field({ label, error, children, hint }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
