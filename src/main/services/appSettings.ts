/**
 * App-wide settings. Stored as plain JSON (settings.json) because none of
 * these values are sensitive (theme, language, data dir, startup behavior).
 * Profile data lives in the encrypted database instead.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings } from '@shared/types'
import * as paths from '../paths'
import { logger } from '../logger'
import * as db from '../db/database'
import { closeDatabase } from '../db/database'

const DEFAULTS: AppSettings = {
  theme: 'system',
  language: 'en',
  dataDir: '',
  launchAtStartup: false,
  closeBrowsersOnQuit: true,
  minimizeToTray: false
}

let cache: AppSettings | null = null

export function loadSettings(): AppSettings {
  if (cache) return { ...cache }
  cache = paths.readSettingsFile<AppSettings>(DEFAULTS)
  return { ...cache }
}

export function getSettings(): AppSettings {
  return loadSettings()
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = loadSettings()
  const next: AppSettings = { ...current, ...patch }

  // Data directory change: relocate the encrypted DB + master key.
  if (next.dataDir && next.dataDir !== current.dataDir && next.dataDir !== paths.getDataDir()) {
    await relocateDataDir(next.dataDir)
  } else if (!next.dataDir) {
    next.dataDir = ''
    paths.setDataDir(paths.defaultDataDir())
  }

  // Startup behavior (Windows/macOS).
  try {
    // Lazy-require electron so this module can be loaded in non-Electron contexts
    // (scripts/tests) without crashing.
    const { app } = require('electron')
    app.setLoginItemSettings({ openAtLogin: next.launchAtStartup })
  } catch (e) {
    logger.warn('setLoginItemSettings failed', e)
  }

  cache = next
  paths.writeSettingsFile(next)
  logger.info('Settings saved', next)
  return { ...next }
}

async function relocateDataDir(newDir: string): Promise<void> {
  const oldBase = paths.getDataDir()
  const oldDb = paths.dbFile()
  const newBase = newDir
  if (oldBase === newBase) return

  closeDatabase() // release file handles (WAL) before copying
  try {
    mkdirSync(newBase, { recursive: true })
    if (existsSync(oldDb)) {
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        const src = oldDb + suffix
        if (existsSync(src)) copyFileSync(src, join(newBase, 'profiles.db' + suffix))
      }
      if (existsSync(paths.masterKeyFile())) {
        copyFileSync(paths.masterKeyFile(), join(newBase, 'master.key'))
      }
    }
    paths.setDataDir(newBase)
    db.openDatabase()
    logger.info('Data directory relocated to', newBase)
  } catch (e) {
    // Roll back on failure
    paths.setDataDir(oldBase)
    db.openDatabase()
    throw new Error('Could not relocate data directory: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    // Never delete the old directory — safety first.
  }
}

export function resetSettingsCache(): void {
  cache = null
}

export function cleanupOldDataDir(): void {
  // Intentionally a no-op: old data dirs are kept, never deleted.
}
