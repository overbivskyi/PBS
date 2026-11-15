// Simple text pages. Ihor's drafts (WBS 7.4, 7.6) replace this text.
import { t } from '../lib/i18n.js'

const TEXTS = {
  terms: {
    title: 'Terms of service',
    body: [
      'This website is a course demo. No real payments are made and no real photo shoots are arranged.',
      'Deposits shown on the site are 30% of the shoot price. The remaining 70% is paid after the shoot.',
      'Cancellation rules: draft. The final text will come from the team (WBS 7.4).',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    body: [
      'In this demo, accounts and bookings you create are stored only in your own browser. Nothing is sent to a server.',
      'You can delete everything with "Reset demo data" in the footer.',
      'The final text will come from the team (WBS 7.6).',
    ],
  },
}

export default function TextPage({ kind }) {
  const page = TEXTS[kind]
  return (
    <main className="page-alt">
      <div className="container narrow-page">
        <article className="form-card prose">
          <span className="kicker">{t('Draft')}</span>
          <h1>{t(page.title)}</h1>
          {page.body.map((p) => <p key={p}>{t(p)}</p>)}
        </article>
      </div>
    </main>
  )
}
