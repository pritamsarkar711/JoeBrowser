// ============================================================
// Joe Browser - Embedded Browser Launcher
// Launches profiles in embedded BrowserWindow with webview
// Fixes: popup→tab, Brave/Edge/Firefox support, stealth preload
// ============================================================

import { app, BrowserWindow, session, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { ProfileData, BROWSER_THEMES, MOBILE_RESOLUTIONS, BrowserType } from '../../shared/types';

// Track open browser windows
const openWindows = new Map<string, BrowserWindow>();

// Directory for stealth preload scripts
const PRELOAD_DIR = path.join(app.getPath('userData'), 'stealth-preloads');

/**
 * Build the stealth preload script content for a given profile.
 * This script runs BEFORE any page JavaScript, preventing detection.
 */
function buildStealthPreloadScript(profile: ProfileData): string {
  const fp = profile.fingerprint;

  return `
// ============================================================
// Joe Browser Stealth Preload Script
// Runs before page JS to prevent fingerprint detection
// Profile: ${profile.name} (${profile.browserType})
// ============================================================

// NOTE: Do NOT use require() here - this runs in a context-isolated preload.
// The script is loaded via session.setPreloads() and runs before page JS.

// ---- Navigator Overrides ----
const _origNavigator = window.navigator;
const _origDefineProperty = Object.defineProperty;

function overrideNavigator() {
  const overrides = {
    userAgent: ${JSON.stringify(fp.userAgent)},
    platform: ${JSON.stringify(fp.platform)},
    vendor: ${JSON.stringify(fp.vendor)},
    language: ${JSON.stringify(fp.language)},
    languages: ${JSON.stringify(fp.languages)},
    hardwareConcurrency: ${fp.hardwareConcurrency},
    deviceMemory: ${fp.deviceMemory},
    maxTouchPoints: ${fp.maxTouchPoints},
    appVersion: ${JSON.stringify(fp.userAgent.replace('Mozilla/', ''))},
  };

  for (const [key, value] of Object.entries(overrides)) {
    try {
      _origDefineProperty.call(Object, Navigator.prototype, key, {
        get: () => value,
        configurable: true,
      });
    } catch (e) {
      // Some properties may be non-configurable, try direct assignment
      try {
        _origNavigator[key] = value;
      } catch (e2) {}
    }
  }

  // Override plugins for Chrome-based browsers
  if (${fp.browserType !== 'firefox'}) {
    try {
      Object.defineProperty(Navigator.prototype, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          plugins.length = 3;
          return plugins;
        },
        configurable: true,
      });
    } catch (e) {}
  }
}

// ---- Screen Overrides ----
function overrideScreen() {
  const res = ${JSON.stringify(fp.screenResolution)}.split('x');
  const availRes = ${JSON.stringify(fp.availableScreenResolution)}.split('x');

  const screenOverrides = {
    width: parseInt(res[0]),
    height: parseInt(res[1]),
    availWidth: parseInt(availRes[0]),
    availHeight: parseInt(availRes[1]),
    colorDepth: ${fp.colorDepth},
    pixelDepth: ${fp.colorDepth},
  };

  for (const [key, value] of Object.entries(screenOverrides)) {
    try {
      Object.defineProperty(Screen.prototype, key, {
        get: () => value,
        configurable: true,
      });
    } catch (e) {}
  }
}

// ---- WebGL Overrides ----
function overrideWebGL() {
  const getParameterProxyHandler = {
    apply: function(target, thisArg, args) {
      const param = args[0];
      const gl = thisArg;

      // UNMASKED_VENDOR_WEBGL
      if (param === 0x9245) return ${JSON.stringify(fp.webglVendor)};
      // UNMASKED_RENDERER_WEBGL
      if (param === 0x9246) return ${JSON.stringify(fp.webglRenderer)};

      return Reflect.apply(target, thisArg, args);
    }
  };

  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = new Proxy(origGetParameter, getParameterProxyHandler);

  if (typeof WebGL2RenderingContext !== 'undefined') {
    const origGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = new Proxy(origGetParameter2, getParameterProxyHandler);
  }
}

// ---- Canvas Noise ----
function overrideCanvas() {
  const noise = ${fp.canvasNoise};

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      try {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + (Math.random() - 0.5) * noise * 255));
        }
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {}
    }
    return origToDataURL.apply(this, args);
  };

  const origToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      try {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + (Math.random() - 0.5) * noise * 255));
        }
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {}
    }
    return origToBlob.call(this, callback, ...args);
  };
}

// ---- Audio Noise ----
function overrideAudio() {
  const noise = ${fp.audioNoise};

  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(channel) {
        const data = origGetChannelData.call(this, channel);
        if (this._noised) return data;
        for (let i = 0; i < data.length; i += 100) {
          data[i] += (Math.random() - 0.5) * noise;
        }
        this._noised = true;
        return data;
      };

      const origCreateAnalyser = OrigAudioContext.prototype.createAnalyser;
      OrigAudioContext.prototype.createAnalyser = function() {
        const analyser = origCreateAnalyser.call(this);
        const origGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
        analyser.getFloatFrequencyData = function(array) {
          origGetFloatFrequencyData(array);
          for (let i = 0; i < array.length; i += 100) {
            array[i] += (Math.random() - 0.5) * noise * 100;
          }
        };
        return analyser;
      };
    }
  }
}

// ---- WebRTC Policy ----
function overrideWebRTC() {
  const policy = ${JSON.stringify(fp.webRtcPolicy)};
  if (policy === 'disable') {
    try {
      const origRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
      if (origRTCPeerConnection) {
        window.RTCPeerConnection = function() { return null; };
        window.webkitRTCPeerConnection = function() { return null; };
      }
    } catch (e) {}
  }
}

// ---- Timezone Override ----
function overrideTimezone() {
  const tz = ${JSON.stringify(fp.timezone)};
  try {
    const origDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locale, options) {
      options = options || {};
      options.timeZone = options.timeZone || tz;
      return new origDateTimeFormat(locale, options);
    };
    Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = origDateTimeFormat.supportedLocalesOf;
  } catch (e) {}
}

// ---- Brave-specific overrides ----
function overrideBrave() {
  // Make the page think it's running in Brave
  if (${fp.browserType === 'brave'}) {
    try {
      Object.defineProperty(window, 'brave', {
        value: {
          isBrave: () => Promise.resolve(true),
          braveShields: { getDetails: () => Promise.resolve({ shieldsUp: true }) },
        },
        configurable: true,
        writable: true,
      });
    } catch (e) {}
  }
}

// ---- Firefox-specific overrides ----
function overrideFirefox() {
  if (${fp.browserType === 'firefox'}) {
    try {
      // Firefox doesn't have chrome object
      if (window.chrome) {
        delete window.chrome;
      }
    } catch (e) {}
  }
}

// ---- Edge-specific overrides ----
function overrideEdge() {
  if (${fp.browserType === 'edge'}) {
    try {
      // Add Edge-specific styles
      Object.defineProperty(Navigator.prototype, 'brave', {
        get: () => undefined,
        configurable: true,
      });
    } catch (e) {}
  }
}

// ---- Apply all overrides ----
try {
  overrideNavigator();
  overrideScreen();
  overrideWebGL();
  overrideCanvas();
  overrideAudio();
  overrideWebRTC();
  overrideTimezone();
  overrideBrave();
  overrideFirefox();
  overrideEdge();
} catch (e) {
  console.error('Stealth preload error:', e);
}
`;
}

/**
 * Write the stealth preload script to a file for the profile.
 * Returns the file path.
 */
function writeStealthPreload(profile: ProfileData): string {
  if (!fs.existsSync(PRELOAD_DIR)) {
    fs.mkdirSync(PRELOAD_DIR, { recursive: true });
  }

  const scriptPath = path.join(PRELOAD_DIR, `stealth-${profile.id}.js`);
  const scriptContent = buildStealthPreloadScript(profile);

  fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
  return scriptPath;
}

/**
 * Clean up a specific stealth preload script
 */
export function cleanupStealthPreload(profileId: string): void {
  try {
    const scriptPath = path.join(PRELOAD_DIR, `stealth-${profileId}.js`);
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
  } catch (e) {
    console.error('Failed to cleanup stealth preload:', e);
  }
}

/**
 * Clean up all stealth preload scripts
 */
export function cleanupAllPreloads(): void {
  try {
    if (fs.existsSync(PRELOAD_DIR)) {
      const files = fs.readdirSync(PRELOAD_DIR);
      for (const file of files) {
        if (file.startsWith('stealth-')) {
          fs.unlinkSync(path.join(PRELOAD_DIR, file));
        }
      }
    }
  } catch (e) {
    console.error('Failed to cleanup preloads:', e);
  }
}

/**
 * Get the browser-chrome.html path
 */
function getBrowserChromePath(): string {
  // In development, use the source file directly
  const devPath = path.join(__dirname, '..', 'assets', 'browser-chrome.html');
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  // In production, use the extraResources path
  const prodPath = path.join(process.resourcesPath, 'browser-chrome.html');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // Fallback: try relative to app.asar
  const asarPath = path.join(__dirname, '..', '..', 'assets', 'browser-chrome.html');
  if (fs.existsSync(asarPath)) {
    return asarPath;
  }

  throw new Error('browser-chrome.html not found! Check electron-builder.yml extraResources.');
}

/**
 * Get the page URL for the browser-chrome.html
 */
function getBrowserChromeUrl(): string {
  const htmlPath = getBrowserChromePath();
  return `file://${htmlPath.replace(/\\/g, '/')}`;
}

/**
 * Get the session partition name for a profile.
 * Each profile gets its own isolated session.
 */
function getPartitionName(profile: ProfileData): string {
  return `persist:joe-${profile.id}`;
}

/**
 * Get the window dimensions based on profile device type
 */
function getWindowDimensions(profile: ProfileData): { width: number; height: number } {
  if (profile.deviceType === 'mobile') {
    const deviceKey = profile.os === 'ios' ? 'iphone-15-pro' : 'pixel-8';
    const res = MOBILE_RESOLUTIONS[deviceKey];
    // Add space for the browser chrome UI
    return {
      width: res.width + 40,
      height: res.height + 120,
    };
  }
  return {
    width: 1280,
    height: 800,
  };
}

/**
 * Get the browser color theme
 */
function getBrowserTheme(browserType: BrowserType): { primary: string; accent: string } {
  return BROWSER_THEMES[browserType] || BROWSER_THEMES.chrome;
}

/**
 * Launch a profile in an embedded browser window.
 * This creates a BrowserWindow with an embedded webview (not a popup).
 */
export async function launchProfile(profile: ProfileData): Promise<{ success: boolean; error?: string; windowId?: number }> {
  try {
    // Check if already open
    const existing = openWindows.get(profile.id);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return { success: true, windowId: existing.id };
    }

    // Write stealth preload script
    const preloadPath = writeStealthPreload(profile);

    // Get the session partition
    const partition = getPartitionName(profile);

    // Set up the session with stealth preload
    const ses = session.fromPartition(partition);

    // NOTE: We do NOT use ses.setPreloads() here because that would apply
    // the stealth preload to ALL pages in the session, including the
    // browser-chrome.html itself. Instead, we pass the preloadPath to
    // the webview's preload attribute in browser-chrome.html.

    // Set user agent
    ses.setUserAgent(profile.fingerprint.userAgent);

    // Configure proxy if set
    if (profile.proxy) {
      const proxyConfig = profile.proxy;
      if (proxyConfig.username && proxyConfig.password) {
        // Write PAC file for authenticated proxy
        const pacContent = `
function FindProxyForURL(url, host) {
  return "${proxyConfig.type === 'socks5' ? 'SOCKS5' : proxyConfig.type === 'socks4' ? 'SOCKS4' : 'PROXY'} ${proxyConfig.host}:${proxyConfig.port}; DIRECT";
}`;
        const pacPath = path.join(PRELOAD_DIR, `proxy-${profile.id}.pac`);
        fs.writeFileSync(pacPath, pacContent, 'utf-8');
        await ses.setProxy({ pacScript: `file://${pacPath.replace(/\\/g, '/')}` });
      } else {
        const proxyRule = `${proxyConfig.type}://${proxyConfig.host}:${proxyConfig.port}`;
        await ses.setProxy({ proxyRules: proxyRule });
      }
    } else {
      // No proxy - direct connection
      await ses.setProxy({ mode: 'direct' });
    }

    // Load extensions if any
    if (profile.extensions && profile.extensions.length > 0) {
      for (const extPath of profile.extensions) {
        try {
          if (fs.existsSync(extPath)) {
            await ses.loadExtension(extPath);
          }
        } catch (extErr) {
          console.error(`Failed to load extension ${extPath}:`, extErr);
        }
      }
    }

    // Get window dimensions
    const dims = getWindowDimensions(profile);

    // Get browser theme
    const theme = getBrowserTheme(profile.browserType);

    // Create the browser window
    // IMPORTANT: The BrowserWindow itself uses the default session (no partition).
    // The webview inside browser-chrome.html uses the profile's partition.
    // This prevents the stealth preload from running on the browser-chrome.html itself.
    const win = new BrowserWindow({
      width: dims.width,
      height: dims.height,
      minWidth: 400,
      minHeight: 300,
      title: `${profile.name} - Joe Browser`,
      backgroundColor: '#1a1a2e',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
        // DO NOT set partition here - the BrowserWindow uses the default session.
        // The webview inside browser-chrome.html uses the profile's partition.
      },
    });

    // Load the browser-chrome.html with query parameters
    const chromeUrl = getBrowserChromeUrl();
    const params = new URLSearchParams({
      url: profile.launchUrl || 'https://iphey.com',
      profile: profile.id,
      profileName: encodeURIComponent(profile.name),
      browserType: profile.browserType,
      deviceType: profile.deviceType,
      themePrimary: theme.primary,
      themeAccent: theme.accent,
      isMobile: profile.deviceType === 'mobile' ? 'true' : 'false',
      preloadPath: preloadPath,
    });

    // For mobile, add device resolution
    if (profile.deviceType === 'mobile') {
      const deviceKey = profile.os === 'ios' ? 'iphone-15-pro' : 'pixel-8';
      const res = MOBILE_RESOLUTIONS[deviceKey];
      params.set('mobileWidth', res.width.toString());
      params.set('mobileHeight', res.height.toString());
    }

    await win.loadURL(`${chromeUrl}?${params.toString()}`);

    // Track the window
    openWindows.set(profile.id, win);

    // Handle window close
    win.on('closed', () => {
      openWindows.delete(profile.id);
      cleanupStealthPreload(profile.id);
    });

    // Open external links in system browser
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    return { success: true, windowId: win.id };
  } catch (error: any) {
    console.error('Failed to launch profile:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Close a running browser window for a profile
 */
export function closeProfile(profileId: string): boolean {
  const win = openWindows.get(profileId);
  if (win && !win.isDestroyed()) {
    win.close();
    openWindows.delete(profileId);
    cleanupStealthPreload(profileId);
    return true;
  }
  return false;
}

/**
 * Get all open profile IDs
 */
export function getOpenProfileIds(): string[] {
  return Array.from(openWindows.keys());
}

/**
 * Check if a profile is currently running
 */
export function isProfileRunning(profileId: string): boolean {
  const win = openWindows.get(profileId);
  return !!win && !win.isDestroyed();
}
