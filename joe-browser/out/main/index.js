"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
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
const runningWindows = /* @__PURE__ */ new Map();
function isProfileRunning(profileId) {
  return runningWindows.has(profileId);
}
function getRunningProfileIds() {
  return Array.from(runningWindows.keys());
}
function closeProfileBrowser(profileId) {
  const win = runningWindows.get(profileId);
  if (win && !win.isDestroyed()) {
    win.close();
    return true;
  }
  runningWindows.delete(profileId);
  return false;
}
async function launchProfile(profile) {
  try {
    if (runningWindows.has(profile.id)) {
      const existingWin = runningWindows.get(profile.id);
      if (existingWin && !existingWin.isDestroyed()) {
        existingWin.focus();
        return { success: true, windowId: existingWin.id };
      }
      runningWindows.delete(profile.id);
    }
    if (!profile.id || !profile.fingerprint) {
      return { success: false, error: "Invalid profile data: missing id or fingerprint" };
    }
    const chromeHtmlPath = getBrowserChromePath();
    if (!chromeHtmlPath) {
      return { success: false, error: "Browser chrome HTML not found" };
    }
    if (profile.proxy) {
      await configureProxy(profile.id, profile.proxy);
      const geoInfo = await detectProxyGeo(profile.proxy);
      if (geoInfo) {
        profile.fingerprint.timezone = geoInfo.timezone;
        profile.fingerprint.language = geoInfo.language;
        profile.fingerprint.languages = [geoInfo.language, geoInfo.language.split("-")[0]];
        console.log(`[BrowserLauncher] Proxy auto-detect: ${geoInfo.timezone}, ${geoInfo.language} (${geoInfo.country})`);
      }
    }
    const preloadPath = buildAndWriteStealthPreload(profile);
    if (!preloadPath) {
      return { success: false, error: "Failed to create stealth preload script" };
    }
    const themeInfo = BROWSER_THEMES[profile.browserType] || BROWSER_THEMES.chrome;
    const themeColor = themeInfo.primary;
    const windowSize = getWindowSize(profile);
    const targetUrl = profile.launchUrl || "https://www.google.com";
    const chromeUrl = buildChromeUrl(chromeHtmlPath, {
      targetUrl,
      profileId: profile.id,
      browserType: profile.browserType,
      preloadPath,
      themeColor,
      homeUrl: "https://www.google.com"
    });
    const browserWindow = new electron.BrowserWindow({
      width: windowSize.width,
      height: windowSize.height,
      minWidth: 800,
      minHeight: 600,
      title: `${themeInfo.name} - ${profile.name}`,
      backgroundColor: "#1f1f1f",
      autoHideMenuBar: true,
      titleBarStyle: "hidden",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
        sandbox: false
      }
    });
    await browserWindow.loadURL(chromeUrl);
    runningWindows.set(profile.id, browserWindow);
    browserWindow.on("closed", () => {
      runningWindows.delete(profile.id);
      try {
        if (fs__namespace.existsSync(preloadPath)) {
          fs__namespace.unlinkSync(preloadPath);
        }
      } catch (e) {
      }
    });
    return { success: true, windowId: browserWindow.id };
  } catch (err) {
    console.error("[BrowserLauncher] Failed to launch profile:", err);
    return { success: false, error: err.message || "Unknown error launching profile" };
  }
}
function getBrowserChromePath() {
  const devPath1 = path__namespace.join(__dirname, "..", "..", "src", "main", "assets", "browser-chrome.html");
  if (fs__namespace.existsSync(devPath1)) {
    return devPath1;
  }
  const prodPath = path__namespace.join(process.resourcesPath, "browser-chrome.html");
  if (fs__namespace.existsSync(prodPath)) {
    return prodPath;
  }
  try {
    const appPath = electron.app.getAppPath();
    const appPathResolve = path__namespace.join(appPath, "src", "main", "assets", "browser-chrome.html");
    if (fs__namespace.existsSync(appPathResolve)) {
      return appPathResolve;
    }
  } catch (e) {
  }
  const devPath2 = path__namespace.join(__dirname, "..", "assets", "browser-chrome.html");
  if (fs__namespace.existsSync(devPath2)) {
    return devPath2;
  }
  console.error("[BrowserLauncher] Could not find browser-chrome.html");
  return null;
}
function buildChromeUrl(htmlPath, params) {
  const query = new URLSearchParams({
    targetUrl: params.targetUrl,
    profileId: params.profileId,
    browserType: params.browserType,
    preloadPath: params.preloadPath,
    theme: params.themeColor,
    homeUrl: params.homeUrl
  }).toString();
  return `file://${htmlPath}?${query}`;
}
function getWindowSize(profile) {
  if (profile.deviceType === "mobile") {
    return { width: 420, height: 900 };
  }
  return { width: 1280, height: 800 };
}
async function configureProxy(profileId, proxy) {
  if (!proxy) return;
  const partitionName = `persist:joe-${profileId}`;
  const ses = electron.session.fromPartition(partitionName);
  const proxyRules = `${proxy.type}://${proxy.host}:${proxy.port}`;
  await ses.setProxy({ proxyRules });
  if (proxy.username || proxy.password) {
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      callback({ requestHeaders: details.requestHeaders });
    });
  }
}
async function detectProxyGeo(proxy) {
  try {
    console.log(`[BrowserLauncher] Auto-detecting proxy location for ${proxy.host}:${proxy.port}...`);
    const proxyUrl = `${proxy.type}://${proxy.username ? proxy.username + ":" + proxy.password + "@" : ""}${proxy.host}:${proxy.port}`;
    const geoData = await fetchGeoThroughProxy(proxyUrl);
    if (geoData) {
      return {
        timezone: geoData.timezone || "America/New_York",
        language: countryCodeToLanguage(geoData.countryCode),
        country: geoData.country || "Unknown"
      };
    }
    const fallbackData = await fetchGeoFallback(proxyUrl);
    if (fallbackData) {
      return {
        timezone: fallbackData.timezone || "America/New_York",
        language: countryCodeToLanguage(fallbackData.country),
        country: fallbackData.country || "Unknown"
      };
    }
    return null;
  } catch (err) {
    console.error("[BrowserLauncher] Proxy geo detection failed:", err);
    return null;
  }
}
function fetchGeoThroughProxy(proxyUrl) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 5e3);
    try {
      const url = new URL("http://ip-api.com/json/?fields=status,country,countryCode,timezone");
      const proxyOptions = {
        method: "GET",
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search
      };
      const parsedProxy = new URL(proxyUrl);
      const proxyHost = parsedProxy.hostname;
      const proxyPort = parseInt(parsedProxy.port) || 8080;
      const http = require("http");
      const req = http.request({
        host: proxyHost,
        port: proxyPort,
        method: "CONNECT",
        path: `${url.hostname}:80`,
        headers: proxyOptions
      });
      req.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        const getRequest = http.request({
          createConnection: () => socket,
          hostname: url.hostname,
          port: 80,
          path: url.pathname + url.search,
          method: "GET",
          headers: { "Host": url.hostname }
        }, (getResponse) => {
          let data = "";
          getResponse.on("data", (chunk) => {
            data += chunk;
          });
          getResponse.on("end", () => {
            clearTimeout(timeout);
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
        getRequest.on("error", () => {
          clearTimeout(timeout);
          resolve(null);
        });
        getRequest.end();
      });
      req.on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
      req.setTimeout(5e3, () => {
        req.destroy();
        clearTimeout(timeout);
        resolve(null);
      });
      req.end();
    } catch (e) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}
function fetchGeoFallback(proxyUrl) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 5e3);
    try {
      const http = require("http");
      const parsedProxy = new URL(proxyUrl);
      const proxyHost = parsedProxy.hostname;
      const proxyPort = parseInt(parsedProxy.port) || 8080;
      const req = http.request({
        host: proxyHost,
        port: proxyPort,
        method: "CONNECT",
        path: "ipinfo.io:443"
      });
      req.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        const https = require("https");
        const getRequest = https.request({
          socket,
          hostname: "ipinfo.io",
          path: "/json",
          method: "GET",
          headers: { "Host": "ipinfo.io" }
        }, (getResponse) => {
          let data = "";
          getResponse.on("data", (chunk) => {
            data += chunk;
          });
          getResponse.on("end", () => {
            clearTimeout(timeout);
            try {
              const parsed = JSON.parse(data);
              resolve({
                country: parsed.country,
                timezone: parsed.timezone,
                countryCode: parsed.country
              });
            } catch (e) {
              resolve(null);
            }
          });
        });
        getRequest.on("error", () => {
          clearTimeout(timeout);
          resolve(null);
        });
        getRequest.end();
      });
      req.on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
      req.setTimeout(5e3, () => {
        req.destroy();
        clearTimeout(timeout);
        resolve(null);
      });
      req.end();
    } catch (e) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}
