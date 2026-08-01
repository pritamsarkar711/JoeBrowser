"use strict";
const electron = require("electron");
const joeAPI = {
  profiles: {
    list: () => electron.ipcRenderer.invoke("profiles:list"),
    create: (input) => electron.ipcRenderer.invoke("profiles:create", input),
    update: (id, updates) => electron.ipcRenderer.invoke("profiles:update", id, updates),
    delete: (id) => electron.ipcRenderer.invoke("profiles:delete", id),
    launch: (id) => electron.ipcRenderer.invoke("profiles:launch", id),
    export: (id) => electron.ipcRenderer.invoke("profiles:export", id),
    import: () => electron.ipcRenderer.invoke("profiles:import"),
    duplicate: (id) => electron.ipcRenderer.invoke("profiles:duplicate", id)
  },
  browser: {
    close: (profileId) => electron.ipcRenderer.invoke("browser:close", profileId),
    list: () => electron.ipcRenderer.invoke("browser:list")
  },
  settings: {
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value)
  },
  masterPassword: {
    init: () => electron.ipcRenderer.invoke("master-password:init"),
    verify: (password) => electron.ipcRenderer.invoke("master-password:verify", password),
    change: (password) => electron.ipcRenderer.invoke("master-password:change", password)
  },
  app: {
    version: () => electron.ipcRenderer.invoke("app:version"),
    quit: () => electron.ipcRenderer.invoke("app:quit")
  }
};
electron.contextBridge.exposeInMainWorld("joeAPI", joeAPI);
