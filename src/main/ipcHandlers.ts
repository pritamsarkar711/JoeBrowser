/**
 * All IPC handlers, registered once at app startup.
 *
 * Every handler returns `{ ok: true, data }` or `{ ok: false, error }`
 * so the renderer never has to guess about thrown exceptions.
 */
import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron'
import { cpus, hostname, platform, release, totalmem } from 'node:os'
import { IPC } from '@shared/ipc'
import type {
  AppSettings,
  BrowserStatusEvent,
  GenerateFingerprintOptions,
  LaunchOptions,
  NewProfileInput,
  ProfileData,
  ProxyConfig,
  SystemInfo
} from '@shared/types'
import * as masterKey from './crypto/masterKey'
import * as db from './db/database'
import * as repo from './db/profileRepository'
import { deriveFingerprintFromUA, generateFingerprint, generateForNewProfile } from './services/fingerprintGenerator'
import { detectAllBrowsers } from './services/browserDetector'
import { testProxy } from './services/proxyTester'
import { UA_LIBRARY } from './services/uaDatabase'
import { closeProfile, launchProfile, listRunning, onBrowserStatus } from './services/browserLauncher'
import { getSettings, saveSettings } from './services/appSettings'
import { logger } from './logger'
import * as paths from './paths'

interface Result<T> {
  ok: boolean
  data?: T
  error?: string
}

function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

function fail(error: unknown): Result<never> {
  return { ok: false, error: error instanceof Error ? error.message : String(error) }
}

