import { create } from 'zustand';
import type { AuthUser } from '@/types';
import { secureStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { setAccessToken, authEventEmitter } from '@/api/client';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;

  login: (user: AuthUser, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setLoggingIn: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoggingIn: false,

  login: async (user, token, refreshToken) => {
    setAccessToken(token);
    await Promise.all([
      secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, token),
      secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      secureStorage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
    ]);
    set({ user, isAuthenticated: true, isLoading: false, isLoggingIn: false });
  },

  logout: async () => {
    setAccessToken(null);
    await secureStorage.clear([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: async () => {
    try {
      const [token, userData] = await Promise.all([
        secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN),
        secureStorage.get(STORAGE_KEYS.USER_DATA),
      ]);
      if (token && userData) {
        setAccessToken(token);
        set({
          user: JSON.parse(userData),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setLoggingIn: (loading) => set({ isLoggingIn: loading }),
}));

// Listen for force logout from API interceptor
authEventEmitter.on('forceLogout', () => {
  useAuthStore.getState().logout();
});
