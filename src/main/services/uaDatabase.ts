/**
 * Curated library of real user-agent strings for the supported browsers,
 * with the metadata needed to derive consistent fingerprints
 * (platform, oscpu, engine, version).
 *
 * Strings are based on real browser releases; versions are sampled across
 * the supported range so fingerprints stay realistic.
 */
import type { BrowserType, DeviceType, TargetOS } from '@shared/types'

export type Engine = 'chromium' | 'gecko'

export interface UAEntry {
  ua: string
  browser: BrowserType
  engine: Engine
  os: TargetOS
  device: DeviceType
  /** navigator.platform value */
  platform: string
  /** navigator.oscpu (Firefox only) */
  oscpu: string
  /** Browser major version (for WebGL/OS pairing heuristics). */
  version: string
}

// --- Windows Chrome ---------------------------------------------------------
const winChrome = (v: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'chrome',
  engine: 'chromium',
  os: 'windows',
  device: 'desktop',
  platform: 'Win32',
  oscpu: '',
  version: v
})

// --- macOS Chrome -----------------------------------------------------------
const macChrome = (v: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'chrome',
  engine: 'chromium',
  os: 'macos',
  device: 'desktop',
  platform: 'MacIntel',
  oscpu: '',
  version: v
})

// --- Linux Chrome -----------------------------------------------------------
const linuxChrome = (v: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'chrome',
  engine: 'chromium',
  os: 'linux',
  device: 'desktop',
  platform: 'Linux x86_64',
  oscpu: '',
  version: v
})

// --- Android Chrome ---------------------------------------------------------
const androidChrome = (v: string, build: string, model: string, android: string): UAEntry => ({
  ua: `Mozilla/5.0 (Linux; Android ${android}; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Mobile Safari/537.36`,
  browser: 'chrome',
  engine: 'chromium',
  os: 'android',
  device: 'mobile',
  platform: 'Linux armv8l',
  oscpu: '',
  version: v
})

// --- iOS Chrome (CriOS) -----------------------------------------------------
const iosChrome = (v: string, model: string, platform: string): UAEntry => ({
  ua: `Mozilla/5.0 (${model}; CPU ${platform} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${v}.0.${'0.0'} Mobile/15E148 Safari/604.1`,
  browser: 'chrome',
  engine: 'chromium',
  os: 'ios',
  device: 'mobile',
  platform,
  oscpu: '',
  version: v
})

// --- Windows Edge -----------------------------------------------------------
const winEdge = (v: string, edgeV: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36 Edg/${edgeV}`,
  browser: 'edge',
  engine: 'chromium',
  os: 'windows',
  device: 'desktop',
  platform: 'Win32',
  oscpu: '',
  version: v
})

// --- Windows Brave ----------------------------------------------------------
// Brave deliberately ships a standard Chromium UA without a "Brave" token.
const winBrave = (v: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'brave',
  engine: 'chromium',
  os: 'windows',
  device: 'desktop',
  platform: 'Win32',
  oscpu: '',
  version: v
})

const macBrave = (v: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'brave',
  engine: 'chromium',
  os: 'macos',
  device: 'desktop',
  platform: 'MacIntel',
  oscpu: '',
  version: v
})

// --- Firefox ----------------------------------------------------------------
const winFirefox = (v: string): UAEntry => ({
  ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
  browser: 'firefox',
  engine: 'gecko',
  os: 'windows',
  device: 'desktop',
  platform: 'Win32',
  oscpu: 'Windows NT 10.0; Win64; x64',
  version: v
})

const macFirefox = (v: string): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
  browser: 'firefox',
  engine: 'gecko',
  os: 'macos',
  device: 'desktop',
  platform: 'MacIntel',
  oscpu: 'Intel Mac OS X 10.15',
  version: v
})

const linuxFirefox = (v: string): UAEntry => ({
  ua: `Mozilla/5.0 (X11; Linux x86_64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
  browser: 'firefox',
  engine: 'gecko',
  os: 'linux',
  device: 'desktop',
  platform: 'Linux x86_64',
  oscpu: 'Linux x86_64',
  version: v
})

const androidFirefox = (v: string): UAEntry => ({
  ua: `Mozilla/5.0 (Android ${v === '133' ? '14' : '14'}; Mobile; rv:${v}.0) Gecko/${v}.0 Firefox/${v}.0`,
  browser: 'firefox',
  engine: 'gecko',
  os: 'android',
  device: 'mobile',
  platform: 'Linux armv8l',
  oscpu: 'Linux armv8l',
  version: v
})

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