async function guard<T>(fn: () => T | Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn())
  } catch (e) {
    logger.error('IPC error:', e)
    return fail(e)
  }
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  // --- Auth ----------------------------------------------------------------
  ipcMain.handle(IPC.AppInit, () =>
    guard(() => ({
      initialized: masterKey.isInitialized(),
      unlocked: masterKey.isUnlocked(),
      version: app.getVersion(),
      platform: process.platform
    }))
  )

  ipcMain.handle(IPC.AppSetMasterPassword, (_e, password: string) =>
    guard(() => {
      masterKey.setMasterPassword(password)
      db.openDatabase()
      return true
    })
  )

  ipcMain.handle(IPC.AppUnlock, (_e, password: string) =>
    guard(() => {
      const unlocked = masterKey.unlock(password)
      if (unlocked) db.openDatabase()
      return unlocked
    })
  )

  ipcMain.handle(IPC.AppChangeMasterPassword, (_e, oldPw: string, newPw: string) =>
    guard(() => {
      masterKey.changeMasterPassword(oldPw, newPw)
      return true
    })
  )

  ipcMain.handle(IPC.AppLock, () =>
    guard(() => {
      db.closeDatabase()
      masterKey.lock()
      return true
    })
  )

  ipcMain.handle(IPC.AppQuit, () => {
    app.quit()
    return ok(true)
  })

  // --- Settings ------------------------------------------------------------
  ipcMain.handle(IPC.AppGetSettings, () => guard(() => getSettings()))

  ipcMain.handle(IPC.AppUpdateSettings, (_e, patch: Partial<AppSettings>) =>
    guard(() => saveSettings(patch))
  )

  // --- Profiles ------------------------------------------------------------
  ipcMain.handle(IPC.ProfilesList, () => guard(() => repo.listProfiles()))

  ipcMain.handle(IPC.ProfilesGet, (_e, id: string) => guard(() => repo.getProfile(id)))

  ipcMain.handle(IPC.ProfilesCreate, (_e, input: NewProfileInput) =>
    guard(() => {
      const profile = repo.createProfile(input)
      if (input.fingerprintsAuto) {
        const fp = generateForNewProfile(input.browserType)
        repo.updateProfile(profile.id, { fingerprint: fp })
        return repo.getProfile(profile.id) as ProfileData
      }
      return profile
    })
  )

  ipcMain.handle(IPC.ProfilesUpdate, (_e, id: string, patch: Partial<ProfileData>) =>
    guard(() => repo.updateProfile(id, patch))
  )

  ipcMain.handle(IPC.ProfilesDuplicate, (_e, id: string) => guard(() => repo.duplicateProfile(id)))

  ipcMain.handle(IPC.ProfilesDelete, (_e, id: string) =>
    guard(async () => {
      try {
        await closeProfile(id)
      } catch {
        /* not running */
      }
      repo.deleteProfile(id)
      return true
    })
  )

  ipcMain.handle(IPC.ProfilesExport, (_e, id: string, password: string) =>
    guard(() => repo.exportProfileEncrypted(id, password))
  )

  ipcMain.handle(IPC.ProfilesImport, (_e, json: string, password: string) =>
    guard(() => repo.importProfileEncrypted(json, password))
  )

  ipcMain.handle(IPC.UaList, () =>
    guard(() => {
      return UA_LIBRARY.map((e) => ({
        ua: e.ua,
        browser: e.browser,
        os: e.os,
        device: e.device,
        platform: e.platform,
        version: e.version
      }))
    })
  )

  // --- Fingerprint engine --------------------------------------------------
  ipcMain.handle(IPC.FingerprintGenerate, (_e, options: GenerateFingerprintOptions) =>
    guard(() => generateFingerprint(options))
  )

  ipcMain.handle(IPC.FingerprintDeriveFromUA, (_e, ua: string, seed: string) =>
    guard(() => deriveFingerprintFromUA(ua, seed))
  )

  ipcMain.handle(IPC.SystemInfo, () =>
    guard<SystemInfo>(() => ({
      platform: platform() as NodeJS.Platform,
      osVersion: release(),
      arch: process.arch,
      cpus: cpus().length,
      logicalCores: cpus().length,
      totalMemoryGB: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
      hostname: hostname()
    }))
  )

  // --- Browsers ------------------------------------------------------------
  ipcMain.handle(IPC.BrowsersDetect, () => guard(() => detectAllBrowsers()))

  ipcMain.handle(IPC.BrowserLaunch, (_e, id: string, opts: LaunchOptions) =>
    guard(async () => {
      const profile = repo.getProfile(id)
      if (!profile) throw new Error('Profile not found: ' + id)
      return launchProfile(profile, opts)
    })
  )

  ipcMain.handle(IPC.BrowserClose, (_e, id: string) => guard(() => closeProfile(id)))

  ipcMain.handle(IPC.BrowserListRunning, () => guard(() => listRunning()))

  // --- Proxy ---------------------------------------------------------------
  ipcMain.handle(IPC.ProxyTest, (_e, config: ProxyConfig) => guard(() => testProxy(config)))

  // --- Dialogs -------------------------------------------------------------
  ipcMain.handle(
    IPC.DialogPickFile,
    (_e, options: { filters?: Array<{ name: string; extensions: string[] }> }) =>
      guard(async () => {
        const win = getWindow()
        const res = await dialog.showOpenDialog(win ?? ({} as BrowserWindow), {
          properties: ['openFile'],
          filters: options.filters ?? []
        })
        return res.canceled ? '' : res.filePaths[0] ?? ''
      })
  )

  ipcMain.handle(IPC.DialogPickDirectory, () =>
    guard(async () => {
      const win = getWindow()
      const res = await dialog.showOpenDialog(win ?? ({} as BrowserWindow), {
        properties: ['openDirectory', 'createDirectory']
      })
      return res.canceled ? '' : res.filePaths[0] ?? ''
    })
  )

  ipcMain.handle(IPC.AppOpenPath, (_e, p: string) => guard(async () => shell.openPath(p)))

  // --- Health check (diagnostics) -------------------------------------------
  ipcMain.handle(IPC.AppHealthCheck, () =>
    guard(() => {
      const checks: Record<string, boolean | string> = {}
      // 1. Can we read settings?
      try {
        getSettings()
        checks.settings = true
      } catch (e) {
        checks.settings = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
      }
      // 2. Can we load the SQLite module?
      try {
        if (db) checks.sqliteModule = true
        else checks.sqliteModule = 'FAIL: module not loaded'
      } catch (e) {
        checks.sqliteModule = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
      }
      // 3. Can we access the data directory?
      try {
        const dir = paths.getDataDir()
        paths.ensureDirs()
        checks.dataDir = dir
      } catch (e) {
        checks.dataDir = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
      }
      // 4. Extension template directory
      try {
        const extDir = paths.extensionTemplateDir()
        checks.extensionTemplate = extDir
      } catch (e) {
        checks.extensionTemplate = 'FAIL: ' + (e instanceof Error ? e.message : String(e))
      }
      checks.platform = process.platform
      checks.arch = process.arch
      checks.electron = process.versions.electron
      checks.node = process.versions.node
      checks.appVersion = app.getVersion()
      return checks
    })
  )

  logger.info('IPC handlers registered')
}

/** Wire the browser status push events to the renderer window. */
export function wireStatusEvents(getWindow: () => BrowserWindow | null): void {
  onBrowserStatus((event: BrowserStatusEvent) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.BrowserEvent, event)
    }
  })
}
