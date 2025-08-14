import { NextRequest, NextResponse } from 'next/server';

// Almacenamiento temporal para desarrollo
const syncQueue = new Map();
const lastSyncTimestamps = new Map();

// POST /api/mobile/sync
// Sincronización bidireccional de datos
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      deviceId, 
      lastSyncAt, 
      data: clientData,
      type = 'full' // 'full' | 'delta' | 'push'
    } = body;

    // Timestamp actual
    const currentTimestamp = new Date().toISOString();

    // Datos para enviar al cliente
    const serverData = {
      timestamp: currentTimestamp,
      type: type,
      data: {}
    };

    // Procesar datos recibidos del cliente
    if (clientData) {
      // Guardar pedidos nuevos
      if (clientData.orders && clientData.orders.length > 0) {
        console.log('Nuevos pedidos recibidos:', clientData.orders.length);
        // TODO: Guardar en base de datos
        
        serverData.data.ordersProcessed = clientData.orders.map(o => ({
          localId: o.localId,
          serverId: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'confirmed'
        }));
      }

      // Actualizar visitas completadas
      if (clientData.visits && clientData.visits.length > 0) {
        console.log('Visitas actualizadas:', clientData.visits.length);
        // TODO: Actualizar en base de datos
      }

      // Guardar ubicaciones GPS
      if (clientData.locations && clientData.locations.length > 0) {
        console.log('Ubicaciones GPS recibidas:', clientData.locations.length);
        // TODO: Guardar historial de ubicaciones
      }

      // Procesar fotos/evidencias
      if (clientData.photos && clientData.photos.length > 0) {
        console.log('Fotos recibidas:', clientData.photos.length);
        // TODO: Procesar y guardar fotos
      }
    }

    // Determinar qué datos enviar según el tipo de sincronización
    if (type === 'full' || !lastSyncAt) {
      // Sincronización completa
      serverData.data = {
        ...serverData.data,
        clients: [
          {
            id: '1',
            name: 'Abarrotes El Sol',
            address: 'Calle Principal 123',
            phone: '555-0001',
            zone: 'Norte',
            coordinates: { lat: 25.123, lng: -100.456 },
            creditLimit: 10000,
            creditUsed: 3500,
            lastVisit: '2025-01-10T10:30:00Z',
            visitFrequency: 'weekly'
          },
          {
            id: '2',
            name: 'Tienda La Esquina',
            address: 'Av. Revolución 456',
            phone: '555-0002',
            zone: 'Norte',
            coordinates: { lat: 25.124, lng: -100.457 },
            creditLimit: 5000,
            creditUsed: 1200,
            lastVisit: '2025-01-12T14:20:00Z',
            visitFrequency: 'weekly'
          },
          {
            id: '3',
            name: 'Mini Super López',
            address: 'Blvd. Universidad 789',
            phone: '555-0003',
            zone: 'Norte',
            coordinates: { lat: 25.125, lng: -100.458 },
            creditLimit: 15000,
            creditUsed: 8900,
            lastVisit: '2025-01-08T09:15:00Z',
            visitFrequency: 'biweekly'
          }
        ],
        products: [
          {
            id: '1',
            code: 'P001',
            name: 'Refresco Cola 2L',
            price: 35,
            wholesalePrice: 32,
            stock: 100,
            minStock: 20,
            category: 'Bebidas',
            brand: 'CocaCola',
            barcode: '7501031311309'
          },
          {
            id: '2',
            code: 'P002',
            name: 'Agua Natural 1L',
            price: 15,
            wholesalePrice: 13,
            stock: 200,
            minStock: 50,
            category: 'Bebidas',
            brand: 'Bonafont',
            barcode: '7501055300846'
          },
          {
            id: '3',
            code: 'P003',
            name: 'Sabritas Original 45g',
            price: 18,
            wholesalePrice: 16,
            stock: 150,
            minStock: 30,
            category: 'Botanas',
            brand: 'Sabritas',
            barcode: '7501011130012'
          },
          {
            id: '4',
            code: 'P004',
            name: 'Galletas Marías',
            price: 22,
            wholesalePrice: 20,
            stock: 80,
            minStock: 15,
            category: 'Galletas',
            brand: 'Gamesa',
            barcode: '7501030402022'
          }
        ],
        routes: [
          {
            id: '1',
            name: 'Ruta Norte - Lunes',
            date: new Date().toISOString(),
            status: 'active',
            totalClients: 3,
            visitedClients: 0,
            estimatedDuration: 240, // minutos
            estimatedDistance: 15.5, // km
            inventory: [
              { productId: '1', loaded: 50, sold: 0, returned: 0 },
              { productId: '2', loaded: 100, sold: 0, returned: 0 },
              { productId: '3', loaded: 75, sold: 0, returned: 0 },
              { productId: '4', loaded: 40, sold: 0, returned: 0 }
            ],
            visits: [
              {
                id: 'v1',
                clientId: '1',
                clientName: 'Abarrotes El Sol',
                scheduledTime: new Date().toISOString(),
                estimatedDuration: 30,
                status: 'pending',
                order: 1
              },
              {
                id: 'v2',
                clientId: '2',
                clientName: 'Tienda La Esquina',
                scheduledTime: new Date(Date.now() + 3600000).toISOString(),
                estimatedDuration: 25,
                status: 'pending',
                order: 2
              },
              {
                id: 'v3',
                clientId: '3',
                clientName: 'Mini Super López',
                scheduledTime: new Date(Date.now() + 7200000).toISOString(),
                estimatedDuration: 35,
                status: 'pending',
                order: 3
              }
            ]
          }
        ],
        promotions: [
          {
            id: 'promo1',
            name: '2x1 en Refrescos',
            description: 'Lleva 2 paga 1 en refrescos de 2L',
            productIds: ['1'],
            validFrom: '2025-01-01T00:00:00Z',
            validTo: '2025-01-31T23:59:59Z',
            type: '2x1'
          },
          {
            id: 'promo2',
            name: '10% de descuento en Botanas',
            description: 'Descuento en todas las botanas',
            categoryIds: ['Botanas'],
            validFrom: '2025-01-01T00:00:00Z',
            validTo: '2025-01-15T23:59:59Z',
            type: 'discount',
            discountPercent: 10
          }
        ],
        settings: {
          syncInterval: 30000,
          gpsInterval: 10000,
          photoQuality: 0.7,
          maxPhotosPerVisit: 3,
          requirePhotoEvidence: true,
          requireSignature: true,
          allowOfflineOrders: true,
          maxOfflineDays: 7,
          currency: 'MXN',
          timezone: 'America/Mexico_City'
        }
      };
    } else {
      // Sincronización delta (solo cambios desde lastSyncAt)
      const lastSync = new Date(lastSyncAt);
      
      // Simular cambios incrementales
      serverData.data = {
        ...serverData.data,
        updatedClients: [],
        updatedProducts: [
          {
            id: '1',
            stock: 95 // Stock actualizado
          }
        ],
        newOrders: [],
        cancelledOrders: [],
        messages: [
          {
            id: 'msg1',
            type: 'info',
            title: 'Promoción especial',
            message: 'Recuerda ofrecer la promoción 2x1 en refrescos',
            createdAt: currentTimestamp
          }
        ]
      };
    }

    // Guardar timestamp de última sincronización
    lastSyncTimestamps.set(deviceId, currentTimestamp);

    return NextResponse.json({
      success: true,
      ...serverData,
      nextSyncIn: 30000 // Próxima sincronización en 30 segundos
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Error durante la sincronización' },
      { status: 500 }
    );
  }
}

// GET /api/mobile/sync/status
// Obtener estado de sincronización
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID requerido' },
        { status: 400 }
      );
    }

    const lastSync = lastSyncTimestamps.get(deviceId);
    const pendingItems = syncQueue.get(deviceId) || [];

    return NextResponse.json({
      deviceId,
      lastSyncAt: lastSync || null,
      pendingItems: pendingItems.length,
      serverTime: new Date().toISOString(),
      status: 'online'
    });

  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
