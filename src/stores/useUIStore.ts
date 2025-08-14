"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type UIState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "light" | "dark";
  hasHydrated: boolean;

  // acciones
  setHasHydrated: (v: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: "light",
  hasHydrated: false,

  setHasHydrated: (v) => set({ hasHydrated: v }),

  setSidebarOpen: (open) =>
    set((s) => (s.sidebarOpen === open ? s : { sidebarOpen: open })),

  setSidebarCollapsed: (collapsed) =>
    set((s) =>
      s.sidebarCollapsed === collapsed ? s : { sidebarCollapsed: collapsed }
    ),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapsed: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setTheme: (t) => set({ theme: t }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
}));

/** Helpers selectores “seguros” */
export const useSidebar = () =>
  useUIStore(
    useShallow((s) => ({
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
    useShallow((s) => ({
      theme: s.theme,
      setTheme: s.setTheme,
      toggle: s.toggleTheme,
      hasHydrated: s.hasHydrated,
    }))
  );
