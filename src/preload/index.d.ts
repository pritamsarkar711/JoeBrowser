import type { StealthApi } from './index'

declare global {
  interface Window {
    /** JoeBrowser preload bridge (see src/preload/index.ts). */
    stealth: StealthApi
  }
}

export {}
