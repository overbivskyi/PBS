import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Art, Avatar, Field, Loading, ErrorState } from '../../components/ui.jsx'
import { useAsync } from '../../lib/hooks.js'
import { getPhotographer, saveProfile, styleName } from '../../lib/store.js'
import { PhotographerGate, PhotographerTabs, readImage } from './common.jsx'

const MAX_PHOTOS = 12
const MIN_PHOTOS = 3
const ABOUT_MAX = 400

export default function ProfileSettings() {
  return <PhotographerGate>{(id) => <Loader id={id} />}</PhotographerGate>
}

function Loader({ id }) {
  const data = useAsync(() => getPhotographer(id), [id])
  if (data.status === 'loading') return <div className="container page"><Loading /></div>
  if (data.status === 'error') return <div className="container page"><ErrorState text="We could not load your profile. Try again." onRetry={data.retry} /></div>
  return <ProfileForm key={id} photographer={data.data} />
}

function ProfileForm({ photographer: p }) {
  const [f, setF] = useState({
    photo: p.photo, firstName: p.firstName, lastName: p.lastName, about: p.about,
    skills: p.skills, gear: p.gear.join('\n'), portfolio: p.portfolio,
  })
  const [skill, setSkill] = useState('')
  const [photoError, setPhotoError] = useState(null)
  const [portfolioError, setPortfolioError] = useState(null)
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const dragFrom = useRef(null)
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setSaved(false) }

  const errors = {
    firstName: !f.firstName.trim() ? 'Fill in this field' : null,
    portfolio: f.portfolio.length < MIN_PHOTOS ? `Add at least ${MIN_PHOTOS} photos` : null,
  }
  const valid = !errors.firstName && !errors.portfolio

  async function changePhoto(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      set('photo', await readImage(file, 400))
      setPhotoError(null)
    } catch (err) {
      setPhotoError(err.message)
    }
  }

  async function addPhotos(e) {
    const files = [...e.target.files]
    e.target.value = ''
    setPortfolioError(null)
    const room = MAX_PHOTOS - f.portfolio.length
    if (files.length > room) setPortfolioError(`You can have up to ${MAX_PHOTOS} photos`)
    const added = []
    for (const file of files.slice(0, room)) {
      try {
        added.push({ id: `${p.id}-u${Date.now()}-${added.length}`, src: await readImage(file) })
      } catch (err) {
        setPortfolioError(`${file.name}: ${err.message}`)
      }
    }
    set('portfolio', [...f.portfolio, ...added])
  }

  function move(from, to) {
    if (from == null || from === to) return
    const list = [...f.portfolio]
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    set('portfolio', list)
  }

  function addSkill(e) {
    e.preventDefault()
    const v = skill.trim()
    if (v && !f.skills.includes(v)) set('skills', [...f.skills, v])
    setSkill('')
  }

  async function save(e) {
    e.preventDefault()
    setTried(true)
    if (!valid) return
    try {
      await saveProfile(p.id, {
        photo: f.photo, firstName: f.firstName.trim(), lastName: f.lastName.trim(), about: f.about.trim(),
        skills: f.skills, gear: f.gear.split('\n').map((x) => x.trim()).filter(Boolean), portfolio: f.portfolio,
      })
      setSaved(true)
      setSaveError(null)
    } catch {
      setSaveError('Could not save: the photos are too large for browser storage. Remove some photos and try again.')
    }
  }

  return (
    <div className="container page narrow">
      <PhotographerTabs />
      <h1>Profile settings</h1>
      {!p.rulesDone && <p className="note">You appear in the search after you save both your profile and your <Link to="/photographer/rules">rules</Link>.</p>}
      <form className="card form" onSubmit={save} noValidate>
        <div className="photo-row">
          <Avatar person={{ ...p, photo: f.photo, firstName: f.firstName, lastName: f.lastName }} size={88} />
          <label className="btn">
            Change photo
            <input type="file" accept="image/jpeg,image/png" hidden onChange={changePhoto} />
          </label>
          {photoError && <span className="field-error">{photoError}</span>}
        </div>

        <div className="grid-2">
          <Field label="First name" error={tried ? errors.firstName : null}><input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Last name"><input value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
        </div>

        <Field label="About" hint={`${f.about.length} / ${ABOUT_MAX}`}>
          <textarea rows="4" maxLength={ABOUT_MAX} value={f.about} onChange={(e) => set('about', e.target.value)} />
        </Field>

        <div className="field">
          <span className="field-label">Skills</span>
          <div className="tags">
            {f.skills.map((s) => (
              <span key={s} className="tag tag-edit">
                {s} <button type="button" aria-label={`Remove ${s}`} onClick={() => set('skills', f.skills.filter((x) => x !== s))}>×</button>
              </span>
            ))}
          </div>
          <div className="inline">
            <input value={skill} onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill(e)} placeholder="New skill" />
            <button type="button" className="btn" onClick={addSkill}>Add</button>
          </div>
        </div>

        <Field label="Gear" hint="One item per line">
          <textarea rows="4" value={f.gear} onChange={(e) => set('gear', e.target.value)} />
        </Field>

        <div className={`field ${(tried && errors.portfolio) || portfolioError ? 'has-error' : ''}`}>
          <span className="field-label">Portfolio <span className="muted">({f.portfolio.length} / {MAX_PHOTOS}, drag to reorder)</span></span>
          <div className="portfolio">
            {f.portfolio.map((ph, i) => (
              <div key={ph.id} className="portfolio-item" draggable
                onDragStart={() => { dragFrom.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => move(dragFrom.current, i)}>
                <Art seed={ph.id} src={ph.src} label={ph.style ? styleName(ph.style) : ''} />
                <button type="button" className="remove" aria-label="Remove photo" onClick={() => set('portfolio', f.portfolio.filter((x) => x.id !== ph.id))}>×</button>
              </div>
            ))}
          </div>
          {f.portfolio.length < MAX_PHOTOS && (
            <label className="btn">
              Add photos
              <input type="file" accept="image/jpeg,image/png" multiple hidden onChange={addPhotos} />
            </label>
          )}
          {portfolioError && <span className="field-error">{portfolioError}</span>}
          {tried && errors.portfolio && <span className="field-error">{errors.portfolio}</span>}
        </div>

        <div className="actions">
          <button className="btn btn-primary btn-lg">Save profile</button>
          <Link className="btn btn-lg" to={`/photographer/${p.id}`}>View my profile</Link>
        </div>
        {saved && <p className="success" role="status">Profile saved</p>}
        {saveError && <p className="field-error" role="alert">{saveError}</p>}
      </form>
    </div>
  )
}