function countryCodeToLanguage(countryCode) {
  const map = {
    "US": "en-US",
    "GB": "en-GB",
    "AU": "en-AU",
    "CA": "en-CA",
    "DE": "de-DE",
    "AT": "de-AT",
    "CH": "de-CH",
    "FR": "fr-FR",
    "BE": "fr-BE",
    "ES": "es-ES",
    "MX": "es-MX",
    "AR": "es-AR",
    "IT": "it-IT",
    "PT": "pt-PT",
    "BR": "pt-BR",
    "NL": "nl-NL",
    "RU": "ru-RU",
    "JP": "ja-JP",
    "KR": "ko-KR",
    "CN": "zh-CN",
    "TW": "zh-TW",
    "HK": "zh-HK",
    "IN": "en-IN",
    "PL": "pl-PL",
    "TR": "tr-TR",
    "SE": "sv-SE",
    "NO": "nb-NO",
    "DK": "da-DK",
    "FI": "fi-FI",
    "UA": "uk-UA",
    "CZ": "cs-CZ",
    "RO": "ro-RO",
    "HU": "hu-HU",
    "TH": "th-TH",
    "VN": "vi-VN",
    "ID": "id-ID",
    "MY": "ms-MY",
    "PH": "fil-PH",
    "SA": "ar-SA",
    "AE": "ar-AE",
    "IL": "he-IL",
    "GR": "el-GR"
  };
  return map[countryCode] || "en-US";
}
function buildAndWriteStealthPreload(profile) {
  try {
    const script = buildStealthPreloadScript(profile);
    if (!script) {
      console.error("[BrowserLauncher] Failed to build stealth preload script");
      return null;
    }
    const preloadDir = path__namespace.join(electron.app.getPath("userData"), "stealth-preloads");
    fs__namespace.mkdirSync(preloadDir, { recursive: true });
    const preloadPath = path__namespace.join(preloadDir, `stealth-${profile.id}.js`);
    fs__namespace.writeFileSync(preloadPath, script, "utf8");
    return preloadPath;
  } catch (err) {
    console.error("[BrowserLauncher] Failed to write stealth preload:", err);
    return null;
  }
}
function buildStealthPreloadScript(profile) {
  const fp = profile.fingerprint;
  if (!fp) return null;
  const browserType = profile.browserType;
  const isFirefox = browserType === "firefox";
  const isBrave = browserType === "brave";
  const isEdge = browserType === "edge";
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

    // Firefox has InstallTrigger
    Object.defineProperty(navigator, 'InstallTrigger', {
      get: () => ({ getType: () => 'extension', supported: true })
    });

    // Firefox MozAppearance
    try {
      Object.defineProperty(document.documentElement.style, 'MozAppearance', {
        get: () => '',
        set: () => {}
      });
    } catch(e) {}
  ` : "";
  const braveOverrides = isBrave ? `
    // Brave has its own chrome.brave object
    if (window.chrome) {
      try {
        Object.defineProperty(window.chrome, 'brave', {
          get: () => ({
            isBrave: () => Promise.resolve(true),
            getBraveCoreVersion: () => Promise.resolve('1.60.114'),
            getPDFViewerDetails: () => Promise.resolve({ viewer: 'brave' }),
          }),
          configurable: true,
        });
      } catch(e) {}
    }
  ` : "";
  const edgeOverrides = isEdge ? `
    // Edge has specific objects
    if (window.chrome) {
      try {
        Object.defineProperty(window.chrome, 'edge', {
          get: () => ({
            searchBox: {},
          }),
          configurable: true,
        });
      } catch(e) {}
    }
  ` : "";
  const webrtcPolicy = fp.webRtcPolicy === "disable" ? `
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
  ` : fp.webRtcPolicy === "proxy" ? `
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
  ` : "";
  const script = `
// ============================================================
// JoeBrowser Stealth Preload Script
// Profile: ${profile.name} (${browserType})
// Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
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

    // Override Date.prototype.getTimezoneOffset
    const origGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    const targetTZ = targetTimezone;
    try {
      const targetDate = new Date(Date.UTC(2024, 0, 1));
      const utcDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(targetDate.toLocaleString('en-US', { timeZone: targetTZ }));
      const offset = (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
      Date.prototype.getTimezoneOffset = function() {
        return offset;
      };
    } catch(e) {}

    // Override Date.prototype.toString to show target timezone
    const origToString = Date.prototype.toString;
    Date.prototype.toString = function() {
      try {
        return this.toLocaleString('en-US', { timeZone: targetTZ });
      } catch(e) {
        return origToString.call(this);
      }
    };
  } catch(e) { console.warn('Timezone override failed:', e); }

  // ===== WEBGL OVERRIDES =====
  try {
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 0x9245) return ${JSON.stringify(fp.webglVendor)};
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

    // Override navigator.getBattery (Chrome-specific)
    if (navigator.getBattery) {
      const origGetBattery = navigator.getBattery;
      Object.defineProperty(navigator, 'getBattery', {
        get: () => function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1.0,
            addEventListener: function() {},
            removeEventListener: function() {},
          });
        }
      });
    }

    // Override navigator.connection
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 });
      Object.defineProperty(navigator.connection, 'downlink', { get: () => 10 });
      Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
      Object.defineProperty(navigator.connection, 'saveData', { get: () => false });
    }
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

  // ===== SCREEN ORIENTATION =====
  try {
    if (screen.orientation) {
      Object.defineProperty(screen.orientation, 'type', { get: () => 'landscape-primary' });
      Object.defineProperty(screen.orientation, 'angle', { get: () => 0 });
    }
  } catch(e) {}

  // ===== BATTERY API FAKE =====
  try {
    if (!navigator.getBattery) {
      Object.defineProperty(navigator, 'getBattery', {
        get: () => function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1.0,
            addEventListener: function() {},
            removeEventListener: function() {},
          });
        }
      });
    }
  } catch(e) {}

  console.log('[JoeBrowser] Stealth fingerprint applied for profile: ${profile.name}');

})();
`;
  return script;
}
function getUAInfo(browserType, os, deviceType) {
  const chromeVersion = "131.0.6778.139";
  const firefoxVersion = "133.0";
  const edgeVersion = "131.0.2903.86";
  let platform;
  let osInfo;
  if (deviceType === "mobile") {
    switch (os) {
      case "android":
        platform = "Linux armv81";
        osInfo = "Linux; Android 14; Pixel 8";
        break;
      case "ios":
        platform = "iPhone";
        osInfo = "iPhone; CPU iPhone OS 18_1 like Mac OS X";
        break;
      default:
        platform = "Linux armv81";
        osInfo = "Linux; Android 14; Pixel 8";
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
  const webglOptions = [
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)" }
  ];
  const webglIdx = Math.floor(Math.random() * webglOptions.length);
  const firefoxWebglOptions = [
    { vendor: "NVIDIA Corporation", renderer: "GeForce RTX 3060/PCIe/SSE2" },
    { vendor: "NVIDIA Corporation", renderer: "GeForce GTX 1660 SUPER/PCIe/SSE2" },
    { vendor: "Intel", renderer: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)" },
    { vendor: "X.Org", renderer: "AMD Radeon RX 580 Series (polaris10, LLVM 15.0.7, DRM 3.49, 6.1.0)" }
  ];
  const firefoxWebglIdx = Math.floor(Math.random() * firefoxWebglOptions.length);
  switch (browserType) {
    case "chrome":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else if (deviceType === "mobile" && os === "ios") {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${chromeVersion} Mobile/15E148 Safari/604.1`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = "Google Inc.";
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;
    case "brave":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = "Google Inc.";
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;
    case "firefox":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Android 14; Mobile; rv:${firefoxVersion}) Gecko/${firefoxVersion} Firefox/${firefoxVersion}`;
      } else if (deviceType === "mobile" && os === "ios") {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${firefoxVersion} Mobile/15E148 Safari/605.1.15`;
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
      webglVendor = firefoxWebglOptions[firefoxWebglIdx].vendor;
      webglRenderer = firefoxWebglOptions[firefoxWebglIdx].renderer;
      break;
    case "edge":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36 EdgA/${edgeVersion}`;
      } else if (deviceType === "mobile" && os === "ios") {
        ua = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/${edgeVersion} Mobile/15E148 Safari/605.1.15`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
      }
      vendor = "Google Inc.";
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;
    case "chromium":
      if (deviceType === "mobile" && os === "android") {
        ua = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Mobile Safari/537.36`;
      } else {
        ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      }
      vendor = "Google Inc.";
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
      break;
    default:
      ua = `Mozilla/5.0 (${osInfo}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      vendor = "Google Inc.";
      webglVendor = webglOptions[webglIdx].vendor;
      webglRenderer = webglOptions[webglIdx].renderer;
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
  const hardwareConcurrency = deviceType === "mobile" ? 8 : [4, 8, 12, 16][Math.floor(Math.random() * 4)];
  const deviceMemory = deviceType === "mobile" ? 8 : [4, 8, 16][Math.floor(Math.random() * 3)];
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
  if (process.platform !== "darwin" && !mainWindow) {
    electron.app.quit();
  }
});
process.on("uncaughtException", (err) => {
  console.error("[Main] Uncaught exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Main] Unhandled rejection:", reason);
});
