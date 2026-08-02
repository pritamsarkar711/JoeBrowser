// ============================================================
// Joe Browser - Real Browser Launcher
// Launches ACTUAL Chrome/Brave/Edge/Firefox/Chromium processes
// with custom profiles, stealth extensions, and proxy support
// ============================================================

import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { ProfileData, BrowserType } from '../../shared/types';

// Track running browser processes by profileId
const runningProcesses = new Map<string, ChildProcess>();

/**
 * Check if a profile is currently running
 */
export function isProfileRunning(profileId: string): boolean {
  return runningProcesses.has(profileId);
}

/**
 * Get all running profile IDs
 */
export function getRunningProfileIds(): string[] {
  return Array.from(runningProcesses.keys());
}

/**
 * Close a running profile's browser
 */
export function closeProfileBrowser(profileId: string): boolean {
  const proc = runningProcesses.get(profileId);
  if (proc && !proc.killed) {
    proc.kill();
    runningProcesses.delete(profileId);
    return true;
  }
  runningProcesses.delete(profileId);
  return false;
}

/**
 * Launch a profile in a REAL browser
 */
export async function launchProfile(profile: ProfileData): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already running
    if (runningProcesses.has(profile.id)) {
      return { success: true };
    }

    if (!profile.id || !profile.fingerprint) {
      return { success: false, error: 'Invalid profile data' };
    }

    // Auto-detect timezone from proxy if proxy is set
    if (profile.proxy) {
      await autoDetectTimezoneFromProxy(profile);
    }

    // Create profile directory
    const profileDir = createProfileDirectory(profile);
    if (!profileDir) {
      return { success: false, error: 'Failed to create profile directory' };
    }

    // Create stealth extension for this profile
    const extensionDir = createStealthExtension(profile);
    if (!extensionDir) {
      return { success: false, error: 'Failed to create stealth extension' };
    }

    // Find the browser executable
    const browserPath = findBrowserExecutable(profile.browserType);
    if (!browserPath) {
      return { success: false, error: `${getBrowserName(profile.browserType)} not found. Please install it first.` };
    }

    // Build launch arguments
    const args = buildLaunchArguments(profile, profileDir, extensionDir);

    // Launch the browser
    const proc = spawn(browserPath, args, {
      detached: false,
      stdio: 'ignore',
    });

    if (!proc.pid) {
      return { success: false, error: 'Failed to start browser process' };
    }

    // Track the process
    runningProcesses.set(profile.id, proc);

    // Handle process exit
    proc.on('exit', () => {
      runningProcesses.delete(profile.id);
    });

    proc.on('error', (err) => {
      console.error(`[RealBrowserLauncher] Process error for ${profile.id}:`, err);
      runningProcesses.delete(profile.id);
    });

    return { success: true };

  } catch (err: any) {
    console.error('[RealBrowserLauncher] Failed to launch profile:', err);
    return { success: false, error: err.message || 'Unknown error launching profile' };
  }
}

// ============================================================
// BROWSER EXECUTABLE FINDER
// ============================================================

