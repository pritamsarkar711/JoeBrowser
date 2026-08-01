/**
 * Local fingerprint generation engine.
 *
 * Everything is derived from a SEEDED pseudo-random generator so the exact
 * same fingerprint can be reproduced from the profile's seed — a hard
 * requirement for believable fingerprints (they never change between
 * sessions, which is what a real device looks like).
 *
 * All randomness comes from the seeded RNG. No external services.
 */
import type {
  BrowserType,
  FingerprintConfig,
  GenerateFingerprintOptions,
  TargetOS
} from '@shared/types'
import { pickUA, parseUA, type UAEntry } from './uaDatabase'

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

/** FNV-1a string hash -> 32-bit seed. */
export function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — tiny, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SeededRng {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(arr: readonly T[]) => T
  chance: (p: number) => boolean
}

export function createRng(seed: string): SeededRng {
  const rnd = mulberry32(hashString(seed))
  return {
    next: rnd,
    int: (min, max) => min + Math.floor(rnd() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(rnd() * arr.length)],
    chance: (p) => rnd() < p
  }
}

// ---------------------------------------------------------------------------
// Value pools (curated for realism)
// ---------------------------------------------------------------------------

const SCREENS_DESKTOP: Array<[number, number]> = [
  [1920, 1080],
  [1366, 768],
  [1536, 864],
  [2560, 1440],
  [2560, 1600],
  [1920, 1200],
  [3440, 1440],
  [1440, 900],
  [1280, 720],
  [3840, 2160],
  [1680, 1050],
  [1280, 1024]
]

const SCREENS_MOBILE: Array<[number, number]> = [
  [360, 800],
  [390, 844],
  [393, 852],
  [412, 915],
  [414, 896],
  [430, 932]
]

const CORES_DESKTOP = [4, 6, 8, 8, 12, 16]
const CORES_MOBILE = [8, 8, 8]
const MEMORY_DESKTOP = [8, 8, 16, 16, 32]
const MEMORY_MOBILE = [4, 6, 8, 8]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Africa/Lagos',
  'Africa/Cairo'
]

const LANGUAGES: Record<TargetOS, string[][]> = {
  windows: [
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['de-DE', 'en-US', 'en'],
    ['fr-FR', 'en-US', 'en'],
    ['es-ES', 'en-US', 'en'],
    ['pt-BR', 'en-US', 'en'],
    ['it-IT', 'en-US', 'en'],
    ['nl-NL', 'en-US', 'en'],
    ['pl-PL', 'en-US', 'en'],
    ['ru-RU', 'en-US', 'en'],
    ['hi-IN', 'en-US', 'en'],
    ['bn-BD', 'en-US', 'en'],
    ['tr-TR', 'en-US', 'en'],
    ['ar-SA', 'en-US', 'en'],
    ['ja-JP', 'en-US', 'en'],
    ['zh-CN', 'en-US', 'en']
  ],
  macos: [
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['de-DE', 'en-US', 'en'],
    ['fr-FR', 'en-US', 'en'],
    ['es-ES', 'en-US', 'en'],
    ['pt-PT', 'en-US', 'en'],
    ['ja-JP', 'en-US', 'en'],
    ['zh-CN', 'en-US', 'en']
  ],
  linux: [
    ['en-US', 'en'],
    ['de-DE', 'en-US', 'en'],
    ['fr-FR', 'en-US', 'en'],
    ['pt-BR', 'en-US', 'en'],
    ['ru-RU', 'en-US', 'en'],
    ['pl-PL', 'en-US', 'en'],
    ['hi-IN', 'en-US', 'en']
  ],
  android: [
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['de-DE', 'en-US', 'en'],
    ['fr-FR', 'en-US', 'en'],
    ['es-ES', 'en-US', 'en'],
    ['pt-BR', 'en-US', 'en'],
    ['hi-IN', 'en-US', 'en'],
    ['bn-BD', 'en-US', 'en'],
    ['id-ID', 'en-US', 'en'],
    ['ar-SA', 'en-US', 'en']
  ],
  ios: [
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['de-DE', 'en-US', 'en'],
    ['fr-FR', 'en-US', 'en'],
    ['es-ES', 'en-US', 'en'],
    ['ja-JP', 'en-US', 'en']
  ]
}

interface GpuPair {
  vendor: string
  renderer: string
}

