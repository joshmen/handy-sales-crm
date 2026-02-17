import { User, Product, Client } from './index';

export interface Route {
  id: string;
  name: string;
  userId: string;
  user: User;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  initialCash: number;
  finalCash?: number;
  products: RouteProduct[];
  orders: RouteOrder[];
  visits: RouteVisit[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteProduct {
  id: string;
  routeId: string;
  productId: string;
  product: Product;
  assignedQuantity: number;
  soldQuantity: number;
  returnedQuantity: number;
  unitPrice: number;
}

export interface RouteOrder {
  id: string;
  routeId: string;
  clientId: string;
  client: Client;
  status: 'pending' | 'delivered' | 'cancelled';
  items: RouteOrderItem[];
  total: number;
  deliveryDate?: Date;
}

export interface RouteOrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface RouteVisit {
  id: string;
  routeId: string;
  clientId: string;
  client: Client;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  duration?: number;
}

export interface RouteSummary {
  totalSales: number;
  totalOrders: number;
  totalVisits: number;
  completedVisits: number;
  effectiveness: number;
  productsReturned: number;
}

// Inventario que se carga a una ruta
export interface RouteInventory {
  productId: string;
  quantity: number;
  unitPrice?: number; // opcional si solo cargas cantidades
}

// Template (plantilla) de rutas
export interface RouteTemplate {
  id: string;
  name: string;
  zone?: string;
  isActive: boolean;
  // visitas previstas en la plantilla
  visits: Array<{
    clientId: string;
    order?: number; // orden sugerido de visita
    preferredTime?: string; // ej. "09:00-11:00"
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
