"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface UIState {
  sidebarOpen: boolean;
  currentPage: string;
  theme: "light" | "dark";
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

interface UIContextType {
  state: UIState;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UIState>({
    sidebarOpen: true,
    currentPage: "dashboard",
    theme: "light",
    notifications: [],
  });

  const setSidebarOpen = (open: boolean) => {
    setState((prev) => ({ ...prev, sidebarOpen: open }));
  };

  const setCurrentPage = (page: string) => {
    setState((prev) => ({ ...prev, currentPage: page }));
  };

  const setTheme = (theme: "light" | "dark") => {
    setState((prev) => ({ ...prev, theme }));
  };

  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    setState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, newNotification],
    }));

    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  };

  return (
    <UIContext.Provider
      value={{
        state,
        setSidebarOpen,
        setCurrentPage,
        setTheme,
        addNotification,
        removeNotification,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};
