// ============================================================
// Joe Browser - Database Service
// SQLite-based profile storage with proper error handling
// ============================================================

import * as path from 'path';
import * as fs from 'fs';
import { ProfileData, NewProfileInput } from '../../shared/types';

// We use better-sqlite3 for synchronous, fast SQLite access
let Database: any;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('[Database] Failed to load better-sqlite3:', err);
  Database = null;
}

export class DatabaseService {
  private db: any;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!Database) {
      throw new Error('better-sqlite3 is not available');
    }

    try {
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.initialize();
      console.log('[Database] Initialized at:', dbPath);
    } catch (err) {
      console.error('[Database] Failed to initialize:', err);
      throw err;
    }
  }

  /**
   * Initialize database tables
   */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        browser_type TEXT NOT NULL DEFAULT 'chrome',
        device_type TEXT NOT NULL DEFAULT 'desktop',
        os TEXT NOT NULL DEFAULT 'windows',
        fingerprint TEXT NOT NULL DEFAULT '{}',
        proxy TEXT,
        launch_url TEXT DEFAULT 'https://www.google.com',
        tags TEXT DEFAULT '[]',
        group_name TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used INTEGER,
        notes TEXT DEFAULT '',
        extensions TEXT DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_browser_type ON profiles(browser_type);
      CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_name);
      CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at);
    `);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ProfileData[] {
    try {
      const rows = this.db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all();
      return rows.map((row: any) => this.rowToProfile(row));
    } catch (err) {
      console.error('[Database] Failed to get profiles:', err);
      return [];
    }
  }

  /**
   * Get a single profile by ID
   */
  getProfile(id: string): ProfileData | null {
    try {
      const row = this.db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
      if (!row) return null;
      return this.rowToProfile(row);
    } catch (err) {
      console.error('[Database] Failed to get profile:', err);
      return null;
    }
  }

  /**
   * Create a new profile
   */
  createProfile(profile: ProfileData): void {
    try {
      this.db.prepare(`
        INSERT INTO profiles (id, name, browser_type, device_type, os, fingerprint, proxy, launch_url, tags, group_name, created_at, updated_at, last_used, notes, extensions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profile.id,
        profile.name,
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
        profile.lastUsed || null,
        profile.notes,
        JSON.stringify(profile.extensions),
      );
    } catch (err) {
      console.error('[Database] Failed to create profile:', err);
      throw err;
    }
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, updates: Partial<ProfileData>): void {
    try {
      const existing = this.getProfile(id);
      if (!existing) {
        throw new Error(`Profile not found: ${id}`);
      }

      // Build SET clause dynamically
      const fields: string[] = [];
      const values: any[] = [];

      const fieldMap: Record<string, string> = {
        name: 'name',
        browserType: 'browser_type',
        deviceType: 'device_type',
        os: 'os',
        fingerprint: 'fingerprint',
        proxy: 'proxy',
        launchUrl: 'launch_url',
        tags: 'tags',
        group: 'group_name',
        updatedAt: 'updated_at',
        lastUsed: 'last_used',
        notes: 'notes',
        extensions: 'extensions',
      };

      for (const [key, column] of Object.entries(fieldMap)) {
        if ((updates as any)[key] !== undefined) {
          fields.push(`${column} = ?`);
          let value = (updates as any)[key];

          // Serialize JSON fields
          if (key === 'fingerprint' || key === 'proxy' || key === 'tags' || key === 'extensions') {
            value = value ? JSON.stringify(value) : null;
          }

          values.push(value);
        }
      }

      if (fields.length === 0) return;

      values.push(id);
      this.db.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    } catch (err) {
      console.error('[Database] Failed to update profile:', err);
      throw err;
    }
  }

  /**
   * Delete a profile
   */
  deleteProfile(id: string): void {
    try {
      this.db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
    } catch (err) {
      console.error('[Database] Failed to delete profile:', err);
      throw err;
    }
  }

  /**
   * Convert a database row to a ProfileData object
   */
  private rowToProfile(row: any): ProfileData {
    return {
      id: row.id,
      name: row.name,
      browserType: row.browser_type,
      deviceType: row.device_type,
      os: row.os,
      fingerprint: typeof row.fingerprint === 'string' ? JSON.parse(row.fingerprint) : row.fingerprint,
      proxy: row.proxy ? (typeof row.proxy === 'string' ? JSON.parse(row.proxy) : row.proxy) : undefined,
      launchUrl: row.launch_url || 'https://www.google.com',
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      group: row.group_name || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsed: row.last_used || undefined,
      notes: row.notes || '',
      extensions: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    try {
      if (this.db) {
        this.db.close();
      }
    } catch (err) {
      console.error('[Database] Failed to close:', err);
    }
  }
}
