"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useUIStore } from "@/stores/useUIStore";
import useRouteStore from "@/stores/useRouteStore";

interface HydrationProviderProps {
  children: React.ReactNode;
}

export function HydrationProvider({ children }: HydrationProviderProps) {
  // Marcar cuando los stores están hidratados
  useEffect(() => {
    useAppStore.getState().setHasHydrated(true);
    useUIStore.getState().setHasHydrated(true);
    useRouteStore.getState().setHasHydrated(true);
  }, []);

  return <>{children}</>;
}
