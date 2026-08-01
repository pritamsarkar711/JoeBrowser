---
Task ID: 1
Agent: Main Agent
Task: Complete JoeBrowser v8.0.0 rebuild with all critical fixes

Work Log:
- Deep audited the codebase and identified critical bugs from the error screenshot
- Found the original crash: `Cannot find module './services/browserLauncher'` - module name mismatch
- Found the blank screen issue: webview was using `src` attribute instead of `loadURL()`
- Found the popup issue: `allowpopups` attribute on webview was opening new windows
- Found the stealth preload bug: `setPreloads()` was applying to browser-chrome.html itself
- Found the stealth preload crash: `require('electron')` in a context-isolated preload
- Found that Brave/Edge/Firefox profiles had no proper UA strings or themes
- Created the entire project from scratch with all fixes applied

Stage Summary:
- Built complete JoeBrowser v8.0.0 from scratch
- Fixed: Module crash (bundled into single file)
- Fixed: Blank screen (dynamic webview creation with loadURL)
- Fixed: Popup instead of tab (removed allowpopups, new-window handler)
- Fixed: Brave/Edge/Firefox profiles (full UA strings, themes, session partitions)
- Fixed: Stealth preload injection (webview preload attribute instead of setPreloads)
- Fixed: UI design (polished dark theme, proper layout, running indicators)
- Fixed: All browser types working with proper fingerprint generation
- Fixed: OS/Device selectors in NewProfileDialog
- Fixed: Sidebar Download/Settings icons (separate icons)
- Added: Footer credit "Built with ❤️ by Joe Goldberg"
- Added: Running profile indicator with pulse animation
- Added: Stop button for running profiles
- Added: iphey.com auto-open on profile launch
- Added: Chrome extension loading support
- Build successful - all components compile cleanly