const GPUS: Record<TargetOS, GpuPair[]> = {
  windows: [
    {
      vendor: 'Google Inc. (NVIDIA)',
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (NVIDIA)',
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (NVIDIA)',
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (NVIDIA)',
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (NVIDIA)',
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (NVIDIA)',
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (AMD)',
      renderer:
        'ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (AMD)',
      renderer:
        'ANGLE (AMD, AMD Radeon RX 7600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (AMD)',
      renderer:
        'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (AMD)',
      renderer:
        'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (Intel)',
      renderer:
        'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (Intel)',
      renderer:
        'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      vendor: 'Google Inc. (Intel)',
      renderer:
        'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
    }
  ],
  macos: [
    { vendor: 'Apple Inc.', renderer: 'ANGLE (Apple, Apple M4, OpenGL 4.1)' },
    { vendor: 'Apple Inc.', renderer: 'ANGLE (Apple, Apple M4 Pro, OpenGL 4.1)' },
    { vendor: 'Apple Inc.', renderer: 'ANGLE (Apple, Apple M3, OpenGL 4.1)' },
    { vendor: 'Apple Inc.', renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)' },
    { vendor: 'Apple Inc.', renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)' },
    { vendor: 'Apple Inc.', renderer: 'Apple GPU' }
  ],
  linux: [
    {
      vendor: 'Google Inc. (Mesa)',
      renderer: 'ANGLE (Mesa, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.5)'
    },
    {
      vendor: 'Google Inc. (Mesa)',
      renderer: 'ANGLE (Mesa, AMD Radeon RX 580 Series (RADV POLARIS10), OpenGL 4.5)'
    },
    {
      vendor: 'Google Inc. (Mesa)',
      renderer: 'ANGLE (Mesa, Mesa Intel(R) Iris(R) Xe Graphics (RPL-P), OpenGL 4.5)'
    },
    {
      vendor: 'Google Inc. (Mesa)',
      renderer: 'ANGLE (Mesa, NVIDIA GeForce GTX 1080 (NVIDIA), OpenGL 4.5)'
    }
  ],
  android: [
    { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 740' },
    { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 750' },
    { vendor: 'Google Inc. (ARM)', renderer: 'Mali-G715' },
    { vendor: 'Google Inc. (ARM)', renderer: 'Mali-G78' },
    { vendor: 'Google Inc. (Samsung)', renderer: 'ANGLE (Samsung, Samsung Xclipse 920, OpenGL ES 3.2)' }
  ],
  ios: [
    { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    { vendor: 'Apple Inc.', renderer: 'Metal' }
  ]
}

const FONTS: Record<TargetOS, string[]> = {
  windows: [
    'Arial',
    'Arial Black',
    'Calibri',
    'Cambria',
    'Cambria Math',
    'Candara',
    'Comic Sans MS',
    'Consolas',
    'Constantia',
    'Corbel',
    'Courier New',
    'Ebrima',
    'Franklin Gothic Medium',
    'Gabriola',
    'Georgia',
    'Impact',
    'Ink Free',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Malgun Gothic',
    'Microsoft JhengHei',
    'Microsoft Sans Serif',
    'Microsoft YaHei',
    'Palatino Linotype',
    'Segoe Print',
    'Segoe Script',
    'Segoe UI',
    'Segoe UI Light',
    'Segoe UI Semibold',
    'Sitka',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Webdings',
    'Wingdings'
  ],
  macos: [
    'American Typewriter',
    'Andale Mono',
    'Arial',
    'Arial Black',
    'Arial Narrow',
    'Arial Rounded MT Bold',
    'Avenir',
    'Avenir Next',
    'Baskerville',
    'Big Caslon',
    'Bodoni 72',
    'Bradley Hand',
    'Brush Script MT',
    'Chalkboard',
    'Chalkboard SE',
    'Charter',
    'Cochin',
    'Comic Sans MS',
    'Copperplate',
    'Courier',
    'Courier New',
    'Didot',
    'DIN Alternate',
    'Futura',
    'Geneva',
    'Georgia',
    'Gill Sans',
    'Helvetica',
    'Helvetica Neue',
    'Herculanum',
    'Hoefler Text',
    'Impact',
    'Kailasa',
    'Luminari',
    'Marker Felt',
    'Menlo',
    'Monaco',
    'Noteworthy',
    'Optima',
    'Palatino',
    'Papyrus',
    'Phosphate',
    'Rockwell',
    'Savoye LET',
    'SignPainter',
    'Skia',
    'Snell Roundhand',
    'Tahoma',
    'Times',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Zapfino'
  ],
  linux: [
    'Arial',
    'Bitstream Charter',
    'Cantarell',
    'Courier 10 Pitch',
    'Courier New',
    'DejaVu Sans',
    'DejaVu Sans Mono',
    'DejaVu Serif',
    'Droid Sans',
    'Droid Sans Mono',
    'Droid Serif',
    'FreeMono',
    'FreeSans',
    'FreeSerif',
    'Georgia',
    'Liberation Mono',
    'Liberation Sans',
    'Liberation Serif',
    'Lohit Bengali',
    'Lohit Devanagari',
    'Lohit Gujarati',
    'Lohit Tamil',
    'Noto Color Emoji',
    'Noto Mono',
    'Noto Sans',
    'Noto Sans CJK JP',
    'Noto Sans CJK SC',
    'Noto Serif',
    'OpenSymbol',
    'PT Sans',
    'Tahoma',
    'Times New Roman',
    'Ubuntu',
    'Ubuntu Mono',
    'Ubuntu Condensed',
    'Verdana',
    'WenQuanYi Micro Hei',
    'WenQuanYi Zen Hei'
  ],
  android: [
    'Arial',
    'Coming Soon',
    'Cutive Mono',
    'Dancing Script',
    'Droid Sans',
    'Droid Sans Mono',
    'Droid Serif',
    'Lato',
    'Noto Color Emoji',
    'Noto Sans',
    'Noto Sans Arabic',
    'Noto Sans Bengali',
    'Noto Sans CJK',
    'Noto Sans Devanagari',
    'Noto Sans Hebrew',
    'Noto Sans Japanese',
    'Noto Sans Korean',
    'Noto Sans Thai',
    'Noto Serif',
    'Open Sans',
    'Oswald',
    'PT Sans',
    'Raleway',
    'Roboto',
    'Roboto Condensed',
    'Roboto Mono',
    'Roboto Slab',
    'Source Sans Pro'
  ],
  ios: [
    'Academy Engraved LET',
    'Al Nile',
    'American Typewriter',
    'Apple Color Emoji',
    'Apple SD Gothic Neo',
    'Arial',
    'Arial Hebrew',
    'Arial Rounded MT Bold',
    'Avenir',
    'Avenir Next',
    'Avenir Next Condensed',
    'Baskerville',
    'Bangla Sangam MN',
    'Bodoni 72',
    'Bradley Hand',
    'Chalkboard SE',
    'Charter',
    'Cochin',
    'Copperplate',
    'Courier New',
    'Damascus',
    'Devanagari Sangam MN',
    'Didot',
    'DIN Alternate',
    'Futura',
    'Geeza Pro',
    'Georgia',
    'Gill Sans',
    'Gujarati Sangam MN',
    'Gurmukhi MN',
    'Helvetica',
    'Helvetica Neue',
    'Hiragino Maru Gothic ProN',
    'Hiragino Mincho ProN',
    'Hiragino Sans',
    'Hoefler Text',
    'Impact',
    'Kailasa',
    'Kannada Sangam MN',
    'Khmer Sangam MN',
    'Lao Sangam MN',
    'Malayalam Sangam MN',
    'Marker Felt',
    'Menlo',
    'Mishafi',
    'Noteworthy',
    'Optima',
    'Palatino',
    'Papyrus',
    'Party LET',
    'PingFang HK',
    'PingFang SC',
    'PingFang TC',
    'Rockwell',
    'Sinhala Sangam MN',
    'Snell Roundhand',
    'STHeiti',
    'Symbol',
    'Tamil Sangam MN',
    'Telugu Sangam MN',
    'Thonburi',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Zapf Dingbats',
    'Zapfino'
  ]
}

const PLATFORM_UA_PAIR: Record<TargetOS, string> = {
  windows: 'Windows NT 10.0',
  macos: 'Mac OS X 10_15_7',
  linux: 'X11; Linux x86_64',
  android: 'Android 14',
  ios: 'iPhone'
}

// ---------------------------------------------------------------------------
// Timezone offset helper
// ---------------------------------------------------------------------------

export function timezoneOffsetMinutes(iana: string, at = Date.now()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(at)
    const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? 0)
    const utc = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')))
    return Math.round((utc.getTime() - at) / 60000)
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete, internally consistent fingerprint from options.
 * Every value is derived from `seed` (or generated and returned via
 * fingerprint.seed so it can be persisted and reproduced).
 */
export function generateFingerprint(options: GenerateFingerprintOptions): FingerprintConfig {
  const seed = options.seed ?? 'fp-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  const rng = createRng(seed)

  const entry: UAEntry = options.userAgent
    ? uaFromParsed(parseUA(options.userAgent), options.userAgent)
    : pickUA(options.browser, options.os, options.device, rng.next)

  return buildFromEntry(entry, seed, rng)
}

function uaFromParsed(parsed: ReturnType<typeof parseUA>, ua: string): UAEntry {
  if (!parsed) {
    return {
      ua,
      browser: 'chrome',
      engine: 'chromium',
      os: 'windows',
      device: 'desktop',
      platform: 'Win32',
      oscpu: '',
      version: '0'
    }
  }
  return {
    ua,
    browser: parsed.browser,
    engine: parsed.engine,
    os: parsed.os,
    device: parsed.device,
    platform: parsed.platform,
    oscpu: parsed.oscpu,
    version: parsed.version
  }
}

/**
 * Derive a consistent fingerprint from an arbitrary pasted UA string,
 * keeping the caller's existing seed for reproducibility.
 */
export function deriveFingerprintFromUA(userAgent: string, seed: string): FingerprintConfig {
  const rng = createRng(seed)
  const entry = uaFromParsed(parseUA(userAgent), userAgent)
  return buildFromEntry(entry, seed, rng)
}

function buildFromEntry(entry: UAEntry, seed: string, rng: SeededRng): FingerprintConfig {
  const os = entry.os
  const device = entry.device
  const isMobile = device === 'mobile'

  const screen = rng.pick(isMobile ? SCREENS_MOBILE : SCREENS_DESKTOP)
  const availW = screen[0] - rng.int(0, 16)
  const availH = screen[1] - rng.int(28, 92)

  const cores = rng.pick(isMobile ? CORES_MOBILE : CORES_DESKTOP)
  const memory = rng.pick(isMobile ? MEMORY_MOBILE : MEMORY_DESKTOP)

  const languages = rng.pick(LANGUAGES[os] ?? LANGUAGES.windows)
  const timezone = rng.pick(TIMEZONES)

  const gpu = rng.pick(GPUS[os] ?? GPUS.windows)

  const dpr = isMobile ? rng.pick([2.75, 3, 3]) : rng.pick([1, 1, 1, 1.25, 1.5])
  const colorDepth = 24

  return {
    seed,
    userAgent: entry.ua,
    platform: entry.platform,
    oscpu: entry.oscpu,
    language: languages[0],
    languages: [...languages],
    timezone,
    timezoneOffset: timezoneOffsetMinutes(timezone),
    screenWidth: screen[0],
    screenHeight: screen[1],
    screenAvailWidth: availW,
    screenAvailHeight: availH,
    screenColorDepth: colorDepth,
    screenPixelDepth: colorDepth,
    devicePixelRatio: dpr,
    hardwareConcurrency: cores,
    deviceMemory: memory,
    maxTouchPoints: isMobile ? 5 : 0,
    webglVendor: gpu.vendor,
    webglRenderer: gpu.renderer,
    canvasNoiseEnabled: true,
    canvasNoiseSeed: rng.int(0, 0xffffffff),
    audioNoiseEnabled: true,
    audioNoiseSeed: rng.int(0, 0xffffffff),
    webRTCLeakProtect: true,
    fontFingerprintProtection: true,
    customFonts: [],
    pluginsSpoof: true,
    geolocation: {
      mode: 'block',
      latitude: 0,
      longitude: 0
    },
    connectionDownlink: rng.pick([1.4, 2.5, 4.4, 5.6, 8.5, 10]),
    connectionEffectiveType: rng.pick(['4g', '4g', '4g', '3g']),
    connectionRtt: rng.pick([50, 50, 100, 150, 200]),
    permissionsPolicy: {
      notifications: rng.chance(0.3) ? 'granted' : 'prompt',
      camera: 'prompt',
      microphone: 'prompt'
    }
  }
}

/** Convenience: generate a fingerprint for a fresh profile (called at create time). */
export function generateForNewProfile(browser: BrowserType): FingerprintConfig {
  const os = guessOSForBrowser()
  return generateFingerprint({
    device: 'desktop',
    os,
    browser,
    seed: 'fp-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  })
}

function guessOSForBrowser(): TargetOS {
  // Prefer the host OS for the default fingerprint so browser type matches
  // what the user is likely running; other OS options are one click away.
  const host = process.platform
  if (host === 'darwin') return 'macos'
  if (host === 'linux') return 'linux'
  return 'windows'
}

export { PLATFORM_UA_PAIR, FONTS }

/** Font pool for a given OS (used by the extension builder). */
export function getFontsForOS(os: TargetOS): string[] {
  return FONTS[os] ?? FONTS.windows
}
