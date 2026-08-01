// ============================================================
// Joe Browser - Preload Script
// Exposes IPC methods to the renderer via contextBridge
// ============================================================

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, NewProfileInput, ProfileData } from '../shared/types';

const api = {
  // Profiles
  profiles: {
    list: (): Promise<{ success: boolean; data?: ProfileData[]; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LIST),

    create: (input: NewProfileInput): Promise<{ success: boolean; data?: ProfileData; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_CREATE, input),

    update: (id: string, updates: Partial<ProfileData>): Promise<{ success: boolean; data?: ProfileData; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, id, updates),

    delete: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, id),

    launch: (id: string): Promise<{ success: boolean; error?: string; windowId?: number }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LAUNCH, id),

    export: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT, id),

    import: (): Promise<{ success: boolean; data?: ProfileData; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT),

    duplicate: (id: string): Promise<{ success: boolean; data?: ProfileData; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DUPLICATE, id),
  },

  // Browser
  browser: {
    close: (profileId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_CLOSE, profileId),

    list: (): Promise<{ success: boolean; data?: string[] }> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_LIST),
  },

  // Settings
  settings: {
    get: (key: string): Promise<{ success: boolean; data?: string | null }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),

    set: (key: string, value: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  },

  // Master Password
  masterPassword: {
    init: (): Promise<{ success: boolean; data?: { initialized: boolean } }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MASTER_PASSWORD_INIT),

    verify: (password: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MASTER_PASSWORD_VERIFY, password),

    change: (password: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MASTER_PASSWORD_CHANGE, password),
  },

  // App
  app: {
    version: (): Promise<{ success: boolean; data?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION),

    quit: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
  },
};

contextBridge.exposeInMainWorld('joeAPI', api);
