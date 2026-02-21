'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

type UIState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  hasHydrated: boolean;

  // acciones
  setHasHydrated: (v: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  hydrate: () => void;
};

// Función para obtener el tema desde localStorage de forma segura
const getStoredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('handy-suites-theme');
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

// Función para guardar el tema en localStorage
const storeTheme = (theme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('handy-suites-theme', theme);
  } catch {
    // Silently fail if localStorage is not available
  }
};

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: 'light', // Valor por defecto, se hidrata desde localStorage
  hasHydrated: false,

  setHasHydrated: v => set({ hasHydrated: v }),

  setSidebarOpen: open => set(s => (s.sidebarOpen === open ? s : { sidebarOpen: open })),

  setSidebarCollapsed: collapsed =>
    set(s => (s.sidebarCollapsed === collapsed ? s : { sidebarCollapsed: collapsed })),

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapsed: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setTheme: (theme: 'light' | 'dark') => {
    storeTheme(theme);
    set({ theme });
  },
  
  toggleTheme: () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    storeTheme(newTheme);
    set({ theme: newTheme });
  },

  // Función para hidratar el estado desde localStorage
  hydrate: () => {
    const storedTheme = getStoredTheme();
    set({ theme: storedTheme, hasHydrated: true });
  },
}));

/** Helpers selectores “seguros” */
export const useSidebar = () =>
  useUIStore(
    useShallow(s => ({
      open: s.sidebarOpen,
      collapsed: s.sidebarCollapsed,
      setOpen: s.setSidebarOpen,
      setCollapsed: s.setSidebarCollapsed,
      toggle: s.toggleSidebar,
      toggleCollapsed: s.toggleSidebarCollapsed,
      hasHydrated: s.hasHydrated,
    }))
  );

export const useTheme = () =>
  useUIStore(
    useShallow(s => ({
      theme: s.theme,
      setTheme: s.setTheme,
      toggle: s.toggleTheme,
      hasHydrated: s.hasHydrated,
    }))
  );
