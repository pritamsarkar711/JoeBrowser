"use strict";
const electron = require("electron");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const Database = require("better-sqlite3");
const uuid = require("uuid");
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
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
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
const BROWSER_THEMES = {
  chrome: { primary: "#4285F4", accent: "#34A853", name: "Chrome" },
  brave: { primary: "#FB542B", accent: "#FF6B3D", name: "Brave" },
  firefox: { primary: "#FF7139", accent: "#FF9500", name: "Firefox" },
  edge: { primary: "#0078D7", accent: "#00A4EF", name: "Edge" },
  chromium: { primary: "#4285F4", accent: "#34A853", name: "Chromium" }
};
const MOBILE_RESOLUTIONS = {
  "iphone-14": { width: 390, height: 844, userAgent: "iPhone" },
  "iphone-15-pro": { width: 393, height: 852, userAgent: "iPhone" },
  "iphone-se": { width: 375, height: 667, userAgent: "iPhone" },
  "pixel-7": { width: 412, height: 915, userAgent: "Android" },
  "pixel-8": { width: 412, height: 915, userAgent: "Android" },
  "samsung-s23": { width: 360, height: 780, userAgent: "Android" },
  "ipad-air": { width: 820, height: 1180, userAgent: "iPad" },
  "ipad-pro": { width: 1024, height: 1366, userAgent: "iPad" }
};
const UA_TEMPLATES = {
  chrome: {
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1"
  },
  brave: {
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1"
  },
  firefox: {
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    linux: "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    android: "Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15"
  },
  edge: {
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 EdgA/131.0.0.0",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.0.0 Mobile/15E148 Safari/605.1.15"
  },
  chromium: {
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1"
  }
};
const WEBGL_RENDERERS = {
  windows: [
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)" }
  ],
  macos: [
    { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, Apple M2, Unspecified Version)" },
    { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, Apple M1, Unspecified Version)" },
    { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, Apple M3, Unspecified Version)" }
  ],
  linux: [
    { vendor: "Mesa", renderer: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)" },
    { vendor: "Mesa", renderer: "Mesa NVIDIA GeForce RTX 4070" },
    { vendor: "X.Org", renderer: "AMD Radeon RX 6800 XT (navi10, LLVM 15.0.7)" }
  ],
  android: [
    { vendor: "Qualcomm", renderer: "Adreno (TM) 740" },
    { vendor: "Qualcomm", renderer: "Adreno (TM) 660" },
    { vendor: "ARM", renderer: "Mali-G78" }
  ],
  ios: [
    { vendor: "Apple Inc.", renderer: "Apple GPU" }
  ]
};
const SCREEN_RESOLUTIONS = {
  windows: [
    { screen: "1920x1080", available: "1920x1040", colorDepth: 24 },
    { screen: "2560x1440", available: "2560x1400", colorDepth: 24 },
    { screen: "1366x768", available: "1366x728", colorDepth: 24 },
    { screen: "3840x2160", available: "3840x2120", colorDepth: 24 }
  ],
  macos: [
    { screen: "2560x1600", available: "2560x1556", colorDepth: 24 },
    { screen: "1440x900", available: "1440x856", colorDepth: 24 },
    { screen: "1680x1050", available: "1680x1006", colorDepth: 24 }
  ],
  linux: [
    { screen: "1920x1080", available: "1920x1040", colorDepth: 24 },
    { screen: "2560x1440", available: "2560x1400", colorDepth: 24 }
  ],
  android: [
    { screen: "412x915", available: "412x915", colorDepth: 24 },
    { screen: "360x780", available: "360x780", colorDepth: 24 }
  ],
  ios: [
    { screen: "393x852", available: "393x852", colorDepth: 24 },
    { screen: "390x844", available: "390x844", colorDepth: 24 }
  ]
};
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateForNewProfile(browser, os, device) {
  const deviceType = device || "desktop";
  const targetOs = os || "windows";
  const effectiveOs = deviceType === "mobile" ? targetOs === "ios" ? "ios" : "android" : targetOs;
  const userAgent = UA_TEMPLATES[browser][effectiveOs];
  const webgl = pickRandom(WEBGL_RENDERERS[effectiveOs]);
  let screenRes;
  if (deviceType === "mobile") {
    const mobileKey = effectiveOs === "ios" ? "iphone-15-pro" : "pixel-8";
    const res = MOBILE_RESOLUTIONS[mobileKey];
    screenRes = {
      screen: `${res.width}x${res.height}`,
      available: `${res.width}x${res.height}`,
      colorDepth: 24
    };
  } else {
    screenRes = pickRandom(SCREEN_RESOLUTIONS[effectiveOs]);
  }
  const platformMap = {
    windows: "Win32",
    macos: "MacIntel",
    linux: "Linux x86_64",
    android: "Linux armv81",
    ios: "iPhone"
  };
  const vendorMap = {
    chrome: "Google Inc.",
    brave: "Google Inc.",
    firefox: "",
    edge: "Google Inc.",
    chromium: "Google Inc."
  };
  const hwConcurrency = deviceType === "mobile" ? randomInt(4, 8) : randomInt(4, 16);
  const deviceMemory = deviceType === "mobile" ? pickRandom([4, 6, 8]) : pickRandom([8, 16, 32]);
  const maxTouchPoints = deviceType === "mobile" ? 5 : 0;
  const languages = ["en-US", "en"];
  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo"
  ];
  return {
    userAgent,
    platform: platformMap[effectiveOs],
    vendor: vendorMap[browser],
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    screenResolution: screenRes.screen,
    availableScreenResolution: screenRes.available,
    colorDepth: screenRes.colorDepth,
    hardwareConcurrency: hwConcurrency,
    deviceMemory,
    maxTouchPoints,
    language: "en-US",
    languages,
    timezone: pickRandom(timezones),
    canvasNoise: Math.random() * 0.01,
    audioNoise: Math.random() * 1e-3,
    webRtcPolicy: "default",
    browserType: browser,
    deviceType,
    targetOs: effectiveOs
  };
}
function generateProfileName(browser, index) {
  const names = {
    chrome: "Chrome",
    brave: "Brave",
    firefox: "Firefox",
    edge: "Edge",
    chromium: "Chromium"
  };
  return `${names[browser]} Profile ${index}`;
}
let db = null;
function getDbPath() {
  return path.join(electron.app.getPath("userData"), "joe-browser.db");
}
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initialize();
  }
  return db;
}
function initialize() {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      browser_type TEXT NOT NULL DEFAULT 'chrome',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      os TEXT NOT NULL DEFAULT 'windows',
      fingerprint TEXT NOT NULL,
      proxy TEXT,
      launch_url TEXT NOT NULL DEFAULT 'https://iphey.com',
      tags TEXT NOT NULL DEFAULT '[]',
      profile_group TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_used INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      extensions TEXT NOT NULL DEFAULT '[]'
    )
  `);
  d.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  d.exec(`
    CREATE TABLE IF NOT EXISTS master_password (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hash TEXT NOT NULL
    )
  `);
}
function listProfiles() {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all();
  return rows.map((row) => deserializeProfile(row));
}
function getProfile(id) {
  const d = getDb();
  const row = d.prepare("SELECT * FROM profiles WHERE id = ?").get(id);
  return row ? deserializeProfile(row) : null;
}
function createProfile(input) {
  const d = getDb();
  const now = Date.now();
  const id = uuid.v4();
  const fingerprint = generateForNewProfile(
    input.browserType,
    input.os,
    input.deviceType
  );
  const count = d.prepare("SELECT COUNT(*) as cnt FROM profiles WHERE browser_type = ?").get(input.browserType);
  const name = input.name || generateProfileName(input.browserType, (count?.cnt || 0) + 1);
  const profile = {
    id,
    name,
    browserType: input.browserType,
    deviceType: input.deviceType || "desktop",
    os: input.os || "windows",
    fingerprint,
    proxy: input.proxy,
    launchUrl: input.launchUrl || "https://iphey.com",
    tags: input.tags || [],
    group: input.group || "",
    createdAt: now,
    updatedAt: now,
    notes: input.notes || "",
    extensions: []
  };
  d.prepare(`
    INSERT INTO profiles (id, name, browser_type, device_type, os, fingerprint, proxy, launch_url, tags, profile_group, created_at, updated_at, notes, extensions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
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
    profile.notes,
    JSON.stringify(profile.extensions)
  );
  return profile;
}
function updateProfile(id, updates) {
  const d = getDb();
  const existing = getProfile(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: Date.now() };
  if (updates.browserType || updates.os || updates.deviceType) {
    updated.fingerprint = generateForNewProfile(
      updated.browserType,
      updated.os,
      updated.deviceType
    );
  }
  d.prepare(`
    UPDATE profiles SET
      name = ?, browser_type = ?, device_type = ?, os = ?,
      fingerprint = ?, proxy = ?, launch_url = ?, tags = ?,
      profile_group = ?, updated_at = ?, notes = ?, extensions = ?, last_used = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.browserType,
    updated.deviceType,
    updated.os,
    JSON.stringify(updated.fingerprint),
    updated.proxy ? JSON.stringify(updated.proxy) : null,
    updated.launchUrl,
    JSON.stringify(updated.tags),
    updated.group,
    updated.updatedAt,
    updated.notes,
    JSON.stringify(updated.extensions),
    updated.lastUsed || null,
    id
  );
  return updated;
}
function deleteProfile(id) {
  const d = getDb();
  const result = d.prepare("DELETE FROM profiles WHERE id = ?").run(id);
  return result.changes > 0;
}
function duplicateProfile(id) {
  const existing = getProfile(id);
  if (!existing) return null;
  return createProfile({
    name: `${existing.name} (Copy)`,
    browserType: existing.browserType,
    deviceType: existing.deviceType,
    os: existing.os,
    proxy: existing.proxy,
    launchUrl: existing.launchUrl,
    tags: [...existing.tags],
    group: existing.group,
    notes: existing.notes
  });
}
function exportProfile(id) {
  const profile = getProfile(id);
  if (!profile) return null;
  return JSON.stringify(profile, null, 2);
}
function importProfile(json) {
  try {
    const data = JSON.parse(json);
    return createProfile({
      name: data.name,
      browserType: data.browserType,
      deviceType: data.deviceType,
      os: data.os,
      proxy: data.proxy,
      launchUrl: data.launchUrl,
      tags: data.tags,
      group: data.group,
      notes: data.notes
    });
  } catch {
    return null;
  }
}
function deserializeProfile(row) {
  return {
    id: row.id,
    name: row.name,
    browserType: row.browser_type,
    deviceType: row.device_type,
    os: row.os,
    fingerprint: JSON.parse(row.fingerprint),
    proxy: row.proxy ? JSON.parse(row.proxy) : void 0,
    launchUrl: row.launch_url,
    tags: JSON.parse(row.tags),
    group: row.profile_group,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsed: row.last_used || void 0,
    notes: row.notes,
    extensions: JSON.parse(row.extensions)
  };
}
function getSetting(key) {
  const d = getDb();
  const row = d.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value || null;
}
function setSetting(key, value) {
  const d = getDb();
  d.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
function getMasterPasswordHash() {
  const d = getDb();
  const row = d.prepare("SELECT hash FROM master_password WHERE id = 1").get();
  return row?.hash || null;
}
function setMasterPasswordHash(hash) {
  const d = getDb();
  d.prepare("INSERT OR REPLACE INTO master_password (id, hash) VALUES (1, ?)").run(hash);
}
function isMasterPasswordInitialized() {
  return !!getMasterPasswordHash();
}
const openWindows = /* @__PURE__ */ new Map();
const PRELOAD_DIR = path.join(electron.app.getPath("userData"), "stealth-preloads");
function buildStealthPreloadScript(profile) {
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
    appVersion: ${JSON.stringify(fp.userAgent.replace("Mozilla/", ""))},
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
  if (${fp.browserType !== "firefox"}) {
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
  if (${fp.browserType === "brave"}) {
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
  if (${fp.browserType === "firefox"}) {
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
  if (${fp.browserType === "edge"}) {
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
function writeStealthPreload(profile) {
  if (!fs.existsSync(PRELOAD_DIR)) {
    fs.mkdirSync(PRELOAD_DIR, { recursive: true });
  }
  const scriptPath = path.join(PRELOAD_DIR, `stealth-${profile.id}.js`);
  const scriptContent = buildStealthPreloadScript(profile);
  fs.writeFileSync(scriptPath, scriptContent, "utf-8");
  return scriptPath;
}
function cleanupStealthPreload(profileId) {
  try {
    const scriptPath = path.join(PRELOAD_DIR, `stealth-${profileId}.js`);
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
  } catch (e) {
    console.error("Failed to cleanup stealth preload:", e);
  }
}
function cleanupAllPreloads() {
  try {
    if (fs.existsSync(PRELOAD_DIR)) {
      const files = fs.readdirSync(PRELOAD_DIR);
      for (const file of files) {
        if (file.startsWith("stealth-")) {
          fs.unlinkSync(path.join(PRELOAD_DIR, file));
        }
      }
    }
  } catch (e) {
    console.error("Failed to cleanup preloads:", e);
  }
}
function getBrowserChromePath() {
  const devPath = path.join(__dirname, "..", "assets", "browser-chrome.html");
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  const prodPath = path.join(process.resourcesPath, "browser-chrome.html");
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  const asarPath = path.join(__dirname, "..", "..", "assets", "browser-chrome.html");
  if (fs.existsSync(asarPath)) {
    return asarPath;
  }
  throw new Error("browser-chrome.html not found! Check electron-builder.yml extraResources.");
}
function getBrowserChromeUrl() {
  const htmlPath = getBrowserChromePath();
  return `file://${htmlPath.replace(/\\/g, "/")}`;
}
function getPartitionName(profile) {
  return `persist:joe-${profile.id}`;
}
function getWindowDimensions(profile) {
  if (profile.deviceType === "mobile") {
    const deviceKey = profile.os === "ios" ? "iphone-15-pro" : "pixel-8";
    const res = MOBILE_RESOLUTIONS[deviceKey];
    return {
      width: res.width + 40,
      height: res.height + 120
    };
  }
  return {
    width: 1280,
    height: 800
  };
}
function getBrowserTheme(browserType) {
  return BROWSER_THEMES[browserType] || BROWSER_THEMES.chrome;
}
async function launchProfile(profile) {
  try {
    const existing = openWindows.get(profile.id);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return { success: true, windowId: existing.id };
    }
    const preloadPath = writeStealthPreload(profile);
    const partition = getPartitionName(profile);
    const ses = electron.session.fromPartition(partition);
    ses.setUserAgent(profile.fingerprint.userAgent);
    if (profile.proxy) {
      const proxyConfig = profile.proxy;
      if (proxyConfig.username && proxyConfig.password) {
        const pacContent = `
function FindProxyForURL(url, host) {
  return "${proxyConfig.type === "socks5" ? "SOCKS5" : proxyConfig.type === "socks4" ? "SOCKS4" : "PROXY"} ${proxyConfig.host}:${proxyConfig.port}; DIRECT";
}`;
        const pacPath = path.join(PRELOAD_DIR, `proxy-${profile.id}.pac`);
        fs.writeFileSync(pacPath, pacContent, "utf-8");
        await ses.setProxy({ pacScript: `file://${pacPath.replace(/\\/g, "/")}` });
      } else {
        const proxyRule = `${proxyConfig.type}://${proxyConfig.host}:${proxyConfig.port}`;
        await ses.setProxy({ proxyRules: proxyRule });
      }
    } else {
      await ses.setProxy({ mode: "direct" });
    }
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
    const dims = getWindowDimensions(profile);
    const theme = getBrowserTheme(profile.browserType);
    const win = new electron.BrowserWindow({
      width: dims.width,
      height: dims.height,
      minWidth: 400,
      minHeight: 300,
      title: `${profile.name} - Joe Browser`,
      backgroundColor: "#1a1a2e",
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true
        // DO NOT set partition here - the BrowserWindow uses the default session.
        // The webview inside browser-chrome.html uses the profile's partition.
      }
    });
    const chromeUrl = getBrowserChromeUrl();
    const params = new URLSearchParams({
      url: profile.launchUrl || "https://iphey.com",
      profile: profile.id,
      profileName: encodeURIComponent(profile.name),
      browserType: profile.browserType,
      deviceType: profile.deviceType,
      themePrimary: theme.primary,
      themeAccent: theme.accent,
      isMobile: profile.deviceType === "mobile" ? "true" : "false",
      preloadPath
    });
    if (profile.deviceType === "mobile") {
      const deviceKey = profile.os === "ios" ? "iphone-15-pro" : "pixel-8";
      const res = MOBILE_RESOLUTIONS[deviceKey];
      params.set("mobileWidth", res.width.toString());
      params.set("mobileHeight", res.height.toString());
    }
    await win.loadURL(`${chromeUrl}?${params.toString()}`);
    openWindows.set(profile.id, win);
    win.on("closed", () => {
      openWindows.delete(profile.id);
      cleanupStealthPreload(profile.id);
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      electron.shell.openExternal(url);
      return { action: "deny" };
    });
    return { success: true, windowId: win.id };
  } catch (error) {
    console.error("Failed to launch profile:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
function closeProfile(profileId) {
  const win = openWindows.get(profileId);
  if (win && !win.isDestroyed()) {
    win.close();
    openWindows.delete(profileId);
    cleanupStealthPreload(profileId);
    return true;
  }
  return false;
}
function getOpenProfileIds() {
  return Array.from(openWindows.keys());
}
function registerIpcHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, async () => {
    try {
      return { success: true, data: listProfiles() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_, input) => {
    try {
      const profile = createProfile(input);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_, id, updates) => {
    try {
      const profile = updateProfile(id, updates);
      if (!profile) return { success: false, error: "Profile not found" };
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_, id) => {
    try {
      closeProfile(id);
      const result = deleteProfile(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_LAUNCH, async (_, id) => {
    try {
      const profiles = listProfiles();
      const profile = profiles.find((p) => p.id === id);
      if (!profile) {
        return { success: false, error: "Profile not found" };
      }
      const result = await launchProfile(profile);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT, async (_, id) => {
    try {
      const data = exportProfile(id);
      if (!data) return { success: false, error: "Profile not found" };
      const { filePath } = await electron.dialog.showSaveDialog({
        title: "Export Profile",
        defaultPath: `profile-${id}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }]
      });
      if (filePath) {
        fs__namespace.writeFileSync(filePath, data, "utf-8");
        return { success: true };
      }
      return { success: false, error: "Cancelled" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT, async () => {
    try {
      const { filePaths } = await electron.dialog.showOpenDialog({
        title: "Import Profile",
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"]
      });
      if (filePaths.length > 0) {
        const data = fs__namespace.readFileSync(filePaths[0], "utf-8");
        const profile = importProfile(data);
        if (!profile) return { success: false, error: "Invalid profile data" };
        return { success: true, data: profile };
      }
      return { success: false, error: "Cancelled" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DUPLICATE, async (_, id) => {
    try {
      const profile = duplicateProfile(id);
      if (!profile) return { success: false, error: "Profile not found" };
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.BROWSER_CLOSE, async (_, profileId) => {
    try {
      closeProfile(profileId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.BROWSER_LIST, async () => {
    try {
      return { success: true, data: getOpenProfileIds() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_, key) => {
    try {
      return { success: true, data: getSetting(key) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_, key, value) => {
    try {
      setSetting(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_INIT, async () => {
    try {
      return { success: true, data: { initialized: isMasterPasswordInitialized() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_VERIFY, async (_, password) => {
    try {
      const hash = getMasterPasswordHash();
      if (!hash) return { success: false, error: "No password set" };
      const inputHash = crypto__namespace.createHash("sha256").update(password).digest("hex");
      return { success: inputHash === hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_CHANGE, async (_, password) => {
    try {
      const hash = crypto__namespace.createHash("sha256").update(password).digest("hex");
      setMasterPasswordHash(hash);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.APP_VERSION, async () => {
    return { success: true, data: electron.app.getVersion() };
  });
  electron.ipcMain.handle(IPC_CHANNELS.APP_QUIT, async () => {
    cleanupAllPreloads();
    electron.app.quit();
  });
  console.log("IPC handlers registered successfully");
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
    icon: path__namespace.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path__namespace.join(__dirname, "..", "preload", "index.js")
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path__namespace.join(__dirname, "..", "renderer", "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
  return mainWindow;
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    cleanupAllPreloads();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  cleanupAllPreloads();
  electron.globalShortcut.unregisterAll();
});
electron.app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
});
