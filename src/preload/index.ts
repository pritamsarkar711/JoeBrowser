/**
 * Preload bridge — the ONLY surface the renderer sees.
 *
 * Every method returns a Promise; the {ok,data,error} envelope is unwrapped
 * here so renderer code can use plain try/catch.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  AppInitState,
  AppSettings,
  BrowserInfo,
  BrowserStatusEvent,
  GenerateFingerprintOptions,
  LaunchOptions,
  NewProfileInput,
  ProfileData,
  ProxyConfig,
  ProxyTestResult,
  RunningSession,
  SystemInfo
} from '@shared/types'
import type { FingerprintConfig } from '@shared/types'

interface Result<T> {
  ok: boolean
  data?: T
  error?: string
}

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, ...args)) as Result<T>
  if (!res.ok) {
    throw new Error(res.error || 'Unknown IPC error on ' + channel)
  }
  return res.data as T
}

const api = {
  // --- init / auth ---------------------------------------------------------
  init: (): Promise<AppInitState> => invoke(IPC.AppInit),
  setMasterPassword: (password: string): Promise<boolean> =>
    invoke(IPC.AppSetMasterPassword, password),
  unlock: (password: string): Promise<boolean> => invoke(IPC.AppUnlock, password),
  changeMasterPassword: (oldPw: string, newPw: string): Promise<boolean> =>
    invoke(IPC.AppChangeMasterPassword, oldPw, newPw),
  lock: (): Promise<boolean> => invoke(IPC.AppLock),
  quit: (): Promise<boolean> => invoke(IPC.AppQuit),

  // --- settings ------------------------------------------------------------
  getSettings: (): Promise<AppSettings> => invoke(IPC.AppGetSettings),
  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    invoke(IPC.AppUpdateSettings, patch),

  // --- profiles ------------------------------------------------------------
  listProfiles: (): Promise<ProfileData[]> => invoke(IPC.ProfilesList),
  getProfile: (id: string): Promise<ProfileData | null> => invoke(IPC.ProfilesGet, id),
  createProfile: (input: NewProfileInput): Promise<ProfileData> =>
    invoke(IPC.ProfilesCreate, input),
  updateProfile: (id: string, patch: Partial<ProfileData>): Promise<ProfileData> =>
    invoke(IPC.ProfilesUpdate, id, patch),
  duplicateProfile: (id: string): Promise<ProfileData> => invoke(IPC.ProfilesDuplicate, id),
  deleteProfile: (id: string): Promise<boolean> => invoke(IPC.ProfilesDelete, id),
  exportProfile: (id: string, password: string): Promise<string> =>
    invoke(IPC.ProfilesExport, id, password),
  importProfile: (json: string, password: string): Promise<ProfileData> =>
    invoke(IPC.ProfilesImport, json, password),

  // --- fingerprint engine ----------------------------------------------------
  generateFingerprint: (options: GenerateFingerprintOptions): Promise<FingerprintConfig> =>
    invoke(IPC.FingerprintGenerate, options),
  deriveFingerprintFromUA: (ua: string, seed: string): Promise<FingerprintConfig> =>
    invoke(IPC.FingerprintDeriveFromUA, ua, seed),
  listUserAgents: (): Promise<
    Array<{
      ua: string
      browser: string
      os: string
      device: string
      platform: string
      version: string
    }>
  > => invoke(IPC.UaList),
  getSystemInfo: (): Promise<SystemInfo> => invoke(IPC.SystemInfo),

  // --- browsers --------------------------------------------------------------
  detectBrowsers: (): Promise<BrowserInfo[]> => invoke(IPC.BrowsersDetect),
  launch: (id: string, opts: LaunchOptions): Promise<{ pid: number; url: string | null }> =>
    invoke(IPC.BrowserLaunch, id, opts),
  closeBrowser: (id: string): Promise<boolean> => invoke(IPC.BrowserClose, id),
  listRunning: (): Promise<RunningSession[]> => invoke(IPC.BrowserListRunning),

  // --- proxy ------------------------------------------------------------------
  testProxy: (config: ProxyConfig): Promise<ProxyTestResult> => invoke(IPC.ProxyTest, config),

  // --- dialogs ----------------------------------------------------------------
  pickFile: (filters?: Array<{ name: string; extensions: string[] }>): Promise<string> =>
    invoke(IPC.DialogPickFile, { filters }),
  pickDirectory: (): Promise<string> => invoke(IPC.DialogPickDirectory),
  openPath: (p: string): Promise<string> => invoke(IPC.AppOpenPath, p),

  // --- diagnostics -------------------------------------------------------------
  healthCheck: (): Promise<Record<string, boolean | string>> =>
    invoke<Record<string, boolean | string>>(IPC.AppHealthCheck),

  // --- events ------------------------------------------------------------------
  onBrowserStatus: (cb: (event: BrowserStatusEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, event: BrowserStatusEvent): void => cb(event)
    ipcRenderer.on(IPC.BrowserEvent, listener)
    return () => ipcRenderer.removeListener(IPC.BrowserEvent, listener)
  }
}

export type StealthApi = typeof api

contextBridge.exposeInMainWorld('stealth', api)
