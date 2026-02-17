# HandySales Mobile - Arquitectura React Native

## Visión General

App móvil para vendedores de campo que permite gestionar visitas a clientes, crear pedidos, sincronizar datos offline y recibir notificaciones push.

## Stack Tecnológico

```
Framework:        React Native 0.73+ (Expo SDK 50+)
Lenguaje:         TypeScript 5.x
Estado Global:    Zustand + React Query
Navegación:       React Navigation 6.x
UI Components:    React Native Paper / NativeBase
Formularios:      React Hook Form + Zod
HTTP Client:      Axios
Offline:          WatermelonDB / MMKV
Push:             Firebase Cloud Messaging (FCM)
Maps:             react-native-maps
Geolocation:      expo-location
Camera:           expo-camera / expo-image-picker
Storage:          expo-secure-store (tokens)
```

## Estructura de Carpetas

```
handy-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Pantallas de autenticación
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Tab navigator principal
│   │   ├── index.tsx            # Dashboard/Home
│   │   ├── clientes/            # Lista y detalle de clientes
│   │   ├── pedidos/             # Gestión de pedidos
│   │   ├── visitas/             # Visitas programadas
│   │   └── perfil.tsx           # Perfil y configuración
│   └── _layout.tsx              # Root layout
│
├── src/
│   ├── api/                     # Configuración de API
│   │   ├── client.ts            # Axios instance con interceptors
│   │   ├── endpoints/           # Endpoints por dominio
│   │   │   ├── auth.ts
│   │   │   ├── clientes.ts
│   │   │   ├── pedidos.ts
│   │   │   ├── visitas.ts
│   │   │   └── sync.ts
│   │   └── types/               # Tipos de respuesta API
│   │
│   ├── components/              # Componentes reutilizables
│   │   ├── ui/                  # Botones, inputs, cards
│   │   ├── forms/               # Formularios compuestos
│   │   └── layouts/             # Layouts de pantalla
│   │
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useLocation.ts
│   │   ├── useOffline.ts
│   │   └── useNotifications.ts
│   │
│   ├── stores/                  # Zustand stores
│   │   ├── authStore.ts
│   │   ├── syncStore.ts
│   │   └── uiStore.ts
│   │
│   ├── services/                # Servicios de negocio
│   │   ├── auth.service.ts
│   │   ├── sync.service.ts
│   │   ├── location.service.ts
│   │   └── notification.service.ts
│   │
│   ├── db/                      # Base de datos local
│   │   ├── schema.ts            # WatermelonDB schema
│   │   ├── models/              # Modelos de datos
│   │   └── migrations/          # Migraciones
│   │
│   ├── utils/                   # Utilidades
│   │   ├── storage.ts           # SecureStore wrapper
│   │   ├── format.ts            # Formateo de datos
│   │   └── validation.ts        # Schemas Zod
│   │
│   └── constants/               # Constantes
│       ├── api.ts
│       ├── colors.ts
│       └── config.ts
│
├── assets/                      # Imágenes, fonts, etc.
├── app.json                     # Expo config
├── eas.json                     # EAS Build config
└── package.json
```

## Flujo de Autenticación

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Login     │────▶│  API /login  │────▶│ Store JWT   │
│   Screen    │     │              │     │ SecureStore │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Device       │
                    │ Registration │
                    │ + FCM Token  │
                    └──────────────┘
```

### Tokens

```typescript
// Almacenamiento seguro
await SecureStore.setItemAsync('access_token', token);
await SecureStore.setItemAsync('refresh_token', refreshToken);

// Interceptor de refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await refreshTokens();
      // Reintentar request original
    }
    return Promise.reject(error);
  }
);
```

## Sincronización Offline

### Estrategia Delta Sync

```
┌────────────────────────────────────────────────────────┐
│                    APP MÓVIL                            │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │ WatermelonDB│◀──▶│ Sync Service │◀──▶│ API      │  │
│  │ (SQLite)    │    │              │    │ /sync    │  │
│  └─────────────┘    └──────────────┘    └──────────┘  │
└────────────────────────────────────────────────────────┘

Sync Flow:
1. GET /api/sync?lastSync=2026-01-30T12:00:00
2. Server retorna entidades modificadas desde lastSync
3. App aplica cambios a DB local
4. App envía cambios locales pendientes
5. Server confirma y retorna IDs actualizados
```

### Entidades Sincronizables

| Entidad | Sync Down | Sync Up | Prioridad |
|---------|-----------|---------|-----------|
| Clientes | ✅ | ✅ | Alta |
| Productos | ✅ | ❌ | Alta |
| ListasPrecios | ✅ | ❌ | Alta |
| Pedidos | ✅ | ✅ | Alta |
| Visitas | ✅ | ✅ | Alta |
| Rutas | ✅ | ✅ | Media |

### Resolución de Conflictos

```typescript
// Estrategia: Last-Write-Wins con Version
interface SyncEntity {
  id: number;
  version: number;
  lastModifiedUtc: string;
}

// Conflicto: versión local < versión servidor
// Resolución: servidor gana, se notifica al usuario
```

## Geolocalización

### Check-in de Visitas

```typescript
// hooks/useLocation.ts
export const useLocation = () => {
  const [location, setLocation] = useState<Location | null>(null);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permiso de ubicación denegado');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  };

  return { location, getCurrentLocation };
};
```

### Validación de Proximidad

```typescript
// Validar que el vendedor está cerca del cliente
const MAX_DISTANCE_METERS = 100;

