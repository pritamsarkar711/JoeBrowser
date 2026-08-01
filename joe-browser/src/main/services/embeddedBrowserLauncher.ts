// ============================================================
// Joe Browser - Embedded Browser Launcher
// Launches profiles in embedded BrowserWindow with webview
// ALL bugs fixed: webview loading, stealth injection, browser types
// ============================================================

import { app, BrowserWindow, session, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { ProfileData, BROWSER_THEMES, MOBILE_RESOLUTIONS, BrowserType } from '../../shared/types';

// Track open browser windows
const openWindows = new Map<string, BrowserWindow>();

// Store stealth scripts per profile (keyed by profile ID)
const stealthScripts = new Map<string, string>();

// Directory for proxy PAC files
const PRELOAD_DIR = path.join(app.getPath('userData'), 'stealth-preloads');

// ===== Register stealth injection handler ONCE at module level =====
// This intercepts webview webContents creation and injects stealth scripts
app.on('web-contents-created', (event, contents) => {
  // Only process webview webContents
  if (contents.getType() !== 'webview') return;

  const webviewPartition = contents.session?.partition || '';
  // Only process partitions that belong to our profiles
  if (!webviewPartition.startsWith('persist:joe-')) return;

  // Extract profile ID from partition name
  const profileId = webviewPartition.replace('persist:joe-', '');

  console.log(`[JoeBrowser] Webview webContents created for profile: ${profileId}`);

  // Inject stealth script on every navigation
  contents.on('did-navigate', () => {
    const script = stealthScripts.get(profileId);
    if (script) {
      contents.executeJavaScript(script)
        .catch((err: Error) => console.error('[JoeBrowser] Stealth injection failed:', err.message));
    }
  });

  // Also inject on in-page navigation
  contents.on('did-navigate-in-page', () => {
    const script = stealthScripts.get(profileId);
    if (script) {
      contents.executeJavaScript(script)
        .catch((err: Error) => console.error('[JoeBrowser] Stealth injection (in-page) failed:', err.message));
    }
  });

  // Inject on dom-ready for the first load
  contents.on('dom-ready', () => {
    const script = stealthScripts.get(profileId);
    if (script) {
      contents.executeJavaScript(script)
        .catch((err: Error) => console.error('[JoeBrowser] Stealth injection (dom-ready) failed:', err.message));
    }
  });
});

/**
 * Build the stealth injection script that runs in the webview.
 * This script runs AFTER the page loads via executeJavaScript.
 * It's NOT a preload script - it's injected into the page context.
 */
function buildStealthScript(profile: ProfileData): string {
  const fp = profile.fingerprint;

  return `
(function() {
  'use strict';

  // ---- Navigator Overrides ----
  try {
    var overrides = {
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

    for (var key in overrides) {
      try {
        Object.defineProperty(Navigator.prototype, key, {
          get: function() { return overrides[key]; },
          configurable: true,
        });
      } catch (e) {
        try { navigator[key] = overrides[key]; } catch (e2) {}
      }
    }

    ${fp.browserType !== 'firefox' ? `
    try {
      Object.defineProperty(Navigator.prototype, 'plugins', {
        get: function() {
          var p = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          p.length = 3;
          return p;
        },
        configurable: true,
      });
    } catch (e) {}` : ''}
  } catch (e) {}

  // ---- Screen Overrides ----
  try {
    var res = ${JSON.stringify(fp.screenResolution)}.split('x');
    var availRes = ${JSON.stringify(fp.availableScreenResolution)}.split('x');
    var screenOverrides = {
      width: parseInt(res[0]),
      height: parseInt(res[1]),
      availWidth: parseInt(availRes[0]),
      availHeight: parseInt(availRes[1]),
      colorDepth: ${fp.colorDepth},
      pixelDepth: ${fp.colorDepth},
    };
    for (var key in screenOverrides) {
      try {
        Object.defineProperty(Screen.prototype, key, {
          get: function() { return screenOverrides[key]; },
          configurable: true,
        });
      } catch (e) {}
    }
  } catch (e) {}

  // ---- WebGL Overrides ----
  try {
    var handler = {
      apply: function(target, thisArg, args) {
        if (args[0] === 0x9245) return ${JSON.stringify(fp.webglVendor)};
        if (args[0] === 0x9246) return ${JSON.stringify(fp.webglRenderer)};
        return Reflect.apply(target, thisArg, args);
      }
    };
    var orig1 = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = new Proxy(orig1, handler);
    if (typeof WebGL2RenderingContext !== 'undefined') {
      var orig2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = new Proxy(orig2, handler);
    }
  } catch (e) {}

  // ---- Canvas Noise ----
  try {
    var noise = ${fp.canvasNoise};
    var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      var ctx = this.getContext('2d');
      if (ctx) {
        try {
          var img = ctx.getImageData(0, 0, this.width, this.height);
          for (var i = 0; i < img.data.length; i += 4) {
            img.data[i] = Math.min(255, Math.max(0, img.data[i] + (Math.random() - 0.5) * noise * 255));
          }
          ctx.putImageData(img, 0, 0);
        } catch (e) {}
      }
      return origToDataURL.apply(this, arguments);
    };
  } catch (e) {}

  // ---- Audio Noise ----
  try {
    var noise = ${fp.audioNoise};
    var origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(channel) {
      var data = origGetChannelData.call(this, channel);
      if (!this._joeNoised) {
        for (var i = 0; i < data.length; i += 100) {
          data[i] += (Math.random() - 0.5) * noise;
        }
        this._joeNoised = true;
      }
      return data;
    };
  } catch (e) {}

  // ---- WebRTC ----
  try {
    var policy = ${JSON.stringify(fp.webRtcPolicy)};
    if (policy === 'disable') {
      window.RTCPeerConnection = function() { return null; };
      window.webkitRTCPeerConnection = function() { return null; };
    }
  } catch (e) {}

  // ---- Timezone ----
  try {
    var tz = ${JSON.stringify(fp.timezone)};
    var OrigDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locale, options) {
      options = options || {};
      options.timeZone = options.timeZone || tz;
      return new OrigDateTimeFormat(locale, options);
    };
    Intl.DateTimeFormat.prototype = OrigDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = OrigDateTimeFormat.supportedLocalesOf;
  } catch (e) {}

  // ---- Brave-specific ----
  ${fp.browserType === 'brave' ? `
  try {
    Object.defineProperty(window, 'brave', {
      value: { isBrave: function() { return Promise.resolve(true); }, braveShields: { getDetails: function() { return Promise.resolve({ shieldsUp: true }); } } },
      configurable: true, writable: true,
    });
  } catch (e) {}` : ''}

  // ---- Firefox-specific ----
  ${fp.browserType === 'firefox' ? `
  try { if (window.chrome) delete window.chrome; } catch (e) {}` : ''}

  // ---- Edge-specific ----
  ${fp.browserType === 'edge' ? `
  try {
    Object.defineProperty(Navigator.prototype, 'brave', { get: function() { return undefined; }, configurable: true });
  } catch (e) {}` : ''}

})();
`;
}

/**
 * Clean up a specific stealth script
 */
export function cleanupStealthPreload(profileId: string): void {
  try {
    stealthScripts.delete(profileId);
    const pacPath = path.join(PRELOAD_DIR, `proxy-${profileId}.pac`);
    if (fs.existsSync(pacPath)) fs.unlinkSync(pacPath);
  } catch (e) {
    console.error('Failed to cleanup stealth script:', e);
  }
}

/**
 * Clean up all stealth scripts
 */
export function cleanupAllPreloads(): void {
  try {
    stealthScripts.clear();
    if (fs.existsSync(PRELOAD_DIR)) {
      const files = fs.readdirSync(PRELOAD_DIR);
      for (const file of files) {
        if (file.startsWith('proxy-')) {
          fs.unlinkSync(path.join(PRELOAD_DIR, file));
        }
      }
    }
  } catch (e) {
    console.error('Failed to cleanup scripts:', e);
  }
}

/**
 * Get the browser-chrome.html path - tries multiple locations
 */
function getBrowserChromePath(): string {
  // 1. Development: relative to the compiled main/index.js
  const devPath = path.join(__dirname, '..', 'assets', 'browser-chrome.html');
  if (fs.existsSync(devPath)) return devPath;

  // 2. Production: extraResources (electron-builder copies it here)
  const prodPath = path.join(process.resourcesPath, 'browser-chrome.html');
  if (fs.existsSync(prodPath)) return prodPath;

  // 3. Fallback: try relative to app path
  const appPath = path.join(app.getAppPath(), 'src', 'main', 'assets', 'browser-chrome.html');
  if (fs.existsSync(appPath)) return appPath;

  throw new Error('browser-chrome.html not found! Searched: ' + devPath + ', ' + prodPath + ', ' + appPath);
}

/**
 * Get the file:// URL for browser-chrome.html
 */
function getBrowserChromeUrl(): string {
  const htmlPath = getBrowserChromePath();
  const normalized = htmlPath.replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
}

/**
 * Get the session partition name for a profile
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
    return { width: res.width + 40, height: res.height + 120 };
  }
  return { width: 1280, height: 800 };
}

/**
 * Get the browser color theme
 */
function getBrowserTheme(browserType: BrowserType): { primary: string; accent: string } {
  return BROWSER_THEMES[browserType] || BROWSER_THEMES.chrome;
}

/**
 * Launch a profile in an embedded browser window.
 * 
 * Architecture:
 * - BrowserWindow loads browser-chrome.html (the browser UI)
 * - browser-chrome.html creates a <webview> tag for the actual page
 * - The webview uses the profile's isolated session partition
 * - Stealth injection is done via executeJavaScript from main process
 *   using the 'did-navigate' event on the webview's webContents
 */
export async function launchProfile(profile: ProfileData): Promise<{ success: boolean; error?: string; windowId?: number }> {
  try {
    // Check if already open
    const existing = openWindows.get(profile.id);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return { success: true, windowId: existing.id };
    }

    // Build and store the stealth script for this profile
    const stealthScriptContent = buildStealthScript(profile);
    stealthScripts.set(profile.id, stealthScriptContent);

    // Get the session partition
    const partition = getPartitionName(profile);

    // Set up the session for the webview
    const ses = session.fromPartition(partition);

    // Set user agent on the session
    ses.setUserAgent(profile.fingerprint.userAgent);

    // Configure proxy if set
    if (profile.proxy) {
      const proxyConfig = profile.proxy;
      if (proxyConfig.username && proxyConfig.password) {
        const pacContent = `function FindProxyForURL(url, host) { return "${proxyConfig.type === 'socks5' ? 'SOCKS5' : proxyConfig.type === 'socks4' ? 'SOCKS4' : 'PROXY'} ${proxyConfig.host}:${proxyConfig.port}; DIRECT"; }`;
        if (!fs.existsSync(PRELOAD_DIR)) fs.mkdirSync(PRELOAD_DIR, { recursive: true });
        const pacPath = path.join(PRELOAD_DIR, `proxy-${profile.id}.pac`);
        fs.writeFileSync(pacPath, pacContent, 'utf-8');
        const pacUrl = pacPath.replace(/\\/g, '/');
        await ses.setProxy({ pacScript: `file://${pacUrl.startsWith('/') ? '' : '/'}${pacUrl}` });
      } else {
        const proxyRule = `${proxyConfig.type}://${proxyConfig.host}:${proxyConfig.port}`;
        await ses.setProxy({ proxyRules: proxyRule });
      }
    } else {
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
        // No partition here - BrowserWindow uses default session
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
    });

    // For mobile, add device resolution
    if (profile.deviceType === 'mobile') {
      const deviceKey = profile.os === 'ios' ? 'iphone-15-pro' : 'pixel-8';
      const res = MOBILE_RESOLUTIONS[deviceKey];
      params.set('mobileWidth', res.width.toString());
      params.set('mobileHeight', res.height.toString());
    }

    const fullUrl = `${chromeUrl}?${params.toString()}`;
    console.log(`[JoeBrowser] Launching profile: ${profile.name} (${profile.browserType})`);
    console.log(`[JoeBrowser] Target URL: ${profile.launchUrl || 'https://iphey.com'}`);
    console.log(`[JoeBrowser] Partition: ${partition}`);

    await win.loadURL(fullUrl);

    // Track the window
    openWindows.set(profile.id, win);

    // Handle window close
    win.on('closed', () => {
      openWindows.delete(profile.id);
      cleanupStealthPreload(profile.id);
    });

    // Prevent new windows from the BrowserWindow itself
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    return { success: true, windowId: win.id };
  } catch (error: any) {
    console.error('[JoeBrowser] Failed to launch profile:', error);
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
