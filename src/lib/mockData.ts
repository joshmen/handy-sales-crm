import { User, Client, Product, DashboardMetrics } from '@/types'

// Mock user data
export const mockUser: User = {
  id: '1',
  name: 'Carlos Mendoza',
  email: 'carlos.mendoza@handy.com',
  role: 'VENDEDOR',
  avatar: '',
  phone: '+52 644 123 4567',
  territory: 'Zona Norte',
  isActive: true,
  lastLogin: new Date('2024-01-15T08:30:00'),
  createdAt: new Date('2023-06-15'),
  updatedAt: new Date('2024-01-15')
}

// Mock clients data
export const mockClients: Client[] = [
  {
    id: '1',
    code: 'CLI-001',
    name: 'Abarrotes Don Juan',
    email: 'donjuan@email.com',
    phone: '+52 644 111 2222',
    address: 'Av. Revolución 123, Centro',
    city: 'Hermosillo',
    state: 'Sonora',
    zipCode: '83000',
    latitude: 29.0729,
    longitude: -110.9559,
    type: 'MINORISTA',
    isActive: true,
    creditLimit: 10000,
    paymentTerms: 30,
    notes: 'Cliente frecuente, pago puntual',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '2',
    code: 'CLI-002',
    name: 'Supermercado La Esperanza',
    email: 'esperanza@email.com',
    phone: '+52 644 333 4444',
    address: 'Calle Morelos 456, Norte',
    city: 'Hermosillo',
    state: 'Sonora',
    zipCode: '83010',
    latitude: 29.1026,
    longitude: -110.9770,
    type: 'MAYORISTA',
    isActive: true,
    creditLimit: 50000,
    paymentTerms: 45,
    notes: 'Compras grandes, solicita descuentos',
    createdAt: new Date('2023-03-20'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: '3',
    code: 'CLI-003',
    name: 'Tienda La Esquina',
    email: 'esquina@email.com',
    phone: '+52 644 555 6666',
    address: 'Av. Juárez 789, Sur',
    city: 'Hermosillo',
    state: 'Sonora',
    zipCode: '83020',
    latitude: 29.0529,
    longitude: -110.9359,
    type: 'MINORISTA',
    isActive: true,
    creditLimit: 5000,
    paymentTerms: 15,
    notes: 'Negocio familiar, pagos en efectivo',
    createdAt: new Date('2023-07-10'),
    updatedAt: new Date('2024-01-08')
  },
  {
    id: '4',
    code: 'CLI-004',
    name: 'Distribuidora Norte',
    email: 'norte@email.com',
    phone: '+52 644 777 8888',
    address: 'Blvd. Luis Encinas 321, Industrial',
    city: 'Hermosillo',
    state: 'Sonora',
    zipCode: '83030',
    latitude: 29.1129,
    longitude: -110.9869,
    type: 'DISTRIBUIDOR',
    isActive: true,
    creditLimit: 100000,
    paymentTerms: 60,
    notes: 'Distribuidor principal de la zona',
    createdAt: new Date('2023-02-05'),
    updatedAt: new Date('2024-01-14')
  }
]

// Mock products data
export const mockProducts: Product[] = [
  {
    id: '1',
    code: 'PROD-001',
    name: 'Refresco Cola 2L',
    description: 'Refresco de cola sabor original',
    category: 'Bebidas',
    brand: 'Coca Cola',
    unit: 'pz',
    price: 32.50,
    cost: 20.00,
    stock: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    images: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '2',
    code: 'PROD-002',
    name: 'Agua Natural 1L',
    description: 'Agua purificada natural',
    category: 'Bebidas',
    brand: 'Bonafont',
    unit: 'pz',
    price: 15.00,
    cost: 8.50,
    stock: 200,
    minStock: 30,
    maxStock: 800,
    isActive: true,
    images: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-05')
  },
  {
    id: '3',
    code: 'PROD-003',
    name: 'Pan Blanco Integral',
    description: 'Pan de caja integral 680g',
    category: 'Panadería',
    brand: 'Bimbo',
    unit: 'pz',
    price: 45.00,
    cost: 28.00,
    stock: 80,
    minStock: 15,
    maxStock: 200,
    isActive: true,
    images: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: '4',
    code: 'PROD-004',
    name: 'Leche Entera 1L',
    description: 'Leche entera pasteurizada',
    category: 'Lácteos',
    brand: 'Lala',
    unit: 'pz',
    price: 28.00,
    cost: 18.50,
    stock: 120,
    minStock: 25,
    maxStock: 400,
    isActive: true,
    images: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-11')
  },
  {
    id: '5',
    code: 'PROD-005',
    name: 'Arroz Blanco 1kg',
    description: 'Arroz blanco grano largo',
    category: 'Abarrotes',
    brand: 'Verde Valle',
    unit: 'kg',
    price: 35.00,
    cost: 22.00,
    stock: 60,
    minStock: 10,
    maxStock: 150,
    isActive: true,
    images: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-09')
  },
  {
    id: '6',
    code: 'PROD-006',
    name: 'Aceite Vegetal 1L',
    description: 'Aceite vegetal comestible',
    category: 'Abarrotes',
    brand: 'Capullo',
    unit: 'pz',
    price: 55.00,
    cost: 35.00,
    stock: 40,
    minStock: 8,
    maxStock: 100,
    isActive: true,
    images: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-13')
  }
]

// Mock dashboard metrics
export const mockMetrics: DashboardMetrics = {
  visits: {
    total: 45,
    effectiveness: 82,
    scheduled: 12,
    completed: 33
  },
  sales: {
    total: 125000,
    target: 150000,
    percentage: 83.3
  },
  products: {
    total: 156,
    withoutSales: 23
  },
  clients: {
    total: 89,
    withoutOrders: 15,
    withScheduledVisits: 28
  },
  users: {
    total: 12,
    withoutOrders: 3
  }
}

// Mock notifications
export const mockNotifications = [
  {
    id: '1',
    type: 'info' as const,
    title: 'Nueva visita programada',
    message: 'Se ha programado una visita para el cliente Abarrotes Don Juan',
    read: false,
    createdAt: new Date('2024-01-15T09:30:00'),
    duration: 0
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'Stock bajo',
    message: 'El producto "Refresco Cola 2L" tiene stock bajo (150 unidades)',
    read: false,
    createdAt: new Date('2024-01-15T08:15:00'),
    duration: 0
  },
  {
    id: '3',
    type: 'success' as const,
    title: 'Pedido completado',
    message: 'El pedido #ORD-123 ha sido entregado exitosamente',
    read: true,
    createdAt: new Date('2024-01-14T16:45:00'),
    duration: 0
  },
  {
    id: '4',
    type: 'error' as const,
    title: 'Entrega fallida',
    message: 'No se pudo completar la entrega del pedido #ORD-124',
    read: true,
    createdAt: new Date('2024-01-14T14:20:00'),
    duration: 0
  }
]

// Function to initialize mock data in stores
export const initializeMockData = () => {
  if (typeof window !== 'undefined') {
    // Initialize user
    const userStore = JSON.parse(localStorage.getItem('handy-crm-storage') || '{}')
    if (!userStore.state?.user) {
      localStorage.setItem('handy-crm-storage', JSON.stringify({
        state: {
          user: mockUser,
          isAuthenticated: true
        },
        version: 0
      }))
    }
  }
}

// Export all mock data
export const mockData = {
  user: mockUser,
  clients: mockClients,
  products: mockProducts,
  metrics: mockMetrics,
  notifications: mockNotifications
}

export default mockData
