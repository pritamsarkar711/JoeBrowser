# StealthBrowser

**Open-source anti-detect browser for Windows (and macOS/Linux).**

StealthBrowser is a profile-based launcher that creates **fully isolated browser environments** — each with its own encrypted storage, realistic **fingerprint masking**, and per-profile **proxy** support — for Google Chrome, Microsoft Edge, Brave and Mozilla Firefox.

**Everything runs locally. No cloud services, no telemetry, no account, no phone-home of any kind.**

![License: MIT](https://img.shields.io/badge/license-MIT-green) ![Electron](https://img.shields.io/badge/Electron-37-blue) ![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)

---

## Features

| Area | What you get |
|---|---|
| **Profiles** | Create, duplicate, delete; tags + notes; search & filter; per-profile isolation of cookies, localStorage, IndexedDB, cache and extensions |
| **Fingerprints** | Auto-generate a *realistic, internally consistent* fingerprint (UA, platform, screen, CPU/RAM, timezone, languages, WebGL GPU, fonts, noise seeds) from one seeded RNG — reproducible by design |
| **Stealth engine** | A built-in Manifest V3 extension (Chromium **and** Firefox) overrides `navigator`, `screen`, WebGL, canvas, audio, WebRTC, fonts and geolocation at `document_start` in the MAIN world; wrapped functions report `[native code]` |
| **Proxies** | HTTP / HTTPS / SOCKS5 / SOCKS4 with auth, custom PAC support, local relay so credentials never reach the browser, and a built-in **Test Proxy** button (exit IP + geo + latency) |
| **Verification** | Built-in **fingerprint test page** (served locally) that shows every spoofed value: UA, screen, WebGL hash, canvas hash, audio hash, font list, WebRTC leak probe, geolocation |
| **Security** | Master password on first run → PBKDF2-SHA256 (250k iterations) → AES-256-GCM encryption of the whole profile database; profile payloads are useless without the password |
| **Browser engines** | Chrome, Edge, Brave (Chromium) and Firefox — auto-detected on Windows (registry + common paths), custom executable override per profile |
| **Build** | `electron-builder` NSIS installer + portable `.exe` for Windows x64 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Renderer (React 19 + MUI, Vite)                             │
│  Sidebar · Profile editor (Fingerprint/Proxy/Advanced/Launch)│
│  Settings · Auto-generate dialog · Test proxy · Toasts      │
└──────────────▲──────────────────────────────────────────────┘
               │ contextBridge (src/preload)
┌──────────────┴──────────────────────────────────────────────┐
│ Main process (Electron, src/main)                           │
│  database.ts      better-sqlite3 + AES-256-GCM (app layer)  │
│  masterKey.ts     PBKDF2 master-password → wrapped DB key    │
│  fingerprintGenerator.ts  seeded RNG, UA library, GPU/font   │
│                         pools → consistent fingerprints     │
│  browserLauncher.ts      spawn + flags + session tracking    │
│  extensionBuilder.ts     build MV3 ext per profile (temp),   │
│                         .xpi packaging for Firefox           │
│  proxyRelay.ts           local HTTP/SOCKS relay w/ auth      │
│  pacServer.ts / testPageServer.ts  local servers             │
└──────────────┬──────────────────────────────────────────────┘
               │ spawn (flags / prefs)
        Chrome · Edge · Brave · Firefox  (per-profile user data dir)
```

### Data directory

```
%APPDATA%/StealthBrowser/
├── profiles.db              # SQLite; every payload AES-256-GCM encrypted
├── master.key               # wrapped DB key + verifier (never the password)
├── settings.json            # non-sensitive UI settings (theme, lang, data dir)
├── profiles/<id>/userData   # browser user data (cookies, cache, ...) — isolated
└── logs/app.log             # rotating local log
```

---

## Getting started

### Prerequisites

- **Node.js 18+** (20/22 recommended) and npm
- **Windows 10/11** for the `.exe` build; dev/run works on macOS/Linux too
- At least one of Chrome / Edge / Brave / Firefox installed (or set a custom executable path per profile)

### Install & run (dev)

```bash
npm install          # better-sqlite3 downloads a prebuilt binary for Electron — no Visual Studio needed
npm run dev          # electron-vite dev server + Electron window
```

> If your machine blocks GitHub downloads (e.g. a corporate proxy), install with
> `npm install --ignore-scripts`, then `npm rebuild better-sqlite3` — you need a C++ toolchain
> for the source build in that case.

### Build the Windows installer + portable .exe

```bash
npm run dist:win     # NSIS installer + portable exe in dist/
npm run build:win    # installer only
npm run build:win:portable   # portable only
npm run pack         # unpacked directory (fast smoke-test build)
```

Outputs land in `dist/`:

- `StealthBrowser-1.0.0-x64.exe` — NSIS installer
- `StealthBrowser-1.0.0-portable.exe` — portable build

### Tests

```bash
npm run selftest:node    # 42 checks: crypto, master password, DB, fingerprint engine, extension builder, proxy relay
npm run test:generator   # fingerprint determinism & UA library
npm run test:extension   # loads the REAL stealth script into a DOM and verifies every spoof
npm run typecheck
```

---

## First run

1. **Create your master password.** This encrypts everything. There is **no recovery** — store it somewhere safe.
2. Click **New profile**, pick a name and a browser engine.
3. Open the **Fingerprint** tab → **Auto-generate realistic fingerprint** → pick device/OS/browser → the engine fills all fields with consistent values.
4. (Optional) **Proxy** tab → enable, enter host/port/auth → **Test proxy** → green = good.
5. **Launch** tab → **Launch profile**. The browser opens with:
   - its own `--user-data-dir` (complete isolation),
   - the stealth extension loaded from a temp dir (removed when the browser exits),
   - proxy flags/PAC/prefs applied,
   - telemetry, sync, first-run and update noise disabled.
6. Hit **Fingerprint test** to open the local verification page, then browse real sites and check e.g. `browserleaks.com` / `amiunique.org`.

---

## How the stealth extension works

The extension lives in [`src/extension/`](src/extension) and is **built locally at every launch**:

1. `extensionBuilder.ts` reads the profile's fingerprint,
2. injects it into `stealth-main.js` (replacing `__INJECT_CONFIG__`),
3. writes a unique temp directory with `manifest.json` (MV3),
4. Chromium: loaded with `--load-extension=<tempdir>`; Firefox: packaged into a `.xpi` and dropped into the profile's `extensions/` folder (with `xpinstall.signatures.required=false` for the local, unsigned add-on).

The script runs **at `document_start` in the MAIN world** (`"world": "MAIN"`, supported in Chrome 111+ and Firefox 128+), so page scripts observe the spoofed values first and can never read the real ones. Overrides include:

- `navigator`: `userAgent`, `appVersion`, `platform`, `vendor`, `vendorSub`, `product`, `productSub`, `language`, `languages`, `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`, `webdriver=false`, `oscpu` (Firefox), `plugins`/`mimeTypes` (realistic PDF plugin lists), `userAgentData` (Client Hints incl. `getHighEntropyValues`)
- `screen`: `width`, `height`, `availWidth`, `availHeight`, `colorDepth`, `pixelDepth` + `devicePixelRatio`
- **WebGL**: `UNMASKED_VENDOR_WEBGL` / `UNMASKED_RENDERER_WEBGL` on WebGL1 **and** WebGL2
- **Canvas 2D**: seeded sub-pixel jitter on `fillText`/`strokeText`/`fillRect`/`arc`/`drawImage` + per-pixel noise on `getImageData`; seeded `measureText` width noise for font probes
- **Audio**: seeded inaudible noise on `AudioBuffer.getChannelData`
- **WebRTC**: `createOffer`/`createAnswer` SDP candidates stripped, `addIceCandidate` filters srflx/host/relay
- **Fonts**: `@font-face`/`local()` declarations + `FontFaceSet.forEach/entries/iterator/load/check` restricted to the profile's font list
- **Geolocation**: blocked or spoofed (with matching `permissions.query` behavior)
- `Date.getTimezoneOffset` (+ `--timezone-for-testing` / Firefox prefs for `Intl`)

All wrapped functions return `function name() { [native code] }` from `Function.prototype.toString` (and direct `toString` calls).

### Firefox specifics

`navigator.userAgent` is `[LegacyUnforgeable]` in Firefox, so the JS override is backed by prefs written into the profile's `user.js`:

```
general.useragent.override / general.platform.override / general.oscpu.override
intl.accept_languages          privacy.resistFingerprinting=false
dom.webdriver.enabled=false    webdriver.remote.enabled=false
extensions.enabledScopes=15    xpinstall.signatures.required=false
network.proxy.type / socks / autologin
telemetry prefs (all off)      app.update.* = false
```

---

## Proxy deployment matrix

| Proxy config | Chromium | Firefox |
|---|---|---|
| HTTP/HTTPS, no auth | `--proxy-server=http://host:port` | `network.proxy.*` prefs |
| HTTP/HTTPS, auth | local relay → `--proxy-server=http://127.0.0.1:port` | local relay + `signon.autologin.proxy` |
| SOCKS5/SOCKS4, no auth | `--proxy-server=socks5://host:port` | `network.proxy.socks*` prefs |
| SOCKS5/SOCKS4, auth | local SOCKS relay on 127.0.0.1 (browser gets no creds) | same relay + prefs |
| Custom PAC | `--proxy-pac-url=<url>` | `network.proxy.autoconfig_url` |
| Local `.pac` file | served by the built-in PAC server on 127.0.0.1 | same |

The **Test Proxy** button runs a real request *through* the proxy to `api.ipify.org` and geolocates the exit IP with `ip-api.com` (both free, no keys; geo lookup is optional).

---

## Browser version management

StealthBrowser detects system browsers (Windows registry `App Paths` + standard paths; macOS/Linux common paths) and supports a **custom executable path per profile** (`Advanced` tab). The architecture separates "find browser" (`browserDetector.ts`) from "launch" (`browserLauncher.ts`), so a future **Browser Versions** tab can download Chromium builds into the data directory and point profiles at them without touching anything else.

---

## Security notes

- The master password never touches disk. The random 32-byte **database key** is wrapped with a PBKDF2-derived key (250 000 iterations, per-file random salt, HMAC verifier). Forgetting the password = data is gone (by design).
- Profile rows are AES-256-GCM encrypted; only non-sensitive index columns (`id`, `name`, `browser_type`, `updated_at`) are plaintext so the sidebar can render while locked.
- No analytics, no telemetry, no auto-update, no network calls except: proxy tests (through your proxy), optional IP geo lookup, and the sites you visit in launched browsers.
- `better-sqlite3` is pinned to a version with **prebuilt Electron binaries** — `npm install` works without a C++ toolchain on Windows.

---

## Project layout

```
├── build/                     # app icon (PNG, used for .exe icon + tray)
├── scripts/
│   ├── build-extension.ts     # build demo extension output (inspection)
│   ├── test-generator.ts      # fingerprint engine tests (node)
│   ├── test-extension-dom.ts  # stealth script DOM tests (jsdom)
│   └── selftest.ts            # plain-node entry for the self-test suite
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # window, lifecycle, single-instance, tray
│   │   ├── ipcHandlers.ts     # all IPC handlers
│   │   ├── selftest.ts        # 42-check engine test suite
│   │   ├── paths.ts / logger.ts
│   │   ├── crypto/            # cipher.ts (AES-256-GCM, PBKDF2), masterKey.ts
│   │   ├── db/                # database.ts (SQLite + encryption), profileRepository.ts
│   │   ├── services/          # fingerprintGenerator, uaDatabase, browserDetector,
│   │   │                      # browserLauncher, extensionBuilder, proxyRelay,
│   │   │                      # pacServer, testPageServer, firefoxProfile, proxyTester
│   │   └── assets/fingerprint-test.html   # local verification page
│   ├── preload/               # contextBridge API (typed)
│   ├── renderer/              # React 19 + MUI app (Vite)
│   │   └── src/components/    # Sidebar, ProfileEditor, tabs, dialogs, ...
│   ├── extension/             # stealth extension template (MV3)
│   │   ├── manifest.chrome.json / manifest.firefox.json
│   │   ├── stealth-main.js    # the whole spoofing engine (config injected)
│   │   ├── background.js
│   │   └── config.template.js
│   └── shared/                # types.ts, ipc.ts (contracts across processes)
├── electron.vite.config.ts / tsconfig.*.json
└── package.json               # electron-builder config (NSIS + portable)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `--load-extension` ignored on Chrome 137+ | StealthBrowser passes `--disable-features=Translate,DisableLoadExtensionCommandLineSwitch` automatically (Chrome's enterprise switch that re-enables CLI-loaded extensions). |
| Extension not injected in Firefox | Ensure the profile's `extensions/` folder contains `stealth-engine@stealthbrowser.local.xpi`; check `about:debugging#/runtime/this-firefox` after first launch. |
| `npm install` fails on better-sqlite3 | Use a mirror or install the prebuild manually (see *Install & run*). The pinned version ships Electron ABI 136 prebuilds for win32-x64. |
| Proxy works in Test Proxy but not in the browser | Check the profile's Proxy tab is **enabled** and the proxy supports the scheme; SOCKS4 is converted to SOCKS5 via the local relay. |
| Fingerprint test page says extension NOT active | Only launch via **Fingerprint test** button; the page must be opened from a profile launch, not by hand. |
| Firefox shows a "new profile" first-run page | Run the profile once, close it, then relaunch — `browser.startup.homepage_override.mstone` gets set on first run. |

---

## Roadmap ideas

- Browser Versions tab (download pinned Chromium builds into the data dir)
- Proxy geolocation auto-pairing with fingerprints (timezone/language matching)
- Fingerprint "clone" from a reference device
- Drag-and-drop profile reordering
- Linux/macOS installers (the app already runs there)

---

## License

MIT — see [LICENSE](LICENSE). StealthBrowser is provided for privacy research, QA automation and legitimate multi-accounting workflows. You are responsible for complying with the ToS of the sites you visit. This project has **no affiliation with** Google, Microsoft, Brave Software or Mozilla.
