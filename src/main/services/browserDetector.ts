/**
 * Locates installed Chrome / Edge / Brave / Firefox on the host machine.
 *
 * Windows: reads the "App Paths" registry keys via `reg query` (no native
 * modules required) plus the standard Program Files locations.
 * macOS/Linux: checks the well-known installation paths.
 *
 * Results are cached per app run.
 */
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { BrowserDetection, BrowserInfo, BrowserType } from '@shared/types'

const WIN_REG_APP_PATHS = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths'
const WIN_REG_APP_PATHS_HKCU = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths'

interface Candidate {
  type: BrowserType
  name: string
  paths: string[]
}

function winPaths(exe: string): string[] {
  const pf = process.env.ProgramFiles ?? 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
  const local = process.env.LOCALAPPDATA ?? ''
  return [
    join(pf, exe),
    join(pf86, exe),
    local ? join(local, exe) : ''
  ]
}

function candidates(): Candidate[] {
  return [
    { type: 'chrome', name: 'Google Chrome', paths: winPaths('Google\\Chrome\\Application\\chrome.exe') },
    { type: 'edge', name: 'Microsoft Edge', paths: winPaths('Microsoft\\Edge\\Application\\msedge.exe') },
    { type: 'brave', name: 'Brave', paths: winPaths('BraveSoftware\\Brave-Browser\\Application\\brave.exe') },
    { type: 'firefox', name: 'Mozilla Firefox', paths: winPaths('Mozilla Firefox\\firefox.exe') }
  ]
}

function linuxPaths(): Candidate[] {
  const home = homedir()
  const candidates: Candidate[] = [
    { type: 'chrome', name: 'Google Chrome', paths: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/snap/bin/chromium'] },
    { type: 'edge', name: 'Microsoft Edge', paths: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/opt/microsoft/msedge/msedge'] },
    { type: 'brave', name: 'Brave', paths: ['/usr/bin/brave-browser', '/usr/bin/brave', '/opt/brave.com/brave/brave-browser'] },
    { type: 'firefox', name: 'Mozilla Firefox', paths: ['/usr/bin/firefox', '/usr/bin/firefox-esr', '/snap/bin/firefox'] }
  ]
  if (process.platform === 'linux') {
    // Flatpak installs live under ~/.local/share/flatpak
    candidates[0].paths.push(join(home, '.local/share/flatpak/exports/bin/com.google.Chrome'))
    candidates[1].paths.push(join(home, '.local/share/flatpak/exports/bin/com.microsoft.Edge'))
    candidates[2].paths.push(join(home, '.local/share/flatpak/exports/bin/com.brave.Browser'))
    candidates[3].paths.push(join(home, '.local/share/flatpak/exports/bin/org.mozilla.firefox'))
  }
  return candidates
}

function macPaths(): Candidate[] {
  const a = '/Applications'
  return [
    { type: 'chrome', name: 'Google Chrome', paths: [join(a, 'Google Chrome.app/Contents/MacOS/Google Chrome')] },
    { type: 'edge', name: 'Microsoft Edge', paths: [join(a, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge')] },
    { type: 'brave', name: 'Brave', paths: [join(a, 'Brave Browser.app/Contents/MacOS/Brave Browser')] },
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

/** Detect one browser type. */
export function detectBrowser(type: BrowserType): BrowserDetection {
  const list = process.platform === 'win32' ? candidates() : process.platform === 'darwin' ? macPaths() : linuxPaths()
  const cand = list.find((c) => c.type === type)
  if (!cand) return { type, name: type, path: '', version: '', found: false }

  const exeName = type === 'chrome' ? 'chrome.exe' : type === 'edge' ? 'msedge.exe' : type === 'brave' ? 'brave.exe' : 'firefox.exe'

  let path = ''
  if (process.platform === 'win32') {
    path = queryRegistryAppPath(exeName)
  }
  if (!path) {
    for (const p of cand.paths) {
      if (p && existsSync(p)) {
        path = p
        break
      }
    }
  }
  return { type, name: cand.name, path, version: '', found: path !== '' }
}

/** Detect all four browsers. */
export function detectAllBrowsers(): BrowserInfo[] {
  return (['chrome', 'edge', 'brave', 'firefox'] as BrowserType[]).map((t) => {
    const d = detectBrowser(t)
    return { type: d.type, name: d.name, path: d.path, found: d.found, version: d.version }
  })
}

/** Convenience: best known path for a type (used by the launcher). */
export function findBrowserExecutable(type: BrowserType): string {
  return detectBrowser(type).path
}
