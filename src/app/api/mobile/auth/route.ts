import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Mock database para desarrollo
const mockDevices = new Map();
const mockSyncData = new Map();

// POST /api/mobile/auth/login
// Login desde la app móvil con registro de dispositivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, deviceInfo } = body;

    // Validar credenciales (mock para desarrollo)
    const mockUsers = [
      { 
        id: '1', 
        email: 'vendedor@handysales.com', 
        password: 'vendedor123',
        name: 'Vendedor Demo',
        role: 'VENDEDOR',
        code: 'V001',
        zone: 'Norte',
        permissions: ['client.read', 'order.create', 'route.read']
      }
    ];

    const user = mockUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Registrar dispositivo
    const deviceId = deviceInfo?.deviceId || `device-${Date.now()}`;
    const device = {
      id: deviceId,
      userId: user.id,
      deviceName: deviceInfo?.deviceName || 'Dispositivo móvil',
      platform: deviceInfo?.platform || 'unknown',
      model: deviceInfo?.model,
      osVersion: deviceInfo?.osVersion,
      appVersion: deviceInfo?.appVersion,
      pushToken: deviceInfo?.pushToken,
      lastActive: new Date(),
      isActive: true,
    };

    mockDevices.set(deviceId, device);

    // Generar token JWT (en producción usar una librería como jsonwebtoken)
    const token = Buffer.from(JSON.stringify({ userId: user.id, deviceId })).toString('base64');
    
    // Preparar datos iniciales para sincronización
    const initialData = {
      clients: [
        {
          id: '1',
          name: 'Abarrotes El Sol',
          address: 'Calle Principal 123',
          phone: '555-0001',
          zone: 'Norte',
          coordinates: { lat: 25.123, lng: -100.456 }
        },
        {
          id: '2',
          name: 'Tienda La Esquina',
          address: 'Av. Revolución 456',
          phone: '555-0002',
          zone: 'Norte',
          coordinates: { lat: 25.124, lng: -100.457 }
        }
      ],
      products: [
        {
          id: '1',
          code: 'P001',
          name: 'Refresco Cola 2L',
          price: 35,
          stock: 100,
          category: 'Bebidas'
        },
        {
          id: '2',
          code: 'P002',
          name: 'Agua Natural 1L',
          price: 15,
          stock: 200,
          category: 'Bebidas'
        }
      ],
      routes: [
        {
          id: '1',
          name: 'Ruta Norte - Lunes',
          date: new Date().toISOString(),
          status: 'active',
          clients: ['1', '2'],
          visits: [
            {
              id: 'v1',
              clientId: '1',
              scheduledTime: new Date().toISOString(),
              status: 'pending'
            },
            {
              id: 'v2',
              clientId: '2',
              scheduledTime: new Date(Date.now() + 3600000).toISOString(),
              status: 'pending'
            }
          ]
        }
      ],
      settings: {
        syncInterval: 30000, // 30 segundos
        gpsInterval: 10000,  // 10 segundos
        offlineMode: true,
        maxOfflineDays: 7,
        currency: 'MXN',
        timezone: 'America/Mexico_City'
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        token,
        refreshToken: `refresh-${token}`,
        expiresIn: 86400, // 24 horas
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          code: user.code,
          zone: user.zone,
          permissions: user.permissions
        },
        device: {
          id: deviceId,
          registered: true
        },
        initialData
      }
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// GET /api/mobile/auth/validate
// Validar token y refrescar si es necesario
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Validar token (mock)
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Verificar si el dispositivo está activo
      const device = mockDevices.get(decoded.deviceId);
      if (!device || !device.isActive) {
        return NextResponse.json(
          { error: 'Dispositivo no autorizado' },
          { status: 403 }
        );
      }

      // Actualizar última actividad
      device.lastActive = new Date();
      mockDevices.set(decoded.deviceId, device);

      return NextResponse.json({
        valid: true,
        userId: decoded.userId,
        deviceId: decoded.deviceId
      });
    } catch {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
