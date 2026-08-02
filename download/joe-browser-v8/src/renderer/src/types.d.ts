// ============================================================
// Joe Browser - Window API Type Declarations
// ============================================================

import { NewProfileInput, ProfileData } from '../../shared/types';

export interface JoeAPI {
  profiles: {
    list: () => Promise<{ success: boolean; data?: ProfileData[]; error?: string }>;
    create: (input: NewProfileInput) => Promise<{ success: boolean; data?: ProfileData; error?: string }>;
    update: (id: string, updates: Partial<ProfileData>) => Promise<{ success: boolean; data?: ProfileData; error?: string }>;
    delete: (id: string) => Promise<{ success: boolean; error?: string }>;
    launch: (id: string) => Promise<{ success: boolean; error?: string; windowId?: number }>;
    export: (id: string) => Promise<{ success: boolean; error?: string }>;
    import: () => Promise<{ success: boolean; data?: ProfileData; error?: string }>;
    duplicate: (id: string) => Promise<{ success: boolean; data?: ProfileData; error?: string }>;
  };
  browser: {
    close: (profileId: string) => Promise<{ success: boolean }>;
    list: () => Promise<{ success: boolean; data?: string[] }>;
  };
  settings: {
    get: (key: string) => Promise<{ success: boolean; data?: string | null }>;
    set: (key: string, value: string) => Promise<{ success: boolean }>;
  };
  masterPassword: {
    init: () => Promise<{ success: boolean; data?: { initialized: boolean } }>;
    verify: (password: string) => Promise<{ success: boolean }>;
    change: (password: string) => Promise<{ success: boolean }>;
  };
  app: {
    version: () => Promise<{ success: boolean; data?: string }>;
    quit: () => Promise<void>;
  };
}

declare global {
  interface Window {
    joeAPI: JoeAPI;
  }
}

export {};