const isNearClient = (vendorLoc: Coords, clientLoc: Coords): boolean => {
  const distance = getDistanceFromLatLonInMeters(
    vendorLoc.latitude, vendorLoc.longitude,
    clientLoc.latitude, clientLoc.longitude
  );
  return distance <= MAX_DISTANCE_METERS;
};
```

## Push Notifications

### Configuración FCM

```typescript
// services/notification.service.ts
import messaging from '@react-native-firebase/messaging';

export const initializeNotifications = async () => {
  // Solicitar permisos
  const authStatus = await messaging().requestPermission();

  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
    // Obtener token FCM
    const token = await messaging().getToken();

    // Registrar en backend
    await api.post('/notificaciones/push-token', {
      pushToken: token,
      platform: Platform.OS,
    });
  }

  // Handler de notificaciones en foreground
  messaging().onMessage(async (remoteMessage) => {
    // Mostrar notificación local
  });

  // Handler de notificaciones en background
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // Procesar silenciosamente
  });
};
```

### Tipos de Notificación

| Tipo | Acción | Deep Link |
|------|--------|-----------|
| Order | Nuevo pedido asignado | /pedidos/{id} |
| Route | Ruta actualizada | /rutas/{id} |
| Visit | Recordatorio de visita | /visitas/{id} |
| Alert | Alerta del sistema | /notificaciones |
| System | Actualización de app | N/A |

## Pantallas Principales

### 1. Dashboard (Home)

```
┌─────────────────────────────────┐
│  Buenos días, Juan              │
│  Empresa ABC                    │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐      │
│  │ Visitas │  │ Pedidos │      │
│  │   5     │  │   12    │      │
│  │  hoy    │  │ pendiente│     │
│  └─────────┘  └─────────┘      │
├─────────────────────────────────┤
│  Próxima visita                 │
│  ┌─────────────────────────────┐│
│  │ Cliente X - 10:30 AM        ││
│  │ Av. Principal #123          ││
│  │ [Navegar] [Check-in]        ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  Resumen del día                │
│  • 3 visitas completadas        │
│  • 2 pedidos creados            │
│  • $12,500 en ventas            │
└─────────────────────────────────┘
```

### 2. Lista de Clientes

```
┌─────────────────────────────────┐
│  🔍 Buscar cliente...           │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 🏢 Empresa ABC              ││
│  │    Última visita: hace 3 días││
│  │    📍 2.5 km                ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 🏢 Tienda XYZ               ││
│  │    Sin visitas recientes    ││
│  │    📍 5.1 km                ││
│  └─────────────────────────────┘│
│  ...                            │
└─────────────────────────────────┘
```

### 3. Detalle de Cliente

```
┌─────────────────────────────────┐
│  ← Empresa ABC                  │
├─────────────────────────────────┤
│  📞 55-1234-5678                │
│  📧 contacto@abc.com            │
│  📍 Av. Principal #123          │
├─────────────────────────────────┤
│  [Llamar] [Navegar] [Check-in]  │
├─────────────────────────────────┤
│  Últimos pedidos                │
│  • PED-001 - $5,500 - Entregado │
│  • PED-002 - $3,200 - En ruta   │
├─────────────────────────────────┤
│  [+ Nuevo Pedido]               │
└─────────────────────────────────┘
```

### 4. Crear Pedido

```
┌─────────────────────────────────┐
│  ← Nuevo Pedido                 │
│     Cliente: Empresa ABC        │
├─────────────────────────────────┤
│  Productos                      │
│  ┌─────────────────────────────┐│
│  │ Producto A        x2  $200 ││
│  │ Producto B        x5  $500 ││
│  │ [+ Agregar producto]        ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  Subtotal:              $700    │
│  IVA (16%):             $112    │
│  Total:                 $812    │
├─────────────────────────────────┤
│  Notas: _______________         │
├─────────────────────────────────┤
│  [Guardar Borrador] [Enviar]    │
└─────────────────────────────────┘
```

### 5. Check-in de Visita

```
┌─────────────────────────────────┐
│  ← Check-in                     │
│     Empresa ABC                 │
├─────────────────────────────────┤
│  📍 Ubicación verificada ✓      │
│     Distancia: 45 metros        │
├─────────────────────────────────┤
│  Notas de llegada:              │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │                             ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  [Tomar Foto]                   │
├─────────────────────────────────┤
│  [Confirmar Check-in]           │
└─────────────────────────────────┘
```

## Estados de la App

### Zustand Store - Auth

```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### Zustand Store - Sync

```typescript
interface SyncStore {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  pendingChanges: number;
  syncErrors: SyncError[];

  syncAll: () => Promise<void>;
  syncEntity: (entity: string) => Promise<void>;
  clearPending: () => void;
}
```

## Configuración de Builds

### EAS Build (eas.json)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  }
}
```

## Próximos Pasos

1. **Configuración inicial**
   - Crear proyecto Expo con TypeScript template
   - Configurar estructura de carpetas
   - Instalar dependencias core

2. **Autenticación**
   - Implementar login screen
   - Configurar secure storage
   - Implementar refresh token

3. **Navegación**
   - Configurar Expo Router
   - Crear tab navigator
   - Implementar deep linking

4. **API Integration**
   - Configurar Axios client
   - Implementar endpoints
   - Configurar React Query

5. **Offline First**
   - Configurar WatermelonDB
   - Implementar sync service
   - Manejar conflictos

6. **Features Core**
   - Dashboard
   - Lista de clientes
   - Crear pedido
   - Check-in/Check-out

7. **Push Notifications**
   - Configurar FCM
   - Registrar tokens
   - Manejar deep links

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npx expo start

# Build Android (APK para testing)
eas build --platform android --profile preview

# Build iOS (TestFlight)
eas build --platform ios --profile production
```
