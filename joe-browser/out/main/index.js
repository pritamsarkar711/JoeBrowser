"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const http = require("http");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const http__namespace = /* @__PURE__ */ _interopNamespaceDefault(http);
const IPC_CHANNELS = {
  // Profiles
  PROFILES_LIST: "profiles:list",
  PROFILES_CREATE: "profiles:create",
  PROFILES_UPDATE: "profiles:update",
  PROFILES_DELETE: "profiles:delete",
  PROFILES_LAUNCH: "profiles:launch",
  PROFILES_EXPORT: "profiles:export",
  PROFILES_IMPORT: "profiles:import",
  PROFILES_DUPLICATE: "profiles:duplicate",
  // Browser
  BROWSER_CLOSE: "browser:close",
  BROWSER_LIST: "browser:list",
  // Settings
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  // Master Password
  MASTER_PASSWORD_INIT: "master-password:init",
  MASTER_PASSWORD_VERIFY: "master-password:verify",
  MASTER_PASSWORD_CHANGE: "master-password:change",
  // App
  APP_VERSION: "app:version",
  APP_QUIT: "app:quit"
};
let Database;
try {
  Database = require("better-sqlite3");
} catch (err) {
  console.error("[Database] Failed to load better-sqlite3:", err);
  Database = null;
}
class DatabaseService {
  db;
  dbPath;
  constructor(dbPath) {
    this.dbPath = dbPath;
    const dir = path__namespace.dirname(dbPath);
    if (!fs__namespace.existsSync(dir)) {
      fs__namespace.mkdirSync(dir, { recursive: true });
    }
    if (!Database) {
      throw new Error("better-sqlite3 is not available");
    }
    try {
      this.db = new Database(dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
      this.initialize();
      console.log("[Database] Initialized at:", dbPath);
    } catch (err) {
      console.error("[Database] Failed to initialize:", err);
      throw err;
    }
  }
  /**
   * Initialize database tables
   */
  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        browser_type TEXT NOT NULL DEFAULT 'chrome',
        device_type TEXT NOT NULL DEFAULT 'desktop',
        os TEXT NOT NULL DEFAULT 'windows',
        fingerprint TEXT NOT NULL DEFAULT '{}',
        proxy TEXT,
        launch_url TEXT DEFAULT 'https://www.google.com',
        tags TEXT DEFAULT '[]',
        group_name TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used INTEGER,
        notes TEXT DEFAULT '',
        extensions TEXT DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_browser_type ON profiles(browser_type);
      CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_name);
      CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at);
    `);
  }
  /**
   * Get all profiles
   */
  getAllProfiles() {
    try {
      const rows = this.db.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all();
      return rows.map((row) => this.rowToProfile(row));
    } catch (err) {
      console.error("[Database] Failed to get profiles:", err);
      return [];
    }
  }
  /**
   * Get a single profile by ID
   */
  getProfile(id) {
    try {
      const row = this.db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);
      if (!row) return null;
      return this.rowToProfile(row);
    } catch (err) {
      console.error("[Database] Failed to get profile:", err);
      return null;
    }
  }
  /**
   * Create a new profile
   */
  createProfile(profile) {
    try {
      this.db.prepare(`
        INSERT INTO profiles (id, name, browser_type, device_type, os, fingerprint, proxy, launch_url, tags, group_name, created_at, updated_at, last_used, notes, extensions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profile.id,
        profile.name,
        profile.browserType,
        profile.deviceType,
        profile.os,
        JSON.stringify(profile.fingerprint),
        profile.proxy ? JSON.stringify(profile.proxy) : null,
        profile.launchUrl,
        JSON.stringify(profile.tags),
        profile.group,
        profile.createdAt,
        profile.updatedAt,
        profile.lastUsed || null,
        profile.notes,
        JSON.stringify(profile.extensions)
      );
    } catch (err) {
      console.error("[Database] Failed to create profile:", err);
      throw err;
    }
  }
  /**
   * Update a profile
   */
  updateProfile(id, updates) {
    try {
      const existing = this.getProfile(id);
      if (!existing) {
        throw new Error(`Profile not found: ${id}`);
      }
      const fields = [];
      const values = [];
      const fieldMap = {
        name: "name",
        browserType: "browser_type",
        deviceType: "device_type",
        os: "os",
        fingerprint: "fingerprint",
        proxy: "proxy",
        launchUrl: "launch_url",
        tags: "tags",
        group: "group_name",
        updatedAt: "updated_at",
        lastUsed: "last_used",
        notes: "notes",
        extensions: "extensions"
      };
      for (const [key, column] of Object.entries(fieldMap)) {
        if (updates[key] !== void 0) {
          fields.push(`${column} = ?`);
          let value = updates[key];
          if (key === "fingerprint" || key === "proxy" || key === "tags" || key === "extensions") {
            value = value ? JSON.stringify(value) : null;
          }
          values.push(value);
        }
      }
      if (fields.length === 0) return;
      values.push(id);
      this.db.prepare(`UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    } catch (err) {
      console.error("[Database] Failed to update profile:", err);
      throw err;
    }
  }
  /**
   * Delete a profile
   */
  deleteProfile(id) {
    try {
      this.db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
    } catch (err) {
      console.error("[Database] Failed to delete profile:", err);
      throw err;
    }
  }
  /**
   * Convert a database row to a ProfileData object
   */
  rowToProfile(row) {
    return {
      id: row.id,
      name: row.name,
      browserType: row.browser_type,
      deviceType: row.device_type,
      os: row.os,
      fingerprint: typeof row.fingerprint === "string" ? JSON.parse(row.fingerprint) : row.fingerprint,
      proxy: row.proxy ? typeof row.proxy === "string" ? JSON.parse(row.proxy) : row.proxy : void 0,
      launchUrl: row.launch_url || "https://www.google.com",
      tags: typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [],
      group: row.group_name || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsed: row.last_used || void 0,
      notes: row.notes || "",
      extensions: typeof row.extensions === "string" ? JSON.parse(row.extensions) : row.extensions || []
    };
  }
  /**
   * Close the database connection
   */
  close() {
    try {
      if (this.db) {
        this.db.close();
      }
    } catch (err) {
      console.error("[Database] Failed to close:", err);
    }
  }
}
const runningProcesses = /* @__PURE__ */ new Map();
function isProfileRunning(profileId) {
  return runningProcesses.has(profileId);
}
function getRunningProfileIds() {
  return Array.from(runningProcesses.keys());
}
function closeProfileBrowser(profileId) {
  const proc = runningProcesses.get(profileId);
  if (proc && !proc.killed) {
    proc.kill();
    runningProcesses.delete(profileId);
    return true;
  }
  runningProcesses.delete(profileId);
  return false;
}
async function launchProfile(profile) {
  try {
    if (runningProcesses.has(profile.id)) {
      return { success: true };
    }
    if (!profile.id || !profile.fingerprint) {
      return { success: false, error: "Invalid profile data" };
    }
    if (profile.proxy) {
      await autoDetectTimezoneFromProxy(profile);
    }
    const profileDir = createProfileDirectory(profile);
    if (!profileDir) {
      return { success: false, error: "Failed to create profile directory" };
    }
    const extensionDir = createStealthExtension(profile);
    if (!extensionDir) {
      return { success: false, error: "Failed to create stealth extension" };
    }
    const browserPath = findBrowserExecutable(profile.browserType);
    if (!browserPath) {
      return { success: false, error: `${getBrowserName(profile.browserType)} not found. Please install it first.` };
    }
    const args = buildLaunchArguments(profile, profileDir, extensionDir);
    const proc = child_process.spawn(browserPath, args, {
      detached: false,
      stdio: "ignore"
    });
    if (!proc.pid) {
      return { success: false, error: "Failed to start browser process" };
    }
    runningProcesses.set(profile.id, proc);
    proc.on("exit", () => {
      runningProcesses.delete(profile.id);
    });
    proc.on("error", (err) => {
      console.error(`[RealBrowserLauncher] Process error for ${profile.id}:`, err);
      runningProcesses.delete(profile.id);
    });
    return { success: true };
  } catch (err) {
    console.error("[RealBrowserLauncher] Failed to launch profile:", err);
    return { success: false, error: err.message || "Unknown error launching profile" };
  }
}
function findBrowserExecutable(browserType) {
  const platform = process.platform;
  const paths = {
    win32: {
      chrome: [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        path__namespace.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe")
      ],
      brave: [
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        path__namespace.join(process.env.LOCALAPPDATA || "", "BraveSoftware\\Brave-Browser\\Application\\brave.exe")
      ],
      edge: [
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      ],
      firefox: [
        "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
        "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe"
      ],
      chromium: [
        "C:\\Program Files\\Chromium\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
        path__namespace.join(process.env.LOCALAPPDATA || "", "Chromium\\Application\\chrome.exe")
      ]
    },
    darwin: {
      chrome: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
      brave: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
      edge: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
      firefox: ["/Applications/Firefox.app/Contents/MacOS/firefox"],
      chromium: ["/Applications/Chromium.app/Contents/MacOS/Chromium"]
    },
    linux: {
      chrome: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chrome"],
      brave: ["/usr/bin/brave-browser", "/usr/bin/brave-browser-stable", "/usr/bin/brave"],
      edge: ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable", "/usr/bin/microsoft-edge-dev"],
      firefox: ["/usr/bin/firefox", "/usr/bin/firefox-esr", "/snap/bin/firefox"],
      chromium: ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/chromium-dev"]
    }
  };
  const platformPaths = paths[platform];
  if (!platformPaths) return null;
  const browserPaths = platformPaths[browserType];
  if (!browserPaths) return null;
  for (const p of browserPaths) {
    if (p && fs__namespace.existsSync(p)) {
      return p;
    }
  }
  return null;
}
function getBrowserName(browserType) {
  const names = {
    chrome: "Google Chrome",
    brave: "Brave Browser",
    firefox: "Mozilla Firefox",
    edge: "Microsoft Edge",
    chromium: "Chromium"
  };
  return names[browserType] || browserType;
}
function buildLaunchArguments(profile, profileDir, extensionDir) {
  const isFirefox = profile.browserType === "firefox";
  const args = [];
  if (isFirefox) {
    args.push("-profile", profileDir);
    args.push("-no-remote");
    args.push("-new-instance");
    if (profile.launchUrl) {
      args.push(profile.launchUrl);
    }
    if (profile.proxy) {
      createFirefoxProxyConfig(profileDir, profile.proxy);
    }
  } else {
    args.push(`--user-data-dir=${profileDir}`);
    args.push(`--load-extension=${extensionDir}`);
    args.push("--no-first-run");
    args.push("--no-default-browser-check");
    args.push("--disable-background-networking");
    args.push("--disable-client-side-phishing-detection");
    args.push("--disable-default-apps");
    args.push("--disable-hang-monitor");
    args.push("--disable-popup-blocking");
    args.push("--disable-prompt-on-repost");
    args.push("--disable-sync");
    args.push("--disable-web-security");
    args.push("--metrics-recording-only");
    args.push("--safebrowsing-disable-auto-update");
    if (profile.fingerprint.userAgent) {
      args.push(`--user-agent=${profile.fingerprint.userAgent}`);
    }
    if (profile.deviceType === "mobile") {
      const screenRes = profile.fingerprint.screenResolution.split("x");
      args.push(`--window-size=${screenRes[0]},${screenRes[1]}`);
    }
    if (profile.proxy) {
      const proxyUrl = `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`;
      args.push(`--proxy-server=${proxyUrl}`);
      if (profile.proxy.username && profile.proxy.password) {
        createProxyAuthExtension(profileDir, profile.proxy);
      }
    }
    if (profile.launchUrl) {
      args.push(profile.launchUrl);
    }
  }
  return args;
}
function createProfileDirectory(profile) {
  try {
    const baseDir = path__namespace.join(electron.app.getPath("userData"), "browser-profiles", profile.id);
    fs__namespace.mkdirSync(baseDir, { recursive: true });
    if (profile.browserType === "firefox") {
      createFirefoxUserPrefs(baseDir, profile);
    }
    return baseDir;
  } catch (err) {
    console.error("[RealBrowserLauncher] Failed to create profile directory:", err);
    return null;
  }
}
function createFirefoxUserPrefs(profileDir, profile) {
  const fp = profile.fingerprint;
  const prefsPath = path__namespace.join(profileDir, "user.js");
  let prefs = `// JoeBrowser Firefox Preferences - ${profile.name}
`;
  prefs += `user_pref("general.useragent.override", "${fp.userAgent}");
`;
  prefs += `user_pref("intl.locale.requested", "${fp.language}");
`;
  prefs += `user_pref("privacy.resistFingerprinting", false);
`;
  prefs += `user_pref("webgl.renderer-string-override", "${fp.webglRenderer}");
`;
  prefs += `user_pref("webgl.vendor-string-override", "${fp.webglVendor}");
`;
  prefs += `user_pref("device.sensors.enabled", false);
`;
  prefs += `user_pref("dom.webaudio.enabled", true);
`;
  prefs += `user_pref("media.navigator.enabled", true);
`;
  prefs += `user_pref("media.peerconnection.enabled", ${fp.webRtcPolicy !== "disable"});
`;
  prefs += `user_pref("network.cookie.cookieBehavior", 0);
`;
  prefs += `user_pref("privacy.donottrackheader.enabled", false);
`;
  prefs += `user_pref("dom.maxHardwareConcurrency", ${fp.hardwareConcurrency});
`;
  prefs += `user_pref("browser.startup.homepage", "${profile.launchUrl || "https://www.google.com"}");
`;
  prefs += `user_pref("browser.cache.disk.enable", true);
`;
  prefs += `user_pref("browser.cache.memory.enable", true);
`;
  prefs += `user_pref("browser.display.use_document_fonts", 1);
`;
  prefs += `user_pref("browser.shell.checkDefaultBrowser", false);
`;
  prefs += `user_pref("browser.startup.page", 1);
`;
  prefs += `user_pref("datareporting.policy.dataSubmissionEnabled", false);
`;
  prefs += `user_pref("toolkit.telemetry.enabled", false);
`;
  prefs += `user_pref("toolkit.telemetry.unified", false);
`;
  fs__namespace.writeFileSync(prefsPath, prefs, "utf8");
}
function createFirefoxProxyConfig(profileDir, proxy) {
  if (!proxy) return;
  const prefsPath = path__namespace.join(profileDir, "user.js");
  const existing = fs__namespace.existsSync(prefsPath) ? fs__namespace.readFileSync(prefsPath, "utf8") : "";
  let proxyPrefs = existing + "\n// Proxy Configuration\n";
  switch (proxy.type) {
    case "http":
      proxyPrefs += `user_pref("network.proxy.type", 1);
`;
      proxyPrefs += `user_pref("network.proxy.http", "${proxy.host}");
`;
      proxyPrefs += `user_pref("network.proxy.http_port", ${proxy.port});
`;
      proxyPrefs += `user_pref("network.proxy.ssl", "${proxy.host}");
`;
      proxyPrefs += `user_pref("network.proxy.ssl_port", ${proxy.port});
`;
      break;
    case "socks4":
      proxyPrefs += `user_pref("network.proxy.type", 1);
`;
      proxyPrefs += `user_pref("network.proxy.socks", "${proxy.host}");
`;
      proxyPrefs += `user_pref("network.proxy.socks_port", ${proxy.port});
`;
      proxyPrefs += `user_pref("network.proxy.socks_version", 4);
`;
      break;
    case "socks5":
      proxyPrefs += `user_pref("network.proxy.type", 1);
`;
      proxyPrefs += `user_pref("network.proxy.socks", "${proxy.host}");
`;
      proxyPrefs += `user_pref("network.proxy.socks_port", ${proxy.port});
`;
      proxyPrefs += `user_pref("network.proxy.socks_version", 5);
`;
      break;
    case "https":
      proxyPrefs += `user_pref("network.proxy.type", 1);
`;
      proxyPrefs += `user_pref("network.proxy.http", "${proxy.host}");
`;
      proxyPrefs += `user_pref("network.proxy.http_port", ${proxy.port});
`;
      proxyPrefs += `user_pref("network.proxy.ssl", "${proxy.host}");
`;
      proxyPrefs += `user_pref("network.proxy.ssl_port", ${proxy.port});
`;
      break;
  }
  if (proxy.username) {
    proxyPrefs += `user_pref("network.proxy.share_proxy_settings", true);
`;
  }
  proxyPrefs += `user_pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1");
`;
  fs__namespace.writeFileSync(prefsPath, proxyPrefs, "utf8");
}
function createStealthExtension(profile) {
  try {
    const isFirefox = profile.browserType === "firefox";
    const extDir = path__namespace.join(electron.app.getPath("userData"), "browser-profiles", profile.id, "joe-stealth-extension");
    fs__namespace.mkdirSync(extDir, { recursive: true });
    if (isFirefox) {
      const sourceDir = path__namespace.join(__dirname, "..", "..", "main", "extensions", "firefox");
      if (!copyExtensionFiles(sourceDir, extDir)) {
        createFirefoxExtensionFiles(extDir, profile);
      }
    } else {
      const sourceDir = path__namespace.join(__dirname, "..", "..", "main", "extensions", "chrome");
      if (!copyExtensionFiles(sourceDir, extDir)) {
        createChromeExtensionFiles(extDir, profile);
      }
    }
    createFingerprintDataFile(extDir, profile);
    return extDir;
  } catch (err) {
    console.error("[RealBrowserLauncher] Failed to create stealth extension:", err);
    return null;
  }
}
function copyExtensionFiles(sourceDir, targetDir) {
  try {
    if (!fs__namespace.existsSync(sourceDir)) return false;
    const files = fs__namespace.readdirSync(sourceDir);
    for (const file of files) {
      const src = path__namespace.join(sourceDir, file);
      const dst = path__namespace.join(targetDir, file);
      fs__namespace.copyFileSync(src, dst);
    }
    return true;
  } catch (err) {
    return false;
  }
}
function createChromeExtensionFiles(extDir, profile) {
  const manifest = {
    manifest_version: 3,
    name: "JoeBrowser Stealth",
    version: "1.0.0",
    description: "Anti-detect fingerprint injection",
    content_scripts: [{
      matches: ["<all_urls>"],
      js: ["fingerprint-data.js", "content.js"],
      run_at: "document_start",
      world: "MAIN"
    }],
    permissions: [],
    incognito: "split"
  };
  fs__namespace.writeFileSync(path__namespace.join(extDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const sourceContentPath = path__namespace.join(__dirname, "..", "..", "main", "extensions", "chrome", "content.js");
  if (fs__namespace.existsSync(sourceContentPath)) {
    fs__namespace.copyFileSync(sourceContentPath, path__namespace.join(extDir, "content.js"));
  } else {
    fs__namespace.writeFileSync(path__namespace.join(extDir, "content.js"), getChromeContentScript(), "utf8");
  }
}
function createFirefoxExtensionFiles(extDir, profile) {
  const manifest = {
    manifest_version: 2,
    name: "JoeBrowser Stealth",
    version: "1.0.0",
    description: "Anti-detect fingerprint injection for Firefox",
    content_scripts: [{
      matches: ["<all_urls>"],
      js: ["content.js"],
      run_at: "document_start"
    }],
    web_accessible_resources: ["inject.js", "fingerprint-data.js"],
    incognito: "spanning"
  };
  fs__namespace.writeFileSync(path__namespace.join(extDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
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
  fs__namespace.writeFileSync(path__namespace.join(extDir, "content.js"), contentScript, "utf8");
  const sourceInjectPath = path__namespace.join(__dirname, "..", "..", "main", "extensions", "firefox", "inject.js");
  if (fs__namespace.existsSync(sourceInjectPath)) {
    fs__namespace.copyFileSync(sourceInjectPath, path__namespace.join(extDir, "inject.js"));
  } else {
    fs__namespace.writeFileSync(path__namespace.join(extDir, "inject.js"), getFirefoxInjectScript(), "utf8");
  }
}
function createFingerprintDataFile(extDir, profile) {
  const fp = profile.fingerprint;
  const data = `window.__JOE_FINGERPRINT__ = ${JSON.stringify(fp)};`;
  fs__namespace.writeFileSync(path__namespace.join(extDir, "fingerprint-data.js"), data, "utf8");
}
function getChromeContentScript() {
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
function getFirefoxInjectScript() {
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
function createProxyAuthExtension(profileDir, proxy) {
  const extDir = path__namespace.join(profileDir, "proxy-auth-extension");
  fs__namespace.mkdirSync(extDir, { recursive: true });
  const manifest = {
    manifest_version: 3,
    name: "Proxy Auth",
    version: "1.0",
    permissions: ["webRequest", "webRequestAuthProvider"],
    background: { service_worker: "background.js" }
  };
  fs__namespace.writeFileSync(path__namespace.join(extDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const bgScript = `
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: '${proxy.username || ""}',
        password: '${proxy.password || ""}'
      }
    };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);
`;
  fs__namespace.writeFileSync(path__namespace.join(extDir, "background.js"), bgScript, "utf8");
}
async function autoDetectTimezoneFromProxy(profile) {
  if (!profile.proxy) return;
  try {
    const proxyUrl = `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`;
    console.log(`[RealBrowserLauncher] Auto-detecting timezone for proxy: ${proxyUrl}`);
    const geoData = await fetchGeoLocation(proxyUrl);
    if (geoData) {
      if (geoData.timezone) {
        profile.fingerprint.timezone = geoData.timezone;
        console.log(`[RealBrowserLauncher] Timezone set to: ${geoData.timezone}`);
      }
      if (geoData.countryCode) {
        const langMap = {
          US: "en-US",
          GB: "en-GB",
          DE: "de-DE",
          FR: "fr-FR",
          ES: "es-ES",
          IT: "it-IT",
          JP: "ja-JP",
          KR: "ko-KR",
          CN: "zh-CN",
          RU: "ru-RU",
          BR: "pt-BR",
          IN: "en-IN",
          AU: "en-AU",
          CA: "en-CA",
          NL: "nl-NL"
        };
        if (langMap[geoData.countryCode]) {
          profile.fingerprint.language = langMap[geoData.countryCode];
          profile.fingerprint.languages = [langMap[geoData.countryCode], langMap[geoData.countryCode].split("-")[0]];
        }
      }
    }
  } catch (err) {
    console.warn("[RealBrowserLauncher] Failed to auto-detect timezone from proxy:", err);
  }
}
function fetchGeoLocation(proxyUrl) {
  return new Promise((resolve) => {
    const url = "http://ip-api.com/json/?fields=status,countryCode,timezone";
    const req = http__namespace.get(url, { timeout: 5e3 }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === "success") {
            resolve(parsed);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}
function getUAInfo(browserType, os, deviceType) {
  const chromeVersion = "120.0.6099.130";
  const firefoxVersion = "121.0";
  const edgeVersion = "120.0.2210.91";
  let platform;
  let osInfo;
  if (deviceType === "mobile") {
    switch (os) {
      case "android":
        platform = "Linux armv81";
        osInfo = "Linux; Android 13; Pixel 7";
        break;
      case "ios":
        platform = "iPhone";
        osInfo = "iPhone; CPU iPhone OS 17_2 like Mac OS X";
        break;
      default:
        platform = "Linux armv81";
        osInfo = "Linux; Android 13; Pixel 7";
    }
  } else {
    switch (os) {
      case "windows":
        platform = "Win32";
        osInfo = "Windows NT 10.0; Win64; x64";
        break;
      case "macos":
        platform = "MacIntel";
        osInfo = "Macintosh; Intel Mac OS X 10_15_7";
        break;
      case "linux":
        platform = "Linux x86_64";
        osInfo = "X11; Linux x86_64";
        break;
      default:
        platform = "Win32";
        osInfo = "Windows NT 10.0; Win64; x64";
    }
  }
  let ua;
  let vendor;
  let webglVendor;
  let webglRenderer;
  switch (browserType) {
    case "chrome":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else if (deviceType === "mobile" && os === "ios") {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${chromeVersion} Mobile/15E148 Safari/604.1`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = "Google Inc.";
      webglVendor = "Google Inc. (NVIDIA)";
      webglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)";
      break;
    case "brave":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = "Google Inc.";
      webglVendor = "Google Inc. (NVIDIA)";
      webglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)";
      break;
    case "firefox":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Android 13; Mobile; rv:${firefoxVersion}) Gecko/${firefoxVersion} Firefox/${firefoxVersion}`;
      } else if (deviceType === "mobile" && os === "ios") {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${firefoxVersion} Mobile/15E148 Safari/605.1.15`;
      } else {
        switch (os) {
          case "windows":
            ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
            break;
          case "macos":
            ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
            break;
          case "linux":
            ua = `Mozilla/5.0 (X11; Linux x86_64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
            break;
          default:
            ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
        }
      }
      vendor = "";
      webglVendor = "NVIDIA Corporation";
      webglRenderer = "GeForce GTX 1060 6GB/PCIe/SSE2";
      break;
    case "edge":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36 EdgA/${edgeVersion}`;
      } else if (deviceType === "mobile" && os === "ios") {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/${edgeVersion} Mobile/15E148 Safari/605.1.15`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
      }
      vendor = "Google Inc.";
      webglVendor = "Google Inc. (NVIDIA)";
      webglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)";
      break;
    case "chromium":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = "Google Inc.";
      webglVendor = "Google Inc. (NVIDIA)";
      webglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)";
      break;
    default:
      ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      vendor = "Google Inc.";
      webglVendor = "Google Inc. (NVIDIA)";
      webglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)";
  }
  return { platform, osInfo, ua, vendor, webglVendor, webglRenderer };
}
function generateFingerprint(browserType, deviceType, os) {
  const uaInfo = getUAInfo(browserType, os, deviceType);
  let screenResolution;
  let availableScreenResolution;
  let maxTouchPoints;
  if (deviceType === "mobile") {
    if (os === "ios") {
      screenResolution = "1170x2532";
      availableScreenResolution = "1170x2422";
    } else {
      screenResolution = "1080x2400";
      availableScreenResolution = "1080x2290";
    }
    maxTouchPoints = 5;
  } else {
    switch (os) {
      case "macos":
        screenResolution = "2560x1440";
        availableScreenResolution = "2560x1325";
        break;
      case "linux":
        screenResolution = "1920x1080";
        availableScreenResolution = "1920x971";
        break;
      default:
        screenResolution = "1920x1080";
        availableScreenResolution = "1920x1040";
    }
    maxTouchPoints = 0;
  }
  const hardwareConcurrency = deviceType === "mobile" ? 8 : 12;
  const deviceMemory = deviceType === "mobile" ? 8 : 16;
  const language = "en-US";
  const languages = ["en-US", "en"];
  const timezone = "America/New_York";
  const canvasNoise = Math.floor(Math.random() * 5) + 1;
  const audioNoise = Math.floor(Math.random() * 3) + 1;
  const webRtcPolicy = "default";
  return {
    userAgent: uaInfo.ua,
    platform: uaInfo.platform,
    vendor: uaInfo.vendor,
    webglVendor: uaInfo.webglVendor,
    webglRenderer: uaInfo.webglRenderer,
    screenResolution,
    availableScreenResolution,
    colorDepth: 24,
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints,
    language,
    languages,
    timezone,
    canvasNoise,
    audioNoise,
    webRtcPolicy,
    browserType,
    deviceType,
    targetOs: os
  };
}
let db = null;
function registerIpcHandlers() {
  const dbPath = path__namespace.join(electron.app.getPath("userData"), "joe-browser.db");
  db = new DatabaseService(dbPath);
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, async () => {
    try {
      const profiles = db.getAllProfiles();
      return { success: true, data: profiles };
    } catch (err) {
      console.error("[IPC] profiles:list error:", err);
      return { success: false, error: err.message || "Failed to list profiles" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, input) => {
    try {
      if (!input.browserType) {
        return { success: false, error: "Browser type is required" };
      }
      const deviceType = input.deviceType || "desktop";
      const os = input.os || (deviceType === "mobile" ? "android" : "windows");
      const fingerprint = generateFingerprint(input.browserType, deviceType, os);
      const name = input.name || `${input.browserType.charAt(0).toUpperCase() + input.browserType.slice(1)} Profile`;
      const profile = {
        id: generateId(),
        name,
        browserType: input.browserType,
        deviceType,
        os,
        fingerprint,
        proxy: input.proxy,
        launchUrl: input.launchUrl || "https://www.google.com",
        tags: input.tags || [],
        group: input.group || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: input.notes || "",
        extensions: []
      };
      db.createProfile(profile);
      return { success: true, data: profile };
    } catch (err) {
      console.error("[IPC] profiles:create error:", err);
      return { success: false, error: err.message || "Failed to create profile" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id, updates) => {
    try {
      if (!id) return { success: false, error: "Profile ID is required" };
      if (updates.browserType || updates.os || updates.deviceType) {
        const existing = db.getProfile(id);
        if (!existing) return { success: false, error: "Profile not found" };
        const browserType = updates.browserType || existing.browserType;
        const deviceType = updates.deviceType || existing.deviceType;
        const os = updates.os || existing.os;
        updates.fingerprint = generateFingerprint(browserType, deviceType, os);
      }
      updates.updatedAt = Date.now();
      db.updateProfile(id, updates);
      const updated = db.getProfile(id);
      return { success: true, data: updated };
    } catch (err) {
      console.error("[IPC] profiles:update error:", err);
      return { success: false, error: err.message || "Failed to update profile" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id) => {
    try {
      if (!id) return { success: false, error: "Profile ID is required" };
      if (isProfileRunning(id)) {
        closeProfileBrowser(id);
      }
      db.deleteProfile(id);
      return { success: true };
    } catch (err) {
      console.error("[IPC] profiles:delete error:", err);
      return { success: false, error: err.message || "Failed to delete profile" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_LAUNCH, async (_event, id) => {
    try {
      if (!id) return { success: false, error: "Profile ID is required" };
      const profile = db.getProfile(id);
      if (!profile) return { success: false, error: "Profile not found" };
      db.updateProfile(id, { lastUsed: Date.now() });
      const result = await launchProfile(profile);
      return result;
    } catch (err) {
      console.error("[IPC] profiles:launch error:", err);
      return { success: false, error: err.message || "Failed to launch profile" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT, async (_event, id) => {
    try {
      if (!id) return { success: false, error: "Profile ID is required" };
      const profile = db.getProfile(id);
      if (!profile) return { success: false, error: "Profile not found" };
      const exportPath = path__namespace.join(electron.app.getPath("downloads"), `joe-profile-${id}.json`);
      fs__namespace.writeFileSync(exportPath, JSON.stringify(profile, null, 2), "utf8");
      return { success: true };
    } catch (err) {
      console.error("[IPC] profiles:export error:", err);
      return { success: false, error: err.message || "Failed to export profile" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT, async () => {
    return { success: false, error: "Import not yet implemented" };
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DUPLICATE, async (_event, id) => {
    try {
      if (!id) return { success: false, error: "Profile ID is required" };
      const original = db.getProfile(id);
      if (!original) return { success: false, error: "Profile not found" };
      const fingerprint = generateFingerprint(original.browserType, original.deviceType, original.os);
      const duplicate = {
        ...original,
        id: generateId(),
        name: `${original.name} (Copy)`,
        fingerprint,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsed: void 0
      };
      db.createProfile(duplicate);
      return { success: true, data: duplicate };
    } catch (err) {
      console.error("[IPC] profiles:duplicate error:", err);
      return { success: false, error: err.message || "Failed to duplicate profile" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.BROWSER_CLOSE, async (_event, profileId) => {
    try {
      if (!profileId) return { success: false, error: "Profile ID is required" };
      closeProfileBrowser(profileId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] browser:close error:", err);
      return { success: false, error: err.message || "Failed to close browser" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.BROWSER_LIST, async () => {
    try {
      const runningIds = getRunningProfileIds();
      return { success: true, data: runningIds };
    } catch (err) {
      console.error("[IPC] browser:list error:", err);
      return { success: false, error: err.message || "Failed to list browsers" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key) => {
    try {
      if (!key) return { success: false, error: "Key is required" };
      const settingsPath = path__namespace.join(electron.app.getPath("userData"), "settings.json");
      if (!fs__namespace.existsSync(settingsPath)) return { success: true, data: null };
      const settings = JSON.parse(fs__namespace.readFileSync(settingsPath, "utf8"));
      return { success: true, data: settings[key] || null };
    } catch (err) {
      return { success: false, error: err.message || "Failed to get setting" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key, value) => {
    try {
      if (!key) return { success: false, error: "Key is required" };
      const settingsPath = path__namespace.join(electron.app.getPath("userData"), "settings.json");
      let settings = {};
      if (fs__namespace.existsSync(settingsPath)) {
        settings = JSON.parse(fs__namespace.readFileSync(settingsPath, "utf8"));
      }
      settings[key] = value;
      fs__namespace.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Failed to set setting" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_INIT, async () => {
    try {
      const settingsPath = path__namespace.join(electron.app.getPath("userData"), "settings.json");
      if (!fs__namespace.existsSync(settingsPath)) return { success: true, data: { initialized: false } };
      const settings = JSON.parse(fs__namespace.readFileSync(settingsPath, "utf8"));
      return { success: true, data: { initialized: !!settings.masterPasswordHash } };
    } catch (err) {
      return { success: false, error: err.message || "Failed to check master password" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_VERIFY, async (_event, password) => {
    try {
      const settingsPath = path__namespace.join(electron.app.getPath("userData"), "settings.json");
      if (!fs__namespace.existsSync(settingsPath)) return { success: false, error: "No master password set" };
      const settings = JSON.parse(fs__namespace.readFileSync(settingsPath, "utf8"));
      const hash = simpleHash(password);
      return { success: hash === settings.masterPasswordHash };
    } catch (err) {
      return { success: false, error: err.message || "Failed to verify password" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_CHANGE, async (_event, password) => {
    try {
      const settingsPath = path__namespace.join(electron.app.getPath("userData"), "settings.json");
      let settings = {};
      if (fs__namespace.existsSync(settingsPath)) {
        settings = JSON.parse(fs__namespace.readFileSync(settingsPath, "utf8"));
      }
      settings.masterPasswordHash = simpleHash(password);
      fs__namespace.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Failed to change password" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.APP_VERSION, async () => {
    try {
      return { success: true, data: electron.app.getVersion() };
    } catch (err) {
      return { success: false, error: err.message || "Failed to get version" };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.APP_QUIT, async () => {
    try {
      electron.app.quit();
    } catch (err) {
      console.error("[IPC] app:quit error:", err);
    }
  });
  console.log("[IPC] All handlers registered (using REAL browser launcher)");
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
let mainWindow = null;
function createMainWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Joe Browser",
    backgroundColor: "#0f0f23",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path__namespace.join(__dirname, "..", "preload", "index.js")
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path__namespace.join(__dirname, "..", "renderer", "index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
electron.app.whenReady().then(() => {
  try {
    registerIpcHandlers();
    createMainWindow();
  } catch (err) {
    console.error("[Main] Failed to initialize app:", err);
  }
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
process.on("uncaughtException", (err) => {
  console.error("[Main] Uncaught exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Main] Unhandled rejection:", reason);
});
