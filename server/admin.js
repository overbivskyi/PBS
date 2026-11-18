// Server admin tasks.
//   npm run server:seed                          reload generated demo data (testers' data stays)
//   npm run server:team -- email password Name   create a team account (sees the role switch)
//   npm run server:testers -- delete             delete all testers' accounts, photographers and bookings

import { randomBytes, scryptSync } from 'node:crypto'
import { openDb, seedGenerated, DB_PATH } from './db.js'

const [cmd, ...args] = process.argv.slice(2)
const db = openDb()

if (cmd === 'seed') {
  console.log('Loaded demo data into', DB_PATH, seedGenerated(db))
} else if (cmd === 'team') {
  const [email, password, firstName = 'Team', lastName = 'PBS'] = args
  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run server:team -- email password(8+ chars) [FirstName] [LastName]')
    process.exit(1)
  }
  const salt = randomBytes(16).toString('hex')
  const hash = `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
  db.prepare(`INSERT INTO users (id, role, first_name, last_name, email, password_hash, user_type)
    VALUES (?, 'team', ?, ?, ?, ?, 'team')`).run('u' + randomBytes(5).toString('hex'), firstName, lastName, email, hash)
  console.log('Team account created:', email)
} else if (cmd === 'testers' && args[0] === 'delete') {
  db.exec(`
    DELETE FROM events WHERE source = 'tester';
    DELETE FROM photographers WHERE user_type = 'tester';
    DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE user_type = 'tester');
    DELETE FROM users WHERE user_type = 'tester';
  `)
  console.log('Deleted all testers\' data')
} else {
  console.error('Commands: seed | team email password [First] [Last] | testers delete')
  process.exit(1)
}
