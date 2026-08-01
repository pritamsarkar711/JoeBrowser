// ============================================================
// Joe Browser - Shared Types
// ============================================================

export type BrowserType = 'chrome' | 'brave' | 'firefox' | 'edge' | 'chromium';
export type DeviceType = 'desktop' | 'mobile';
export type OsType = 'windows' | 'macos' | 'linux' | 'android' | 'ios';

export interface FingerprintConfig {
  userAgent: string;
  platform: string;
  vendor: string;
  webglVendor: string;
  webglRenderer: string;
  screenResolution: string;
  availableScreenResolution: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  language: string;
  languages: string[];
  timezone: string;
  canvasNoise: number;
  audioNoise: number;
  webRtcPolicy: 'default' | 'disable' | 'proxy';
  browserType: BrowserType;
  deviceType: DeviceType;
  targetOs: OsType;
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
}

export interface ProfileData {
  id: string;
  name: string;
  browserType: BrowserType;
  deviceType: DeviceType;
  os: OsType;
  fingerprint: FingerprintConfig;
  proxy?: ProxyConfig;
  launchUrl: string;
  tags: string[];
  group: string;
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
  notes: string;
  extensions: string[];
}

export interface NewProfileInput {
  name?: string;
  browserType: BrowserType;
  deviceType?: DeviceType;
  os?: OsType;
  proxy?: ProxyConfig;
  launchUrl?: string;
  tags?: string[];
  group?: string;
  notes?: string;
}

export interface LaunchResult {
  success: boolean;
  error?: string;
  windowId?: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  language: string;
  checkUpdatesOnStart: boolean;
  defaultLaunchUrl: string;
  dataDir: string;
}

export interface MasterPasswordState {
  initialized: boolean;
  hash?: string;
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Profiles
  PROFILES_LIST: 'profiles:list',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_UPDATE: 'profiles:update',
  PROFILES_DELETE: 'profiles:delete',
  PROFILES_LAUNCH: 'profiles:launch',
  PROFILES_EXPORT: 'profiles:export',
  PROFILES_IMPORT: 'profiles:import',
  PROFILES_DUPLICATE: 'profiles:duplicate',

  // Browser
  BROWSER_CLOSE: 'browser:close',
  BROWSER_LIST: 'browser:list',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Master Password
  MASTER_PASSWORD_INIT: 'master-password:init',
  MASTER_PASSWORD_VERIFY: 'master-password:verify',
  MASTER_PASSWORD_CHANGE: 'master-password:change',

  // App
  APP_VERSION: 'app:version',
  APP_QUIT: 'app:quit',
} as const;

// Browser type color themes
export const BROWSER_THEMES: Record<BrowserType, { primary: string; accent: string; name: string }> = {
  chrome: { primary: '#4285F4', accent: '#34A853', name: 'Chrome' },
  brave: { primary: '#FB542B', accent: '#FF6B3D', name: 'Brave' },
  firefox: { primary: '#FF7139', accent: '#FF9500', name: 'Firefox' },
  edge: { primary: '#0078D7', accent: '#00A4EF', name: 'Edge' },
  chromium: { primary: '#4285F4', accent: '#34A853', name: 'Chromium' },
};

// Mobile device resolutions
export const MOBILE_RESOLUTIONS: Record<string, { width: number; height: number; userAgent: string }> = {
  'iphone-14': { width: 390, height: 844, userAgent: 'iPhone' },
  'iphone-15-pro': { width: 393, height: 852, userAgent: 'iPhone' },
  'iphone-se': { width: 375, height: 667, userAgent: 'iPhone' },
  'pixel-7': { width: 412, height: 915, userAgent: 'Android' },
  'pixel-8': { width: 412, height: 915, userAgent: 'Android' },
  'samsung-s23': { width: 360, height: 780, userAgent: 'Android' },
  'ipad-air': { width: 820, height: 1180, userAgent: 'iPad' },
  'ipad-pro': { width: 1024, height: 1366, userAgent: 'iPad' },
};
