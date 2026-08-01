/**
 * Shared type contracts used by the main process, preload bridge and renderer.
 * Keep this file dependency-free so it can be imported from anywhere.
 */

export type BrowserType = 'chrome' | 'edge' | 'brave' | 'firefox'
export type DeviceType = 'desktop' | 'mobile'
export type TargetOS = 'windows' | 'macos' | 'linux' | 'android' | 'ios'
export type ProxyType = 'http' | 'https' | 'socks5' | 'socks4'

export interface ProxyConfig {
  enabled: boolean
  type: ProxyType
  host: string
  port: number
  username: string
  password: string
  /** Optional custom PAC URL (overrides auto-generated proxy strategy). */
  pacUrl: string
}

export interface GeoLocation {
  mode: 'block' | 'spoof'
  latitude: number
  longitude: number
}

export interface FingerprintConfig {
  /** Seeded RNG seed — makes fingerprint generation reproducible. */
  seed: string
  userAgent: string
  /** navigator.platform, e.g. "Win32" */
  platform: string
  /** navigator.oscpu (Firefox). Empty for Chromium. */
  oscpu: string
  /** Primary language, e.g. "en-US" */
  language: string
  /** navigator.languages / Accept-Language */
  languages: string[]
  /** IANA timezone, e.g. "Europe/Berlin" */
  timezone: string
  /** Offset minutes computed from the IANA timezone at generation time. */
  timezoneOffset: number
  screenWidth: number
  screenHeight: number
  screenAvailWidth: number
  screenAvailHeight: number
  screenColorDepth: number
  screenPixelDepth: number
  devicePixelRatio: number
  hardwareConcurrency: number
  deviceMemory: number
  maxTouchPoints: number
  webglVendor: string
  webglRenderer: string
  canvasNoiseEnabled: boolean
  canvasNoiseSeed: number
  audioNoiseEnabled: boolean
  audioNoiseSeed: number
  webRTCLeakProtect: boolean
  fontFingerprintProtection: boolean
  /** Fonts that should be the ONLY enumerable fonts (one per line in UI). */
  customFonts: string[]
  /** Spoof navigator.plugins / mimeTypes with realistic entries. */
  pluginsSpoof: boolean
  geolocation: GeoLocation
  /** navigator.connection.downlink (Mbps). */
  connectionDownlink: number
  /** navigator.connection.effectiveType (e.g. "4g"). */
  connectionEffectiveType: string
  /** navigator.connection.rtt (ms). */
  connectionRtt: number
  /** Permissions API policy: maps permission name to state (granted/denied/prompt). */
  permissionsPolicy: Record<string, string>
}

export interface ProfileData {
  id: string
  name: string
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
  lastLaunchedAt: number | null
  browserType: BrowserType
  /** Empty string = auto-detect from system. */
  browserExecutablePath: string
  fingerprintsAuto: boolean
  proxy: ProxyConfig
  fingerprint: FingerprintConfig
  /** Extra command-line flags, one per line. */
  extraLaunchArgs: string
  /** Additional local extensions (.crx / unpacked dir / .xpi) to load. */
  customExtensions: string[]
  /** Default URL opened on launch. */
  launchUrl: string
  /** Override for the user data directory. Empty = app-managed. */
  userDataDirOverride: string
  /**
   * When true (default), Chromium launches with
   * --disable-blink-features=AutomationControlled and related anti-automation flags.
   */
  disableAutomationFlags: boolean
}

/** Options for the "Auto-generate realistic fingerprint" dialog. */
export interface GenerateFingerprintOptions {
  device: DeviceType
  os: TargetOS
  browser: BrowserType
  /** Optional custom UA to derive from instead of the library. */
  userAgent?: string
  seed?: string
}

export interface BrowserDetection {
  type: BrowserType
  name: string
  path: string
  version: string
  found: boolean
}

