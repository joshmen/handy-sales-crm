# Firebase Cloud Messaging (FCM) - Guía de Configuración

Esta guía describe cómo configurar Firebase Cloud Messaging para habilitar notificaciones push en la aplicación HandySales.

## Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Firebase Console](#configuración-de-firebase-console)
3. [Configuración del Backend (.NET)](#configuración-del-backend-net)
4. [Configuración de la App Móvil](#configuración-de-la-app-móvil)
5. [Pruebas](#pruebas)
6. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

- Cuenta de Google con acceso a Firebase Console
- Proyecto Firebase creado (o crear uno nuevo)
- Backend .NET desplegado
- App móvil React Native con Expo configurada

---

## Configuración de Firebase Console

### 1. Crear Proyecto Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Click en "Agregar proyecto"
3. Nombre del proyecto: `handysales-prod` (o el nombre deseado)
4. Habilitar Google Analytics (recomendado)
5. Seleccionar cuenta de Analytics existente o crear una nueva

### 2. Agregar Apps al Proyecto

#### Android

1. En la página del proyecto, click en el ícono de Android
2. **Package name**: `com.handysales.mobile` (debe coincidir con `package` en `app.json`)
3. **App nickname**: HandySales Android
4. **Debug signing certificate SHA-1**: (opcional para desarrollo)
5. Descargar `google-services.json`
6. Guardar el archivo en `handy-mobile/android/app/`

#### iOS

1. Click en "Agregar app" > iOS
2. **Bundle ID**: `com.handysales.mobile` (debe coincidir con `ios.bundleIdentifier` en `app.json`)
3. **App nickname**: HandySales iOS
4. Descargar `GoogleService-Info.plist`
5. Guardar el archivo en `handy-mobile/ios/HandyMobile/`

### 3. Generar Clave de Servicio (Service Account)

1. Ir a Configuración del Proyecto > Cuentas de Servicio
2. Click en "Generar nueva clave privada"
3. Confirmar la descarga
4. **IMPORTANTE**: Guardar este archivo de forma segura, contiene credenciales sensibles
5. Renombrar a `firebase-service-account.json`

---

## Configuración del Backend (.NET)

### 1. Instalar NuGet Package

```bash
cd HandySales/src/HandySales.Infrastructure
dotnet add package FirebaseAdmin --version 2.4.0
```

### 2. Configurar appsettings.json

#### Desarrollo (appsettings.Development.json)

```json
{
  "Firebase": {
    "ProjectId": "handysales-dev",
    "CredentialsPath": "secrets/firebase-service-account-dev.json"
  }
}
```

#### Producción (appsettings.Production.json)

```json
{
  "Firebase": {
    "ProjectId": "handysales-prod",
    "CredentialsPath": "/app/secrets/firebase-service-account.json"
  }
}
```

### 3. Configurar Variables de Entorno (Azure)

Para Azure Container Instances:

```bash
# Usando Azure CLI
az container create \
  --resource-group HandySales-RG \
  --name handysales-api \
  --environment-variables \
    Firebase__ProjectId="handysales-prod" \
    Firebase__CredentialsPath="/app/secrets/firebase-service-account.json"
```

O usando Azure Key Vault (recomendado):

```bash
# Guardar credenciales como secreto
az keyvault secret set \
  --vault-name handysales-keyvault \
  --name FirebaseCredentials \
  --file firebase-service-account.json
```

### 4. Actualizar FcmService.cs

El servicio actual (`HandySales.Infrastructure/Notifications/Services/FcmService.cs`) está preparado para Firebase. Solo necesita descomentar el código de producción:

```csharp
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using HandySales.Application.Notifications.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HandySales.Infrastructure.Notifications.Services;

public class FcmService : IFcmService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<FcmService> _logger;
    private readonly bool _isConfigured;

    public FcmService(IConfiguration configuration, ILogger<FcmService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        var projectId = _configuration["Firebase:ProjectId"];
        var credentialsPath = _configuration["Firebase:CredentialsPath"];
        _isConfigured = !string.IsNullOrEmpty(projectId) && !string.IsNullOrEmpty(credentialsPath);

        if (_isConfigured)
        {
            InitializeFirebase(credentialsPath!, projectId!);
        }
        else
        {
            _logger.LogWarning("Firebase no está configurado. Las notificaciones push no estarán disponibles.");
        }
    }

    public bool IsConfigured => _isConfigured;

    private void InitializeFirebase(string credentialsPath, string projectId)
    {
        try
        {
            if (FirebaseApp.DefaultInstance == null)
            {
                var credential = GoogleCredential.FromFile(credentialsPath);
                FirebaseApp.Create(new AppOptions
                {
                    Credential = credential,
                    ProjectId = projectId
                });
            }
            _logger.LogInformation("Firebase inicializado correctamente para proyecto {ProjectId}", projectId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al inicializar Firebase");
        }
    }

    public async Task<FcmSendResult> EnviarAsync(string token, string titulo, string mensaje, Dictionary<string, string>? data = null)
    {
        if (!_isConfigured)
        {
            return new FcmSendResult { Success = false, Error = "Firebase no está configurado" };
        }

        try
        {
            var message = new Message
            {
                Token = token,
                Notification = new Notification
                {
                    Title = titulo,
                    Body = mensaje
                },
                Data = data,
                Android = new AndroidConfig
                {
                    Priority = Priority.High,
                    Notification = new AndroidNotification
                    {
                        ChannelId = "handysales_default",
                        Icon = "notification_icon",
                        Sound = "default"
                    }
                },
                Apns = new ApnsConfig
                {
                    Aps = new Aps
                    {
                        Sound = "default",
                        Badge = 1
                    }
                }
            };

            var response = await FirebaseMessaging.DefaultInstance.SendAsync(message);
            _logger.LogInformation("Notificación enviada exitosamente. MessageId: {MessageId}", response);

            return new FcmSendResult { Success = true, MessageId = response };
        }
        catch (FirebaseMessagingException ex)
        {
            _logger.LogError(ex, "Error FCM al enviar notificación. Token: {Token}", token.Substring(0, 20));
            return new FcmSendResult { Success = false, Error = ex.Message };
        }
    }

    public async Task<FcmSendResult> EnviarMulticastAsync(List<string> tokens, string titulo, string mensaje, Dictionary<string, string>? data = null)
    {
        if (!_isConfigured)
        {
            return new FcmSendResult { Success = false, Error = "Firebase no está configurado" };
        }

        if (tokens == null || !tokens.Any())
        {
            return new FcmSendResult { Success = false, Error = "No se proporcionaron tokens" };
        }

        try
        {
            var message = new MulticastMessage
            {
                Tokens = tokens,
                Notification = new Notification
                {
                    Title = titulo,
                    Body = mensaje
                },
                Data = data,
                Android = new AndroidConfig
                {
                    Priority = Priority.High,
                    Notification = new AndroidNotification
                    {
                        ChannelId = "handysales_default",
                        Icon = "notification_icon",
                        Sound = "default"
                    }
                },
                Apns = new ApnsConfig
                {
                    Aps = new Aps
                    {
                        Sound = "default"
                    }
                }
            };

            var response = await FirebaseMessaging.DefaultInstance.SendEachForMulticastAsync(message);
            _logger.LogInformation("Multicast enviado. Exitosos: {Success}, Fallidos: {Failure}",
                response.SuccessCount, response.FailureCount);

            return new FcmSendResult
            {
                Success = response.SuccessCount > 0,
                MessageId = $"multicast_{response.SuccessCount}_{response.FailureCount}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al enviar notificación multicast");
            return new FcmSendResult { Success = false, Error = ex.Message };
        }
    }
}
```

---

## Configuración de la App Móvil

### 1. Instalar Dependencias

```bash
cd handy-mobile
npx expo install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Configurar app.json

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.handysales.mobile"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.handysales.mobile"
    }
  }
}
```

### 3. Implementar Servicio de Notificaciones

```typescript
// src/services/notification.service.ts
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { api } from '@/api/client';

export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  },

  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error obteniendo FCM token:', error);
      return null;
    }
  },

  async registerTokenWithBackend(sessionId: number): Promise<void> {
    const token = await this.getToken();
    if (!token) return;

    try {
      await api.post('/notificaciones/push-token', {
        pushToken: token,
        sessionId: sessionId
      });
      console.log('Token registrado en backend');
    } catch (error) {
      console.error('Error registrando token:', error);
    }
  },

  setupListeners() {
    // Notificaciones en foreground
    messaging().onMessage(async remoteMessage => {
      console.log('Notificación en foreground:', remoteMessage);
      // Mostrar notificación local o actualizar UI
    });

    // Notificación tocada (app en background)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('App abierta por notificación:', remoteMessage);
      // Navegar a pantalla correspondiente
    });

    // App cerrada y abierta por notificación
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('App iniciada por notificación:', remoteMessage);
        // Navegar a pantalla correspondiente
      }
    });

    // Token refresh
    messaging().onTokenRefresh(async newToken => {
      console.log('Token actualizado:', newToken);
      // Re-registrar en backend
    });
  }
};
```

### 4. Inicializar en App

```typescript
// App.tsx o _layout.tsx
import { useEffect } from 'react';
import { NotificationService } from '@/services/notification.service';
import { useAuthStore } from '@/stores/authStore';

export default function App() {
  const { sessionId, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initNotifications = async () => {
      const hasPermission = await NotificationService.requestPermission();
      if (hasPermission && isAuthenticated && sessionId) {
        await NotificationService.registerTokenWithBackend(sessionId);
        NotificationService.setupListeners();
      }
    };

    initNotifications();
  }, [isAuthenticated, sessionId]);

  // ...
}
```

---

## Pruebas

### Prueba desde Firebase Console

1. Ir a Firebase Console > Cloud Messaging
2. Click en "Enviar tu primer mensaje"
3. Completar título y texto
4. Seleccionar la app
5. Enviar mensaje de prueba

### Prueba desde Backend

```bash
# Usando curl
curl -X POST https://api.handysales.com/notificaciones/enviar \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": 1,
    "titulo": "Prueba FCM",
    "mensaje": "Esta es una notificación de prueba",
    "tipo": "General"
  }'
```

### Prueba en Swagger

1. Abrir https://api.handysales.com/swagger
2. Autenticarse con JWT
3. Ir a POST /notificaciones/enviar
4. Ejecutar con los parámetros deseados

---

## Troubleshooting

### Token inválido o expirado

```
Error: messaging/registration-token-not-registered
```

**Solución**: El token FCM expiró o el usuario desinstalo la app. El backend debe manejar este error y limpiar tokens inválidos.

### Certificados iOS

```
Error: APNS certificate has not been uploaded
```

**Solución**: Subir el certificado APNs en Firebase Console > Configuración > Cloud Messaging

### Sin permisos en Android

**Solución**: Verificar que el canal de notificaciones esté creado:

```typescript
import notifee from '@notifee/react-native';

await notifee.createChannel({
  id: 'handysales_default',
  name: 'Notificaciones de HandySales',
  importance: AndroidImportance.HIGH,
});
```

### Logs de depuración

Habilitar logs detallados en el backend:

```json
// appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "HandySales.Infrastructure.Notifications": "Debug"
    }
  }
}
```

---

## Seguridad

### Credenciales

- **NUNCA** commitear `firebase-service-account.json` a Git
- Agregar a `.gitignore`:
  ```
  **/firebase-service-account*.json
  **/google-services.json
  **/GoogleService-Info.plist
  ```
- Usar Azure Key Vault o similar para producción

### Validación de tokens

El backend valida que el usuario solo pueda registrar tokens para sus propias sesiones de dispositivo.

---

## Referencias

- [Firebase Admin SDK para .NET](https://firebase.google.com/docs/admin/setup)
- [React Native Firebase](https://rnfirebase.io/)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
