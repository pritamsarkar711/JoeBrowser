# JoeBrowser – Open-Source Anti-Detect Browser Manager

Create and manage fully isolated browser profiles (Chrome, Edge, Brave, Firefox)
with per-profile fingerprint spoofing, proxy support (HTTP/SOCKS/PAC), encrypted
profile storage, and an MV3 stealth extension.

## 🆕 What's New in v4.0.0

This is a major release with critical bug fixes and significant new features:

- **Fixed critical startup crash on Windows** — dynamic `require()` bug that prevented the app from launching
- **135+ user agent entries** — 3× more browser versions covered for fingerprint diversity
- **Enhanced fingerprint generation** — more GPUs, screen resolutions, timezones, and font sets
- **Intl.DateTimeFormat timezone spoofing** for Firefox profiles
- **Canvas double-noise fix** — eliminated redundant canvas noise injection
- **navigator.doNotTrack and window.chrome spoofing** — better browser identity masking
- **StorageManager.estimate spoofing** — prevents storage quota fingerprinting
- **Fixed PAC server IP bypass vulnerability** — proxy auto-config no longer leaks real IP
- **Fixed SOCKS4 proxy handling** — proper SOCKS4 handshake and error recovery
- **Fixed non-atomic key file write** — master key file is now written atomically (write-rename) to prevent corruption
- **Improved UI/UX** — compact layout, responsive design, reduced text density
- **Profile creation now supports OS and device selection** — simulate different platforms
- **Sort and search improvements in sidebar** — faster profile lookup and organization
- **Dangerous launch flags warning** — alerts when using risky Chromium flags
- **Chip-based tags in Advanced tab** — cleaner multi-value editing
- **Better dark mode theming** — refined contrast and color palette

## ⬇️ Download

> **One-click download page:** open `download.html` locally or visit GitHub Pages if enabled: `docs/index.html`

### Official Releases (recommended)
Installers are published on the **Releases** page:

> **https://github.com/pritamsarkar711/JoeBrowser/releases**

| Platform | Files | Notes |
|----------|-------|-------|
| **Windows** | `JoeBrowser-Setup-<ver>.exe` | NSIS installer (recommended) |
| **Windows** | `JoeBrowser-Portable-<ver>.exe` | Portable, no install, USB-friendly |
| **macOS** | `JoeBrowser-<ver>-arm64.dmg` | Apple Silicon (M1/M2/M3/M4) |
| **macOS** | `JoeBrowser-<ver>-x64.dmg` | Intel Macs |
| **Linux** | `JoeBrowser-<ver>-x64.AppImage` | Universal, `chmod +x` then run |
| **Linux** | `JoeBrowser-<ver>-amd64.deb` | Ubuntu/Debian: `sudo dpkg -i` |
| **Linux** | `JoeBrowser-<ver>-x86_64.rpm` | Fedora/RHEL: `sudo rpm -i` |

**Direct links (latest):**
- Installer: `https://github.com/pritamsarkar711/JoeBrowser/releases/latest/download/JoeBrowser-Setup-4.0.0.exe`
- Portable: `https://github.com/pritamsarkar711/JoeBrowser/releases/latest/download/JoeBrowser-Portable-4.0.0.exe`

> If Releases page is empty, use Method 2 or 3 below to generate the installer.

### 🪟 Windows won't open the app? Read this first (v4.0.0 fix)

The most common reasons a downloaded JoeBrowser `.exe` "does nothing" on Windows — and what to do:

1. **SmartScreen "Windows protected your PC"** — JoeBrowser is **not code-signed** (open source, MIT), so the first time you run a freshly downloaded `.exe`, Windows shows a blue warning. This is normal.
   - Click **More info → Run anyway** (or on the install screen **Yes / Allow**).
2. **Windows Defender quarantines the file** — anti-detect tools are sometimes flagged as *PUA* by antivirus engines, even though the source is public.
   - Open **Windows Security → Virus & threat protection → Protection history**, find JoeBrowser and choose **Allow on device**.
   - Or add an exclusion: **Virus & threat protection → Exclusions → Add folder/file**.
3. **The window opens but shows nothing / closes instantly** — the app now writes a crash report:
   - Log: `%APPDATA%\JoeBrowser\logs\app.log` and `%APPDATA%\JoeBrowser\logs\crash.log`
   - Reinstall from the Releases page (never copy a half-downloaded `.exe`), then retry.
4. **App shows "Starting JoeBrowser..." forever** — this means the app started but the renderer failed to initialize. After 15 seconds a diagnostic screen will appear. Common causes:
   - Native SQLite module failed to load → reinstall the app
   - Another instance is already running → check Task Manager / system tray
   - Data directory permissions → delete `%APPDATA%\JoeBrowser` and relaunch
5. **Antivirus deleted the file while downloading** — check **Protection history** / quarantine before re-downloading.
6. **Still broken?** Open an issue at https://github.com/pritamsarkar711/JoeBrowser/issues and attach `crash.log` — that tells us exactly what happened.

Since **v4.0.0** the app no longer fails silently: startup errors show a dialog with the reason and log paths, the SQLite module gives a clear message instead of an opaque crash, renderer crashes are caught by an ErrorBoundary, and a 15-second boot timeout prevents the app from hanging forever. Cross-platform builds (Linux + macOS) are now supported.

