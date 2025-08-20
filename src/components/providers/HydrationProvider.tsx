"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useUIStore } from "@/stores/useUIStore";
import useRouteStore from "@/stores/useRouteStore";

interface HydrationProviderProps {
  children: React.ReactNode;
}

export function HydrationProvider({ children }: HydrationProviderProps) {
  // Hidratar stores desde localStorage y marcar como hidratados
  useEffect(() => {
    useAppStore.getState().setHasHydrated(true);
    useUIStore.getState().hydrate(); // Hidrata el tema desde localStorage
    useRouteStore.getState().setHasHydrated(true);
  }, []);

  return <>{children}</>;
}
