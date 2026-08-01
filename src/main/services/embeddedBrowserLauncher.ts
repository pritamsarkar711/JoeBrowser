/**
 * Embedded browser launcher — opens profiles INSIDE the app with a full
 * browser chrome (address bar, navigation, back/forward/refresh).
 *
 * Uses Electron's BrowserWindow + webview tag inside a custom HTML page.
 * Each profile gets a unique session partition for isolation.
 *
 * The stealth injection runs BEFORE any page JS via session.setPreloads(),
 * which eliminates the race condition that existed with executeJavaScript().
 */
import { BrowserWindow, session, app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserStatusEvent, LaunchOptions, ProfileData, RunningSession } from '@shared/types'
import { buildExtensionConfig, type ExtensionConfig } from './extensionBuilder'
import { deployProxy, type ProxyDeployment } from './proxyRelay'
import { startPacServer, type PacServer } from './pacServer'
import { startTestPageServer } from './testPageServer'
import * as paths from '../paths'
import { logger } from '../logger'
import { touchLastLaunched } from '../db/profileRepository'

interface EmbeddedSession {
  profileId: string
  win: BrowserWindow
  browserType: ProfileData['browserType']
  startedAt: number
  userDataDir: string
  cleanup: () => Promise<void>
  exited: boolean
  partition: string
}

type StatusListener = (event: BrowserStatusEvent) => void

const sessions = new Map<string, EmbeddedSession>()
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
    .filter((s) => !s.exited && !s.win.isDestroyed())
    .map((s) => ({
      profileId: s.profileId,
      pid: 0,
      browserType: s.browserType,
      startedAt: s.startedAt,
      userDataDir: s.userDataDir
    }))
}

export function isRunning(profileId: string): boolean {
  const s = sessions.get(profileId)
  return !!s && !s.exited && !s.win.isDestroyed()
}

// ---------------------------------------------------------------------------
// Stealth preload script builder — runs BEFORE any page JavaScript
// ---------------------------------------------------------------------------

