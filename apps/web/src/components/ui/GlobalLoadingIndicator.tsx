"use client";

import React from "react";
import { useLoading } from "@/contexts/LoadingContext";
import { Loading } from "./Loading";

const getLoadingText = () => {
  try { return JSON.parse(localStorage.getItem('company_settings') || '{}').language === 'en' ? 'Loading...' : 'Cargando...'; }
  catch { return 'Cargando...'; }
};

export const GlobalLoadingIndicator: React.FC = () => {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity">
      <div className="rounded-xl bg-white p-6 shadow-2xl dark:bg-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loading size="lg" className="border-teal-500 border-t-transparent" />
          <span className="text-sm font-medium text-foreground/70 dark:text-muted-foreground/60">
            {getLoadingText()}
          </span>
        </div>
      </div>
    </div>
  );
};

// Versión más sutil - solo un indicador en la esquina
export const GlobalLoadingBar: React.FC = () => {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] h-1">
      <div className="h-full w-full animate-pulse bg-gradient-to-r from-teal-500 via-blue-500 to-teal-500 bg-[length:200%_100%]" />
    </div>
  );
};
