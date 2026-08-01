/**
 * Browser launcher & session manager.
 *
 * Launch flow per profile:
 *  1. resolve executable (profile path override → auto-detected → error)
 *  2. build the stealth extension (unique temp dir) / Firefox xpi
 *  3. deploy proxy (direct / relay / PAC)
 *  4. provision user data dir (Chromium flags or Firefox user.js + xpi)
 *  5. spawn the browser, track the process, clean up on exit
 *
 * Isolation guarantee: every profile gets its own --user-data-dir / -profile,
 * so cookies, localStorage, IndexedDB, cache and extensions are completely
 * separate — multi-accounting safe by construction.
 */
import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserStatusEvent, LaunchOptions, ProfileData, RunningSession } from '@shared/types'
import { findBrowserExecutable } from './browserDetector'
import { buildExtension } from './extensionBuilder'
import { deployProxy, type ProxyDeployment } from './proxyRelay'
import { startPacServer, type PacServer } from './pacServer'
import { startTestPageServer } from './testPageServer'
import { provisionFirefoxProfile } from './firefoxProfile'
import * as paths from '../paths'
import { logger } from '../logger'
import { touchLastLaunched } from '../db/profileRepository'

interface Session {
  profileId: string
  proc: ChildProcess
  browserType: ProfileData['browserType']
  pid: number
  startedAt: number
  userDataDir: string
  cleanup: () => Promise<void>
  exited: boolean
}

type StatusListener = (event: BrowserStatusEvent) => void

const sessions = new Map<string, Session>()
const statusListeners: StatusListener[] = []

export function onBrowserStatus(listener: StatusListener): void {
  statusListeners.push(listener)
}

function emitStatus(event: BrowserStatusEvent): void {
  for (const l of statusListeners) {
    try {
      l(event)
    } catch {
      /* listener errors must not break launching */
    }
  }
}

export function listRunning(): RunningSession[] {
  return [...sessions.values()]
    .filter((s) => !s.exited && s.proc.exitCode === null)
    .map((s) => ({
      profileId: s.profileId,
      pid: s.pid,
      browserType: s.browserType,
      startedAt: s.startedAt,
      userDataDir: s.userDataDir
    }))
}

