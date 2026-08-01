"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  // Profiles
  PROFILES_LIST: "profiles:list",
  PROFILES_CREATE: "profiles:create",
  PROFILES_UPDATE: "profiles:update",
  PROFILES_DELETE: "profiles:delete",
  PROFILES_LAUNCH: "profiles:launch",
  PROFILES_EXPORT: "profiles:export",
  PROFILES_IMPORT: "profiles:import",
  PROFILES_DUPLICATE: "profiles:duplicate",
  // Browser
  BROWSER_CLOSE: "browser:close",
  BROWSER_LIST: "browser:list",
  // Settings
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  // Master Password
  MASTER_PASSWORD_INIT: "master-password:init",
  MASTER_PASSWORD_VERIFY: "master-password:verify",
  MASTER_PASSWORD_CHANGE: "master-password:change",
  // App
  APP_VERSION: "app:version",
  APP_QUIT: "app:quit"
};
const api = {
  // Profiles
  profiles: {
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LIST),
    create: (input) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_CREATE, input),
    update: (id, updates) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, id, updates),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, id),
    launch: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LAUNCH, id),
    export: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT, id),
    import: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT),
    duplicate: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DUPLICATE, id)
  },
  // Browser
  browser: {
    close: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_CLOSE, profileId),
    list: () => electron.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_LIST)
  },
  // Settings
  settings: {
    get: (key) => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key, value) => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value)
  },
  // Master Password
  masterPassword: {
    init: () => electron.ipcRenderer.invoke(IPC_CHANNELS.MASTER_PASSWORD_INIT),
    verify: (password) => electron.ipcRenderer.invoke(IPC_CHANNELS.MASTER_PASSWORD_VERIFY, password),
    change: (password) => electron.ipcRenderer.invoke(IPC_CHANNELS.MASTER_PASSWORD_CHANGE, password)
  },
  // App
  app: {
    version: () => electron.ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION),
    quit: () => electron.ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT)
  }
};
electron.contextBridge.exposeInMainWorld("joeAPI", api);
