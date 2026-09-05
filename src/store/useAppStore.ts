import { create } from 'zustand';

interface AppState {
  country: string;
  isPremium: boolean;
  searchOpen: boolean;
  isDarkMode: boolean;
  setCountry: (country: string) => void;
  setPremium: (premium: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  country: 'US', // default
  isPremium: false,
  searchOpen: false,
  isDarkMode: false,
  setCountry: (country) => set({ country }),
  setPremium: (isPremium) => set({ isPremium }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setDarkMode: (isDarkMode) => set({ isDarkMode }),
}));
