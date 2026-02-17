"use client"

import { create } from 'zustand'
import { User, Client, Product, DashboardMetrics } from '@/types'

interface AppState {
  // Auth
  user: User | null
  isAuthenticated: boolean
  
  // Data
  clients: Client[]
  products: Product[]
  metrics: DashboardMetrics | null
  
  // Loading states
  loading: {
    auth: boolean
    clients: boolean
    products: boolean
    metrics: boolean
    global: boolean
  }
  
  // Error states
  errors: {
    auth: string | null
    clients: string | null
    products: string | null
    metrics: string | null
    global: string | null
  }
  
  // Hydration flag
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

interface AppActions {
  // Auth actions
  setUser: (user: User | null) => void
  login: (user: User) => void
  logout: () => void
  
  // Data actions
  setClients: (clients: Client[]) => void
  addClient: (client: Client) => void
  updateClient: (client: Client) => void
  deleteClient: (clientId: string) => void
  
  setProducts: (products: Product[]) => void
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  deleteProduct: (productId: string) => void
  
  setMetrics: (metrics: DashboardMetrics) => void
  
  // Loading actions
  setLoading: (key: keyof AppState['loading'], value: boolean) => void
  
  // Error actions
  setError: (key: keyof AppState['errors'], error: string | null) => void
  clearErrors: () => void
  
  // Reset actions
  reset: () => void
}

type AppStore = AppState & AppActions

const initialState: Omit<AppState, 'hasHydrated' | 'setHasHydrated'> = {
  user: null,
  isAuthenticated: false,
  clients: [],
  products: [],
  metrics: null,
  loading: {
    auth: false,
    clients: false,
    products: false,
    metrics: false,
    global: false,
  },
  errors: {
    auth: null,
    clients: null,
    products: null,
    metrics: null,
    global: null,
  },
}

export const useAppStore = create<AppStore>()((set) => ({
  ...initialState,
  hasHydrated: false,
  setHasHydrated: (state) => set({ hasHydrated: state }),
  
  // Auth actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
  
  // Clients actions
  setClients: (clients) => set({ clients }),
  addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
  updateClient: (client) => set((state) => ({
    clients: state.clients.map((c) => (c.id === client.id ? client : c))
  })),
  deleteClient: (clientId) => set((state) => ({
    clients: state.clients.filter((c) => c.id !== clientId)
  })),
  
  // Products actions
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (product) => set((state) => ({
    products: state.products.map((p) => (p.id === product.id ? product : p))
  })),
  deleteProduct: (productId) => set((state) => ({
    products: state.products.filter((p) => p.id !== productId)
  })),
  
  // Metrics actions
  setMetrics: (metrics) => set({ metrics }),
  
  // Loading actions
  setLoading: (key, value) => set((state) => ({
    loading: { ...state.loading, [key]: value }
  })),
  
  // Error actions
  setError: (key, error) => set((state) => ({
    errors: { ...state.errors, [key]: error }
  })),
  clearErrors: () => set({
    errors: {
      auth: null,
      clients: null,
      products: null,
      metrics: null,
      global: null,
    }
  }),
  
  // Reset action
  reset: () => set(initialState as AppState),
}))

// Selectors for better performance - with SSR safety
export const useUser = () => {
  const user = useAppStore((state) => state.user)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? user : null
}

export const useIsAuthenticated = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? isAuthenticated : false
}

export const useClients = () => {
  const clients = useAppStore((state) => state.clients)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? clients : []
}

export const useProducts = () => {
  const products = useAppStore((state) => state.products)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? products : []
}

export const useMetrics = () => {
  const metrics = useAppStore((state) => state.metrics)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? metrics : null
}

export const useLoading = () => {
  const loading = useAppStore((state) => state.loading)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? loading : initialState.loading
}

export const useErrors = () => {
  const errors = useAppStore((state) => state.errors)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  return hasHydrated ? errors : initialState.errors
}
