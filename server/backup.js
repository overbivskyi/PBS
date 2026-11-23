// Daily database backup: a consistent copy of the SQLite file, the last 14 days are kept.
// Run: node server/backup.js   (on the server a systemd user timer runs it every night)

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, rmSync, chmodSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DB_PATH } from './db.js'

const KEEP = 14
const dir = join(dirname(DB_PATH), 'backups')
mkdirSync(dir, { recursive: true, mode: 0o700 })

const file = join(dir, `pbs-${new Date().toISOString().slice(0, 10)}.sqlite`)
rmSync(file, { force: true })
const db = new DatabaseSync(DB_PATH, { readOnly: true })
db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`)
db.close()
chmodSync(file, 0o600) // testers' personal data: only the owner can read it

const old = readdirSync(dir).filter((f) => /^pbs-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort().slice(0, -KEEP)
for (const f of old) rmSync(join(dir, f))
console.log('Backup saved:', file, old.length ? `(removed ${old.length} old)` : '')
