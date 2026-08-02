// ============================================================
// Joe Browser - Main Process Entry
// ============================================================

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Joe Browser',
    backgroundColor: '#0f0f23',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
    },
  });

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    // Dev mode
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// App lifecycle
app.whenReady().then(() => {
  try {
    // Register IPC handlers
    registerIpcHandlers();

    // Create main window
    createMainWindow();
  } catch (err) {
    console.error('[Main] Failed to initialize app:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection:', reason);
});
