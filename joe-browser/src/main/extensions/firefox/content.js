// ============================================================
// JoeBrowser Stealth - Firefox Extension Content Script
// Injects the stealth script into the MAIN world via <script> tag
// (Firefox doesn't support world:MAIN like Chrome)
// ============================================================
(function() {
  'use strict';

  // Inject the stealth script into the page's main world
  try {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch(e) {
    console.warn('[JoeBrowser] Failed to inject stealth script:', e);
  }
})();