function buildStealthPreloadScript(config: ExtensionConfig): string {
  const json = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

  return `
    'use strict';
    // This preload runs in the ISOLATED world before any page JS.
    // It overrides navigator, screen, WebGL, canvas, audio, etc.
    const CFG = ${json};
    if (!CFG || typeof CFG !== 'object') return;
    const ENABLED = typeof CFG.userAgent === 'string' && CFG.userAgent.length > 0;
    if (!ENABLED) return;

    // Seeded RNG
    function mulberry32(seed) {
      let a = seed >>> 0;
      return function() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // Make fn.toString() look native
    function makeNative(fn, name) {
      const str = 'function ' + name + '() { [native code] }';
      fn.toString = function() { return str; };
      fn.toLocaleString = function() { return str; };
      return fn;
    }

    // Override a property on an object
    function override(obj, prop, getter, setter) {
      try {
        Object.defineProperty(obj, prop, {
          get: makeNative(getter, 'get ' + prop),
          set: setter ? makeNative(setter, 'set ' + prop) : undefined,
          configurable: true,
          enumerable: true
        });
      } catch(e) {}
    }

    // User-Agent
    if (CFG.userAgent) {
      override(Navigator.prototype, 'userAgent', function() { return CFG.userAgent; });
      override(Navigator.prototype, 'appVersion', function() { return CFG.userAgent.substring(CFG.userAgent.indexOf('/') + 1); });
    }

    // Platform
    if (CFG.platform) {
      override(Navigator.prototype, 'platform', function() { return CFG.platform; });
    }

    // oscpu (Firefox)
    if (CFG.oscpu) {
      override(Navigator.prototype, 'oscpu', function() { return CFG.oscpu; });
    }

    // Language
    if (CFG.language) {
      override(Navigator.prototype, 'language', function() { return CFG.language; });
    }
    if (CFG.languages && CFG.languages.length) {
      override(Navigator.prototype, 'languages', function() { return CFG.languages.slice(); });
    }

    // Hardware
    if (CFG.hardwareConcurrency) {
      override(Navigator.prototype, 'hardwareConcurrency', function() { return CFG.hardwareConcurrency; });
    }
    if (CFG.deviceMemory) {
      override(Navigator.prototype, 'deviceMemory', function() { return CFG.deviceMemory; });
    }
    if (CFG.maxTouchPoints !== undefined) {
      override(Navigator.prototype, 'maxTouchPoints', function() { return CFG.maxTouchPoints; });
    }

    // Connection
    if (CFG.connectionDownlink && navigator.connection) {
      try {
        override(navigator.connection, 'downlink', function() { return CFG.connectionDownlink; });
        override(navigator.connection, 'effectiveType', function() { return CFG.connectionEffectiveType; });
        override(navigator.connection, 'rtt', function() { return CFG.connectionRtt; });
      } catch(e) {}
    }

    // Do Not Track
    if (CFG.doNotTrack !== undefined && CFG.doNotTrack !== null) {
      override(Navigator.prototype, 'doNotTrack', function() { return CFG.doNotTrack; });
    }

    // webdriver
    override(Navigator.prototype, 'webdriver', function() { return false; });

    // Screen
    if (CFG.screen) {
      const s = CFG.screen;
      override(Screen.prototype, 'width', function() { return s.width; });
      override(Screen.prototype, 'height', function() { return s.height; });
      override(Screen.prototype, 'availWidth', function() { return s.availWidth; });
      override(Screen.prototype, 'availHeight', function() { return s.availHeight; });
      override(Screen.prototype, 'colorDepth', function() { return s.colorDepth; });
      override(Screen.prototype, 'pixelDepth', function() { return s.pixelDepth; });
      if (s.dpr) {
        override(window, 'devicePixelRatio', function() { return s.dpr; });
      }
    }

    // Timezone
    if (CFG.timezone) {
      try {
        const origDateTimeFormat = Intl.DateTimeFormat;
        const tzOverride = CFG.timezone;
        override(origDateTimeFormat.prototype, 'resolvedOptions', function() {
          const opts = origDateTimeFormat.prototype.resolvedOptions.call(this);
          opts.timeZone = tzOverride;
          return opts;
        });
      } catch(e) {}
    }

    // WebGL
    if (CFG.webglVendor || CFG.webglRenderer) {
      const origGetParam = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = makeNative(function(param) {
        if (param === 0x1F00) return CFG.webglVendor;
        if (param === 0x1F01) return CFG.webglRenderer;
        return origGetParam.call(this, param);
      }, 'getParameter');
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = makeNative(function(param) {
          if (param === 0x1F00) return CFG.webglVendor;
          if (param === 0x1F01) return CFG.webglRenderer;
          return origGetParam2.call(this, param);
        }, 'getParameter');
      }
    }

    // Canvas noise
    if (CFG.canvasNoiseEnabled) {
      const canvasRng = mulberry32(CFG.canvasNoiseSeed || 1);
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = makeNative(function() {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          try {
            const imgData = ctx.getImageData(0, 0, Math.min(this.width, 2), Math.min(this.height, 2));
            for (let i = 0; i < imgData.data.length; i += 4) {
              imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + Math.floor(canvasRng() * 3 - 1)));
            }
            ctx.putImageData(imgData, 0, 0);
          } catch(e) {}
        }
        return origToDataURL.apply(this, arguments);
      }, 'toDataURL');
    }

    // Audio noise — real noise injection
    if (CFG.audioNoiseEnabled) {
      const audioRng = mulberry32(CFG.audioNoiseSeed || 1);
      const origGetFloatFreqData = AnalyserNode.prototype.getFloatFrequencyData;
      AnalyserNode.prototype.getFloatFrequencyData = makeNative(function(array) {
        origGetFloatFreqData.call(this, array);
        for (let i = 0; i < array.length; i++) {
          array[i] += (audioRng() - 0.5) * 0.01;
        }
      }, 'getFloatFrequencyData');
      const origGetByteFreqData = AnalyserNode.prototype.getByteFrequencyData;
      AnalyserNode.prototype.getByteFrequencyData = makeNative(function(array) {
        origGetByteFreqData.call(this, array);
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.min(255, Math.max(0, array[i] + Math.floor(audioRng() * 2 - 1)));
        }
      }, 'getByteFrequencyData');
    }

    // WebRTC leak protection
    if (CFG.webRTCLeakProtect) {
      try {
        const origRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (origRTCPeerConnection) {
          window.RTCPeerConnection = makeNative(function(config, constraints) {
            if (config && config.iceServers) {
              config.iceServers = config.iceServers.filter(function(s) {
                return !s.urls || s.urls.indexOf('stun:') === -1;
              });
            }
            return new origRTCPeerConnection(config, constraints);
          }, 'RTCPeerConnection');
          window.webkitRTCPeerConnection = window.RTCPeerConnection;
        }
      } catch(e) {}
    }

    // Permissions
    if (CFG.permissionsPolicy) {
      const origQuery = Permissions.prototype.query;
      Permissions.prototype.query = makeNative(function(desc) {
        const ov = CFG.permissionsPolicy[desc.name];
        if (ov) {
          return Promise.resolve({ state: ov, onchange: null });
        }
        return origQuery.call(this, desc);
      }, 'query');
    }

    // Geolocation
    if (CFG.geolocation && CFG.geolocation.mode === 'block') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = makeNative(function(success, error) {
          if (error) error({ code: 1, message: 'User denied Geolocation' });
        }, 'getCurrentPosition');
        navigator.geolocation.watchPosition = makeNative(function(success, error) {
          if (error) error({ code: 1, message: 'User denied Geolocation' });
          return 0;
        }, 'watchPosition');
      }
    } else if (CFG.geolocation && CFG.geolocation.mode === 'spoof') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = makeNative(function(success) {
          if (success) success({ coords: { latitude: CFG.geolocation.latitude, longitude: CFG.geolocation.longitude, accuracy: 100 }, timestamp: Date.now() });
        }, 'getCurrentPosition');
        navigator.geolocation.watchPosition = makeNative(function(success) {
          if (success) success({ coords: { latitude: CFG.geolocation.latitude, longitude: CFG.geolocation.longitude, accuracy: 100 }, timestamp: Date.now() });
          return 0;
        }, 'watchPosition');
      }
    }

    // window.chrome
    if (CFG.windowChromeSpoof && !window.chrome) {
      window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
    }

    // Plugins spoof
    if (CFG.pluginsSpoof) {
      override(Navigator.prototype, 'plugins', function() {
        return {
          length: 3,
          item: function(i) { return [null,null,null][i]; },
          namedItem: function() { return null; },
          refresh: function() {},
          0: null, 1: null, 2: null
        };
      });
      override(Navigator.prototype, 'mimeTypes', function() {
        return { length: 0, item: function(){}, namedItem: function(){} };
      });
    }

    // Remove automation indicators
    try { delete navigator.__proto__.webdriver; } catch(e) {}

    console.log('[JoeBrowser] Stealth fingerprint injected (preload): ' + CFG.userAgent.substring(0, 60) + '...');
  `
}

