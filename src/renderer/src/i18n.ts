/**
 * Minimal i18n. English is complete; Bengali is provided for the main
 * chrome. `t(key)` falls back to English.
 */
type Dict = Record<string, string>

const en: Dict = {
  'app.name': 'JoeBrowser',
  'app.tagline': 'Local anti-detect browser',
  'nav.newProfile': 'New profile',
  'nav.search': 'Search profiles…',
  'nav.settings': 'Settings',
  'nav.lock': 'Lock',
  'nav.all': 'All',
  'nav.empty': 'No profiles yet. Create your first one!',
  'profile.lastLaunched': 'Last launched',
  'profile.never': 'Never',
  'profile.running': 'Running',
  'profile.edit': 'Edit',
  'profile.duplicate': 'Duplicate',
  'profile.delete': 'Delete',
  'profile.deleteConfirm': 'Delete profile “{name}”? Its browser data folder will also be removed.',
  'tab.fingerprint': 'Fingerprint',
  'tab.proxy': 'Proxy',
  'tab.advanced': 'Advanced',
  'tab.launch': 'Launch',
  'fp.autogenerate': 'Auto-generate realistic fingerprint',
  'fp.fillReal': 'Fill with real values',
  'fp.derive': 'Re-derive from this UA',
  'fp.section.ua': 'User-Agent & Platform',
  'fp.section.screen': 'Screen',
  'fp.section.hardware': 'Hardware',
  'fp.section.webgl': 'WebGL',
  'fp.section.canvas': 'Canvas & Audio',
  'fp.section.fonts': 'Fonts',
  'fp.section.geo': 'Geolocation',
  'fp.section.advanced': 'Advanced',
  'proxy.title': 'Proxy settings',
  'proxy.test': 'Test proxy',
  'proxy.testing': 'Testing…',
  'proxy.result.ok': 'Proxy works — IP {ip} ({country}) · {latency} ms',
  'proxy.result.fail': 'Proxy failed: {error}',
  'advanced.title': 'Advanced settings',
  'launch.title': 'Launch profile',
  'launch.button': 'Launch profile',
  'launch.fpTest': 'Fingerprint test',
  'launch.close': 'Close browser',
  'settings.title': 'Settings',
  'settings.masterPassword': 'Master password',
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.system': 'System',
  'settings.language': 'Language',
  'settings.dataDir': 'Data directory',
  'settings.startup': 'Launch on system start',
  'settings.closeOnQuit': 'Close browsers when app quits',
  'settings.tray': 'Minimize to tray',
  'auth.createTitle': 'Create master password',
  'auth.createHint': 'This password encrypts all profile data locally. There is no recovery — keep it safe!',
  'auth.unlockTitle': 'Enter master password',
  'auth.password': 'Password',
  'auth.confirm': 'Confirm password',
  'auth.submit': 'Unlock',
  'auth.create': 'Create',
  'auth.wrong': 'Wrong password',
  'auth.mismatch': 'Passwords do not match',
  'common.save': 'Save changes',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.delete': 'Delete',
  'common.generate': 'Generate',
  'common.browse': 'Browse…',
  'common.detect': 'Detect',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled',
  'common.unsaved': 'Unsaved changes',
  'toast.saved': 'Profile saved',
  'toast.launched': 'Browser launched',
  'toast.closed': 'Browser closed',
  'toast.error': 'Error: {error}'
}

const bn: Dict = {
  'app.name': 'স্টিলথব্রাউজার',
  'app.tagline': 'লোকাল অ্যান্টি-ডিটেক্ট ব্রাউজার',
  'nav.newProfile': 'নতুন প্রোফাইল',
  'nav.search': 'প্রোফাইল খুঁজুন…',
  'nav.settings': 'সেটিংস',
  'nav.lock': 'লক',
  'tab.fingerprint': 'ফিঙ্গারপ্রিন্ট',
  'tab.proxy': 'প্রক্সি',
  'tab.advanced': 'অ্যাডভান্সড',
  'tab.launch': 'লঞ্চ',
  'fp.autogenerate': 'রিয়ালিস্টিক ফিঙ্গারপ্রিন্ট অটো-জেনারেট করুন',
  'proxy.test': 'প্রক্সি টেস্ট',
  'settings.title': 'সেটিংস',
  'settings.masterPassword': 'মাস্টার পাসওয়ার্ড',
  'auth.createTitle': 'মাস্টার পাসওয়ার্ড তৈরি করুন',
  'auth.unlockTitle': 'মাস্টার পাসওয়ার্ড দিন',
  'auth.submit': 'আনলক',
  'common.save': 'সংরক্ষণ করুন',
  'common.cancel': 'বাতিল',
  'launch.button': 'প্রোফাইল লঞ্চ করুন'
}

const dicts: Record<string, Dict> = { en, bn }

export function t(key: string, vars?: Record<string, string | number>, lang = 'en'): string {
  const d = dicts[lang] ?? en
  let s = d[key] ?? en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}
