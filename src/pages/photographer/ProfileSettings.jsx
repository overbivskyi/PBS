import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, Icon, Toast } from '../../components/ui.jsx'
import { useAsync } from '../../lib/hooks.js'
import { getPhotographer, saveProfile } from '../../lib/store.js'
import { avatarSrc, portfolioSrc } from '../../lib/photos.js'
import { PhotographerGate, ProPage, ProLoading, readImage } from './common.jsx'

const MAX_PHOTOS = 12
const MIN_PHOTOS = 3
const ABOUT_MAX = 400

export default function ProfileSettings() {
  return <PhotographerGate>{(id) => <Loader id={id} />}</PhotographerGate>
}

function Loader({ id }) {
  const data = useAsync(() => getPhotographer(id), [id])
  if (data.status !== 'ready') return <ProLoading state={data} text="We could not load your profile. Try again." />
  return <ProfileForm key={id} photographer={data.data} />
}

function ProfileForm({ photographer: p }) {
  // Keep the shown photos stable while editing: generated photographers get their demo photos as real items.
  const [f, setF] = useState(() => ({
    photo: p.photo, firstName: p.firstName, lastName: p.lastName, about: p.about,
    skills: p.skills, gear: p.gear.join('\n'),
    portfolio: p.portfolio.map((item, i) => ({ ...item, src: portfolioSrc(p, item, i, 800) })),
  }))
  const [skill, setSkill] = useState('')
  const [photoError, setPhotoError] = useState(null)
  const [portfolioError, setPortfolioError] = useState(null)
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const dragFrom = useRef(null)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(t)
  }, [saved])

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
    setF((x) => ({ ...x, portfolio: [...x.portfolio, ...added] }))
  }

  function move(from, to) {
    if (from == null || from === to) return
    const list = [...f.portfolio]
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    set('portfolio', list)
  }

  function addSkill() {
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
    <ProPage
      title="Profile settings"
      subtitle="Help clients understand your style before they book."
      aside={<Link className="btn btn-secondary" to={`/photographer/${p.id}`}>View my profile</Link>}
    >
      {!p.rulesDone && (
        <p className="note">You appear in the search after you save both your profile and your <Link to="/photographer/rules">rules</Link>.</p>
      )}
      <form onSubmit={save} noValidate>
        <div className="profile-settings">
          <section className="form-card">
            <div className="setting-title">
              <span className="setting-icon"><Icon name="user" /></span>
              <div>
                <h2>Your profile</h2>
                <p>The essentials clients see in search.</p>
              </div>
            </div>
            <div className="photo-upload">
              <img src={f.photo || avatarSrc(p, 200)} alt="Profile" />
              <div>
                <label className="btn btn-secondary">
                  <Icon name="edit" size={17} /> Change photo
                  <input type="file" accept="image/jpeg,image/png" hidden onChange={changePhoto} />
                </label>
                <span>JPG or PNG</span>
                {photoError && <em className="field-error">{photoError}</em>}
              </div>
            </div>
            <div className="two-col">
              <Field label="First name" error={tried ? errors.firstName : null}><input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
              <Field label="Last name"><input value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
            </div>
            <Field label="About" note={`${f.about.length} / ${ABOUT_MAX}`}>
              <textarea rows={5} maxLength={ABOUT_MAX} value={f.about} onChange={(e) => set('about', e.target.value)} />
            </Field>
            <div className="field">
              <span>Skills</span>
              <div className="select-tags">
                {f.skills.map((s) => (
                  <button type="button" className="active" key={s} aria-label={`Remove ${s}`} onClick={() => set('skills', f.skills.filter((x) => x !== s))}>
                    {s} <Icon name="close" size={13} />
                  </button>
                ))}
                <span className="skill-add">
                  <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Add skill"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
                  <button type="button" onClick={addSkill} aria-label="Add skill"><Icon name="plus" size={14} /></button>
                </span>
              </div>
            </div>
            <Field label="Gear" note="One item per line">
              <textarea rows={3} value={f.gear} onChange={(e) => set('gear', e.target.value)} />
            </Field>
          </section>

          <section className="form-card">
            <div className="setting-title">
              <span className="setting-icon"><Icon name="image" /></span>
              <div>
                <h2>Portfolio</h2>
                <p>Show 3 to 12 photos. Drag to reorder; the first one is the cover.</p>
              </div>
            </div>
            <div className="settings-gallery">
              {f.portfolio.map((ph, i) => (
                <div key={ph.id} draggable
                  onDragStart={() => { dragFrom.current = i }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => move(dragFrom.current, i)}>
                  <img src={ph.src} alt={`Portfolio ${i + 1}`} />
                  <button type="button" aria-label="Remove photo" onClick={() => set('portfolio', f.portfolio.filter((x) => x.id !== ph.id))}>
                    <Icon name="close" size={14} />
                  </button>
                  {i === 0 && <span>Cover</span>}
                </div>
              ))}
              {f.portfolio.length < MAX_PHOTOS && (
                <label className="add-photo">
                  <Icon name="plus" />
                  <span>Add photos</span>
                  <small>{f.portfolio.length} of {MAX_PHOTOS}</small>
                  <input type="file" accept="image/jpeg,image/png" multiple hidden onChange={addPhotos} />
                </label>
              )}
            </div>
            {portfolioError && <em className="field-error">{portfolioError}</em>}
            {tried && errors.portfolio && <em className="field-error">{errors.portfolio}</em>}
          </section>
        </div>

        <div className="sticky-save">
          <span>{saveError ? <em className="field-error">{saveError}</em> : 'Your public profile updates at once.'}</span>
          <button className="btn btn-primary">Save profile</button>
        </div>
      </form>
      {saved && <Toast>Profile saved</Toast>}
    </ProPage>
  )
}