### Local build page
We added a beautiful landing page for downloading:

```
open download.html in browser
# or if you cloned repo:
start download.html   (Windows)
open download.html    (macOS)
xdg-open download.html (Linux)
```

This page automatically checks GitHub API for the newest release and gives you installer vs portable buttons, sizes, download counts, and SHA info.

### Method 1 — Build from source (all platforms)

**Requirements:** Node.js 22+ (https://nodejs.org). No other dependencies.

**Windows:**
```bash
# Option A: Double-click scripts\build-windows.bat
# Option B: PowerShell
powershell -ExecutionPolicy Bypass -File ./scripts/build-windows.ps1
# Option C: Manual
git clone https://github.com/pritamsarkar711/JoeBrowser.git
cd JoeBrowser
npm ci && npm run dist:win
# Output: release/JoeBrowser-Setup-4.0.0.exe + release/JoeBrowser-Portable-4.0.0.exe
```

**macOS:**
```bash
git clone https://github.com/pritamsarkar711/JoeBrowser.git
cd JoeBrowser
bash scripts/build-mac.sh
# Or manually: npm ci && npm run dist:mac
# Output: release/JoeBrowser-4.0.0-arm64.dmg (Apple Silicon)
#         release/JoeBrowser-4.0.0-x64.dmg (Intel)
```

**Linux:**
```bash
git clone https://github.com/pritamsarkar711/JoeBrowser.git
cd JoeBrowser
bash scripts/build-linux.sh
# Or manually: npm ci && npm run dist:linux
# Output: release/JoeBrowser-4.0.0-x64.AppImage
#         release/JoeBrowser-4.0.0-amd64.deb
#         release/JoeBrowser-4.0.0-x86_64.rpm
```

### Method 2 — Trigger CI build (for maintainers)
The repo has a GitHub Actions workflow that builds for **Windows, macOS, and Linux**.

1. **Tag push (auto-release):**
   ```bash
   git tag v4.0.0
   git push origin v4.0.0
   # Wait 10-15 min, check Actions tab -> Build Windows EXE
   # All installers are auto-published to Releases
   ```

2. **Manual dispatch (artifacts only, no release):**
   Go to Actions → "Build All Platforms" → Run workflow → pick branch → Run.
   Artifacts `JoeBrowser-Windows-x64`, `JoeBrowser-Linux-x64`, `JoeBrowser-macOS` will be available for 14 days.

### Method 3 — In-App download button
If you already run JoeBrowser from source (`npm run dev`), there is now a **Download EXE** button in the sidebar:

- Sidebar bottom → purple "Download EXE" button
- Opens dialog that fetches latest release live from GitHub
- Two big buttons for Installer and Portable, plus instructions for local build

### Method 4 — Download source ZIP
If you don't have git:

https://github.com/pritamsarkar711/JoeBrowser/archive/refs/heads/main.zip

Unzip → follow Method 1.

## 🖥️ How the download works technically

- `electron-builder.yml` defines two win targets: `nsis` (installer) and `portable`
- `build/icon.png` used for exe icon
- `release/` folder is gitignored, holds built exe
- The HTML page (`download.html` + `docs/index.html`) queries `https://api.github.com/repos/pritamsarkar711/JoeBrowser/releases/latest` to show real-time download URLs
- In-app `DownloadDialog.tsx` does same query inside Electron
- Batch/PowerShell scripts wrap `npm ci && electron-vite build && electron-builder --win`

## Local development

```bash
npm ci            # install dependencies
npm run dev       # launch in dev mode (electron-vite)
npm run selftest  # headless engine self-tests (no Electron needed)
npm run build     # typecheck + bundle (out/)
npm run pack      # build + unpacked dir (no installer)
npm run dist      # build + installer for current OS
npm run dist:win  # build + Windows exe
npm run dist:mac  # build + macOS dmg (needs macOS)
npm run dist:linux # build + Linux AppImage/deb/rpm
```

**Diagnostics:**
If the app won't start, check these files:
- `%APPDATA%/JoeBrowser/logs/app.log` (or `~/.config/JoeBrowser/logs/app.log` on Linux)
- `%APPDATA%/JoeBrowser/logs/crash.log` — fatal errors written here even if the window never opens
- In dev mode, run `npm run selftest` to verify the core engines work

## Features

- Encrypted-at-rest profile database (AES-256-GCM, master-password protected)
- Deterministic fingerprint generation (UA, screen, WebGL, canvas/audio noise, fonts, timezone, WebRTC)
- Per-profile isolated user-data dirs — multi-accounting safe by construction
- Built-in stealth MV3 extension for Chromium and XPI for Firefox
- Proxy support: HTTP(S), SOCKS4/5 (with auth), PAC files, local relay
- Auto browser detection for Chrome, Edge, Brave and Firefox
- Tray integration, minimize-to-tray, launch-at-startup, close-browsers-on-quit
- One-click EXE download via in-app dialog + landing page

## Screenshots

- Sidebar now includes "Download EXE" button
- Settings + Download dialog shows live release info from GitHub
- `download.html` is a standalone landing page you can host anywhere

## License

MIT
