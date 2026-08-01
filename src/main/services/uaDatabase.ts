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
const macChrome = (v: string, build = '0.0.0', macVer = '15_3'): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
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

// --- iOS Safari -------------------------------------------------------------
const iosSafari = (webkitBuild: string, safariVer: string, model: string, platform: string): UAEntry => ({
  ua: `Mozilla/5.0 (${model}; CPU ${platform} like Mac OS X) AppleWebKit/${webkitBuild} (KHTML, like Gecko) Version/${safariVer} Mobile/15E148 Safari/604.1`,
  browser: 'chrome', // closest match — Safari is Chromium-engine-adjacent for fingerprinting
  engine: 'chromium',
  os: 'ios',
  device: 'mobile',
  platform,
  oscpu: '',
  version: safariVer
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

// --- macOS Edge -------------------------------------------------------------
const macEdge = (v: string, edgeV: string, build = '0.0.0', macVer = '15_3'): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36 Edg/${edgeV}`,
  browser: 'edge',
  engine: 'chromium',
  os: 'macos',
  device: 'desktop',
  platform: 'MacIntel',
  oscpu: '',
  version: v
})

// --- Linux Edge -------------------------------------------------------------
const linuxEdge = (v: string, edgeV: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36 Edg/${edgeV}`,
  browser: 'edge',
  engine: 'chromium',
  os: 'linux',
  device: 'desktop',
  platform: 'Linux x86_64',
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

const macBrave = (v: string, build = '0.0.0', macVer = '15_3'): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'brave',
  engine: 'chromium',
  os: 'macos',
  device: 'desktop',
  platform: 'MacIntel',
  oscpu: '',
  version: v
})

