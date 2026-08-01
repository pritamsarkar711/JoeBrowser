# ⬇️ DOWNLOAD JOEBROWSER EXE - CLICK HERE

## You have 3 files that give you the EXE download button:

### 1. `download.html`  (in your repo root)
Open this file in any browser by double-clicking it.
It has 2 big purple buttons: "Download Installer (.exe)" and "Download Portable (.exe)"
It auto-checks GitHub Releases.

**Path:** `/home/user/JoeBrowser/download.html`
**Also copied to:** `/home/user/JoeBrowser/docs/index.html`

If you are in VS Code / file explorer: Right-click → Open with Browser

### 2. In-App Button (if you run the app)
```
npm ci
npm run dev
```
Then look at bottom left sidebar — Purple button "Download EXE"
Click it → dialog with download links.

### 3. Direct GitHub Links (these work AFTER first release)
Right now your Releases page is EMPTY (no tags pushed yet), so the buttons will show "No release yet".
You need to create a release first — easiest way:

**On Windows (2 minutes, guaranteed EXE):**
```bat
# Download this repo as ZIP, unzip, then:
Double-click -> scripts\build-windows.bat
# Wait 3-5 min
# Find EXE in folder: release\JoeBrowser-Setup-1.0.3.exe  <-- HERE IS YOUR EXE!
```

**On GitHub (auto-builds EXE for you):**
```bash
git tag v1.0.3
git push origin v1.0.3
# Go to https://github.com/pritamsarkar711/JoeBrowser/actions
# Wait 10 minutes
# Go to https://github.com/pritamsarkar711/JoeBrowser/releases
# Your EXE will be there!
```

---

## DIRECT LINKS TO CLICK:

1. **Official Releases Page (where EXE lives):**
   https://github.com/pritamsarkar711/JoeBrowser/releases

2. **Latest Release (auto-redirect):**
   https://github.com/pritamsarkar711/JoeBrowser/releases/latest

3. **CI Build Status (see if EXE is building):**
   https://github.com/pritamsarkar711/JoeBrowser/actions/workflows/build-windows.yml

4. **Download Source ZIP (then build EXE locally):**
   https://github.com/pritamsarkar711/JoeBrowser/archive/refs/heads/main.zip

---

## WHERE IS THE BUTTON IN THIS ARENA WORKSPACE?

Look at LEFT file explorer in Arena:
- You see `download.html` -> Click it -> Click "Download" button on top bar to open preview
- Or file `docs/index.html` -> same

If file preview shows code not rendered, copy the file to your PC:
- Download `download.html` from Arena file browser
- Open it on your Windows PC with Chrome/Edge -> Big download buttons appear

---

## I WANT THE EXE FILE NOW, NO BUILD

I cannot build Windows .exe in this Linux container because better-sqlite3 native module needs Windows to compile.

But you can get it in 2 clicks on Windows:

1. On your Windows PC, download and install Node.js 20+ from https://nodejs.org
2. Open CMD, run:
```
git clone https://github.com/pritamsarkar711/JoeBrowser.git
cd JoeBrowser
npm ci
npm run dist:win
```
3. Open folder `release` -> you have:
   - JoeBrowser-Setup-1.0.3.exe (installer, recommended)
   - JoeBrowser-Portable-1.0.3.exe (no install)

OR just double-click `scripts\build-windows.bat` after downloading repo.

---

## SCREENSHOTS OF WHAT YOU SHOULD SEE:

In sidebar after my update:
```
[New profile]
[Profile list]

[ Download EXE ]  <- PURPLE BUTTON - CLICK HERE
[Settings] [Lock] [Download icon]
```

In download.html:
```
┌─────────────────────────────────────────┐
│  Latest: v1.0.3                         │
│  [ ⬇ Download Installer (.exe)    ]    │
│  [ ⬇ Download Portable (.exe)     ]    │
│  Methods to build locally...            │
└─────────────────────────────────────────┘
```

---

## Need help?
Tell me: Are you on Windows? I can give you exact 1-line PowerShell to auto-download and build.