export const UA_LIBRARY: UAEntry[] = [
  // Chrome — Windows 10/11 (NT 10.0 covers both)
  winChrome('137', '7156.52'),
  winChrome('136', '7142.68'),
  winChrome('135', '7049.44'),
  winChrome('134', '6998.35'),
  winChrome('133', '6943.143'),
  winChrome('132', '6834.110'),
  winChrome('131', '6778.86'),
  winChrome('130', '6723.92'),
  winChrome('129', '6668.79'),
  winChrome('128', '6613.86'),
  // Chrome — macOS
  macChrome('137', '7156.52'),
  macChrome('136', '7142.68'),
  macChrome('135', '7049.44'),
  macChrome('133', '6943.143'),
  macChrome('131', '6778.86'),
  macChrome('129', '6668.79'),
  // Chrome — Linux
  linuxChrome('136', '7142.68'),
  linuxChrome('134', '6998.35'),
  linuxChrome('132', '6834.110'),
  linuxChrome('130', '6723.92'),
  // Chrome — Android (Pixel/Galaxy)
  androidChrome('136', '7142.68', 'Pixel 9', '15'),
  androidChrome('135', '7049.44', 'Pixel 8', '14'),
  androidChrome('134', '6998.35', 'Pixel 7', '14'),
  androidChrome('132', '6834.110', 'SM-S928B', '14'),
  // Chrome — iOS
  iosChrome('136', 'iPhone', 'iPhone OS 18_3'),
  iosChrome('134', 'iPhone', 'iPhone OS 17_5'),
  iosChrome('132', 'iPhone', 'iPhone OS 17_4'),
  // Edge — Windows
  winEdge('137', '137.0.3296.52', '7156.52'),
  winEdge('136', '136.0.3240.50', '7142.68'),
  winEdge('135', '135.0.3179.44', '7049.44'),
  winEdge('133', '133.0.3065.82', '6943.143'),
  winEdge('131', '131.0.2903.70', '6778.86'),
  // Brave — Windows & macOS (standard Chromium UA)
  winBrave('137', '7156.52'),
  winBrave('136', '7142.68'),
  winBrave('135', '7049.44'),
  winBrave('133', '6943.143'),
  macBrave('136', '7142.68'),
  macBrave('134', '6998.35'),
  macBrave('132', '6834.110'),
  // Firefox — Windows
  winFirefox('138'),
  winFirefox('137'),
  winFirefox('136'),
  winFirefox('135'),
  winFirefox('134'),
  winFirefox('133'),
  winFirefox('132'),
  winFirefox('131'),
  winFirefox('130'),
  winFirefox('129'),
  // Firefox — macOS
  macFirefox('138'),
  macFirefox('137'),
  macFirefox('136'),
  macFirefox('134'),
  macFirefox('132'),
  macFirefox('130'),
  // Firefox — Linux
  linuxFirefox('138'),
  linuxFirefox('137'),
  linuxFirefox('135'),
  linuxFirefox('133'),
  linuxFirefox('131'),
  // Firefox — Android
  androidFirefox('137'),
  androidFirefox('136'),
  androidFirefox('134'),
  androidFirefox('132')
]

/**
 * Pick a random UA matching device/os/browser filters.
 * `rnd` is a function returning [0,1) — pass the seeded RNG for reproducibility.
 */
export function pickUA(
  browser: BrowserType,
  os: TargetOS,
  device: DeviceType,
  rnd: () => number
): UAEntry {
  const pool = UA_LIBRARY.filter(
    (e) => e.browser === browser && e.os === os && e.device === device
  )
  if (pool.length === 0) {
    // Fall back to any entry of that browser+device, then any browser.
    const loose =
      UA_LIBRARY.filter((e) => e.browser === browser && e.device === device) ??
      UA_LIBRARY.filter((e) => e.browser === browser)
    const source = loose.length > 0 ? loose : UA_LIBRARY
    return source[Math.floor(rnd() * source.length)]
  }
  return pool[Math.floor(rnd() * pool.length)]
}

/**
 * Parse an arbitrary UA string into its components (used when the user
 * pastes a custom UA and wants consistent values derived from it).
 */
export function parseUA(ua: string): {
  browser: BrowserType
  engine: Engine
  os: TargetOS
  device: DeviceType
  platform: string
  oscpu: string
  version: string
} | null {
  if (!ua || !ua.includes('Mozilla')) return null
  const isFirefox = /Firefox\/(\d+)/.test(ua)
  const isEdge = /Edg\//.test(ua)
  const isCriOS = /CriOS\//.test(ua)
  const isMobile = /Mobile/.test(ua)

  let browser: BrowserType
  let engine: Engine
  if (isFirefox) {
    browser = 'firefox'
    engine = 'gecko'
  } else if (isEdge) {
    browser = 'edge'
    engine = 'chromium'
  } else if (isCriOS) {
    browser = 'chrome'
    engine = 'chromium'
  } else {
    browser = 'chrome'
    engine = 'chromium'
  }

  let os: TargetOS = 'windows'
  let platform = 'Win32'
  let oscpu = ''
  if (/Windows NT/.test(ua)) {
    os = 'windows'
    platform = /Win64|WOW64/.test(ua) ? 'Win32' : 'Win32'
    oscpu = 'Windows NT 10.0; Win64; x64'
  } else if (/Mac OS X/.test(ua)) {
    os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : 'macos'
    platform = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : 'MacIntel'
    oscpu = 'Intel Mac OS X 10.15'
  } else if (/Android/.test(ua)) {
    os = 'android'
    platform = 'Linux armv8l'
    oscpu = 'Linux armv8l'
  } else if (/X11|Linux/.test(ua)) {
    os = 'linux'
    platform = 'Linux x86_64'
    oscpu = 'Linux x86_64'
  }

  const versionMatch = ua.match(/(?:Chrome|Firefox|CriOS)\/(\d+)/)
  const version = versionMatch ? versionMatch[1] : '0'

  return { browser, engine, os, device: isMobile ? 'mobile' : 'desktop', platform, oscpu, version }
}
