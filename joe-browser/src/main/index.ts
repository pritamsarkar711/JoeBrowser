// ============================================================
// Joe Browser - Main Process Entry Point
// ============================================================

import { app, BrowserWindow, globalShortcut } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipcHandlers';
import { cleanupAllPreloads } from './services/embeddedBrowserLauncher';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Joe Browser',
    backgroundColor: '#0f0f23',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
    },
  });

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

// ---- App Lifecycle ----

app.whenReady().then(() => {
  // Register IPC handlers
  registerIpcHandlers();

  // Create main window
  createMainWindow();

  // macOS: re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAllPreloads();
    app.quit();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  cleanupAllPreloads();
  globalShortcut.unregisterAll();
});

// Security: Prevent new window creation for the main window only
// Webview windows are handled by the browser-chrome.html new-window event
app.on('web-contents-created', (_, contents) => {
  // Only set window open handler for the main window and webview types
  // For webview, we allow the new-window event to be handled by browser-chrome.html
  if (contents.getType() === 'window') {
    contents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
  }
});
