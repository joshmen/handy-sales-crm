import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
      price: 28.50,
      stock: 150,
      minStock: 50,
      image: 'https://via.placeholder.com/150',
    },
    {
      id: '2',
      sku: 'SAB001',
      name: 'Sabritas Original 45g',
      category: 'Botanas',
      price: 18.00,
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
      assignedTo: 'vendedor@handysales.com',
    },
  ],
  orders: [
    {
      id: '1',
      clientId: '1',
      date: new Date('2025-01-10'),
      items: [
        { productId: '1', quantity: 10, price: 28.50 },
        { productId: '2', quantity: 20, price: 18.00 },
      ],
      total: 645.00,
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

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener datos de sincronización del request
    const body = await request.json();
    const { 
      userId, 
      lastSyncDate, 
      deviceInfo, 
      dataTypes = ['clients', 'products', 'routes', 'orders'] 
    } = body;

    // Validar que el usuario solo pueda sincronizar sus propios datos
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
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
      sessionUser: session.user.email,
    });

    // Filtrar datos según los tipos solicitados
    const syncData: any = {
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
      syncData.data.routes = session.user.role === 'ADMIN' 
        ? mockSyncData.routes
        : mockSyncData.routes.filter(r => r.assignedTo === session.user.email);
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
    return NextResponse.json(
      { error: 'Error en la sincronización' },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar el estado de sincronización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Devolver información sobre la última sincronización
    return NextResponse.json({
      status: 'ready',
      serverTime: new Date(),
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
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
