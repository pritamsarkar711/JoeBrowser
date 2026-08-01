// ============================================================
// Joe Browser - Preload Script
// Exposes joeAPI to the renderer via contextBridge
// ============================================================

import { contextBridge, ipcRenderer } from 'electron';

const joeAPI = {
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    create: (input: any) => ipcRenderer.invoke('profiles:create', input),
    update: (id: string, updates: any) => ipcRenderer.invoke('profiles:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    launch: (id: string) => ipcRenderer.invoke('profiles:launch', id),
    export: (id: string) => ipcRenderer.invoke('profiles:export', id),
    import: () => ipcRenderer.invoke('profiles:import'),
    duplicate: (id: string) => ipcRenderer.invoke('profiles:duplicate', id),
  },
  browser: {
    close: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
    list: () => ipcRenderer.invoke('browser:list'),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
  masterPassword: {
    init: () => ipcRenderer.invoke('master-password:init'),
    verify: (password: string) => ipcRenderer.invoke('master-password:verify', password),
    change: (password: string) => ipcRenderer.invoke('master-password:change', password),
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    quit: () => ipcRenderer.invoke('app:quit'),
  },
};

contextBridge.exposeInMainWorld('joeAPI', joeAPI);
