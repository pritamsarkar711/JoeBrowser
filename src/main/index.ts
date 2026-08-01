/**
 * StealthBrowser — Electron main entry.
 *
 * Responsibilities:
 *  - single instance lock
 *  - app data directory setup + logging
 *  - window creation (Material 3 renderer)
 *  - IPC wiring + browser status push events
 *  - process lifecycle (kill all launched browsers on quit)
 *  - headless self-test mode (--selftest)
 */
import { app, BrowserWindow, Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'node:path'
import { logger, initLogger } from './logger'
import * as paths from './paths'
import { loadSettings } from './services/appSettings'
import { registerIpcHandlers, wireStatusEvents } from './ipcHandlers'
import { closeAllProfiles } from './services/browserLauncher'
import { closeTestPageServer } from './services/testPageServer'
import { runSelfTests } from './selftest'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function appIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#101014',
    icon: appIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // External links open in the user's default browser, never in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (e, url) => {
    // The renderer only ever loads our own bundle.
    const allowed = process.env['ELECTRON_RENDERER_URL']
    if (!allowed || !url.startsWith(allowed)) {
      e.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Dev server URL is injected by electron-vite in dev mode.
  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  try {
    const icon = nativeImage.createFromPath(appIconPath()).resize({ width: 16, height: 16 })
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
    tray.setToolTip('StealthBrowser')
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Show StealthBrowser', click: () => { mainWindow?.show(); mainWindow?.focus() } },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
      ])
    )
    tray.on('click', () => {
      mainWindow?.show()
      mainWindow?.focus()
    })
  } catch (e) {
    logger.warn('Tray unavailable', e)
  }
}

// --- single instance --------------------------------------------------------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // --- settings & dirs ---------------------------------------------------
    const settings = loadSettings()
    if (settings.dataDir) paths.setDataDir(settings.dataDir)
    paths.ensureDirs()
    initLogger(paths.logsDir())
    logger.info('=== StealthBrowser starting (v' + app.getVersion() + ') ===')
    logger.info('Data dir:', paths.getDataDir())

    try {
      app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    } catch {
      /* not supported on this platform */
    }

    // --- self-test mode ------------------------------------------------------
    if (process.argv.includes('--selftest')) {
      void runSelfTests().then((failures) => app.exit(failures === 0 ? 0 : 1))
      return
    }

    // --- window + IPC ---------------------------------------------------------
    registerIpcHandlers(() => mainWindow)
    wireStatusEvents(() => mainWindow)
    createWindow()

    if (settings.minimizeToTray) {
      createTray()
      mainWindow?.on('close', (e) => {
        // Hide instead of quit when tray mode is on (real quit via tray/Quit).
        if (!isQuitting && mainWindow) {
          e.preventDefault()
          mainWindow.hide()
        }
      })
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // --- quit behavior -----------------------------------------------------------
  // Kill every launched browser before exiting so no profile session is orphaned.
  app.on('before-quit', (e) => {
    if (isQuitting) return
    e.preventDefault()
    isQuitting = true
    void (async () => {
      try {
        if (loadSettings().closeBrowsersOnQuit) {
          await closeAllProfiles()
        }
      } catch (err) {
        logger.warn('closeAllProfiles failed during quit', err)
      } finally {
        await closeTestPageServer()
        app.exit(0)
      }
    })()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !loadSettings().minimizeToTray) {
      app.quit()
    }
  })

  // Guard: if the app dies, make sure no browser orphans linger.
  process.on('exit', () => {
    // best-effort — child browsers are killed in before-quit normally
  })
}
