/**
 * IPC channel names shared between main, preload and renderer.
 * Centralizing them avoids typos across process boundaries.
 */
export const IPC = {
  // App lifecycle / auth
  AppInit: 'app:init',
  AppSetMasterPassword: 'app:set-master-password',
  AppUnlock: 'app:unlock',
  AppChangeMasterPassword: 'app:change-master-password',
  AppLock: 'app:lock',
  AppGetSettings: 'app:get-settings',
  AppUpdateSettings: 'app:update-settings',
  AppQuit: 'app:quit',

  // Profiles
  ProfilesList: 'profiles:list',
  ProfilesGet: 'profiles:get',
  ProfilesCreate: 'profiles:create',
  ProfilesUpdate: 'profiles:update',
  ProfilesDuplicate: 'profiles:duplicate',
  ProfilesDelete: 'profiles:delete',
  ProfilesExport: 'profiles:export',
  ProfilesImport: 'profiles:import',

  // UA library
  UaList: 'ua:list',

  // Fingerprint engine
  FingerprintGenerate: 'fingerprint:generate',
  FingerprintDeriveFromUA: 'fingerprint:derive-from-ua',
  SystemInfo: 'system:info',

  // Browsers
  BrowsersDetect: 'browsers:detect',
  BrowserLaunch: 'browser:launch',
  BrowserClose: 'browser:close',
  BrowserListRunning: 'browser:list-running',
  BrowserEvent: 'browser:status',

  // Proxy
  ProxyTest: 'proxy:test',

  // Dialogs / misc
  DialogPickFile: 'dialog:pick-file',
  DialogPickDirectory: 'dialog:pick-directory',
  AppOpenPath: 'app:open-path',

  // Diagnostics
  AppHealthCheck: 'app:health-check'
} as const
