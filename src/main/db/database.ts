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
import { existsSync } from 'node:fs'
import * as paths from '../paths'
import { logger } from '../logger'
import { getDbKey, isUnlocked } from '../crypto/masterKey'
import { encryptJson, decryptJson } from '../crypto/cipher'
import type { ProfileData } from '@shared/types'

// Minimal structural typing for the better-sqlite3 surface we use, so a
// native-module load failure never breaks the whole module graph.
interface DbStatement {
  get(...args: unknown[]): unknown
  all(...args: unknown[]): unknown[]
  run(...args: unknown[]): { changes: number }
}

interface Db {
  pragma(sql: string): unknown
  exec(sql: string): unknown
  prepare(sql: string): DbStatement
  close(): void
}

let db: Db | null = null

interface ProfileRow {
  id: string
  name: string
  browser_type: string
  updated_at: number
  data: Buffer
}

// ---------------------------------------------------------------------------
// Native module loading
//
// Lazy-require better-sqlite3 so that a missing / ABI-mismatched binary
// surfaces as a clear, actionable error (reported by the startup crash
// dialog + crash.log) instead of an opaque crash at import time.
// ---------------------------------------------------------------------------

type SqliteCtor = new (file: string) => Db

let SqliteCtorCache: SqliteCtor | null = null

function loadSqlite(): SqliteCtor {
  if (!SqliteCtorCache) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      SqliteCtorCache = require('better-sqlite3') as unknown as SqliteCtor
    } catch (e) {
      const hint = process.versions.electron
        ? 'The SQLite native module failed to load. Reinstall JoeBrowser from the Releases page, or rebuild locally with "npm run dist:win".'
        : 'The SQLite native module failed to load. Run "npm ci" with an internet connection, then rebuild with "npm run dist:win".'
      throw new Error(
        `${hint} Technical detail: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }
  return SqliteCtorCache
}

export function openDatabase(): void {
  if (db) return
  paths.ensureDirs()
  const ctor = loadSqlite()
  db = new ctor(paths.dbFile())
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

function getDb(): Db {
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

/** List profile index (id, name, browser type, timestamps) without requiring decryption.
 *  Used when the app is locked so the sidebar can still show profile names. */
export function listProfilesIndex(): Array<{ id: string; name: string; browserType: string; updatedAt: number }> {
  const rows = getDb().prepare('SELECT id, name, browser_type, updated_at FROM profiles ORDER BY updated_at DESC').all() as Array<{ id: string; name: string; browser_type: string; updated_at: number }>
  return rows.map((r) => ({ id: r.id, name: r.name, browserType: r.browser_type, updatedAt: r.updated_at }))
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