function findBrowserExecutable(browserType: BrowserType): string | null {
  const platform = process.platform;

  const paths: Record<string, Record<string, string[]>> = {
    win32: {
      chrome: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      ],
      brave: [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
      ],
      edge: [
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ],
      firefox: [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      ],
      chromium: [
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Chromium\\Application\\chrome.exe'),
      ],
    },
    darwin: {
      chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      brave: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
      edge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      firefox: ['/Applications/Firefox.app/Contents/MacOS/firefox'],
      chromium: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
    },
    linux: {
      chrome: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chrome'],
      brave: ['/usr/bin/brave-browser', '/usr/bin/brave-browser-stable', '/usr/bin/brave'],
      edge: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/microsoft-edge-dev'],
      firefox: ['/usr/bin/firefox', '/usr/bin/firefox-esr', '/snap/bin/firefox'],
      chromium: ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/chromium-dev'],
    },
  };

  const platformPaths = paths[platform];
  if (!platformPaths) return null;

  const browserPaths = platformPaths[browserType];
  if (!browserPaths) return null;

  for (const p of browserPaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

function getBrowserName(browserType: BrowserType): string {
  const names: Record<BrowserType, string> = {
    chrome: 'Google Chrome',
    brave: 'Brave Browser',
    firefox: 'Mozilla Firefox',
    edge: 'Microsoft Edge',
    chromium: 'Chromium',
  };
  return names[browserType] || browserType;
}

// ============================================================
// LAUNCH ARGUMENTS
// ============================================================

function buildLaunchArguments(profile: ProfileData, profileDir: string, extensionDir: string): string[] {
  const isFirefox = profile.browserType === 'firefox';
  const args: string[] = [];

  if (isFirefox) {
    // Firefox-specific arguments
    args.push('-profile', profileDir);
    args.push('-no-remote'); // Don't reuse existing Firefox instance
    args.push('-new-instance');

    // Set launch URL
    if (profile.launchUrl) {
      args.push(profile.launchUrl);
    }

    // Proxy configuration for Firefox
    if (profile.proxy) {
      // Firefox proxy is set via user.js in the profile directory
      createFirefoxProxyConfig(profileDir, profile.proxy);
    }
  } else {
    // Chrome/Chromium/Brave/Edge arguments
    args.push(`--user-data-dir=${profileDir}`);
    args.push(`--load-extension=${extensionDir}`);
    args.push('--no-first-run');
    args.push('--no-default-browser-check');
    args.push('--disable-background-networking');
    args.push('--disable-client-side-phishing-detection');
    args.push('--disable-default-apps');
    args.push('--disable-hang-monitor');
    args.push('--disable-popup-blocking');
    args.push('--disable-prompt-on-repost');
    args.push('--disable-sync');
    args.push('--disable-web-security');
    args.push('--metrics-recording-only');
    args.push('--safebrowsing-disable-auto-update');

    // Set user agent
    if (profile.fingerprint.userAgent) {
      args.push(`--user-agent=${profile.fingerprint.userAgent}`);
    }

    // Set window size for mobile emulation
    if (profile.deviceType === 'mobile') {
      const screenRes = profile.fingerprint.screenResolution.split('x');
      args.push(`--window-size=${screenRes[0]},${screenRes[1]}`);
    }

    // Proxy configuration
    if (profile.proxy) {
      const proxyUrl = `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`;
      args.push(`--proxy-server=${proxyUrl}`);

      // Proxy authentication via extension
      if (profile.proxy.username && profile.proxy.password) {
        createProxyAuthExtension(profileDir, profile.proxy);
      }
    }

    // Launch URL
    if (profile.launchUrl) {
      args.push(profile.launchUrl);
    }
  }

  return args;
}

// ============================================================
// PROFILE DIRECTORY MANAGEMENT
// ============================================================

function createProfileDirectory(profile: ProfileData): string | null {
  try {
    const baseDir = path.join(app.getPath('userData'), 'browser-profiles', profile.id);
    fs.mkdirSync(baseDir, { recursive: true });

    if (profile.browserType === 'firefox') {
      // Create Firefox-specific profile files
      createFirefoxUserPrefs(baseDir, profile);
    }

    return baseDir;
  } catch (err) {
    console.error('[RealBrowserLauncher] Failed to create profile directory:', err);
    return null;
  }
}

function createFirefoxUserPrefs(profileDir: string, profile: ProfileData): void {
  const fp = profile.fingerprint;
  const prefsPath = path.join(profileDir, 'user.js');

  let prefs = `// JoeBrowser Firefox Preferences - ${profile.name}\n`;
  prefs += `user_pref("general.useragent.override", "${fp.userAgent}");\n`;
  prefs += `user_pref("intl.locale.requested", "${fp.language}");\n`;
  prefs += `user_pref("privacy.resistFingerprinting", false);\n`;
  prefs += `user_pref("webgl.renderer-string-override", "${fp.webglRenderer}");\n`;
  prefs += `user_pref("webgl.vendor-string-override", "${fp.webglVendor}");\n`;
  prefs += `user_pref("device.sensors.enabled", false);\n`;
  prefs += `user_pref("dom.webaudio.enabled", true);\n`;
  prefs += `user_pref("media.navigator.enabled", true);\n`;
  prefs += `user_pref("media.peerconnection.enabled", ${fp.webRtcPolicy !== 'disable'});\n`;
  prefs += `user_pref("network.cookie.cookieBehavior", 0);\n`;
  prefs += `user_pref("privacy.donottrackheader.enabled", false);\n`;
  prefs += `user_pref("dom.maxHardwareConcurrency", ${fp.hardwareConcurrency});\n`;
  prefs += `user_pref("browser.startup.homepage", "${profile.launchUrl || 'https://www.google.com'}");\n`;
  prefs += `user_pref("browser.cache.disk.enable", true);\n`;
  prefs += `user_pref("browser.cache.memory.enable", true);\n`;
  prefs += `user_pref("browser.display.use_document_fonts", 1);\n`;
  prefs += `user_pref("browser.shell.checkDefaultBrowser", false);\n`;
  prefs += `user_pref("browser.startup.page", 1);\n`;
  prefs += `user_pref("datareporting.policy.dataSubmissionEnabled", false);\n`;
  prefs += `user_pref("toolkit.telemetry.enabled", false);\n`;
  prefs += `user_pref("toolkit.telemetry.unified", false);\n`;

  fs.writeFileSync(prefsPath, prefs, 'utf8');
}

function createFirefoxProxyConfig(profileDir: string, proxy: ProfileData['proxy']): void {
  if (!proxy) return;

  const prefsPath = path.join(profileDir, 'user.js');
  const existing = fs.existsSync(prefsPath) ? fs.readFileSync(prefsPath, 'utf8') : '';

  let proxyPrefs = existing + '\n// Proxy Configuration\n';

  switch (proxy.type) {
    case 'http':
      proxyPrefs += `user_pref("network.proxy.type", 1);\n`;
      proxyPrefs += `user_pref("network.proxy.http", "${proxy.host}");\n`;
      proxyPrefs += `user_pref("network.proxy.http_port", ${proxy.port});\n`;
      proxyPrefs += `user_pref("network.proxy.ssl", "${proxy.host}");\n`;
      proxyPrefs += `user_pref("network.proxy.ssl_port", ${proxy.port});\n`;
      break;
    case 'socks4':
      proxyPrefs += `user_pref("network.proxy.type", 1);\n`;
      proxyPrefs += `user_pref("network.proxy.socks", "${proxy.host}");\n`;
      proxyPrefs += `user_pref("network.proxy.socks_port", ${proxy.port});\n`;
      proxyPrefs += `user_pref("network.proxy.socks_version", 4);\n`;
      break;
    case 'socks5':
      proxyPrefs += `user_pref("network.proxy.type", 1);\n`;
      proxyPrefs += `user_pref("network.proxy.socks", "${proxy.host}");\n`;
      proxyPrefs += `user_pref("network.proxy.socks_port", ${proxy.port});\n`;
      proxyPrefs += `user_pref("network.proxy.socks_version", 5);\n`;
      break;
    case 'https':
      proxyPrefs += `user_pref("network.proxy.type", 1);\n`;
      proxyPrefs += `user_pref("network.proxy.http", "${proxy.host}");\n`;
      proxyPrefs += `user_pref("network.proxy.http_port", ${proxy.port});\n`;
      proxyPrefs += `user_pref("network.proxy.ssl", "${proxy.host}");\n`;
      proxyPrefs += `user_pref("network.proxy.ssl_port", ${proxy.port});\n`;
      break;
  }

  if (proxy.username) {
    proxyPrefs += `user_pref("network.proxy.share_proxy_settings", true);\n`;
    // Firefox doesn't support proxy auth in prefs directly — need extension
    // We'll handle this via the stealth extension
  }

  proxyPrefs += `user_pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1");\n`;

  fs.writeFileSync(prefsPath, proxyPrefs, 'utf8');
}

// ============================================================
// STEALTH EXTENSION CREATION
// ============================================================

function createStealthExtension(profile: ProfileData): string | null {
  try {
    const isFirefox = profile.browserType === 'firefox';
    const extDir = path.join(app.getPath('userData'), 'browser-profiles', profile.id, 'joe-stealth-extension');
    fs.mkdirSync(extDir, { recursive: true });

    if (isFirefox) {
      // Copy Firefox extension files
      const sourceDir = path.join(__dirname, '..', '..', 'main', 'extensions', 'firefox');
      if (!copyExtensionFiles(sourceDir, extDir)) {
        // Fallback: create extension files directly
        createFirefoxExtensionFiles(extDir, profile);
      }
    } else {
      // Copy Chrome extension files
      const sourceDir = path.join(__dirname, '..', '..', 'main', 'extensions', 'chrome');
      if (!copyExtensionFiles(sourceDir, extDir)) {
        // Fallback: create extension files directly
        createChromeExtensionFiles(extDir, profile);
      }
    }

    // Create fingerprint data file that the extension will read
    createFingerprintDataFile(extDir, profile);

    return extDir;
  } catch (err) {
    console.error('[RealBrowserLauncher] Failed to create stealth extension:', err);
    return null;
  }
}

function copyExtensionFiles(sourceDir: string, targetDir: string): boolean {
  try {
    if (!fs.existsSync(sourceDir)) return false;

    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      const src = path.join(sourceDir, file);
      const dst = path.join(targetDir, file);
      fs.copyFileSync(src, dst);
    }
    return true;
  } catch (err) {
    return false;
  }
}

