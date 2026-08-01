/**
 * Encrypted SQLite database (better-sqlite3).
 *
 * better-sqlite3 was chosen over @journeyapps/sqlcipher because it ships
 * prebuilt binaries for Electron (ABI-matched), so `npm install` works on a
 * stock Windows machine without Visual Studio build tools.
 *
 * Encryption at rest is implemented at the application layer:
 *  - every profile row payload is AES-256-GCM encrypted with the DB key
 *    (derived from the master password, see crypto/masterKey.ts),
 *  - only non-sensitive index columns (id, name, browser type, timestamps)
 *    are stored in plaintext so the sidebar can list profiles while locked,
 *  - the DB key itself is stored wrapped — the .db file is useless without
 *    the master password.
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import * as paths from '../paths'
import { logger } from '../logger'
import { getDbKey, isUnlocked } from '../crypto/masterKey'
import { encryptJson, decryptJson } from '../crypto/cipher'
import type { ProfileData } from '@shared/types'

let db: Database.Database | null = null

interface ProfileRow {
  id: string
  name: string
  browser_type: string
  updated_at: number
  data: Buffer
}

export function openDatabase(): void {
  if (db) return
  paths.ensureDirs()
  db = new Database(paths.dbFile())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      browser_type TEXT NOT NULL,
      updated_at   INTEGER NOT NULL,
      data         BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value BLOB NOT NULL
    );
  `)
  logger.info('Database ready')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function getDb(): Database.Database {
  if (!db) throw new Error('Database is not open.')
  return db
}

function requireKey(): Buffer {
  if (!isUnlocked()) throw new Error('App is locked.')
  return getDbKey()
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function listProfiles(): ProfileData[] {
  const rows = getDb().prepare('SELECT * FROM profiles ORDER BY updated_at DESC').all() as ProfileRow[]
  const key = requireKey()
  return rows.map((r) => {
    try {
      return decryptJson<ProfileData>(key, r.data)
    } catch (e) {
      logger.error('Failed to decrypt profile ' + r.id, e)
      return null
    }
  }).filter((p): p is ProfileData => p !== null)
}

export function getProfile(id: string): ProfileData | null {
  const row = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | undefined
  if (!row) return null
  return decryptJson<ProfileData>(requireKey(), row.data)
}

export function insertProfile(profile: ProfileData): void {
  const key = requireKey()
  getDb()
    .prepare('INSERT INTO profiles (id, name, browser_type, updated_at, data) VALUES (?, ?, ?, ?, ?)')
    .run(profile.id, profile.name, profile.browserType, profile.updatedAt, encryptJson(key, profile))
}

export function updateProfile(profile: ProfileData): void {
  const key = requireKey()
  getDb()
    .prepare('UPDATE profiles SET name = ?, browser_type = ?, updated_at = ?, data = ? WHERE id = ?')
    .run(profile.name, profile.browserType, profile.updatedAt, encryptJson(key, profile), profile.id)
}

export function deleteProfile(id: string): boolean {
  const res = getDb().prepare('DELETE FROM profiles WHERE id = ?').run(id)
  return res.changes > 0
}

export function countProfiles(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS c FROM profiles').get() as { c: number }
  return row.c
}

// ---------------------------------------------------------------------------
// Settings (encrypted — may contain the data directory, etc.)
// ---------------------------------------------------------------------------

export function getSetting<T>(key: string, fallback: T): T {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: Buffer } | undefined
  if (!row) return fallback
  try {
    return decryptJson<T>(requireKey(), row.value)
  } catch {
    return fallback
  }
}

export function setSetting<T>(key: string, value: T): void {
  const payload = encryptJson(requireKey(), value)
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, payload)
}

// ---------------------------------------------------------------------------
// Meta (plaintext, non-sensitive)
// ---------------------------------------------------------------------------

export function getMeta(key: string, fallback = ''): string {
  const row = getDb().prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined
  return row ? row.value : fallback
}

export function setMeta(key: string, value: string): void {
  getDb().prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

/** Verify the DB file exists (used by self-test). */
export function databaseExists(): boolean {
  return existsSync(paths.dbFile())
}
