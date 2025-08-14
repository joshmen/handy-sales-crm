"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { User, Client, Product, DashboardMetrics } from "@/types";

interface AppState {
  user: User | null;
  clients: Client[];
  products: Product[];
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_CLIENTS"; payload: Client[] }
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "SET_METRICS"; payload: DashboardMetrics }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_CLIENT"; payload: Client }
  | { type: "UPDATE_CLIENT"; payload: Client }
  | { type: "DELETE_CLIENT"; payload: string };

const initialState: AppState = {
  user: null,
  clients: [],
  products: [],
  metrics: null,
  loading: false,
  error: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_CLIENTS":
      return { ...state, clients: action.payload };
    case "SET_PRODUCTS":
      return { ...state, products: action.payload };
    case "SET_METRICS":
      return { ...state, metrics: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "ADD_CLIENT":
      return { ...state, clients: [...state.clients, action.payload] };
    case "UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === action.payload.id ? action.payload : client
        ),
      };
    case "DELETE_CLIENT":
      return {
        ...state,
        clients: state.clients.filter((client) => client.id !== action.payload),
      };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
