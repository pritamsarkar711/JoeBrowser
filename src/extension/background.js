/**
 * StealthBrowser Engine — background script.
 *
 * Minimal by design: all fingerprint work happens in the MAIN-world content
 * script. This file exists so the extension has a persistent context
 * (MV3 service worker / Firefox event page).
 */
try {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(() => {
      /* intentional no-op — extension is configured per-profile at build time */
    });
  }
} catch (e) {
  /* never throw during startup */
}
