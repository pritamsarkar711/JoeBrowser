/**
 * Locates installed Chrome / Edge / Brave / Chromium / Firefox on the host machine.
 *
 * Windows: reads the "App Paths" registry keys via `reg query` (no native
 * modules required) plus the standard Program Files and LocalAppData locations.
 * macOS/Linux: checks the well-known installation paths.
 *
 * Results are cached per app run.
 *
 * If the user's requested browser is not found, `findBestAvailableBrowser()`
 * will return the best Chromium-based alternative so the app never dead-ends
 * on a "Could not find X on this system" error.
 */
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { BrowserDetection, BrowserInfo, BrowserType } from '@shared/types'

const WIN_REG_APP_PATHS = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths'
const WIN_REG_APP_PATHS_HKCU = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths'

/** Priority order for fallback when the requested browser is missing. */
const CHROMIUM_PRIORITY: BrowserType[] = ['chrome', 'edge', 'brave', 'chromium']

/** All known browser types in the canonical order. */
const ALL_BROWSER_TYPES: BrowserType[] = ['chrome', 'edge', 'brave', 'chromium', 'firefox']

interface Candidate {
  type: BrowserType
  name: string
  paths: string[]
}

/**
 * Build a list of Windows candidate paths for a given relative exe path.
 *
 * Uses environment variables when available, falls back to hard-coded
 * defaults when they are missing (e.g. LOCALAPPDATA may be empty in
 * some service / CI environments).
 */
function winPaths(rel: string): string[] {
  const pf = process.env.ProgramFiles ?? 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
  const local = process.env.LOCALAPPDATA ?? ''
  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'

  const paths: string[] = [
    join(pf, rel),
    join(pf86, rel)
  ]

  // LOCALAPPDATA-based path — only add when the env var exists or when
  // the default path is plausible (avoids joining with an empty string).
  if (local) {
    paths.push(join(local, rel))
  }

  // Also add the PROGRAMFILES variant explicitly (covers cases where
  // pf and pf86 resolve to the same directory on 32-bit Windows).
  paths.push(join(programFiles, rel))

  return paths
}

/**
 * Windows candidate browsers with **expanded** search locations.
 *
 * Each browser now checks multiple well-known install directories including
 * per-user (LocalAppData) installs, system-wide Program Files, and
 * hard-coded fallback paths that work even when env vars are missing.
 */
