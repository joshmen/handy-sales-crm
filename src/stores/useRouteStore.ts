import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Tipos
export interface RouteVisit {
  id: string;
  clientId: string;
  clientName: string;
  address: string;
  scheduledTime: Date;
  completedTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  orderTotal?: number;
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  geoLocation?: {
    lat: number;
    lng: number;
  };
  duration?: number; // minutos
}

export interface RouteInventory {
  productId: string;
  productName: string;
  loaded: number;
  sold: number;
  returned: number;
  damaged: number;
  price: number;
  category: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  zone: string;
  assignedTo: {
    id: string;
    name: string;
    avatar?: string;
    phone?: string;
  };
  supervisor?: {
    id: string;
    name: string;
  };
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'scheduled';
  date: Date;
  startTime?: Date;
  endTime?: Date;
  clients: number;
  visits: RouteVisit[];
  inventory: RouteInventory[];
  sales: {
    total: number;
    cash: number;
    credit: number;
    pending: number;
  };
  performance: {
    efficiency: number;
    avgTimePerVisit: number;
    conversionRate: number;
    distance?: number; // km
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteFilters {
  search: string;
  status: string;
  zone: string;
  dateFrom?: Date;
  dateTo?: Date;
  assignedTo?: string;
}

export interface RouteStatistics {
  activeRoutes: number;
  totalVisitsToday: number;
  completedVisits: number;
  avgEfficiency: number;
  totalSalesToday: number;
  inventoryOut: number;
  topPerformer?: {
    id: string;
    name: string;
    efficiency: number;
  };
}

// Estado de la tienda
interface RouteStore {
  // Estado
  routes: Route[];
  currentRoute: Route | null;
  filters: RouteFilters;
  statistics: RouteStatistics;
  loading: boolean;
  error: string | null;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // Actions - Routes
  setRoutes: (routes: Route[]) => void;
  addRoute: (route: Route) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  setCurrentRoute: (route: Route | null) => void;
  
  // Actions - Visits
  addVisit: (routeId: string, visit: RouteVisit) => void;
  updateVisit: (routeId: string, visitId: string, updates: Partial<RouteVisit>) => void;
  completeVisit: (routeId: string, visitId: string, orderData?: any) => void;
  cancelVisit: (routeId: string, visitId: string, reason?: string) => void;
  
  // Actions - Inventory
  loadInventory: (routeId: string, inventory: RouteInventory[]) => void;
  updateInventoryItem: (routeId: string, productId: string, updates: Partial<RouteInventory>) => void;
  
  // Actions - Route Status
  startRoute: (routeId: string) => void;
  completeRoute: (routeId: string) => void;
  
  // Actions - Filters & Search
  setFilters: (filters: Partial<RouteFilters>) => void;
  clearFilters: () => void;
  
  // Actions - Statistics
  updateStatistics: (stats: Partial<RouteStatistics>) => void;
  calculateStatistics: () => void;
  
  // Computed
  getFilteredRoutes: () => Route[];
  getRoutesByStatus: (status: Route['status']) => Route[];
  getTodayRoutes: () => Route[];
  
  // Estado UI
  selectedVisitId: string | null;
  setSelectedVisitId: (id: string | null) => void;
  mapView: 'list' | 'map' | 'hybrid';
  setMapView: (view: 'list' | 'map' | 'hybrid') => void;
}

// Crear el store
const useRouteStore = create<RouteStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Estado inicial
        routes: [],
        currentRoute: null,
        filters: {
          search: '',
          status: 'all',
          zone: 'all',
        },
        statistics: {
          activeRoutes: 0,
          totalVisitsToday: 0,
          completedVisits: 0,
          avgEfficiency: 0,
          totalSalesToday: 0,
          inventoryOut: 0,
        },
        loading: false,
        error: null,
        selectedVisitId: null,
        mapView: 'list',
        hasHydrated: false,
        
        // Hydration action
        setHasHydrated: (state: boolean) => set(() => ({ hasHydrated: state })),

        // Actions - Routes
        setRoutes: (routes) => set((state) => {
          state.routes = routes;
        }),

        addRoute: (route) => set((state) => {
          state.routes.push(route);
        }),

        updateRoute: (id, updates) => set((state) => {
          const index = state.routes.findIndex(r => r.id === id);
          if (index !== -1) {
            state.routes[index] = { ...state.routes[index], ...updates, updatedAt: new Date() };
          }
        }),

        deleteRoute: (id) => set((state) => {
          state.routes = state.routes.filter(r => r.id !== id);
          if (state.currentRoute?.id === id) {
            state.currentRoute = null;
          }
        }),

        setCurrentRoute: (route) => set((state) => {
          state.currentRoute = route;
        }),

        // Actions - Visits
        addVisit: (routeId, visit) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            route.visits.push(visit);
            route.updatedAt = new Date();
          }
        }),

        updateVisit: (routeId, visitId, updates) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            const visitIndex = route.visits.findIndex(v => v.id === visitId);
            if (visitIndex !== -1) {
              route.visits[visitIndex] = { ...route.visits[visitIndex], ...updates };
              route.updatedAt = new Date();
            }
          }
        }),

        completeVisit: (routeId, visitId, orderData) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            const visit = route.visits.find(v => v.id === visitId);
            if (visit) {
              visit.status = 'completed';
              visit.completedTime = new Date();
              if (orderData) {
                visit.orderTotal = orderData.total;
                visit.products = orderData.products;
              }
              route.updatedAt = new Date();
              
              // Actualizar estadísticas
              get().calculateStatistics();
            }
          }
        }),

        cancelVisit: (routeId, visitId, reason) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            const visit = route.visits.find(v => v.id === visitId);
            if (visit) {
              visit.status = 'cancelled';
              if (reason) visit.notes = reason;
              route.updatedAt = new Date();
            }
          }
        }),

        // Actions - Inventory
        loadInventory: (routeId, inventory) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            route.inventory = inventory;
            route.updatedAt = new Date();
          }
        }),

        updateInventoryItem: (routeId, productId, updates) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            const itemIndex = route.inventory.findIndex(i => i.productId === productId);
            if (itemIndex !== -1) {
              route.inventory[itemIndex] = { ...route.inventory[itemIndex], ...updates };
              route.updatedAt = new Date();
            }
          }
        }),

        // Actions - Route Status
        startRoute: (routeId) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            route.status = 'in_progress';
            route.startTime = new Date();
            route.updatedAt = new Date();
          }
        }),

        completeRoute: (routeId) => set((state) => {
          const route = state.routes.find(r => r.id === routeId);
          if (route) {
            route.status = 'completed';
            route.endTime = new Date();
            route.updatedAt = new Date();
            
            // Calcular métricas finales
            const completedVisits = route.visits.filter(v => v.status === 'completed').length;
            const totalVisits = route.visits.length;
            route.performance.efficiency = Math.round((completedVisits / totalVisits) * 100);
            
            // Calcular ventas totales
            const totalSales = route.visits
              .filter(v => v.status === 'completed')
              .reduce((sum, v) => sum + (v.orderTotal || 0), 0);
            route.sales.total = totalSales;
            
            get().calculateStatistics();
          }
        }),

        // Actions - Filters & Search
        setFilters: (filters) => set((state) => {
          state.filters = { ...state.filters, ...filters };
        }),

        clearFilters: () => set((state) => {
          state.filters = {
            search: '',
            status: 'all',
            zone: 'all',
          };
        }),

        // Actions - Statistics
        updateStatistics: (stats) => set((state) => {
          state.statistics = { ...state.statistics, ...stats };
        }),

        calculateStatistics: () => set((state) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayRoutes = state.routes.filter(r => {
            const routeDate = new Date(r.date);
            routeDate.setHours(0, 0, 0, 0);
            return routeDate.getTime() === today.getTime();
          });
          
          const activeRoutes = todayRoutes.filter(r => 
            r.status === 'active' || r.status === 'in_progress'
          ).length;
          
          const totalVisitsToday = todayRoutes.reduce((sum, r) => 
            sum + r.visits.length, 0
          );
          
          const completedVisits = todayRoutes.reduce((sum, r) => 
            sum + r.visits.filter(v => v.status === 'completed').length, 0
          );
          
          const efficiencies = todayRoutes
            .filter(r => r.performance.efficiency > 0)
            .map(r => r.performance.efficiency);
          
          const avgEfficiency = efficiencies.length > 0
            ? Math.round(efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length)
            : 0;
          
          const totalSalesToday = todayRoutes.reduce((sum, r) => 
            sum + r.sales.total, 0
          );
          
          const inventoryOut = todayRoutes.reduce((sum, r) => 
            sum + r.inventory.reduce((invSum, item) => invSum + item.loaded, 0), 0
          );
          
          state.statistics = {
            activeRoutes,
            totalVisitsToday,
            completedVisits,
            avgEfficiency,
            totalSalesToday,
            inventoryOut,
          };
        }),

        // Computed
        getFilteredRoutes: () => {
          const { routes, filters } = get();
          
          return routes.filter((route) => {
            const matchesSearch = 
              !filters.search ||
              route.name.toLowerCase().includes(filters.search.toLowerCase()) ||
              route.zone.toLowerCase().includes(filters.search.toLowerCase()) ||
              route.assignedTo.name.toLowerCase().includes(filters.search.toLowerCase());
            
            const matchesStatus = 
              filters.status === 'all' || 
              route.status === filters.status;
            
            const matchesZone = 
              filters.zone === 'all' || 
              route.zone === filters.zone;
            
            const matchesDate = 
              (!filters.dateFrom || new Date(route.date) >= filters.dateFrom) &&
              (!filters.dateTo || new Date(route.date) <= filters.dateTo);
            
            const matchesUser = 
              !filters.assignedTo || 
              route.assignedTo.id === filters.assignedTo;
            
            return matchesSearch && matchesStatus && matchesZone && matchesDate && matchesUser;
          });
        },

        getRoutesByStatus: (status) => {
          return get().routes.filter(r => r.status === status);
        },

        getTodayRoutes: () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return get().routes.filter(r => {
            const routeDate = new Date(r.date);
            routeDate.setHours(0, 0, 0, 0);
            return routeDate.getTime() === today.getTime();
          });
        },

        // Estado UI
        setSelectedVisitId: (id) => set((state) => {
          state.selectedVisitId = id;
        }),

        setMapView: (view) => set((state) => {
          state.mapView = view;
        }),
      })),
      {
        name: 'route-store',
        partialize: (state) => ({
          filters: state.filters,
          mapView: state.mapView,
        }),
      }
    )
  )
);

export default useRouteStore;
