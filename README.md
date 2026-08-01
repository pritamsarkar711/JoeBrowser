# JoeBrowser – Open-Source Anti-Detect Browser Manager

Create and manage fully isolated browser profiles (Chrome, Edge, Brave, Firefox)
with per-profile fingerprint spoofing, proxy support (HTTP/SOCKS/PAC), encrypted
profile storage, and an MV3 stealth extension.

## ⬇️ Download the EXE (Windows)

> **One-click download page:** open `download.html` locally or visit GitHub Pages if enabled: `docs/index.html`

### Official Releases (recommended)
Windows installers are published on the **Releases** page:

> **https://github.com/pritamsarkar711/JoeBrowser/releases**

- `JoeBrowser-Setup-<version>.exe` — NSIS installer (recommended, creates shortcuts, per-user install, no admin needed)
- `JoeBrowser-Portable-<version>.exe` — portable, no installation needed, run from USB

**Direct links (latest):**
- Installer: `https://github.com/pritamsarkar711/JoeBrowser/releases/latest/download/JoeBrowser-Setup-1.0.0.exe`
- Portable: `https://github.com/pritamsarkar711/JoeBrowser/releases/latest/download/JoeBrowser-Portable-1.0.0.exe`

> If Releases page is empty, use Method 2 or 3 below to generate the EXE.

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

### Method 1 — Build EXE on Windows in 2 minutes (works 100%)
This is the fastest way if no release exists yet:

**Option A: Double-click batch file**
```
scripts\build-windows.bat   -> double click
```

**Option B: Manual commands**
```bash
git clone https://github.com/pritamsarkar711/JoeBrowser.git
cd JoeBrowser
npm ci
npm run dist:win
# exe appears in release/ folder:
# release/JoeBrowser-Setup-1.0.0.exe
# release/JoeBrowser-Portable-1.0.0.exe
```

**Option C: PowerShell**
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/build-windows.ps1
```

Requirements: Node.js 20+ (https://nodejs.org), Windows 10/11 x64. No other dependencies.

### Method 2 — Trigger CI build (for maintainers)
The repo has a GitHub Actions workflow that builds Windows EXE on `windows-latest` runner (where native modules work).

1. **Tag push (auto-release):**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   # Wait 8-12 min, check Actions tab -> Build Windows EXE
   # EXE is auto-published to Releases
   ```

2. **Manual dispatch (artifacts only, no release):**
   Go to Actions → "Build Windows EXE" → Run workflow → pick branch → Run. Artifacts `JoeBrowser-Windows-x64` will contain exe files for 14 days.

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
npm run dist:win  # build + Windows exe (needs Windows, or CI)
```

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
