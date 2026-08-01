# JoeBrowser – Open-Source Anti-Detect Browser Manager

Create and manage fully isolated browser profiles (Chrome, Edge, Brave, Firefox)
with per-profile fingerprint spoofing, proxy support (HTTP/SOCKS/PAC), encrypted
profile storage, and an MV3 stealth extension.

## Download the EXE

Windows installers are published on the **Releases** page:

> **https://github.com/pritamsarkar711/JoeBrowser/releases**

- `JoeBrowser-Setup-<version>.exe` — NSIS installer (recommended)
- `JoeBrowser-Portable-<version>.exe` — portable, no installation needed

## How to build a release (for maintainers)

1. Tag a commit and push it — the CI workflow builds and publishes automatically:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Or run the **"Build Windows EXE"** workflow manually from the Actions tab.

3. Artifacts are also attached to each workflow run while waiting for a release.

## Local development

```bash
npm ci            # install dependencies
npm run dev       # launch in dev mode (electron-vite)
npm run selftest  # headless engine self-tests (no Electron needed)
npm run build     # typecheck + bundle (out/)
```

## Features

- Encrypted-at-rest profile database (AES-256-GCM, master-password protected)
- Deterministic fingerprint generation (UA, screen, WebGL, canvas/audio noise, fonts, timezone, WebRTC)
- Per-profile isolated user-data dirs — multi-accounting safe by construction
- Built-in stealth MV3 extension for Chromium and XPI for Firefox
- Proxy support: HTTP(S), SOCKS4/5 (with auth), PAC files, local relay
- Auto browser detection for Chrome, Edge, Brave and Firefox
- Tray integration, minimize-to-tray, launch-at-startup, close-browsers-on-quit

## License

MIT
