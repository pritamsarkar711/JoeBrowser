// ============================================================
// Joe Browser - State Management
// React Context + useReducer with proper running state tracking
// ============================================================

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ProfileData, NewProfileInput } from '../../shared/types';

interface AppState {
  profiles: ProfileData[];
  runningProfiles: string[];
  loading: boolean;
  unlocked: boolean;
  passwordInitialized: boolean;
  activeFilter: string;
  searchQuery: string;
}

type Action =
  | { type: 'SET_PROFILES'; payload: ProfileData[] }
  | { type: 'ADD_PROFILE'; payload: ProfileData }
  | { type: 'UPDATE_PROFILE'; payload: ProfileData }
  | { type: 'DELETE_PROFILE'; payload: string }
  | { type: 'SET_RUNNING'; payload: string[] }
  | { type: 'ADD_RUNNING'; payload: string }
  | { type: 'REMOVE_RUNNING'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UNLOCKED'; payload: boolean }
  | { type: 'SET_PASSWORD_INITIALIZED'; payload: boolean }
  | { type: 'SET_ACTIVE_FILTER'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string };

const initialState: AppState = {
  profiles: [],
  runningProfiles: [],
  loading: true,
  unlocked: false,
  passwordInitialized: false,
  activeFilter: 'all',
  searchQuery: '',
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROFILES':
      return { ...state, profiles: action.payload, loading: false };
    case 'ADD_PROFILE':
      return { ...state, profiles: [action.payload, ...state.profiles] };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.filter(p => p.id !== action.payload),
        runningProfiles: state.runningProfiles.filter(id => id !== action.payload),
      };
    case 'SET_RUNNING':
      return { ...state, runningProfiles: action.payload };
    case 'ADD_RUNNING':
      if (state.runningProfiles.includes(action.payload)) return state;
      return { ...state, runningProfiles: [...state.runningProfiles, action.payload] };
    case 'REMOVE_RUNNING':
      return { ...state, runningProfiles: state.runningProfiles.filter(id => id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_UNLOCKED':
      return { ...state, unlocked: action.payload };
    case 'SET_PASSWORD_INITIALIZED':
      return { ...state, passwordInitialized: action.payload };
    case 'SET_ACTIVE_FILTER':
      return { ...state, activeFilter: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  actions: {
    loadProfiles: () => Promise<void>;
    createProfile: (input: NewProfileInput) => Promise<ProfileData | null>;
    updateProfile: (id: string, updates: Partial<ProfileData>) => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;
    launchProfile: (id: string) => Promise<void>;
    closeProfile: (id: string) => Promise<void>;
    duplicateProfile: (id: string) => Promise<void>;
    refreshRunningProfiles: () => Promise<void>;
    unlock: (password: string) => Promise<boolean>;
    checkPasswordInit: () => Promise<void>;
    setActiveFilter: (filter: string) => void;
    setSearchQuery: (query: string) => void;
  };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const actions: AppContextType['actions'] = {
    loadProfiles: async () => {
      try {
        const result = await window.joeAPI.profiles.list();
        if (result.success && result.data) {
          dispatch({ type: 'SET_PROFILES', payload: result.data });
        }
        // Also refresh running profiles
        const runningResult = await window.joeAPI.browser.list();
        if (runningResult.success && runningResult.data) {
          dispatch({ type: 'SET_RUNNING', payload: runningResult.data });
        }
      } catch (err) {
        console.error('Failed to load profiles:', err);
      }
    },

    createProfile: async (input: NewProfileInput) => {
      try {
        const result = await window.joeAPI.profiles.create(input);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_PROFILE', payload: result.data });
          return result.data;
        }
        return null;
      } catch (err) {
        console.error('Failed to create profile:', err);
        return null;
      }
    },

    updateProfile: async (id: string, updates: Partial<ProfileData>) => {
      try {
        const result = await window.joeAPI.profiles.update(id, updates);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_PROFILE', payload: result.data });
        }
      } catch (err) {
        console.error('Failed to update profile:', err);
      }
    },

    deleteProfile: async (id: string) => {
      try {
        const result = await window.joeAPI.profiles.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_PROFILE', payload: id });
        }
      } catch (err) {
        console.error('Failed to delete profile:', err);
      }
    },

    launchProfile: async (id: string) => {
      try {
        const result = await window.joeAPI.profiles.launch(id);
        if (result.success) {
          dispatch({ type: 'ADD_RUNNING', payload: id });
        } else {
          console.error('Failed to launch profile:', result.error);
        }
      } catch (err) {
        console.error('Failed to launch profile:', err);
      }
    },

    closeProfile: async (id: string) => {
      try {
        const result = await window.joeAPI.browser.close(id);
        if (result.success) {
          dispatch({ type: 'REMOVE_RUNNING', payload: id });
        }
      } catch (err) {
        console.error('Failed to close profile:', err);
      }
    },

    duplicateProfile: async (id: string) => {
      try {
        const result = await window.joeAPI.profiles.duplicate(id);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_PROFILE', payload: result.data });
        }
      } catch (err) {
        console.error('Failed to duplicate profile:', err);
      }
    },

    refreshRunningProfiles: async () => {
      try {
        const result = await window.joeAPI.browser.list();
        if (result.success && result.data) {
          dispatch({ type: 'SET_RUNNING', payload: result.data });
        }
      } catch (err) {
        console.error('Failed to refresh running profiles:', err);
      }
    },

    unlock: async (password: string) => {
      try {
        const result = await window.joeAPI.masterPassword.verify(password);
        if (result.success) {
          dispatch({ type: 'SET_UNLOCKED', payload: true });
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to unlock:', err);
        return false;
      }
    },

    checkPasswordInit: async () => {
      try {
        const result = await window.joeAPI.masterPassword.init();
        if (result.success && result.data) {
          dispatch({ type: 'SET_PASSWORD_INITIALIZED', payload: result.data.initialized });
          // If no password set, auto-unlock
          if (!result.data.initialized) {
            dispatch({ type: 'SET_UNLOCKED', payload: true });
          }
        }
      } catch (err) {
        console.error('Failed to check password init:', err);
        // If check fails, auto-unlock (dev mode)
        dispatch({ type: 'SET_UNLOCKED', payload: true });
      }
    },

    setActiveFilter: (filter: string) => {
      dispatch({ type: 'SET_ACTIVE_FILTER', payload: filter });
    },

    setSearchQuery: (query: string) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    },
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
