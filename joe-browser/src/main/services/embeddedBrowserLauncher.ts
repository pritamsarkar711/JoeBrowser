// ============================================================
// Joe Browser - Embedded Browser Launcher
// Launches profiles in a BrowserWindow with webview tag
// All critical bugs fixed: timing, contextIsolation, preload, cleanup
// ============================================================

import { BrowserWindow, app, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ProfileData, BROWSER_THEMES } from '../../shared/types';

// Track running windows by profileId
const runningWindows = new Map<string, BrowserWindow>();

/**
 * Check if a profile is currently running
 */
export function isProfileRunning(profileId: string): boolean {
  return runningWindows.has(profileId);
}

/**
 * Get all running profile IDs
 */
export function getRunningProfileIds(): string[] {
  return Array.from(runningWindows.keys());
}

/**
 * Close a running profile's browser window
 */
export function closeProfileBrowser(profileId: string): boolean {
  const win = runningWindows.get(profileId);
  if (win && !win.isDestroyed()) {
    win.close();
    return true;
  }
  runningWindows.delete(profileId);
  return false;
}

/**
 * Launch a profile in an embedded browser window
 */
export async function launchProfile(profile: ProfileData): Promise<{ success: boolean; error?: string; windowId?: number }> {
  try {
    // Check if already running
    if (runningWindows.has(profile.id)) {
      const existingWin = runningWindows.get(profile.id);
      if (existingWin && !existingWin.isDestroyed()) {
        existingWin.focus();
        return { success: true, windowId: existingWin.id };
      }
      runningWindows.delete(profile.id);
    }

    // Validate profile data
    if (!profile.id || !profile.fingerprint) {
      return { success: false, error: 'Invalid profile data: missing id or fingerprint' };
    }

    // Get browser chrome HTML path
    const chromeHtmlPath = getBrowserChromePath();
    if (!chromeHtmlPath) {
      return { success: false, error: 'Browser chrome HTML not found' };
    }

    // Build and write stealth preload script
    const preloadPath = buildAndWriteStealthPreload(profile);
    if (!preloadPath) {
      return { success: false, error: 'Failed to create stealth preload script' };
    }

    // Get theme color
    const themeInfo = BROWSER_THEMES[profile.browserType] || BROWSER_THEMES.chrome;
    const themeColor = themeInfo.primary;

    // Determine window size
    const windowSize = getWindowSize(profile);

    // Build the URL for browser-chrome.html
    const targetUrl = profile.launchUrl || 'https://www.google.com';
    const chromeUrl = buildChromeUrl(chromeHtmlPath, {
      targetUrl,
      profileId: profile.id,
      browserType: profile.browserType,
      preloadPath,
      themeColor,
    });

    // Configure proxy if set
    if (profile.proxy) {
      await configureProxy(profile.id, profile.proxy);
    }

    // Create the BrowserWindow
    const browserWindow = new BrowserWindow({
      width: windowSize.width,
      height: windowSize.height,
      minWidth: 800,
      minHeight: 600,
      title: `${themeInfo.name} - ${profile.name}`,
      backgroundColor: '#202124',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
        sandbox: false,
        // Do NOT set partition here — the BrowserWindow uses default session
        // The webview inside uses its own partition for profile isolation
      },
    });

    // Load the browser chrome
    await browserWindow.loadURL(chromeUrl);

    // Track this window
    runningWindows.set(profile.id, browserWindow);

    // Handle window close — clean up running state
    browserWindow.on('closed', () => {
      runningWindows.delete(profile.id);
      // Clean up preload script file
      try {
        if (fs.existsSync(preloadPath)) {
          fs.unlinkSync(preloadPath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    return { success: true, windowId: browserWindow.id };

  } catch (err: any) {
    console.error('[EmbeddedBrowserLauncher] Failed to launch profile:', err);
    return { success: false, error: err.message || 'Unknown error launching profile' };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the path to browser-chrome.html
 * In dev: from source directory
 * In production: from extraResources
 */
function getBrowserChromePath(): string | null {
  // Try multiple paths in order of likelihood

  // 1. In development with electron-vite: __dirname is out/main/, so go up to project root
  const devPath1 = path.join(__dirname, '..', '..', 'src', 'main', 'assets', 'browser-chrome.html');
  if (fs.existsSync(devPath1)) {
    return devPath1;
  }

  // 2. In production with electron-builder: extraResources
  const prodPath = path.join(process.resourcesPath, 'browser-chrome.html');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // 3. Using app.getAppPath() (works in dev mode)
  try {
    const appPath = app.getAppPath();
    const appPathResolve = path.join(appPath, 'src', 'main', 'assets', 'browser-chrome.html');
    if (fs.existsSync(appPathResolve)) {
      return appPathResolve;
    }
  } catch (e) {
    // Ignore
  }

  // 4. Try relative to __dirname (old style)
  const devPath2 = path.join(__dirname, '..', 'assets', 'browser-chrome.html');
  if (fs.existsSync(devPath2)) {
    return devPath2;
  }

  console.error('[EmbeddedBrowserLauncher] Could not find browser-chrome.html');
  console.error('[EmbeddedBrowserLauncher] Tried paths:');
  console.error('  -', devPath1);
  console.error('  -', prodPath);
  console.error('  -', devPath2);
  return null;
}

/**
 * Build the URL for browser-chrome.html with query parameters
 */
function buildChromeUrl(
  htmlPath: string,
  params: {
    targetUrl: string;
    profileId: string;
    browserType: string;
    preloadPath: string;
    themeColor: string;
  }
): string {
  const query = new URLSearchParams({
    targetUrl: params.targetUrl,
    profileId: params.profileId,
    browserType: params.browserType,
    preloadPath: params.preloadPath,
    theme: params.themeColor,
  }).toString();

  return `file://${htmlPath}?${query}`;
}

/**
 * Get window size based on profile device type
 */
function getWindowSize(profile: ProfileData): { width: number; height: number } {
  if (profile.deviceType === 'mobile') {
    return { width: 420, height: 900 };
  }
  return { width: 1280, height: 800 };
}

/**
 * Configure proxy for a profile's session partition
 */
async function configureProxy(
  profileId: string,
  proxy: ProfileData['proxy']
): Promise<void> {
  if (!proxy) return;

  const partitionName = `persist:joe-${profileId}`;
  const ses = session.fromPartition(partitionName);

  const proxyConfig: any = {
    mode: 'fixed_servers',
    proxyRules: `${proxy.type}://${proxy.host}:${proxy.port}`,
  };

  // For SOCKS proxies, use the correct scheme
  if (proxy.type === 'socks5') {
    proxyConfig.proxyRules = `socks5://${proxy.host}:${proxy.port}`;
  } else if (proxy.type === 'socks4') {
    proxyConfig.proxyRules = `socks4://${proxy.host}:${proxy.port}`;
  }

  await ses.setProxy(proxyConfig);
}

/**
 * Build the stealth preload script and write it to a temp file
 * Returns the absolute path to the file
 */
function buildAndWriteStealthPreload(profile: ProfileData): string | null {
  try {
    const script = buildStealthPreloadScript(profile);
    if (!script) {
      console.error('[EmbeddedBrowserLauncher] Failed to build stealth preload script');
      return null;
    }

    // Write to user data directory
    const preloadDir = path.join(app.getPath('userData'), 'stealth-preloads');
    fs.mkdirSync(preloadDir, { recursive: true });

    const preloadPath = path.join(preloadDir, `stealth-${profile.id}.js`);
    fs.writeFileSync(preloadPath, script, 'utf8');

    return preloadPath;
  } catch (err) {
    console.error('[EmbeddedBrowserLauncher] Failed to write stealth preload:', err);
    return null;
  }
}

/**
 * Build the stealth preload script content
 * This runs in the webview BEFORE the page loads
 * CRITICAL: contextIsolation must be false for this to work
 * because we need to directly override page JavaScript objects
 */
function buildStealthPreloadScript(profile: ProfileData): string | null {
  const fp = profile.fingerprint;
  if (!fp) return null;

  const browserType = profile.browserType;
  const isFirefox = browserType === 'firefox';
  const isBrave = browserType === 'brave';
  const isEdge = browserType === 'edge';

  // Firefox-specific overrides
  const firefoxOverrides = isFirefox ? `
    // Firefox uses empty vendor string
    Object.defineProperty(navigator, 'vendor', { get: () => '' });

    // Firefox doesn't have chrome object
    if (window.chrome) {
      try { delete window.chrome; } catch(e) {}
    }

    // Firefox has different connection properties
    Object.defineProperty(navigator, 'connection', {
      get: () => undefined
    });

    // Firefox doesn't have getBattery
    if (navigator.getBattery) {
      try { delete navigator.getBattery; } catch(e) {}
    }
  ` : '';

  // Brave-specific overrides
  const braveOverrides = isBrave ? `
    // Brave has its own chrome.brave object
    if (window.chrome) {
      try {
        Object.defineProperty(window.chrome, 'brave', {
          get: () => ({
            isBrave: () => Promise.resolve(true),
            getBraveCoreVersion: () => Promise.resolve('1.60.114'),
            getPDFViewerDetails: () => Promise.resolve({ viewer: 'brave' }),
          })
        });
      } catch(e) {}
    }
  ` : '';

  // Edge-specific overrides
  const edgeOverrides = isEdge ? `
    // Edge has its own chrome.edge object (in some versions)
    // Edge UA has "Edg/" suffix
  ` : '';

  // WebRTC policy
  const webrtcPolicy = fp.webRtcPolicy === 'disable' ? `
    // Disable WebRTC entirely
    if (window.RTCPeerConnection) {
      try { delete window.RTCPeerConnection; } catch(e) {}
    }
    if (window.webkitRTCPeerConnection) {
      try { delete window.webkitRTCPeerConnection; } catch(e) {}
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try { delete navigator.mediaDevices.getUserMedia; } catch(e) {}
    }
  ` : fp.webRtcPolicy === 'proxy' ? `
    // Proxy WebRTC — use default public interface only
    if (window.RTCPeerConnection) {
      const OrigRTC = window.RTCPeerConnection;
      window.RTCPeerConnection = function(...args) {
        if (args[0]) {
          args[0].iceTransportPolicy = 'all';
        }
        return new OrigRTC(...args);
      };
      window.RTCPeerConnection.prototype = OrigRTC.prototype;
    }
  ` : '';

  // Build the full script
  const script = `
// ============================================================
// JoeBrowser Stealth Preload Script
// Profile: ${profile.name} (${browserType})
// Generated: ${new Date().toISOString()}
// ============================================================
(function() {
  'use strict';

  // Prevent re-running
  if (window.__joeStealthApplied) return;
  window.__joeStealthApplied = true;

  // ===== NAVIGATOR OVERRIDES =====
  try {
    Object.defineProperty(navigator, 'userAgent', { get: () => ${JSON.stringify(fp.userAgent)} });
    Object.defineProperty(navigator, 'platform', { get: () => ${JSON.stringify(fp.platform)} });
    Object.defineProperty(navigator, 'vendor', { get: () => ${JSON.stringify(fp.vendor)} });
    Object.defineProperty(navigator, 'language', { get: () => ${JSON.stringify(fp.language)} });
    Object.defineProperty(navigator, 'languages', { get: () => ${JSON.stringify(fp.languages)} });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.hardwareConcurrency} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => ${fp.maxTouchPoints} });
    Object.defineProperty(navigator, 'cookieEnabled', { get: () => true });
    Object.defineProperty(navigator, 'doNotTrack', { get: () => null });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => {
      const arr = [];
      arr.item = (i) => arr[i] || null;
      arr.namedItem = (name) => arr.find(p => p.name === name) || null;
      arr.refresh = () => {};
      return arr;
    }});
    Object.defineProperty(navigator, 'mimeTypes', { get: () => {
      const arr = [];
      arr.item = (i) => arr[i] || null;
      arr.namedItem = (name) => arr.find(m => m.type === name) || null;
      return arr;
    }});
  } catch(e) { console.warn('Navigator override failed:', e); }

  // ===== SCREEN OVERRIDES =====
  try {
    const screenRes = ${JSON.stringify(fp.screenResolution)}.split('x');
    const availRes = ${JSON.stringify(fp.availableScreenResolution)}.split('x');
    Object.defineProperty(screen, 'width', { get: () => parseInt(screenRes[0]) });
    Object.defineProperty(screen, 'height', { get: () => parseInt(screenRes[1]) });
    Object.defineProperty(screen, 'availWidth', { get: () => parseInt(availRes[0]) });
    Object.defineProperty(screen, 'availHeight', { get: () => parseInt(availRes[1]) });
    Object.defineProperty(screen, 'colorDepth', { get: () => ${fp.colorDepth} });
    Object.defineProperty(screen, 'pixelDepth', { get: () => ${fp.colorDepth} });
  } catch(e) { console.warn('Screen override failed:', e); }

  // ===== TIMEZONE OVERRIDE =====
  try {
    const origDateTimeFormat = Intl.DateTimeFormat;
    const targetTimezone = ${JSON.stringify(fp.timezone)};
    Intl.DateTimeFormat = function(...args) {
      if (args.length === 0 || !args[1]) {
        args[1] = { timeZone: targetTimezone };
      } else if (!args[1].timeZone) {
        args[1].timeZone = targetTimezone;
      }
      return new origDateTimeFormat(...args);
    };
    Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = origDateTimeFormat.supportedLocalesOf;
  } catch(e) { console.warn('Timezone override failed:', e); }

  // ===== WEBGL OVERRIDES =====
  try {
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      // UNMASKED_VENDOR_WEBGL = 0x9245
      if (param === 0x9245) return ${JSON.stringify(fp.webglVendor)};
      // UNMASKED_RENDERER_WEBGL = 0x9246
      if (param === 0x9246) return ${JSON.stringify(fp.webglRenderer)};
      return origGetParam.call(this, param);
    };
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        if (param === 0x9245) return ${JSON.stringify(fp.webglVendor)};
        if (param === 0x9246) return ${JSON.stringify(fp.webglRenderer)};
        return origGetParam2.call(this, param);
      };
    }
  } catch(e) { console.warn('WebGL override failed:', e); }

  // ===== CANVAS NOISE =====
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    const canvasNoise = ${fp.canvasNoise};

    const addNoise = (data) => {
      // Apply subtle noise to canvas data
      const noisy = new Uint8ClampedArray(data);
      for (let i = 0; i < noisy.length; i += 4) {
        noisy[i] = Math.max(0, Math.min(255, noisy[i] + (Math.random() - 0.5) * canvasNoise));
        noisy[i+1] = Math.max(0, Math.min(255, noisy[i+1] + (Math.random() - 0.5) * canvasNoise));
        noisy[i+2] = Math.max(0, Math.min(255, noisy[i+2] + (Math.random() - 0.5) * canvasNoise));
      }
      return noisy;
    };

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      try {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          const imgData = ctx.getImageData(0, 0, this.width, this.height);
          const noisy = addNoise(imgData.data);
          ctx.putImageData(new ImageData(noisy, this.width, this.height), 0, 0);
        }
      } catch(e) {}
      return origToDataURL.apply(this, args);
    };
  } catch(e) { console.warn('Canvas noise failed:', e); }

  // ===== AUDIO NOISE =====
  try {
    const audioNoise = ${fp.audioNoise};
    if (audioNoise > 0 && typeof AudioContext !== 'undefined') {
      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(channel) {
        const data = origGetChannelData.call(this, channel);
        for (let i = 0; i < data.length; i += 100) {
          data[i] += (Math.random() - 0.5) * audioNoise * 0.0001;
        }
        return data;
      };
    }
  } catch(e) { console.warn('Audio noise failed:', e); }

  // ===== CHROME OBJECT =====
  try {
    if (!window.chrome) {
      window.chrome = {};
    }
    if (!window.chrome.runtime) {
      window.chrome.runtime = {
        connect: function() {},
        sendMessage: function() {},
        onMessage: { addListener: function() {} },
      };
    }
  } catch(e) {}

  // ===== PREVENT AUTOMATION DETECTION =====
  try {
    // Remove CDC properties
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

    // Override document.$cdc_ variables
    const cdcKeys = Object.keys(document).filter(k => k.startsWith('$cdc_'));
    cdcKeys.forEach(k => { try { delete document[k]; } catch(e) {} });

    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Override permissions query
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = function(parameters) {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return origQuery.call(this, parameters);
    };
  } catch(e) {}

  // ===== BROWSER-SPECIFIC OVERRIDES =====
  ${firefoxOverrides}
  ${braveOverrides}
  ${edgeOverrides}

  // ===== WEBRTC POLICY =====
  ${webrtcPolicy}

  // ===== IFRAME CONTENT WINDOW OVERRIDE =====
  try {
    const origContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (origContentWindow) {
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get: function() {
          const win = origContentWindow.get.call(this);
          if (win) {
            try {
              Object.defineProperty(win.navigator, 'userAgent', { get: () => ${JSON.stringify(fp.userAgent)} });
            } catch(e) {}
          }
          return win;
        }
      });
    }
  } catch(e) {}

  console.log('[JoeBrowser] Stealth fingerprint applied for profile: ${profile.name}');

})();
`;

  return script;
}
