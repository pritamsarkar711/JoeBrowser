// ============================================================
// Joe Browser - App Store (React Context)
// Global state management for the renderer
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ProfileData, NewProfileInput, BrowserType } from '../../../shared/types';

// ---- State ----

interface AppState {
  profiles: ProfileData[];
  loading: boolean;
  error: string | null;
  runningProfiles: string[];
  searchQuery: string;
  filterBrowser: BrowserType | 'all';
  filterGroup: string;
  isLocked: boolean;
  masterPasswordInitialized: boolean;
}

const initialState: AppState = {
  profiles: [],
  loading: true,
  error: null,
  runningProfiles: [],
  searchQuery: '',
  filterBrowser: 'all',
  filterGroup: '',
  isLocked: true,
  masterPasswordInitialized: false,
};

// ---- Actions ----

type Action =
  | { type: 'SET_PROFILES'; payload: ProfileData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_PROFILE'; payload: ProfileData }
  | { type: 'UPDATE_PROFILE'; payload: ProfileData }
  | { type: 'REMOVE_PROFILE'; payload: string }
  | { type: 'SET_RUNNING'; payload: string[] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER_BROWSER'; payload: BrowserType | 'all' }
  | { type: 'SET_FILTER_GROUP'; payload: string }
  | { type: 'SET_LOCKED'; payload: boolean }
  | { type: 'SET_MASTER_PASSWORD_INIT'; payload: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROFILES':
      return { ...state, profiles: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_PROFILE':
      return { ...state, profiles: [action.payload, ...state.profiles] };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      };
    case 'REMOVE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.filter((p) => p.id !== action.payload),
      };
    case 'SET_RUNNING':
      return { ...state, runningProfiles: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_FILTER_BROWSER':
      return { ...state, filterBrowser: action.payload };
    case 'SET_FILTER_GROUP':
      return { ...state, filterGroup: action.payload };
    case 'SET_LOCKED':
      return { ...state, isLocked: action.payload };
    case 'SET_MASTER_PASSWORD_INIT':
      return { ...state, masterPasswordInitialized: action.payload };
    default:
      return state;
  }
}

// ---- Context ----

interface AppActions {
  loadProfiles: () => Promise<void>;
  createProfile: (input: NewProfileInput) => Promise<ProfileData | null>;
  updateProfile: (id: string, updates: Partial<ProfileData>) => Promise<ProfileData | null>;
  deleteProfile: (id: string) => Promise<boolean>;
  launchProfile: (id: string) => Promise<boolean>;
  closeProfile: (id: string) => Promise<void>;
  exportProfile: (id: string) => Promise<void>;
  duplicateProfile: (id: string) => Promise<void>;
  importProfile: () => Promise<void>;
  refreshRunning: () => Promise<void>;
  setSearch: (query: string) => void;
  setFilterBrowser: (browser: BrowserType | 'all') => void;
  setFilterGroup: (group: string) => void;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  checkMasterPassword: () => Promise<void>;
}

const AppContext = createContext<{
  state: AppState;
  actions: AppActions;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadProfiles = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await window.joeAPI.profiles.list();
      if (result.success && result.data) {
        dispatch({ type: 'SET_PROFILES', payload: result.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to load profiles' });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  const createProfile = useCallback(async (input: NewProfileInput): Promise<ProfileData | null> => {
    try {
      const result = await window.joeAPI.profiles.create(input);
      if (result.success && result.data) {
        dispatch({ type: 'ADD_PROFILE', payload: result.data });
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (id: string, updates: Partial<ProfileData>): Promise<ProfileData | null> => {
    try {
      const result = await window.joeAPI.profiles.update(id, updates);
      if (result.success && result.data) {
        dispatch({ type: 'UPDATE_PROFILE', payload: result.data });
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const deleteProfile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.joeAPI.profiles.delete(id);
      if (result.success) {
        dispatch({ type: 'REMOVE_PROFILE', payload: id });
      }
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const launchProfile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.joeAPI.profiles.launch(id);
      if (result.success) {
        dispatch({ type: 'SET_RUNNING', payload: [...state.runningProfiles, id] });
      }
      return result.success;
    } catch {
      return false;
    }
  }, [state.runningProfiles]);

  const closeProfile = useCallback(async (id: string) => {
    try {
      await window.joeAPI.browser.close(id);
      dispatch({ type: 'SET_RUNNING', payload: state.runningProfiles.filter((p) => p !== id) });
    } catch {}
  }, [state.runningProfiles]);

  const exportProfile = useCallback(async (id: string) => {
    try {
      await window.joeAPI.profiles.export(id);
    } catch {}
  }, []);

  const duplicateProfile = useCallback(async (id: string) => {
    try {
      const result = await window.joeAPI.profiles.duplicate(id);
      if (result.success && result.data) {
        dispatch({ type: 'ADD_PROFILE', payload: result.data });
      }
    } catch {}
  }, []);

  const importProfile = useCallback(async () => {
    try {
      const result = await window.joeAPI.profiles.import();
      if (result.success && result.data) {
        dispatch({ type: 'ADD_PROFILE', payload: result.data });
      }
    } catch {}
  }, []);

  const refreshRunning = useCallback(async () => {
    try {
      const result = await window.joeAPI.browser.list();
      if (result.success && result.data) {
        dispatch({ type: 'SET_RUNNING', payload: result.data });
      }
    } catch {}
  }, []);

  const setSearch = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH', payload: query });
  }, []);

  const setFilterBrowser = useCallback((browser: BrowserType | 'all') => {
    dispatch({ type: 'SET_FILTER_BROWSER', payload: browser });
  }, []);

  const setFilterGroup = useCallback((group: string) => {
    dispatch({ type: 'SET_FILTER_GROUP', payload: group });
  }, []);

  const lock = useCallback(() => {
    dispatch({ type: 'SET_LOCKED', payload: true });
  }, []);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    try {
      const result = await window.joeAPI.masterPassword.verify(password);
      if (result.success) {
        dispatch({ type: 'SET_LOCKED', payload: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const checkMasterPassword = useCallback(async () => {
    try {
      const result = await window.joeAPI.masterPassword.init();
      if (result.success && result.data) {
        dispatch({ type: 'SET_MASTER_PASSWORD_INIT', payload: result.data.initialized });
        if (!result.data.initialized) {
          dispatch({ type: 'SET_LOCKED', payload: false });
        }
      }
    } catch {}
  }, []);

  // Load profiles on mount
  useEffect(() => {
    checkMasterPassword();
  }, []);

  // Load profiles when unlocked
  useEffect(() => {
    if (!state.isLocked && state.profiles.length === 0 && state.loading) {
      loadProfiles();
    }
  }, [state.isLocked]);

  const actions: AppActions = {
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    launchProfile,
    closeProfile,
    exportProfile,
    duplicateProfile,
    importProfile,
    refreshRunning,
    setSearch,
    setFilterBrowser,
    setFilterGroup,
    lock,
    unlock,
    checkMasterPassword,
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
