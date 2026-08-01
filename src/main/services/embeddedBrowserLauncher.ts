/**
 * Embedded browser launcher — opens profiles INSIDE the app.
 *
 * Uses Electron's BrowserWindow with a unique session partition per profile
 * so cookies, localStorage, IndexedDB, cache and extensions are completely
 * separate — multi-accounting safe by construction.
 *
 * This is how AdsPower and GoLogin work: the browser is embedded within
 * the application, not launched as an external process.
 */
import { BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
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
// Stealth injection script builder
// ---------------------------------------------------------------------------

function buildStealthInjectionScript(config: ExtensionConfig): string {
  // This script runs in the MAIN world of every page loaded in the browser window.
  // It overrides navigator properties, screen, WebGL, canvas, audio, etc.
  const json = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

  return `
    (function() {
      'use strict';
      var CFG = ${json};
      if (!CFG || typeof CFG !== 'object') return;
      var ENABLED = typeof CFG.userAgent === 'string' && CFG.userAgent.length > 0;
      if (!ENABLED) return;

      // Seeded RNG
      function mulberry32(seed) {
        var a = seed >>> 0;
        return function() {
          a |= 0;
          a = (a + 0x6d2b79f5) | 0;
          var t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      // Make fn.toString() look native
      function makeNative(fn, name) {
        var str = 'function ' + name + '() { [native code] }';
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
        var s = CFG.screen;
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
          var origDateTimeFormat = Intl.DateTimeFormat;
          var tzOverride = CFG.timezone;
          override(origDateTimeFormat.prototype, 'resolvedOptions', function() {
            var opts = origDateTimeFormat.prototype.resolvedOptions.call(this);
            opts.timeZone = tzOverride;
            return opts;
          });
        } catch(e) {}
      }

      // WebGL
      if (CFG.webglVendor || CFG.webglRenderer) {
        var origGetParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = makeNative(function(param) {
          if (param === 0x1F00) return CFG.webglVendor; // UNMASKED_VENDOR_WEBGL
          if (param === 0x1F01) return CFG.webglRenderer; // UNMASKED_RENDERER_WEBGL
          return origGetParam.call(this, param);
        }, 'getParameter');
        if (typeof WebGL2RenderingContext !== 'undefined') {
          var origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = makeNative(function(param) {
            if (param === 0x1F00) return CFG.webglVendor;
            if (param === 0x1F01) return CFG.webglRenderer;
            return origGetParam2.call(this, param);
          }, 'getParameter');
        }
      }

      // Canvas noise
      if (CFG.canvasNoiseEnabled) {
        var canvasRng = mulberry32(CFG.canvasNoiseSeed || 1);
        var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = makeNative(function() {
          var ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            try {
              var imgData = ctx.getImageData(0, 0, Math.min(this.width, 2), Math.min(this.height, 2));
              for (var i = 0; i < imgData.data.length; i += 4) {
                imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + Math.floor(canvasRng() * 3 - 1)));
              }
              ctx.putImageData(imgData, 0, 0);
            } catch(e) {}
          }
          return origToDataURL.apply(this, arguments);
        }, 'toDataURL');
      }

      // Audio noise
      if (CFG.audioNoiseEnabled) {
        var audioRng = mulberry32(CFG.audioNoiseSeed || 1);
        var origCreateOscillator = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = makeNative(function() {
          var osc = origCreateOscillator.call(this);
          var origGetFreq = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'frequency');
          if (origGetFreq && origGetFreq.get) {
            // Add subtle noise to frequency
          }
          return osc;
        }, 'createOscillator');
      }

      // WebRTC leak protection
      if (CFG.webRTCLeakProtect) {
        try {
          var origRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
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
        var origQuery = Permissions.prototype.query;
        Permissions.prototype.query = makeNative(function(desc) {
          var override = CFG.permissionsPolicy[desc.name];
          if (override) {
            return Promise.resolve({ state: override, onchange: null });
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

      // Font fingerprint protection
      if (CFG.fontFingerprintProtection && CFG.fonts && CFG.fonts.length) {
        // This is handled via the extension's CSS/font loading overrides
      }

      // Remove automation indicators
      delete navigator.__proto__.webdriver;

      console.log('[JoeBrowser] Stealth fingerprint injected: ' + CFG.userAgent.substring(0, 60) + '...');
    })();
  `
}

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

function appIconPath(): string {
  const { app } = require('electron')
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

export async function launchProfile(
  profile: ProfileData,
  opts: LaunchOptions = {}
): Promise<{ pid: number; url: string | null }> {
  if (isRunning(profile.id)) {
    throw new Error(`Profile "${profile.name}" is already running.`)
  }

  emitStatus({ profileId: profile.id, status: 'starting' })

  // 1. Target URL
  let targetUrl = opts.url ?? ''
  if (opts.fingerprintTest) {
    const server = await startTestPageServer()
    targetUrl = server.url
  } else if (!targetUrl && profile.launchUrl) {
    targetUrl = profile.launchUrl
  }
  if (!targetUrl) {
    targetUrl = 'https://www.google.com'
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

  // 4. Build stealth config
  const config = buildExtensionConfig(profile)

  // 5. Create the embedded browser window
  const fp = profile.fingerprint
  const isMobile = (fp.screenWidth ?? 0) < 800
  const windowWidth = isMobile ? Math.min(fp.screenWidth + 40, 480) : Math.min(fp.screenWidth ?? 1280, 1400)
  const windowHeight = isMobile ? Math.min(fp.screenHeight + 80, 900) : Math.min(fp.screenHeight ?? 800, 900)

  const stealthScript = buildStealthInjectionScript(config)

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
      partition,
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      webviewTag: true,
      // Allow popups within the browser window
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
    emitStatus({ profileId: profile.id, status: 'exited' })
  })

  // Set up proxy for the session
  const ses = browserWin.webContents.session
  if (profile.proxy.enabled && pacUrl) {
    await ses.setProxy({ pacScript: pacUrl })
  } else if (profile.proxy.enabled && proxy) {
    await ses.setProxy({ proxyRules: proxy.proxyServer })
  } else {
    await ses.setProxy({ proxyRules: 'direct://' })
  }

  // Set User-Agent
  if (fp.userAgent) {
    ses.setUserAgent(fp.userAgent)
  }

  // Inject stealth script on every page load
  browserWin.webContents.on('did-start-navigation', () => {
    try {
      browserWin.webContents.executeJavaScript(stealthScript)
    } catch (e) {
      logger.debug('Stealth injection error (page not ready):', e)
    }
  })

  // Also inject when DOM is ready
  browserWin.webContents.on('dom-ready', () => {
    try {
      browserWin.webContents.executeJavaScript(stealthScript)
    } catch (e) {
      logger.debug('Stealth injection error (dom-ready):', e)
    }
  })

  // Handle new window requests (open in same window)
  browserWin.webContents.setWindowOpenHandler(({ url }) => {
    browserWin.webContents.loadURL(url)
    return { action: 'deny' }
  })

  // Prevent navigation to our own app
  // Allow all navigation within the browser window

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
    }
  }

  sessions.set(profile.id, sessionObj)
  touchLastLaunched(profile.id)

  // Load the target URL
  try {
    await browserWin.loadURL(targetUrl)
  } catch (e) {
    logger.error('Failed to load URL:', e)
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
  emitStatus({ profileId: s.profileId, status: 'exited' })
  return true
}

export async function closeAllProfiles(): Promise<void> {
  for (const id of [...sessions.keys()]) {
    await closeProfile(id)
  }
}