function candidates(): Candidate[] {
  const pf = process.env.ProgramFiles ?? 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
  const local = process.env.LOCALAPPDATA ?? ''

  // Helper to safely build a LocalAppData path; returns empty string when
  // the env var is unset so we can filter it out later.
  const localPath = (rel: string): string => (local ? join(local, rel) : '')

  // Helper for ProgramFiles path.
  const pfPath = (rel: string): string => join(pf, rel)

  return [
    {
      type: 'chrome',
      name: 'Google Chrome',
      paths: [
        // LocalAppData installs (most common on Windows)
        localPath('Google\\Chrome\\Application\\chrome.exe'),
        // Program Files system-wide installs
        pfPath('Google\\Chrome\\Application\\chrome.exe'),
        join(pf86, 'Google\\Chrome\\Application\\chrome.exe'),
        // Hard-coded fallbacks that work without env vars
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        // Also include the generic winPaths results for registry-matched dir layout
        ...winPaths('Google\\Chrome\\Application\\chrome.exe')
      ].filter(Boolean)
    },
    {
      type: 'edge',
      name: 'Microsoft Edge',
      paths: [
        localPath('Microsoft\\Edge\\Application\\msedge.exe'),
        pfPath('Microsoft\\Edge\\Application\\msedge.exe'),
        join(pf86, 'Microsoft\\Edge\\Application\\msedge.exe'),
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        ...winPaths('Microsoft\\Edge\\Application\\msedge.exe')
      ].filter(Boolean)
    },
    {
      type: 'brave',
      name: 'Brave',
      paths: [
        localPath('BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        pfPath('BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        join(pf86, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        ...winPaths('BraveSoftware\\Brave-Browser\\Application\\brave.exe')
      ].filter(Boolean)
    },
    {
      type: 'chromium',
      name: 'Chromium',
      paths: [
        pfPath('Chromium\\Application\\chrome.exe'),
        join(pf86, 'Chromium\\Application\\chrome.exe'),
        localPath('Chromium\\Application\\chrome.exe'),
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
        ...winPaths('Chromium\\Application\\chrome.exe')
      ].filter(Boolean)
    },
    {
      type: 'firefox',
      name: 'Mozilla Firefox',
      paths: [
        pfPath('Mozilla Firefox\\firefox.exe'),
        join(pf86, 'Mozilla Firefox\\firefox.exe'),
        pfPath('Firefox Developer Edition\\firefox.exe'),
        join(pf86, 'Firefox Developer Edition\\firefox.exe'),
        localPath('Mozilla Firefox\\firefox.exe'),
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files\\Firefox Developer Edition\\firefox.exe',
        'C:\\Program Files (x86)\\Firefox Developer Edition\\firefox.exe',
        ...winPaths('Mozilla Firefox\\firefox.exe')
      ].filter(Boolean)
    }
  ]
}

function linuxPaths(): Candidate[] {
  const home = homedir()
  const candidates: Candidate[] = [
    { type: 'chrome', name: 'Google Chrome', paths: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/snap/bin/chromium'] },
    { type: 'edge', name: 'Microsoft Edge', paths: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/opt/microsoft/msedge/msedge'] },
    { type: 'brave', name: 'Brave', paths: ['/usr/bin/brave-browser', '/usr/bin/brave', '/opt/brave.com/brave/brave-browser'] },
    { type: 'chromium', name: 'Chromium', paths: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/lib/chromium/chromium', '/usr/lib/chromium-browser/chromium-browser'] },
    { type: 'firefox', name: 'Mozilla Firefox', paths: ['/usr/bin/firefox', '/usr/bin/firefox-esr', '/snap/bin/firefox'] }
  ]
  // Flatpak installs live under ~/.local/share/flatpak
  candidates[0].paths.push(join(home, '.local/share/flatpak/exports/bin/com.google.Chrome'))
  candidates[1].paths.push(join(home, '.local/share/flatpak/exports/bin/com.microsoft.Edge'))
  candidates[2].paths.push(join(home, '.local/share/flatpak/exports/bin/com.brave.Browser'))
  candidates[3].paths.push(join(home, '.local/share/flatpak/exports/bin/org.chromium.Chromium'))
  candidates[4].paths.push(join(home, '.local/share/flatpak/exports/bin/org.mozilla.firefox'))
  return candidates
}

function macPaths(): Candidate[] {
  const a = '/Applications'
  return [
    { type: 'chrome', name: 'Google Chrome', paths: [join(a, 'Google Chrome.app/Contents/MacOS/Google Chrome')] },
    { type: 'edge', name: 'Microsoft Edge', paths: [join(a, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge')] },
    { type: 'brave', name: 'Brave', paths: [join(a, 'Brave Browser.app/Contents/MacOS/Brave Browser')] },
    { type: 'chromium', name: 'Chromium', paths: [join(a, 'Chromium.app/Contents/MacOS/Chromium')] },
    { type: 'firefox', name: 'Mozilla Firefox', paths: [join(a, 'Firefox.app/Contents/MacOS/firefox')] }
  ]
}

function queryRegistryAppPath(exe: string): string {
  for (const root of [WIN_REG_APP_PATHS, WIN_REG_APP_PATHS_HKCU]) {
    try {
      const out = execFileSync('reg', ['query', `${root}\\${exe}`, '/ve'], {
        encoding: 'utf-8',
        windowsHide: true,
        timeout: 5000
      })
      // Output lines look like: "    (Default)    REG_SZ    C:\...\chrome.exe"
      const match = out.match(/REG_SZ\s+(.+)$/m)
      if (match) {
        const p = match[1].trim()
        if (existsSync(p)) return p
      }
    } catch {
      /* key not present — keep looking */
    }
  }
  return ''
}

/** Extract version from a browser executable by running --version flag. */
function getBrowserVersion(exePath: string): string {
  if (!exePath || !existsSync(exePath)) return ''
  try {
    const out = execFileSync(exePath, ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    // Output like "Google Chrome 137.0.7151.68" or "Mozilla Firefox 128.0" or "Brave Browser 1.77.90"
    const match = out.match(/(\d+\.\d+(?:\.\d+)*)/)
    return match ? match[1] : out.replace(/[^\d.]/g, '').trim()
  } catch {
    return ''
  }
}

/** Resolve the candidate list for the current platform. */
function platformCandidates(): Candidate[] {
  if (process.platform === 'win32') return candidates()
  if (process.platform === 'darwin') return macPaths()
  return linuxPaths()
}

/** Map BrowserType to the Windows registry exe name. */
function registryExeName(type: BrowserType): string {
  switch (type) {
    case 'chrome': return 'chrome.exe'
    case 'edge': return 'msedge.exe'
    case 'brave': return 'brave.exe'
    case 'chromium': return 'chrome.exe'
    case 'firefox': return 'firefox.exe'
  }
}

/** Detect one browser type. */
export function detectBrowser(type: BrowserType): BrowserDetection {
  const list = platformCandidates()
  const cand = list.find((c) => c.type === type)
  if (!cand) return { type, name: type, path: '', version: '', found: false }

  let path = ''
  // On Windows, try the registry first — it's the most reliable source.
  if (process.platform === 'win32') {
    path = queryRegistryAppPath(registryExeName(type))
  }
  // Walk every candidate path until one exists on disk.
  if (!path) {
    for (const p of cand.paths) {
      if (p && existsSync(p)) {
        path = p
        break
      }
    }
  }
  return { type, name: cand.name, path, version: path ? getBrowserVersion(path) : '', found: path !== '' }
}

/** Detect all known browsers. */
export function detectAllBrowsers(): BrowserInfo[] {
  return ALL_BROWSER_TYPES.map((t) => {
    const d = detectBrowser(t)
    return { type: d.type, name: d.name, path: d.path, found: d.found, version: d.version }
  })
}

/** Convenience: best known path for a type (used by the launcher). */
export function findBrowserExecutable(type: BrowserType): string {
  return detectBrowser(type).path
}

/**
 * Find the best available Chromium-based browser when the requested one
 * is not installed.
 *
 * Priority: chrome → edge → brave → chromium → firefox
 *
 * Returns the detection result for the first browser that is actually
 * found on the system, or the originally-requested (not-found) result
 * if absolutely nothing is available.
 */
export function findBestAvailableBrowser(requested: BrowserType): BrowserDetection {
  const direct = detectBrowser(requested)
  if (direct.found) return direct

  // Try Chromium-based browsers in priority order.
  for (const type of CHROMIUM_PRIORITY) {
    if (type === requested) continue // already checked
    const d = detectBrowser(type)
    if (d.found) return d
  }

  // Last resort: any browser at all.
  return detectAnyAvailable() ?? direct
}

/**
 * Return the first found browser of any type, or `null` if no browser
 * is available on the system at all.
 */
export function detectAnyAvailable(): BrowserDetection | null {
  for (const type of ALL_BROWSER_TYPES) {
    const d = detectBrowser(type)
    if (d.found) return d
  }
  return null
}