// --- Linux Brave ------------------------------------------------------------
const linuxBrave = (v: string, build = '0.0.0'): UAEntry => ({
  ua: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build} Safari/537.36`,
  browser: 'brave',
  engine: 'chromium',
  os: 'linux',
  device: 'desktop',
  platform: 'Linux x86_64',
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

const macFirefox = (v: string, macVer = '15.3'): UAEntry => ({
  ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macVer}; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
  browser: 'firefox',
  engine: 'gecko',
  os: 'macos',
  device: 'desktop',
  platform: 'MacIntel',
  oscpu: `Intel Mac OS X ${macVer}`,
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
  ua: `Mozilla/5.0 (Android ${+v >= 136 ? '15' : +v >= 133 ? '14' : '13'}; Mobile; rv:${v}.0) Gecko/${v}.0 Firefox/${v}.0`,
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
  winChrome('125', '6422.60'),
  winChrome('124', '6364.58'),
  winChrome('123', '6312.52'),
  winChrome('122', '6261.57'),
  winChrome('121', '6167.85'),
  winChrome('120', '6099.109'),
  winChrome('119', '6045.123'),
  winChrome('118', '5993.70'),
  winChrome('117', '6105.0'),
  winChrome('116', '5845.96'),
  winChrome('138', '7204.40'),
  winChrome('139', '7258.44'),
  // Chrome — macOS
  macChrome('137', '7156.52', '15_3'),
  macChrome('136', '7142.68', '15_3'),
  macChrome('135', '7049.44', '15_3'),
  macChrome('133', '6943.143', '14_7'),
  macChrome('131', '6778.86', '14_7'),
  macChrome('129', '6668.79', '14_7'),
  macChrome('125', '6422.60', '14_5'),
  macChrome('122', '6261.57', '14_4'),
  macChrome('120', '6099.109', '14_3'),
  macChrome('117', '6105.0', '14_2'),
  macChrome('138', '7204.40', '15_4'),
  macChrome('139', '7258.44', '15_4'),
  // Chrome — Linux
  linuxChrome('136', '7142.68'),
  linuxChrome('134', '6998.35'),
  linuxChrome('132', '6834.110'),
  linuxChrome('130', '6723.92'),
  linuxChrome('125', '6422.60'),
  linuxChrome('122', '6261.57'),
  linuxChrome('120', '6099.109'),
  // Chrome — Android (Pixel/Galaxy/S24/S23/OnePlus/Xiaomi)
  androidChrome('136', '7142.68', 'Pixel 9', '15'),
  androidChrome('135', '7049.44', 'Pixel 8', '14'),
  androidChrome('134', '6998.35', 'Pixel 7', '14'),
  androidChrome('132', '6834.110', 'SM-S928B', '14'),
  androidChrome('131', '6778.86', 'SM-S921B', '14'),
  androidChrome('130', '6723.92', 'SM-S928B', '14'),
  androidChrome('125', '6422.60', 'SM-S911B', '14'),
  androidChrome('134', '6998.35', 'CPH2581', '14'),
  androidChrome('133', '6943.143', '24116PN51G', '14'),
  androidChrome('130', '6723.92', 'Pixel 8a', '14'),
  // Chrome — iOS
  iosChrome('136', 'iPhone', 'iPhone OS 18_3'),
  iosChrome('134', 'iPhone', 'iPhone OS 17_5'),
  iosChrome('132', 'iPhone', 'iPhone OS 17_4'),
  iosChrome('125', 'iPhone', 'iPhone OS 17_3'),
  iosChrome('122', 'iPhone', 'iPhone OS 17_2'),

  // iOS Safari — common mobile fingerprint
  iosSafari('605.1.15', '18.3', 'iPhone', 'iPhone OS 18_3'),
  iosSafari('605.1.15', '17.5', 'iPhone', 'iPhone OS 17_5'),
  iosSafari('605.1.15', '17.4', 'iPhone', 'iPhone OS 17_4'),
  iosSafari('605.1.15', '16.6', 'iPhone', 'iPhone OS 16_6'),
  iosSafari('605.1.15', '18.3', 'iPad', 'iPadOS 18_3'),
  iosSafari('605.1.15', '17.5', 'iPad', 'iPadOS 17_5'),

  // Edge — Windows
  winEdge('137', '137.0.3296.52', '7156.52'),
  winEdge('136', '136.0.3240.50', '7142.68'),
  winEdge('135', '135.0.3179.44', '7049.44'),
  winEdge('134', '134.0.3124.55', '6998.35'),
  winEdge('133', '133.0.3065.82', '6943.143'),
  winEdge('132', '132.0.2965.33', '6834.110'),
  winEdge('131', '131.0.2903.70', '6778.86'),
  winEdge('130', '130.0.2849.47', '6723.92'),
  winEdge('128', '128.0.2739.42', '6613.86'),
  winEdge('126', '126.0.2592.56', '6478.46'),
  winEdge('138', '138.0.3360.22', '7204.40'),
  winEdge('139', '139.0.3405.36', '7258.44'),
  // Edge — macOS
  macEdge('137', '137.0.3296.52', '7156.52', '15_3'),
  macEdge('135', '135.0.3179.44', '7049.44', '15_3'),
  macEdge('133', '133.0.3065.82', '6943.143', '14_7'),
  macEdge('131', '131.0.2903.70', '6778.86', '14_7'),
  macEdge('128', '128.0.2739.42', '6613.86', '14_5'),
  // Edge — Linux
  linuxEdge('136', '136.0.3240.50', '7142.68'),
  linuxEdge('134', '134.0.3124.55', '6998.35'),
  linuxEdge('131', '131.0.2903.70', '6778.86'),

  // Brave — Windows & macOS & Linux (standard Chromium UA)
  winBrave('137', '7156.52'),
  winBrave('136', '7142.68'),
  winBrave('135', '7049.44'),
  winBrave('133', '6943.143'),
  winBrave('131', '6778.86'),
  winBrave('130', '6723.92'),
  winBrave('129', '6668.79'),
  winBrave('128', '6613.86'),
  winBrave('138', '7204.40'),
  winBrave('139', '7258.44'),
  macBrave('136', '7142.68', '15_3'),
  macBrave('134', '6998.35', '14_7'),
  macBrave('132', '6834.110', '14_7'),
  macBrave('130', '6723.92', '14_5'),
  macBrave('128', '6613.86', '14_4'),
  linuxBrave('136', '7142.68'),
  linuxBrave('134', '6998.35'),
  linuxBrave('131', '6778.86'),
  linuxBrave('128', '6613.86'),

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
  winFirefox('128'),
  winFirefox('127'),
  winFirefox('126'),
  winFirefox('125'),
  winFirefox('124'),
  winFirefox('139'),
  winFirefox('140'),
  // Firefox ESR — Windows
  winFirefox('128'), // ESR 128 (duplicate version but ESR path is same UA)
  // Firefox — macOS
  macFirefox('138', '15.3'),
  macFirefox('137', '15.3'),
  macFirefox('136', '15.3'),
  macFirefox('134', '14.7'),
  macFirefox('132', '14.7'),
  macFirefox('130', '14.7'),
  macFirefox('128', '14.5'),
  macFirefox('126', '14.4'),
  macFirefox('124', '14.3'),
  macFirefox('139', '15.4'),
  macFirefox('140', '15.4'),
  // Firefox ESR — macOS
  macFirefox('128', '14.5'),
  // Firefox — Linux
  linuxFirefox('138'),
  linuxFirefox('137'),
  linuxFirefox('135'),
  linuxFirefox('133'),
  linuxFirefox('131'),
  linuxFirefox('128'),
  linuxFirefox('126'),
  linuxFirefox('125'),
  linuxFirefox('124'),
  linuxFirefox('139'),
  linuxFirefox('140'),
  // Firefox ESR — Linux
  linuxFirefox('128'),
  // Firefox — Android
  androidFirefox('137'),
  androidFirefox('136'),
  androidFirefox('134'),
  androidFirefox('132'),
  androidFirefox('128'),
  androidFirefox('126')
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
  const isMobile = /Mobile|iPhone|iPad/.test(ua)

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
    const isIOS = /iPhone|iPad|iPod/.test(ua)
    os = isIOS ? 'ios' : 'macos'
    platform = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : 'MacIntel'
    oscpu = isIOS ? '' : 'Intel Mac OS X 15.3'
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
