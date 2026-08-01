import type { StealthApi } from './index'

declare global {
  interface Window {
    /** StealthBrowser preload bridge (see src/preload/index.ts). */
    stealth: StealthApi
  }
}

export {}
