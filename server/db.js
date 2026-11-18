// SQLite database (built into Node 22.13+, no packages to install).
// The schema is created on start; `npm run server:seed` loads the generated demo data from src/data.

import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DB_PATH = process.env.DB_PATH || join(ROOT, 'server', 'data', 'pbs.sqlite')

export function loadJson(name) {
  return JSON.parse(readFileSync(join(ROOT, 'src', 'data', `${name}.json`), 'utf8'))
}

export function openDb(path = DB_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- user_type is "generated" (demo data) or "tester" (real people), spec section 7
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('client', 'photographer', 'team')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      photographer_id TEXT,
      user_type TEXT NOT NULL DEFAULT 'tester',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- the whole photographer profile and rules as JSON, same shape as src/data/photographers.json
    CREATE TABLE IF NOT EXISTS photographers (
      id TEXT PRIMARY KEY,
      user_type TEXT NOT NULL,
      data TEXT NOT NULL
    );
    -- bookings and other calendar events, same shape as src/data/events.json
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      photographer_id TEXT NOT NULL,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      source TEXT NOT NULL,
      client_user_id TEXT,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_by_day ON events (photographer_id, date);
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      photographer_id TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `)
  return db
}

// Replaces all generated demo data. Testers' accounts, photographers and bookings stay.
export function seedGenerated(db) {
  const photographers = loadJson('photographers')
  const events = loadJson('events')
  const reviews = loadJson('reviews')
  db.exec('BEGIN')
  try {
    db.exec("DELETE FROM photographers WHERE user_type = 'generated'")
    db.exec("DELETE FROM events WHERE source = 'generated'")
    db.exec('DELETE FROM reviews')
    const insP = db.prepare('INSERT INTO photographers (id, user_type, data) VALUES (?, ?, ?)')
    for (const p of photographers) insP.run(p.id, 'generated', JSON.stringify({ ...p, calendarConnected: true }))
    const insE = db.prepare('INSERT INTO events (id, photographer_id, date, kind, source, data) VALUES (?, ?, ?, ?, ?, ?)')
    for (const e of events) insE.run(e.id, e.photographerId, e.date, e.kind, 'generated', JSON.stringify(e))
    const insR = db.prepare('INSERT INTO reviews (id, photographer_id, data) VALUES (?, ?, ?)')
    for (const r of reviews) insR.run(r.id, r.photographerId, JSON.stringify(r))
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return { photographers: photographers.length, events: events.length, reviews: reviews.length }
}