// ---------------------------------------------------------------------------
// Write stealth preload to temp file for session.setPreloads()
// ---------------------------------------------------------------------------

function writeStealthPreload(profileId: string, script: string): string {
  const dir = join(app.getPath('temp'), 'joebrowser-preloads')
  mkdirSync(dir, { recursive: true })
  const filePath = join(dir, `stealth-${profileId}.js`)
  writeFileSync(filePath, script, 'utf-8')
  return filePath
}

function cleanupStealthPreload(profileId: string): void {
  try {
    const dir = join(app.getPath('temp'), 'joebrowser-preloads')
    const filePath = join(dir, `stealth-${profileId}.js`)
    if (existsSync(filePath)) unlinkSync(filePath)
  } catch {
    /* ignore cleanup errors */
  }
}

// ---------------------------------------------------------------------------
// App icon path
// ---------------------------------------------------------------------------

function appIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

// ---------------------------------------------------------------------------
// Browser chrome HTML path
// ---------------------------------------------------------------------------

function browserChromePath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'browser-chrome.html')
    : join(__dirname, '../assets/browser-chrome.html')
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

  emitStatus({ profileId: profile.id, status: 'starting' })

  // 1. Target URL — default to iphey.com for fingerprint check
  let targetUrl = opts.url ?? ''
  if (opts.fingerprintTest) {
    const server = await startTestPageServer()
    targetUrl = server.url
  } else if (!targetUrl && profile.launchUrl) {
    targetUrl = profile.launchUrl
  }
  if (!targetUrl) {
    targetUrl = 'https://iphey.com'
  }

  // 2. Proxy
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

  // 3. Session partition (unique per profile for isolation)
  const partition = `persist:joebrowser-${profile.id}`
  const userDataDir = profile.userDataDirOverride || paths.profileUserDataDir(profile.id)
  mkdirSync(userDataDir, { recursive: true })

  // 4. Build stealth config and write preload script
  const config = buildExtensionConfig(profile)
  const stealthScript = buildStealthPreloadScript(config)
  const stealthPreloadPath = writeStealthPreload(profile.id, stealthScript)

  // 5. Set up session with preloads, proxy, UA, and extensions
  const ses = session.fromPartition(partition)
  
  // Clear any previous preloads and set the stealth preload
  ses.setPreloads([stealthPreloadPath])

  // Set proxy
  if (profile.proxy.enabled && pacUrl) {
    await ses.setProxy({ pacScript: pacUrl })
  } else if (profile.proxy.enabled && proxy) {
    await ses.setProxy({ proxyRules: proxy.proxyServer })
  } else {
    await ses.setProxy({ proxyRules: 'direct://' })
  }

  // Set User-Agent
  const fp = profile.fingerprint
  if (fp.userAgent) {
    ses.setUserAgent(fp.userAgent)
  }

  // Load extensions
  if (profile.customExtensions && profile.customExtensions.length > 0) {
    for (const extPath of profile.customExtensions) {
      try {
        if (existsSync(extPath)) {
          await ses.loadExtension(extPath)
          logger.info(`Extension loaded: ${extPath}`)
        }
      } catch (e) {
        logger.warn(`Failed to load extension: ${extPath}`, e)
      }
    }
  }

  // 6. Create the embedded browser window with browser chrome
  const isMobile = fp.deviceType === 'mobile' || fp.deviceType === 'tablet' || (fp.screenWidth ?? 0) < 800
  const windowWidth = isMobile ? Math.min(Math.max(fp.screenWidth + 80, 480), 560) : Math.min(fp.screenWidth ?? 1280, 1400)
  const windowHeight = isMobile ? Math.min(Math.max(fp.screenHeight + 120, 900), 1000) : Math.min(fp.screenHeight ?? 800, 960)

  // Build the browser chrome URL with query params
  const chromeHtml = browserChromePath()
  const chromeParams = new URLSearchParams({
    pid: profile.id,
    pname: profile.name,
    btype: profile.browserType,
    url: targetUrl,
    partition,
    mobile: isMobile ? 'true' : 'false',
    mw: String(fp.screenWidth ?? 375),
    mh: String(fp.screenHeight ?? 812)
  })
  const chromeUrl = `file://${chromeHtml}?${chromeParams.toString()}`

  const browserWin = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 400,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1a2e',
    title: `Joe Browser — ${profile.name}`,
    icon: appIconPath(),
    webPreferences: {
      partition, // Same partition so the webview can use it
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      webviewTag: true,
      allowRunningInsecureContent: false
    }
  })

  // Show window when ready
  browserWin.on('ready-to-show', () => {
    browserWin.show()
  })

  // Handle window close
  browserWin.on('closed', () => {
    const s = sessions.get(profile.id)
    if (s) {
      s.exited = true
      sessions.delete(profile.id)
      void s.cleanup()
    }
    cleanupStealthPreload(profile.id)
    emitStatus({ profileId: profile.id, status: 'exited' })
  })

  const sessionObj: EmbeddedSession = {
    profileId: profile.id,
    win: browserWin,
    browserType: profile.browserType,
    startedAt: Date.now(),
    userDataDir,
    exited: false,
    partition,
    cleanup: async () => {
      await proxy?.close()
      await pacServer?.close()
      cleanupStealthPreload(profile.id)
    }
  }

  sessions.set(profile.id, sessionObj)
  touchLastLaunched(profile.id)

  // Load the browser chrome HTML
  try {
    await browserWin.loadURL(chromeUrl)
  } catch (e) {
    logger.error('Failed to load browser chrome:', e)
  }

  emitStatus({
    profileId: profile.id,
    status: 'running',
    pid: 0,
    browserType: sessionObj.browserType,
    userDataDir: sessionObj.userDataDir,
    startedAt: sessionObj.startedAt
  })

  return { pid: 0, url: targetUrl || null }
}

async function resolvePacUrl(pacSetting: string): Promise<{ url: string; server: PacServer | null }> {
  const trimmed = pacSetting.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed, server: null }
  }
  const filePath = trimmed.replace(/^file:\/\//i, '')
  if (existsSync(filePath)) {
    const script = readFileSync(filePath, 'utf-8')
    const server = await startPacServer(script)
    return { url: server.url, server }
  }
  return { url: trimmed, server: null }
}

export async function closeProfile(profileId: string): Promise<boolean> {
  const s = sessions.get(profileId)
  if (!s || s.exited) {
    return false
  }
  if (!s.win.isDestroyed()) {
    s.win.close()
  }
  s.exited = true
  sessions.delete(profileId)
  await s.cleanup()
  cleanupStealthPreload(profileId)
  emitStatus({ profileId: s.profileId, status: 'exited' })
  return true
}

export async function closeAllProfiles(): Promise<void> {
  for (const id of [...sessions.keys()]) {
    await closeProfile(id)
  }
}

// Clean up all temp preloads on app quit
export function cleanupAllPreloads(): void {
  try {
    const dir = join(app.getPath('temp'), 'joebrowser-preloads')
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  } catch {
    /* ignore */
  }
}