export function isRunning(profileId: string): boolean {
  const s = sessions.get(profileId)
  return !!s && !s.exited && s.proc.exitCode === null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitExtraArgs(raw: string): string[] {
  return raw
    .split(/\r?\n| /)
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
}

function tempExtensionDir(profileId: string): string {
  return join(paths.tempExtensionRoot(), `${profileId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
}

/**
 * Resolve a PAC setting: http(s) URLs are used directly; local .pac files
 * (or file:// URLs) are served by the built-in PAC server on 127.0.0.1.
 */
async function resolvePacUrl(pacSetting: string): Promise<{ url: string; server: PacServer | null }> {
  const trimmed = pacSetting.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed, server: null }
  }
  const filePath = trimmed.replace(/^file:\/\//i, '').replace(/^file:\/\//, '')
  if (existsSync(filePath)) {
    const script = readFileSync(filePath, 'utf-8')
    const server = await startPacServer(script)
    return { url: server.url, server }
  }
  return { url: trimmed, server: null }
}

async function killTree(proc: ChildProcess): Promise<void> {
  if (!proc || proc.pid === undefined || proc.killed) return
  try {
    if (process.platform === 'win32') {
      await new Promise<void>((resolve) => {
        execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => resolve())
      })
    } else {
      try {
        process.kill(-proc.pid as number, 'SIGKILL')
      } catch {
        proc.kill('SIGKILL')
      }
    }
  } catch (e) {
    logger.warn('killTree failed', e)
  }
}

// ---------------------------------------------------------------------------
// Chromium
// ---------------------------------------------------------------------------

function buildChromiumArgs(
  profile: ProfileData,
  opts: LaunchOptions,
  extDir: string,
  proxy: ProxyDeployment | null,
  pacUrl: string,
  targetUrl: string
): string[] {
  const fp = profile.fingerprint
  const args: string[] = [
    `--user-data-dir=${profile.userDataDirOverride || paths.profileUserDataDir(profile.id)}`,
    '--no-first-run',
    '--no-default-browser-check',
    // Chrome 137+ blocks --load-extension for branded builds; this feature
    // switch re-enables the command line loading we depend on.
    '--disable-features=Translate,OptimizationHints,OptimizationTargetPrediction,DisableLoadExtensionCommandLineSwitch',
    '--disable-component-update',
    '--disable-sync',
    '--disable-background-networking',
    '--disable-client-side-phishing-detection',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--disable-domain-reliability',
    '--disable-search-engine-choice-screen',
    '--disable-hang-monitor',
    '--disable-field-trial-config',
    '--disable-ipc-flooding-protection',
    '--metrics-recording-only',
    '--no-pings',
    '--password-store=basic',
    '--use-mock-keychain'
  ]

  // Anti-automation: hide the controlled-by-software banner and strip
  // navigator.webdriver (paired with the stealth extension override).
  if (profile.disableAutomationFlags !== false) {
    args.push(
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-automation',
      '--disable-infobars'
    )
    // Append AutomationControlled to disable-features if not already present.
    const fi = args.findIndex((a) => a.startsWith('--disable-features='))
    if (fi >= 0) args[fi] = args[fi] + ',AutomationControlled'
  }

  // Stealth extension
  args.push(`--load-extension=${extDir}`)

  // Additional local extensions (unpacked dirs only)
  for (const ext of profile.customExtensions) {
    const p = ext.trim()
    if (p && existsSync(p) && !p.endsWith('.crx')) {
      args.push(`--load-extension=${p}`)
    }
  }

  // Proxy
  if (profile.proxy.enabled && pacUrl) {
    args.push(`--proxy-pac-url=${pacUrl}`)
  } else if (profile.proxy.enabled && proxy) {
    args.push(`--proxy-server=${proxy.proxyServer}`)
    // Keep localhost direct so the built-in test page never goes via proxy.
    args.push('--proxy-bypass-list=<-loopback>')
  } else {
    args.push('--no-proxy-server')
  }

  // Fingerprint-consistent flags
  if (fp.userAgent) {
    args.push(`--user-agent=${fp.userAgent}`)
    args.push(`--lang=${fp.language || 'en-US'}`)
    args.push(`--window-size=${fp.screenWidth},${fp.screenHeight}`)
    if (fp.devicePixelRatio) args.push(`--force-device-scale-factor=${fp.devicePixelRatio}`)
    if (fp.timezone) args.push(`--timezone-for-testing=${fp.timezone}`)
  }

  if (opts.devtools) args.push('--auto-open-devtools-for-tabs')

  args.push(...splitExtraArgs(profile.extraLaunchArgs))

  if (targetUrl) args.push(targetUrl)
  return args
}

// ---------------------------------------------------------------------------
// Firefox
// ---------------------------------------------------------------------------

function buildFirefoxArgs(profile: ProfileData, opts: LaunchOptions, targetUrl: string): string[] {
  const args = [
    '-profile',
    profile.userDataDirOverride || paths.firefoxProfileDir(profile.id),
    '-no-remote',
    '-new-instance'
  ]
  if (opts.devtools) args.push('--devtools')
  if (targetUrl) args.push(targetUrl)
  args.push(...splitExtraArgs(profile.extraLaunchArgs))
  return args
}

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

export async function launchProfile(
  profile: ProfileData,
  opts: LaunchOptions = {}
): Promise<{ pid: number; url: string | null }> {
  if (isRunning(profile.id)) {
    throw new Error(`Profile "${profile.name}" is already running.`)
  }

  // 1. Resolve the executable -------------------------------------------------
  let exe = profile.browserExecutablePath.trim()
  if (!exe) {
    exe = findBrowserExecutable(profile.browserType)
  }
  if (!exe || !existsSync(exe)) {
    throw new Error(
      `Could not find ${profile.browserType} on this system. Install it, or set a custom executable path in the Advanced tab.`
    )
  }
  logger.info('Launching', profile.browserType, '->', exe)

  emitStatus({ profileId: profile.id, status: 'starting' })

  // 2. Target URL --------------------------------------------------------------
  let targetUrl = opts.url ?? ''
  if (opts.fingerprintTest) {
    const server = await startTestPageServer()
    targetUrl = server.url
  } else if (!targetUrl && profile.launchUrl) {
    targetUrl = profile.launchUrl
  }

  // 3. Proxy -------------------------------------------------------------------
  let proxy: ProxyDeployment | null = null
  let pacServer: PacServer | null = null
  let pacUrl = ''
  try {
    if (profile.proxy.enabled) {
      const pacSetting = profile.proxy.pacUrl.trim()
      if (pacSetting) {
        const resolved = await resolvePacUrl(pacSetting)
        pacUrl = resolved.url
        pacServer = resolved.server
      } else {
        proxy = await deployProxy(profile.proxy)
      }
    }
  } catch (e) {
    logger.error('Proxy deployment failed', e)
    throw new Error('Proxy setup failed: ' + (e instanceof Error ? e.message : String(e)))
  }

  // 4. Stealth extension + user data dir ---------------------------------------
  const userDataDir = profile.userDataDirOverride || paths.profileUserDataDir(profile.id)
  mkdirSync(userDataDir, { recursive: true })

  const extDir = tempExtensionDir(profile.id)
  try {
    if (profile.browserType === 'firefox') {
      // Firefox: PAC via network.proxy.autoconfig_url, SOCKS auth via prefs.
      provisionFirefoxProfile(profile, userDataDir, { proxy, pacUrl })
    } else {
      buildExtension(profile, extDir)
    }
  } catch (e) {
    logger.error('Stealth extension build failed', e)
    throw new Error('Extension build failed: ' + (e instanceof Error ? e.message : String(e)))
  }

  // 5. Assemble args & spawn ----------------------------------------------------
  const args =
    profile.browserType === 'firefox'
      ? buildFirefoxArgs(profile, opts, targetUrl)
      : buildChromiumArgs(profile, opts, extDir, proxy, pacUrl, targetUrl)

  logger.debug('Args:', args.join(' '))

  const proc = spawn(exe, args, {
    detached: true,
    windowsHide: false,
    stdio: 'ignore'
  })

  const session: Session = {
    profileId: profile.id,
    proc,
    browserType: profile.browserType,
    pid: proc.pid as number,
    startedAt: Date.now(),
    userDataDir,
    exited: false,
    cleanup: async () => {
      await proxy?.close()
      await pacServer?.close()
      rmSync(extDir, { recursive: true, force: true })
      rmSync(join(userDataDir, '.stealth-build'), { recursive: true, force: true })
    }
  }

  proc.on('error', (err) => {
    logger.error('Browser process error', err)
    session.exited = true
    sessions.delete(profile.id)
    void session.cleanup()
    emitStatus({ profileId: profile.id, status: 'error', pid: proc.pid, error: err.message })
  })

  proc.on('exit', (code, signal) => {
    logger.info('Browser exited', profile.id, 'code=' + code, 'signal=' + signal)
    session.exited = true
    sessions.delete(profile.id)
    void session.cleanup()
    emitStatus({ profileId: profile.id, status: 'exited', pid: proc.pid })
  })

  sessions.set(profile.id, session)
  touchLastLaunched(profile.id)
  emitStatus({ profileId: profile.id, status: 'running', pid: proc.pid as number, browserType: session.browserType, userDataDir: session.userDataDir, startedAt: session.startedAt })

  return { pid: proc.pid as number, url: targetUrl || null }
}

export async function closeProfile(profileId: string): Promise<boolean> {
  const session = sessions.get(profileId)
  if (!session || session.exited) {
    // Process may already be gone; clean up leftovers anyway.
    const dir = paths.profileUserDataDir(profileId)
    rmSync(join(dir, '.stealth-build'), { recursive: true, force: true })
    return false
  }
  await killTree(session.proc)
  return true
}

export async function closeAllProfiles(): Promise<void> {
  for (const id of [...sessions.keys()]) {
    await closeProfile(id)
  }
}
