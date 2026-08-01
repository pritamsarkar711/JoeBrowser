/**
 * JoeBrowser — Electron main entry.
 *
 * Responsibilities:
 *  - single instance lock
 *  - app data directory setup + logging
 *  - window creation (Material 3 renderer)
 *  - IPC wiring + browser status push events
 *  - process lifecycle (kill all launched browsers on quit)
 *  - headless self-test mode (--selftest)
 */
import { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { logger, initLogger } from './logger'
import * as paths from './paths'
import { loadSettings } from './services/appSettings'
import { registerIpcHandlers, wireStatusEvents } from './ipcHandlers'
import { closeAllProfiles } from './services/embeddedBrowserLauncher'
import { closeTestPageServer } from './services/testPageServer'
import { runSelfTests } from './selftest'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// ---------------------------------------------------------------------------
// Fatal-error reporting.
//
// If anything goes wrong before the window is visible (native module load,
// database open, renderer load, ...) the app used to die silently — on
// Windows that looks exactly like "the EXE does nothing". Instead we always
// write crash.log next to app.log and, when possible, show a dialog with the
// reason and the log location so the failure is diagnosable.
// ---------------------------------------------------------------------------

let fatalDialogShown = false

function writeCrashLog(title: string, detail: string): void {
  try {
    const logDir = paths.logsDir()
    mkdirSync(logDir, { recursive: true })
    appendFileSync(
      join(logDir, 'crash.log'),
      `[${new Date().toISOString()}] ${title}\n${detail}\n\n`,
      'utf-8'
    )
  } catch {
    /* crash logging must never crash */
  }
}

function showFatalError(title: string, error: unknown): void {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)
  writeCrashLog(title, detail)
  if (fatalDialogShown) return
  fatalDialogShown = true
  try {
    dialog.showErrorBox(
      'Joe Browser could not start',
      `${title}\n\n${detail}\n\n` +
        `Log file: ${join(paths.logsDir(), 'app.log')}\nCrash log: ${join(paths.logsDir(), 'crash.log')}\n\n` +
        'Fix: reinstall Joe Browser from the Releases page, or if you built this yourself run "npm run dist:win".\n' +
        'If you downloaded the EXE and this happens on first launch, Windows SmartScreen/Defender may have blocked part of the app — see the "Windows won\u2019t open the EXE?" section in the README.'
    )
  } catch {
    /* dialog unavailable (e.g. headless) — crash.log still has the detail */
  }
}

// Never die invisibly: log + report, then let the app continue (the dialog
// informs the user; the window may still come up).
process.on('uncaughtException', (err) => {
  try {
    logger.error('Uncaught exception', err)
  } catch {
    /* logger may not be initialized yet */
  }
  showFatalError('Unexpected error', err)
})

process.on('unhandledRejection', (reason) => {
  try {
    logger.error('Unhandled rejection', reason)
  } catch {
    /* logger may not be initialized yet */
  }
  showFatalError('Unexpected async error', reason)
})

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

  // If the renderer cannot load (missing/broken install, blocked file), the
  // user must see a message instead of an empty window or nothing at all.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (code === -3) return // ERR_ABORTED — normal during reloads/navigation
    logger.error('Renderer failed to load', code, desc, url)
    showFatalError('The Joe Browser window failed to load', `${url}\n(${code}) ${desc}`)
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logger.error('Renderer process gone', details)
    showFatalError('The Joe Browser window crashed', JSON.stringify(details))
  })

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
    tray.setToolTip('Joe Browser')
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Show Joe Browser', click: () => { mainWindow?.show(); mainWindow?.focus() } },
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
    try {
      // --- settings & dirs ---------------------------------------------------
      logger.info('=== Joe Browser starting (v' + app.getVersion() + ') ===')
      logger.info('Platform:', process.platform, process.arch, 'Electron:', process.versions.electron)
      logger.info('App path:', app.getAppPath())
      logger.info('Resources:', process.resourcesPath)
      logger.info('Exec path:', process.execPath)
      logger.info('PID:', process.pid)

      const settings = loadSettings()
      if (settings.dataDir) paths.setDataDir(settings.dataDir)
      paths.ensureDirs()
      initLogger(paths.logsDir())
      logger.info('Data dir:', paths.getDataDir())
      logger.info('Settings:', JSON.stringify({ ...settings, dataDir: settings.dataDir ? '<custom>' : '<default>' }))

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
    } catch (err) {
      // Startup failure must never be silent: log + dialog (see above).
      try {
        logger.error('Startup failed', err)
      } catch {
        /* logger may not be initialized yet */
      }
      showFatalError('Joe Browser failed during startup', err)
    }
  })

  // --- quit behavior -----------------------------------------------------------
  // Kill every launched browser before exiting so no profile session is orphaned.
  // A 5-second timeout guards against hung browser processes that would
  // otherwise prevent the app from ever exiting.
  app.on('before-quit', (e) => {
    if (isQuitting) return
    e.preventDefault()
    isQuitting = true
    const QUIT_TIMEOUT_MS = 5_000
    void (async () => {
      const cleanup = (async () => {
        try {
          if (loadSettings().closeBrowsersOnQuit) {
            await closeAllProfiles()
          }
        } catch (err) {
          logger.warn('closeAllProfiles failed during quit', err)
        } finally {
          await closeTestPageServer()
        }
      })()
      await Promise.race([
        cleanup,
        new Promise<void>((resolve) =>
          setTimeout(() => {
            logger.warn('Quit cleanup timed out after', QUIT_TIMEOUT_MS, 'ms — forcing exit')
            resolve()
          }, QUIT_TIMEOUT_MS)
        )
      ])
      app.exit(0)
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