export interface ProxyTestResult {
  ok: boolean
  ip: string
  country: string
  region: string
  city: string
  isp: string
  latencyMs: number
  error: string
}

export interface SystemInfo {
  platform: NodeJS.Platform
  osVersion: string
  arch: string
  cpus: number
  logicalCores: number
  totalMemoryGB: number
  hostname: string
}

export interface LaunchOptions {
  url?: string
  devtools?: boolean
  fingerprintTest?: boolean
}

export interface RunningSession {
  profileId: string
  pid: number
  browserType: BrowserType
  startedAt: number
  userDataDir: string
}

export interface BrowserStatusEvent {
  profileId: string
  status: 'starting' | 'running' | 'exited' | 'error'
  pid?: number
  error?: string
  browserType?: BrowserType
  userDataDir?: string
  startedAt?: number
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  dataDir: string
  launchAtStartup: boolean
  closeBrowsersOnQuit: boolean
  minimizeToTray: boolean
}

export interface AppInitState {
  initialized: boolean
  unlocked: boolean
  version: string
  platform: string
}

/** Payload for creating a new profile. */
export interface NewProfileInput {
  name: string
  browserType: BrowserType
  tags: string[]
  fingerprintsAuto: boolean
}

export interface BrowserInfo {
  type: BrowserType
  name: string
  path: string
  found: boolean
  version: string
}

export const BROWSER_LABELS: Record<BrowserType, string> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  brave: 'Brave',
  firefox: 'Mozilla Firefox'
}

export const BROWSER_NAMES: BrowserType[] = ['chrome', 'edge', 'brave', 'firefox']

export function emptyProxyConfig(): ProxyConfig {
  return {
    enabled: false,
    type: 'http',
    host: '',
    port: 0,
    username: '',
    password: '',
    pacUrl: ''
  }
}

export function emptyGeoLocation(): GeoLocation {
  return { mode: 'block', latitude: 0, longitude: 0 }
}

/** Default, neutral fingerprint values (used before auto-generation). */
export function defaultFingerprint(seed = 'seed-' + Math.random().toString(36).slice(2)): FingerprintConfig {
  return {
    seed,
    userAgent: '',
    platform: '',
    oscpu: '',
    language: 'en-US',
    languages: ['en-US', 'en'],
    timezone: 'UTC',
    timezoneOffset: 0,
    screenWidth: 1920,
    screenHeight: 1080,
    screenAvailWidth: 1920,
    screenAvailHeight: 1040,
    screenColorDepth: 24,
    screenPixelDepth: 24,
    devicePixelRatio: 1,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    webglVendor: '',
    webglRenderer: '',
    canvasNoiseEnabled: true,
    canvasNoiseSeed: (Math.random() * 0xffffffff) >>> 0,
    audioNoiseEnabled: true,
    audioNoiseSeed: (Math.random() * 0xffffffff) >>> 0,
    webRTCLeakProtect: true,
    fontFingerprintProtection: true,
    customFonts: [],
    pluginsSpoof: true,
    geolocation: emptyGeoLocation(),
    connectionDownlink: 10,
    connectionEffectiveType: '4g',
    connectionRtt: 50,
    permissionsPolicy: {
      notifications: 'prompt',
      camera: 'prompt',
      microphone: 'prompt'
    }
  }
}

export function createNewProfile(input: NewProfileInput): ProfileData {
  const now = Date.now()
  return {
    id: randomId(),
    name: input.name.trim() || 'New Profile',
    tags: input.tags ?? [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    lastLaunchedAt: null,
    browserType: input.browserType,
    browserExecutablePath: '',
    fingerprintsAuto: input.fingerprintsAuto,
    proxy: emptyProxyConfig(),
    fingerprint: defaultFingerprint(),
    extraLaunchArgs: '',
    customExtensions: [],
    launchUrl: '',
    userDataDirOverride: '',
    disableAutomationFlags: true
  }
}

export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
