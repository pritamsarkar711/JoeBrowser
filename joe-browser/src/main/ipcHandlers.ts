// ============================================================
// Joe Browser - IPC Handlers
// Uses REAL browser launcher (Chrome/Brave/Edge/Firefox/Chromium)
// ============================================================

import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS, NewProfileInput, ProfileData } from '../shared/types';
import { DatabaseService } from './services/database';
import { launchProfile, isProfileRunning, closeProfileBrowser, getRunningProfileIds } from './services/embeddedBrowserLauncher';
import { generateFingerprint } from './services/fingerprintGenerator';

let db: DatabaseService | null = null;

/**
 * Initialize all IPC handlers
 */
export function registerIpcHandlers(): void {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'joe-browser.db');
  db = new DatabaseService(dbPath);

  // ===== PROFILE HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, async () => {
    try {
      const profiles = db!.getAllProfiles();
      return { success: true, data: profiles };
    } catch (err: any) {
      console.error('[IPC] profiles:list error:', err);
      return { success: false, error: err.message || 'Failed to list profiles' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, input: NewProfileInput) => {
    try {
      if (!input.browserType) {
        return { success: false, error: 'Browser type is required' };
      }

      const deviceType = input.deviceType || 'desktop';
      const os = input.os || (deviceType === 'mobile' ? 'android' : 'windows');

      const fingerprint = generateFingerprint(input.browserType, deviceType, os);

      const name = input.name || `${input.browserType.charAt(0).toUpperCase() + input.browserType.slice(1)} Profile`;

      const profile: ProfileData = {
        id: generateId(),
        name,
        browserType: input.browserType,
        deviceType,
        os,
        fingerprint,
        proxy: input.proxy,
        launchUrl: input.launchUrl || 'https://www.google.com',
        tags: input.tags || [],
        group: input.group || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: input.notes || '',
        extensions: [],
      };

      db!.createProfile(profile);
      return { success: true, data: profile };
    } catch (err: any) {
      console.error('[IPC] profiles:create error:', err);
      return { success: false, error: err.message || 'Failed to create profile' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id: string, updates: Partial<ProfileData>) => {
    try {
      if (!id) return { success: false, error: 'Profile ID is required' };

      if (updates.browserType || updates.os || updates.deviceType) {
        const existing = db!.getProfile(id);
        if (!existing) return { success: false, error: 'Profile not found' };

        const browserType = updates.browserType || existing.browserType;
        const deviceType = updates.deviceType || existing.deviceType;
        const os = updates.os || existing.os;

        updates.fingerprint = generateFingerprint(browserType, deviceType, os);
      }

      updates.updatedAt = Date.now();
      db!.updateProfile(id, updates);

      const updated = db!.getProfile(id);
      return { success: true, data: updated };
    } catch (err: any) {
      console.error('[IPC] profiles:update error:', err);
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id: string) => {
    try {
      if (!id) return { success: false, error: 'Profile ID is required' };

      if (isProfileRunning(id)) {
        closeProfileBrowser(id);
      }

      db!.deleteProfile(id);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] profiles:delete error:', err);
      return { success: false, error: err.message || 'Failed to delete profile' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_LAUNCH, async (_event, id: string) => {
    try {
      if (!id) return { success: false, error: 'Profile ID is required' };

      const profile = db!.getProfile(id);
      if (!profile) return { success: false, error: 'Profile not found' };

      db!.updateProfile(id, { lastUsed: Date.now() });

      const result = await launchProfile(profile);
      return result;
    } catch (err: any) {
      console.error('[IPC] profiles:launch error:', err);
      return { success: false, error: err.message || 'Failed to launch profile' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT, async (_event, id: string) => {
    try {
      if (!id) return { success: false, error: 'Profile ID is required' };

      const profile = db!.getProfile(id);
      if (!profile) return { success: false, error: 'Profile not found' };

      const exportPath = path.join(app.getPath('downloads'), `joe-profile-${id}.json`);
      fs.writeFileSync(exportPath, JSON.stringify(profile, null, 2), 'utf8');
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] profiles:export error:', err);
      return { success: false, error: err.message || 'Failed to export profile' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT, async () => {
    return { success: false, error: 'Import not yet implemented' };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_DUPLICATE, async (_event, id: string) => {
    try {
      if (!id) return { success: false, error: 'Profile ID is required' };

      const original = db!.getProfile(id);
      if (!original) return { success: false, error: 'Profile not found' };

      const fingerprint = generateFingerprint(original.browserType, original.deviceType, original.os);

      const duplicate: ProfileData = {
        ...original,
        id: generateId(),
        name: `${original.name} (Copy)`,
        fingerprint,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastUsed: undefined,
      };

      db!.createProfile(duplicate);
      return { success: true, data: duplicate };
    } catch (err: any) {
      console.error('[IPC] profiles:duplicate error:', err);
      return { success: false, error: err.message || 'Failed to duplicate profile' };
    }
  });

  // ===== BROWSER HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.BROWSER_CLOSE, async (_event, profileId: string) => {
    try {
      if (!profileId) return { success: false, error: 'Profile ID is required' };
      closeProfileBrowser(profileId);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] browser:close error:', err);
      return { success: false, error: err.message || 'Failed to close browser' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_LIST, async () => {
    try {
      const runningIds = getRunningProfileIds();
      return { success: true, data: runningIds };
    } catch (err: any) {
      console.error('[IPC] browser:list error:', err);
      return { success: false, error: err.message || 'Failed to list browsers' };
    }
  });

  // ===== SETTINGS HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key: string) => {
    try {
      if (!key) return { success: false, error: 'Key is required' };
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (!fs.existsSync(settingsPath)) return { success: true, data: null };
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { success: true, data: settings[key] || null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get setting' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key: string, value: string) => {
    try {
      if (!key) return { success: false, error: 'Key is required' };
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      let settings: Record<string, any> = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      settings[key] = value;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to set setting' };
    }
  });

  // ===== MASTER PASSWORD HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_INIT, async () => {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (!fs.existsSync(settingsPath)) return { success: true, data: { initialized: false } };
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { success: true, data: { initialized: !!settings.masterPasswordHash } };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to check master password' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_VERIFY, async (_event, password: string) => {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (!fs.existsSync(settingsPath)) return { success: false, error: 'No master password set' };
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const hash = simpleHash(password);
      return { success: hash === settings.masterPasswordHash };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify password' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MASTER_PASSWORD_CHANGE, async (_event, password: string) => {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      let settings: Record<string, any> = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      settings.masterPasswordHash = simpleHash(password);
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password' };
    }
  });

  // ===== APP HANDLERS =====

  ipcMain.handle(IPC_CHANNELS.APP_VERSION, async () => {
    try {
      return { success: true, data: app.getVersion() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get version' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, async () => {
    try {
      app.quit();
    } catch (err: any) {
      console.error('[IPC] app:quit error:', err);
    }
  });

  console.log('[IPC] All handlers registered (using REAL browser launcher)');
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
