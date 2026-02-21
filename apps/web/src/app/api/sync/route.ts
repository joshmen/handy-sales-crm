import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock data para desarrollo
const mockSyncData = {
  clients: [
    {
      id: '1',
      name: 'Abarrotes Don Juan',
      address: 'Calle Principal 123',
      phone: '+52 555 123 4567',
      email: 'contacto@donjuan.com',
      location: { lat: 19.4326, lng: -99.1332 },
      creditLimit: 50000,
      creditUsed: 15000,
      lastVisit: new Date('2025-01-10'),
      nextVisit: new Date('2025-01-17'),
    },
    {
      id: '2',
      name: 'Tienda La Esquina',
      address: 'Av. Insurgentes 456',
      phone: '+52 555 234 5678',
      email: 'tienda@laesquina.com',
      location: { lat: 19.4336, lng: -99.1342 },
      creditLimit: 30000,
      creditUsed: 8000,
      lastVisit: new Date('2025-01-12'),
      nextVisit: new Date('2025-01-19'),
    },
  ],
  products: [
    {
      id: '1',
      sku: 'REF001',
      name: 'Refresco Cola 2L',
      category: 'Bebidas',
      price: 28.5,
      stock: 150,
      minStock: 50,
      image: 'https://via.placeholder.com/150',
    },
    {
      id: '2',
      sku: 'SAB001',
      name: 'Sabritas Original 45g',
      category: 'Botanas',
      price: 18.0,
      stock: 200,
      minStock: 100,
      image: 'https://via.placeholder.com/150',
    },
  ],
  routes: [
    {
      id: '1',
      name: 'Ruta Norte',
      date: new Date('2025-01-15'),
      clients: ['1', '2'],
      status: 'scheduled',
      estimatedTime: 240, // minutos
      assignedTo: 'vendedor@handysuites.com',
    },
  ],
  orders: [
    {
      id: '1',
      clientId: '1',
      date: new Date('2025-01-10'),
      items: [
        { productId: '1', quantity: 10, price: 28.5 },
        { productId: '2', quantity: 20, price: 18.0 },
      ],
      total: 645.0,
      status: 'delivered',
      paymentMethod: 'credit',
    },
  ],
  settings: {
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    requirePhotoOnVisit: true,
    requireSignatureOnDelivery: true,
    requireLocationOnCheckIn: true,
    maxDistanceFromClient: 100, // metros
    allowNegativeStock: false,
    requireStockCount: true,
  },
};

// ===== Tipos mínimos para arreglar TS sin romper tu lógica =====
type DataTypeKey = 'clients' | 'products' | 'routes' | 'orders';

type SyncDataPayload = {
  clients?: typeof mockSyncData.clients;
  products?: typeof mockSyncData.products;
  routes?: typeof mockSyncData.routes;
  orders?: typeof mockSyncData.orders;
};

type DeletedIds = {
  clients: string[];
  products: string[];
  routes: string[];
  orders: string[];
};

type SyncResponse = {
  success: boolean;
  lastSyncDate: Date;
  data: SyncDataPayload;
  settings: typeof mockSyncData.settings;
  deletedIds?: DeletedIds;
};

type DeviceInfo = {
  deviceId?: string;
  // ...otros campos que mandes desde el móvil
  [k: string]: unknown;
};

type SessionUser = {
  id: string;
  email: string;
  role: string; // 'ADMIN' | ...
};

// ================================================================

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as unknown as SessionUser;

    // Obtener datos de sincronización del request
    const body = (await request.json()) as {
      userId: string;
      lastSyncDate?: string;
      deviceInfo?: DeviceInfo;
      dataTypes?: DataTypeKey[];
    };

    const {
      userId,
      lastSyncDate,
      deviceInfo,
      dataTypes = ['clients', 'products', 'routes', 'orders'],
    } = body;

    // Validar que el usuario solo pueda sincronizar sus propios datos
    if (userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para sincronizar estos datos' },
        { status: 403 }
      );
    }

    // Log de sincronización
    console.log('Sync request:', {
      userId,
      lastSyncDate,
      deviceInfo,
      dataTypes,
      sessionUser: user.email,
    });

    // Filtrar datos según los tipos solicitados
    const syncData: SyncResponse = {
      success: true,
      lastSyncDate: new Date(),
      data: {},
      settings: mockSyncData.settings,
    };

    // Solo incluir los tipos de datos solicitados
    if (dataTypes.includes('clients')) {
      syncData.data.clients = mockSyncData.clients;
    }
    if (dataTypes.includes('products')) {
      syncData.data.products = mockSyncData.products;
    }
    if (dataTypes.includes('routes')) {
      // Filtrar rutas asignadas al usuario
      syncData.data.routes =
        user.role === 'ADMIN'
          ? mockSyncData.routes
          : mockSyncData.routes.filter(r => r.assignedTo === user.email);
    }
    if (dataTypes.includes('orders')) {
      syncData.data.orders = mockSyncData.orders;
    }

    // Si hay una fecha de última sincronización, filtrar solo datos nuevos/actualizados
    if (lastSyncDate) {
      const lastSync = new Date(lastSyncDate);
      // Aquí filtrarías los datos que han sido modificados después de lastSync
      // Por ahora, enviamos todo en desarrollo
      syncData.deletedIds = {
        clients: [],
        products: [],
        routes: [],
        orders: [],
      };
    }

    // Guardar información del dispositivo para notificaciones push
    if (deviceInfo?.deviceId) {
      // TODO: Guardar deviceToken en la base de datos para notificaciones push
      console.log('Device registered for push notifications:', deviceInfo);
    }

    return NextResponse.json(syncData);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Error en la sincronización' }, { status: 500 });
  }
}

// Endpoint GET para verificar el estado de sincronización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as unknown as SessionUser;

    // Devolver información sobre la última sincronización
    return NextResponse.json({
      status: 'ready',
      serverTime: new Date(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      subscription: {
        status: 'active', // En producción, verificar el estado real de la suscripción
        plan: 'PROFESSIONAL',
        validUntil: new Date('2025-02-15'),
      },
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de sincronización' },
      { status: 500 }
    );
  }
}
