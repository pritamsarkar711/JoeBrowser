/**
 * Centralized path resolution for the app.
 *
 * Base directory defaults to %APPDATA%/StealthBrowser (or ~/.config/StealthBrowser
 * on Linux, ~/Library/Application Support/StealthBrowser on macOS) and can be
 * overridden from Settings.
 *
 * Layout:
 *   <base>/
 *     profiles.db            encrypted SQLite database (AES-256-GCM payloads)
 *     master.key             key-wrapping metadata (never the password itself)
 *     settings.json          non-sensitive UI settings
 *     profiles/<id>/userData browser user data dir per profile (isolation)
 *     logs/app.log           rotating app log
 *
 * This module is Electron-safe: when run under plain Node (scripts/tests),
 * it falls back to environment variables and process.cwd().
 */
import { join } from 'node:path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

interface ElectronAppLike {
  getPath(name: string): string
  isPackaged: boolean
  getAppPath(): string
}

function electronApp(): ElectronAppLike | null {
  if (!process.versions.electron) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as { app: ElectronAppLike }
    return app
  } catch {
    return null
  }
}

const APP_NAME = 'StealthBrowser'
let dataDir: string | null = null

export function defaultDataDir(): string {
  const app = electronApp()
  if (app) return join(app.getPath('appData'), APP_NAME)
  // Plain-Node fallback (tests/scripts)
  if (process.platform === 'win32') return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), APP_NAME)
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', APP_NAME)
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), APP_NAME)
}

export function getDataDir(): string {
  return dataDir ?? defaultDataDir()
}

export function setDataDir(dir: string): void {
  dataDir = dir
  ensureDirs()
}

export function ensureDirs(): void {
  const base = getDataDir()
  mkdirSync(base, { recursive: true })
  mkdirSync(join(base, 'profiles'), { recursive: true })
  mkdirSync(join(base, 'logs'), { recursive: true })
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export const dbFile = (): string => join(getDataDir(), 'profiles.db')
export const masterKeyFile = (): string => join(getDataDir(), 'master.key')
export const settingsFile = (): string => join(getDataDir(), 'settings.json')
export const logsDir = (): string => join(getDataDir(), 'logs')
export const profilesRoot = (): string => join(getDataDir(), 'profiles')

export function profileDir(id: string): string {
  return join(profilesRoot(), id)
}

export function profileUserDataDir(id: string, override = ''): string {
  return override.trim() !== '' ? override : join(profileDir(id), 'userData')
}

export function firefoxProfileDir(id: string, override = ''): string {
  // Firefox uses the same per-profile directory as its -profile target.
  return profileUserDataDir(id, override)
}

/** Temp root for built stealth extensions (unique subdir per launch). */
export function tempExtensionRoot(): string {
  return join(require('node:os').tmpdir(), 'stealthbrowser-ext')
}

/** Where the bundled stealth extension template lives. */
export function extensionTemplateDir(): string {
  const app = electronApp()
  if (app && app.isPackaged) {
    const res = join(process.resourcesPath, 'extension')
    if (existsSync(res)) return res
  }
  const appPath = app ? app.getAppPath() : process.cwd()
  return join(appPath, 'src', 'extension')
}

/** Settings store with an explicit file so it's easy to relocate. */
export function readSettingsFile<T>(fallback: T): T {
  try {
    if (!existsSync(settingsFile())) return fallback
    return { ...fallback, ...JSON.parse(readFileSync(settingsFile(), 'utf-8')) }
  } catch {
    return fallback
  }
}

export function writeSettingsFile<T>(data: T): void {
  mkdirSync(getDataDir(), { recursive: true })
  writeFileSync(settingsFile(), JSON.stringify(data, null, 2), 'utf-8')
}

export { APP_NAME }
