// ============================================================
// Joe Browser - Database Service
// SQLite-based profile storage using better-sqlite3
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { ProfileData, NewProfileInput, BrowserType, DeviceType, OsType } from '../../shared/types';
import { generateForNewProfile, generateProfileName } from './fingerprintGenerator';
import { v4 as uuidv4 } from 'uuid';

let db: Database.Database | null = null;

function getDbPath(): string {
  return path.join(app.getPath('userData'), 'joe-browser.db');
}

function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initialize();
  }
  return db;
}

function initialize(): void {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      browser_type TEXT NOT NULL DEFAULT 'chrome',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      os TEXT NOT NULL DEFAULT 'windows',
      fingerprint TEXT NOT NULL,
      proxy TEXT,
      launch_url TEXT NOT NULL DEFAULT 'https://iphey.com',
      tags TEXT NOT NULL DEFAULT '[]',
      profile_group TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_used INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      extensions TEXT NOT NULL DEFAULT '[]'
    )
  `);

  d.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  d.exec(`
    CREATE TABLE IF NOT EXISTS master_password (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hash TEXT NOT NULL
    )
  `);
}

// ---- Profile CRUD ----

export function listProfiles(): ProfileData[] {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all() as any[];
  return rows.map(row => deserializeProfile(row));
}

export function getProfile(id: string): ProfileData | null {
  const d = getDb();
  const row = d.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as any;
  return row ? deserializeProfile(row) : null;
}

export function createProfile(input: NewProfileInput): ProfileData {
  const d = getDb();
  const now = Date.now();
  const id = uuidv4();

  const fingerprint = generateForNewProfile(
    input.browserType,
    input.os,
    input.deviceType,
  );

  // Count existing profiles for this browser type to generate name
  const count = d.prepare('SELECT COUNT(*) as cnt FROM profiles WHERE browser_type = ?').get(input.browserType) as any;
  const name = input.name || generateProfileName(input.browserType, (count?.cnt || 0) + 1);

  const profile: ProfileData = {
    id,
    name,
    browserType: input.browserType,
    deviceType: input.deviceType || 'desktop',
    os: input.os || 'windows',
    fingerprint,
    proxy: input.proxy,
    launchUrl: input.launchUrl || 'https://iphey.com',
    tags: input.tags || [],
    group: input.group || '',
    createdAt: now,
    updatedAt: now,
    notes: input.notes || '',
    extensions: [],
  };

  d.prepare(`
    INSERT INTO profiles (id, name, browser_type, device_type, os, fingerprint, proxy, launch_url, tags, profile_group, created_at, updated_at, notes, extensions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    profile.browserType,
    profile.deviceType,
    profile.os,
    JSON.stringify(profile.fingerprint),
    profile.proxy ? JSON.stringify(profile.proxy) : null,
    profile.launchUrl,
    JSON.stringify(profile.tags),
    profile.group,
    profile.createdAt,
    profile.updatedAt,
    profile.notes,
    JSON.stringify(profile.extensions),
  );

  return profile;
}

export function updateProfile(id: string, updates: Partial<ProfileData>): ProfileData | null {
  const d = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: Date.now() };

  // Regenerate fingerprint if browser/os/device changed
  if (updates.browserType || updates.os || updates.deviceType) {
    updated.fingerprint = generateForNewProfile(
      updated.browserType,
      updated.os,
      updated.deviceType,
    );
  }

  d.prepare(`
    UPDATE profiles SET
      name = ?, browser_type = ?, device_type = ?, os = ?,
      fingerprint = ?, proxy = ?, launch_url = ?, tags = ?,
      profile_group = ?, updated_at = ?, notes = ?, extensions = ?, last_used = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.browserType,
    updated.deviceType,
    updated.os,
    JSON.stringify(updated.fingerprint),
    updated.proxy ? JSON.stringify(updated.proxy) : null,
    updated.launchUrl,
    JSON.stringify(updated.tags),
    updated.group,
    updated.updatedAt,
    updated.notes,
    JSON.stringify(updated.extensions),
    updated.lastUsed || null,
    id,
  );

  return updated;
}

export function deleteProfile(id: string): boolean {
  const d = getDb();
  const result = d.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  return result.changes > 0;
}

export function duplicateProfile(id: string): ProfileData | null {
  const existing = getProfile(id);
  if (!existing) return null;

  return createProfile({
    name: `${existing.name} (Copy)`,
    browserType: existing.browserType,
    deviceType: existing.deviceType,
    os: existing.os,
    proxy: existing.proxy,
    launchUrl: existing.launchUrl,
    tags: [...existing.tags],
    group: existing.group,
    notes: existing.notes,
  });
}

export function exportProfile(id: string): string | null {
  const profile = getProfile(id);
  if (!profile) return null;
  return JSON.stringify(profile, null, 2);
}

export function importProfile(json: string): ProfileData | null {
  try {
    const data = JSON.parse(json) as ProfileData;
    // Create a new profile from the imported data
    return createProfile({
      name: data.name,
      browserType: data.browserType,
      deviceType: data.deviceType,
      os: data.os,
      proxy: data.proxy,
      launchUrl: data.launchUrl,
      tags: data.tags,
      group: data.group,
      notes: data.notes,
    });
  } catch {
    return null;
  }
}

function deserializeProfile(row: any): ProfileData {
  return {
    id: row.id,
    name: row.name,
    browserType: row.browser_type as BrowserType,
    deviceType: row.device_type as DeviceType,
    os: row.os as OsType,
    fingerprint: JSON.parse(row.fingerprint),
    proxy: row.proxy ? JSON.parse(row.proxy) : undefined,
    launchUrl: row.launch_url,
    tags: JSON.parse(row.tags),
    group: row.profile_group,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsed: row.last_used || undefined,
    notes: row.notes,
    extensions: JSON.parse(row.extensions),
  };
}

// ---- Settings ----

export function getSetting(key: string): string | null {
  const d = getDb();
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// ---- Master Password ----

export function getMasterPasswordHash(): string | null {
  const d = getDb();
  const row = d.prepare('SELECT hash FROM master_password WHERE id = 1').get() as any;
  return row?.hash || null;
}

export function setMasterPasswordHash(hash: string): void {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO master_password (id, hash) VALUES (1, ?)').run(hash);
}

export function isMasterPasswordInitialized(): boolean {
  return !!getMasterPasswordHash();
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