function createChromeExtensionFiles(extDir: string, profile: ProfileData): void {
  // manifest.json
  const manifest = {
    manifest_version: 3,
    name: 'JoeBrowser Stealth',
    version: '1.0.0',
    description: 'Anti-detect fingerprint injection',
    content_scripts: [{
      matches: ['<all_urls>'],
      js: ['fingerprint-data.js', 'content.js'],
      run_at: 'document_start',
      world: 'MAIN',
    }],
    permissions: [],
    incognito: 'split',
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // content.js — same as the extension source
  const sourceContentPath = path.join(__dirname, '..', '..', 'main', 'extensions', 'chrome', 'content.js');
  if (fs.existsSync(sourceContentPath)) {
    fs.copyFileSync(sourceContentPath, path.join(extDir, 'content.js'));
  } else {
    // Create minimal content.js
    fs.writeFileSync(path.join(extDir, 'content.js'), getChromeContentScript(), 'utf8');
  }
}

function createFirefoxExtensionFiles(extDir: string, profile: ProfileData): void {
  // manifest.json
  const manifest = {
    manifest_version: 2,
    name: 'JoeBrowser Stealth',
    version: '1.0.0',
    description: 'Anti-detect fingerprint injection for Firefox',
    content_scripts: [{
      matches: ['<all_urls>'],
      js: ['content.js'],
      run_at: 'document_start',
    }],
    web_accessible_resources: ['inject.js', 'fingerprint-data.js'],
    incognito: 'spanning',
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // content.js — injects scripts into main world
  const contentScript = `
(function() {
  'use strict';
  // Inject fingerprint data first
  const fpScript = document.createElement('script');
  fpScript.src = browser.runtime.getURL('fingerprint-data.js');
  (document.head || document.documentElement).appendChild(fpScript);
  fpScript.onload = () => fpScript.remove();

  // Then inject the stealth script
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
})();
`;
  fs.writeFileSync(path.join(extDir, 'content.js'), contentScript, 'utf8');

  // inject.js — same as the extension source
  const sourceInjectPath = path.join(__dirname, '..', '..', 'main', 'extensions', 'firefox', 'inject.js');
  if (fs.existsSync(sourceInjectPath)) {
    fs.copyFileSync(sourceInjectPath, path.join(extDir, 'inject.js'));
  } else {
    // Create minimal inject.js
    fs.writeFileSync(path.join(extDir, 'inject.js'), getFirefoxInjectScript(), 'utf8');
  }
}

function createFingerprintDataFile(extDir: string, profile: ProfileData): void {
  const fp = profile.fingerprint;
  const data = `window.__JOE_FINGERPRINT__ = ${JSON.stringify(fp)};`;
  fs.writeFileSync(path.join(extDir, 'fingerprint-data.js'), data, 'utf8');
}

function getChromeContentScript(): string {
  return `
(function() {
  'use strict';
  const fp = window.__JOE_FINGERPRINT__;
  if (!fp) return;
  if (window.__joeStealthApplied) return;
  window.__joeStealthApplied = true;
  try {
    Object.defineProperty(navigator, 'userAgent', { get: () => fp.userAgent });
    Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
    Object.defineProperty(navigator, 'vendor', { get: () => fp.vendor });
    Object.defineProperty(navigator, 'languages', { get: () => fp.languages });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => fp.maxTouchPoints });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  } catch(e) {}
  try {
    const sr = fp.screenResolution.split('x');
    const ar = fp.availableScreenResolution.split('x');
    Object.defineProperty(screen, 'width', { get: () => parseInt(sr[0]) });
    Object.defineProperty(screen, 'height', { get: () => parseInt(sr[1]) });
    Object.defineProperty(screen, 'availWidth', { get: () => parseInt(ar[0]) });
    Object.defineProperty(screen, 'availHeight', { get: () => parseInt(ar[1]) });
    Object.defineProperty(screen, 'colorDepth', { get: () => fp.colorDepth });
    Object.defineProperty(screen, 'pixelDepth', { get: () => fp.colorDepth });
  } catch(e) {}
  try {
    const orig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
      if (p === 0x9245) return fp.webglVendor;
      if (p === 0x9246) return fp.webglRenderer;
      return orig.call(this, p);
    };
  } catch(e) {}
  try {
    const origDTF = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(...a) {
      if (!a[1]) a[1] = { timeZone: fp.timezone };
      else if (!a[1].timeZone) a[1].timeZone = fp.timezone;
      return new origDTF(...a);
    };
    Intl.DateTimeFormat.prototype = origDTF.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;
  } catch(e) {}
  try { if (!window.chrome) window.chrome = {}; if (!window.chrome.runtime) window.chrome.runtime = {}; } catch(e) {}
  try { if (fp.browserType === 'brave' && window.chrome) { Object.defineProperty(window.chrome, 'brave', { get: () => ({ isBrave: () => Promise.resolve(true) }) }); } } catch(e) {}
  try { if (fp.webRtcPolicy === 'disable') { delete window.RTCPeerConnection; } } catch(e) {}
  console.log('[JoeBrowser] Stealth applied for:', fp.browserType);
})();
`;
}

function getFirefoxInjectScript(): string {
  return `
(function() {
  'use strict';
  const fp = window.__JOE_FINGERPRINT__;
  if (!fp) return;
  if (window.__joeStealthApplied) return;
  window.__joeStealthApplied = true;
  try {
    Object.defineProperty(navigator, 'userAgent', { get: () => fp.userAgent });
    Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
    Object.defineProperty(navigator, 'vendor', { get: () => '' });
    Object.defineProperty(navigator, 'languages', { get: () => fp.languages });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => fp.maxTouchPoints });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  } catch(e) {}
  try {
    const sr = fp.screenResolution.split('x');
    const ar = fp.availableScreenResolution.split('x');
    Object.defineProperty(screen, 'width', { get: () => parseInt(sr[0]) });
    Object.defineProperty(screen, 'height', { get: () => parseInt(sr[1]) });
    Object.defineProperty(screen, 'availWidth', { get: () => parseInt(ar[0]) });
    Object.defineProperty(screen, 'availHeight', { get: () => parseInt(ar[1]) });
    Object.defineProperty(screen, 'colorDepth', { get: () => fp.colorDepth });
    Object.defineProperty(screen, 'pixelDepth', { get: () => fp.colorDepth });
  } catch(e) {}
  try {
    const orig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
      if (p === 0x9245) return fp.webglVendor;
      if (p === 0x9246) return fp.webglRenderer;
      return orig.call(this, p);
    };
  } catch(e) {}
  try {
    const origDTF = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(...a) {
      if (!a[1]) a[1] = { timeZone: fp.timezone };
      else if (!a[1].timeZone) a[1].timeZone = fp.timezone;
      return new origDTF(...a);
    };
    Intl.DateTimeFormat.prototype = origDTF.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;
  } catch(e) {}
  try { if (window.chrome) delete window.chrome; } catch(e) {}
  try { if (fp.webRtcPolicy === 'disable') { delete window.RTCPeerConnection; } } catch(e) {}
  console.log('[JoeBrowser] Stealth applied for Firefox');
})();
`;
}

// ============================================================
// PROXY AUTH EXTENSION (for Chrome/Brave/Edge)
// ============================================================

function createProxyAuthExtension(profileDir: string, proxy: NonNullable<ProfileData['proxy']>): void {
  const extDir = path.join(profileDir, 'proxy-auth-extension');
  fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'Proxy Auth',
    version: '1.0',
    permissions: ['webRequest', 'webRequestAuthProvider'],
    background: { service_worker: 'background.js' },
  };

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const bgScript = `
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: '${proxy.username || ''}',
        password: '${proxy.password || ''}'
      }
    };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);
`;
  fs.writeFileSync(path.join(extDir, 'background.js'), bgScript, 'utf8');
}

// ============================================================
// PROXY TIMEZONE AUTO-DETECTION
// ============================================================

async function autoDetectTimezoneFromProxy(profile: ProfileData): Promise<void> {
  if (!profile.proxy) return;

  try {
    const proxyUrl = `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`;
    console.log(`[RealBrowserLauncher] Auto-detecting timezone for proxy: ${proxyUrl}`);

    // Use ip-api.com to detect timezone from proxy IP
    const geoData = await fetchGeoLocation(proxyUrl);
    if (geoData) {
      if (geoData.timezone) {
        profile.fingerprint.timezone = geoData.timezone;
        console.log(`[RealBrowserLauncher] Timezone set to: ${geoData.timezone}`);
      }
      if (geoData.countryCode) {
        // Set language based on country
        const langMap: Record<string, string> = {
          US: 'en-US', GB: 'en-GB', DE: 'de-DE', FR: 'fr-FR', ES: 'es-ES',
          IT: 'it-IT', JP: 'ja-JP', KR: 'ko-KR', CN: 'zh-CN', RU: 'ru-RU',
          BR: 'pt-BR', IN: 'en-IN', AU: 'en-AU', CA: 'en-CA', NL: 'nl-NL',
        };
        if (langMap[geoData.countryCode]) {
          profile.fingerprint.language = langMap[geoData.countryCode];
          profile.fingerprint.languages = [langMap[geoData.countryCode], langMap[geoData.countryCode].split('-')[0]];
        }
      }
    }
  } catch (err) {
    console.warn('[RealBrowserLauncher] Failed to auto-detect timezone from proxy:', err);
    // Don't fail the launch — just use the default timezone
  }
}

function fetchGeoLocation(proxyUrl: string): Promise<any> {
  return new Promise((resolve) => {
    const url = 'http://ip-api.com/json/?fields=status,countryCode,timezone';

    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            resolve(parsed);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}
