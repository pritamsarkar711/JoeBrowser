import { app, BrowserWindow } from 'electron';

app.whenReady().then(() => {
  new BrowserWindow({ width: 1200, height: 800, webPreferences: { preload: 'preload.js' } }).loadFile('index.html');
  app.on('activate', () => BrowserWindow.getAllWindows().length || new BrowserWindow({}) );
});
