// Simple text pages. Ihor's drafts (WBS 7.4, 7.6) replace this text.

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
  const t = TEXTS[kind]
  return (
    <div className="container page narrow">
      <article className="card prose">
        <h1>{t.title}</h1>
        <p className="muted small">Draft</p>
        {t.body.map((p) => <p key={p}>{p}</p>)}
      </article>
    </div>
  )
}
