import { create } from 'zustand';
import { PAT_STORAGE_KEY } from '../config';

type AuthState = {
  pat: string | null;
  username: string | null;
  setPat: (pat: string) => void;
  setUsername: (username: string | null) => void;
  clearPat: () => void;
};

const loadInitialPat = (): string | null => {
  try {
    return localStorage.getItem(PAT_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  pat: loadInitialPat(),
  username: null,
  setPat: (pat) => {
    try {
      localStorage.setItem(PAT_STORAGE_KEY, pat);
    } catch {
      // localStorage 不可の環境ではメモリのみ保持
    }
    set({ pat });
  },
  setUsername: (username) => set({ username }),
  clearPat: () => {
    try {
      localStorage.removeItem(PAT_STORAGE_KEY);
    } catch {
      // noop
    }
    set({ pat: null, username: null });
  },
}));
