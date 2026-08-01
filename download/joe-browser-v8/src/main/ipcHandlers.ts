// ============================================================
// Joe Browser - IPC Handlers
// Bridges renderer and main process
// ============================================================

import { ipcMain, dialog, app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  duplicateProfile,
  exportProfile,
  importProfile,
  getSetting,
  setSetting,
  isMasterPasswordInitialized,
  getMasterPasswordHash,
  setMasterPasswordHash,
} from './services/database';
import { launchProfile, closeProfile, getOpenProfileIds, cleanupAllPreloads } from './services/embeddedBrowserLauncher';
import { IPC_CHANNELS, NewProfileInput, ProfileData } from '../shared/types';

export function registerIpcHandlers(): void {
  // ---- Profiles ----

  ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, async () => {
    try {
      return { success: true, data: listProfiles() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_, input: NewProfileInput) => {
    try {
      const profile = createProfile(input);
      return { success: true, data: profile };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_, id: string, updates: Partial<ProfileData>) => {
    try {
      const profile = updateProfile(id, updates);
      if (!profile) return { success: false, error: 'Profile not found' };
      return { success: true, data: profile };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_, id: string) => {
    try {
      closeProfile(id);
      const result = deleteProfile(id);
      return { success: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_LAUNCH, async (_, id: string) => {
    try {
      const profiles = listProfiles();
      const profile = profiles.find((p: ProfileData) => p.id === id);
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }
      const result = await launchProfile(profile);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT, async (_, id: string) => {
    try {
      const data = exportProfile(id);
      if (!data) return { success: false, error: 'Profile not found' };

      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Profile',
        defaultPath: `profile-${id}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (filePath) {
        fs.writeFileSync(filePath, data, 'utf-8');
        return { success: true };
      }
      return { success: false, error: 'Cancelled' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT, async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Import Profile',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (filePaths.length > 0) {
        const data = fs.readFileSync(filePaths[0], 'utf-8');
        const profile = importProfile(data);
        if (!profile) return { success: false, error: 'Invalid profile data' };
        return { success: true, data: profile };
      }
      return { success: false, error: 'Cancelled' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_DUPLICATE, async (_, id: string) => {
    try {
      const profile = duplicateProfile(id);
      if (!profile) return { success: false, error: 'Profile not found' };
      return { success: true, data: profile };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---- Browser ----

  ipcMain.handle(IPC_CHANNELS.BROWSER_CLOSE, async (_, profileId: string) => {
    try {
      closeProfile(profileId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_LIST, async () => {
    try {
      return { success: true, data: getOpenProfileIds() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---- Settings ----

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_, key: string) => {
    try {
      return { success: true, data: getSetting(key) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_, key: string, value: string) => {
    try {
      setSetting(key, value);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---- Master Password ----

  ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_INIT, async () => {
    try {
      return { success: true, data: { initialized: isMasterPasswordInitialized() } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_VERIFY, async (_, password: string) => {
    try {
      const hash = getMasterPasswordHash();
      if (!hash) return { success: false, error: 'No password set' };

      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
      return { success: inputHash === hash };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_CHANGE, async (_, password: string) => {
    try {
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      setMasterPasswordHash(hash);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---- App ----

  ipcMain.handle(IPC_CHANNELS.APP_VERSION, async () => {
    return { success: true, data: app.getVersion() };
  });

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, async () => {
    cleanupAllPreloads();
    app.quit();
  });

  console.log('IPC handlers registered successfully');
}
