# SuperAdmin - Flujo Completo

Guia para crear, configurar y gestionar usuarios SuperAdmin en HandySales.

---

## 1. Que es un SuperAdmin

Un SuperAdmin es un usuario con acceso a nivel plataforma que puede:
- Gestionar TODOS los tenants (empresas)
- Crear/editar/desactivar tenants y sus usuarios
- Impersonar tenants para soporte tecnico
- Acceder al System Dashboard y Global Settings
- Ver TODOS los usuarios del sistema (sin filtro de tenant)

**Diferencia con Admin regular**: Un Admin solo gestiona su propio tenant. Un SuperAdmin gestiona toda la plataforma.

---

## 2. Estructura en Base de Datos

### Tabla `Usuarios` - Campos clave

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `es_super_admin` | BOOLEAN (DEFAULT FALSE) | Flag principal de SuperAdmin |
| `es_admin` | BOOLEAN (DEFAULT FALSE) | Flag de admin (debe ser TRUE tambien) |
| `tenant_id` | INT (FK a Tenants) | Tenant al que pertenece (usualmente tenant_id=1) |
| `email` | VARCHAR(255) UNIQUE | Email de login |
| `password_hash` | VARCHAR(255) | Hash BCrypt del password |

### Combinaciones de flags

| `es_admin` | `es_super_admin` | Rol resultante |
|------------|-------------------|----------------|
| FALSE | FALSE | VENDEDOR |
| TRUE | FALSE | ADMIN (de un tenant) |
| TRUE | TRUE | **SUPER_ADMIN** (plataforma) |

> **Importante**: `es_admin` DEBE ser `true` cuando `es_super_admin` es `true`.

---

## 3. Como Crear un SuperAdmin

### Metodo 1: SQL Directo (Recomendado para produccion)

```sql
-- Opcion A: Crear nuevo usuario SuperAdmin
INSERT INTO Usuarios (
  tenant_id, email, password_hash, nombre,
  es_admin, es_super_admin, activo,
  creado_en, creado_por
) VALUES (
  1,                          -- tenant_id = 1 (tenant del sistema)
  'nuevo_superadmin@empresa.com',
  '$2a$11$HASH_BCRYPT_AQUI',  -- Generar con BCrypt
  'Nombre del Super Admin',
  1,                          -- es_admin = TRUE
  1,                          -- es_super_admin = TRUE
  1,                          -- activo = TRUE
  NOW(),
  'system'
);

-- Opcion B: Promover usuario existente a SuperAdmin
UPDATE Usuarios
SET es_super_admin = 1, es_admin = 1
WHERE email = 'usuario@empresa.com';
```

### Generar hash BCrypt del password

```bash
# Con Node.js
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('miPassword123', 11, (e,h) => console.log(h));"

# Con .NET
dotnet script -e "Console.WriteLine(BCrypt.Net.BCrypt.HashPassword(\"miPassword123\"));"

# Hash de test123 (para desarrollo):
# $2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO
```

### Metodo 2: Script de migracion SQL

Crear archivo en `infra/database/migrations/` con nombre secuencial:

```sql
-- XX_create_superadmin.sql
INSERT INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, activo, creado_en, creado_por)
SELECT 1, 'nuevo_sa@empresa.com', '$2a$11$HASH', 'Nombre SA', 1, 1, 1, NOW(), 'migration'
WHERE NOT EXISTS (SELECT 1 FROM Usuarios WHERE email = 'nuevo_sa@empresa.com');
```

### Metodo 3: Via API (Solo SuperAdmin existente)

Actualmente NO existe endpoint para crear SuperAdmins via API. El endpoint `/api/tenants/{id}/users` fuerza `es_super_admin = false`. La creacion solo es posible via SQL directo.

> **TODO futuro**: Considerar endpoint `/api/superadmins` protegido para gestion via UI.

---

## 4. Flujo de Autenticacion

### 4.1 Login

```
Usuario → POST /auth/login { email, password }
                ↓
AuthService.LoginAsync()
  1. Busca usuario: _db.Usuarios.IgnoreQueryFilters().FirstOrDefault(u => u.Email == email)
  2. Verifica password: BCrypt.Verify(password, usuario.PasswordHash)
  3. Determina rol: EsSuperAdmin → "SUPER_ADMIN" / EsAdmin → "ADMIN" / else → "VENDEDOR"
  4. Genera JWT: GenerateTokenWithRoles(id, tenantId, esAdmin, esSuperAdmin)
                ↓
Respuesta: { user: { id, email, name, role }, token: "eyJ...", refreshToken: "..." }
```

### 4.2 JWT Token - Claims del SuperAdmin

```json
{
  "sub": "10",                    // ID del usuario en DB
  "tenant_id": "1",              // Tenant del sistema
  "es_admin": "True",            // Flag admin
  "es_super_admin": "True",     // Flag super admin
  "role": "SUPER_ADMIN",         // Rol derivado (ClaimTypes.Role)
  "jti": "guid-unico",          // Token ID unico
  "exp": 1234567890              // Expiracion
}
```

### 4.3 NextAuth (Frontend)

```
JWT del backend → NextAuth authorize() callback
  1. Llama POST /auth/login
  2. Recibe { user, token, refreshToken }
  3. Almacena en session: { user.id, user.email, user.role, token }
  4. JWT callback: token.role = user.role ("SUPER_ADMIN")
  5. Session callback: session.user.role = token.role
```

**Archivo**: `apps/web/src/lib/auth.ts`

### 4.4 Middleware de Rutas (Frontend)

```typescript
// apps/web/src/middleware.ts
const ROLE_RESTRICTED_ROUTES = {
  '/admin':           [UserRole.SUPER_ADMIN],         // Solo SuperAdmin
  '/global-settings': [UserRole.SUPER_ADMIN],         // Solo SuperAdmin
  '/users':           [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  '/settings':        [UserRole.ADMIN],
};

// SuperAdmin sin impersonacion: solo puede acceder a rutas /admin y /global-settings
if (userRole === UserRole.SUPER_ADMIN && !token.isImpersonating) {
  // Restringe a rutas de admin unicamente
}
```

---

## 5. Verificacion de Permisos (Backend)

### ICurrentTenant Service

```csharp
// libs/HandySales.Infrastructure/Repositories/Multitenancy/CurrentTenant.cs
public class CurrentTenant : ICurrentTenant
{
    public int TenantId { get; }       // Del claim "tenant_id"
    public string UserId { get; }      // Del claim "sub"
    public bool IsAdmin { get; }       // Del claim "es_admin" == "True"
    public bool IsSuperAdmin { get; }  // Del claim "es_super_admin" == "True"
}
```

### Uso en Endpoints

```csharp
// Patron comun en TenantEndpoints.cs, etc.
private static async Task<IResult> GetAll(ICurrentTenant currentTenant, ...)
{
    if (!currentTenant.IsSuperAdmin)
        return Results.Forbid();  // 403

    // ... logica del endpoint
}
```

### Endpoints protegidos por RequireRole

```csharp
// ImpersonationEndpoints.cs
var group = app.MapGroup("/impersonation")
    .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"));
```

---

## 6. Impersonacion (SuperAdmin-Only)

### Flujo completo

```
SuperAdmin en /admin/tenants/{id}
  → Click "Impersonar"
  → ImpersonationModal se abre
  → Llena: razon (min 20 chars), ticket (opcional), nivel de acceso
  → Acepta politica de auditoria
  → Click "Iniciar Sesion de Soporte"
      ↓
POST /impersonation/start
  {
    targetTenantId: 3,
    reason: "Soporte tecnico para...",
    ticketNumber: "TICKET-123",
    accessLevel: "READ_ONLY"
  }
      ↓
ImpersonationService.StartSessionAsync()
  1. Valida razon >= 20 caracteres
  2. Verifica no hay sesion activa existente
  3. Verifica usuario es SuperAdmin en DB
  4. Obtiene datos del tenant target
  5. Crea ImpersonationSession en DB (UUID, auditoria completa)
  6. Genera JWT de impersonacion (tenant_id = target, is_impersonating = true)
  7. Log IMPERSONATION_STARTED
      ↓
Respuesta: { sessionId, impersonationToken, tenantName, accessLevel, expiresAt }
      ↓
Frontend:
  1. Guarda en ImpersonationStore (Zustand)
  2. Actualiza NextAuth session (isImpersonating = true)
  3. Redirige a /dashboard del tenant target
  4. Muestra ImpersonationBanner en la UI
```

### Token de impersonacion

```json
{
  "sub": "10",                           // ID del SuperAdmin (NO del tenant user)
  "tenant_id": "3",                      // Tenant TARGET (cambia al impersonado)
  "es_admin": "true",
  "es_super_admin": "true",
  "role": "SUPER_ADMIN",
  "impersonation_session_id": "guid",    // ID de la sesion
  "is_impersonating": "true",            // Marcador de impersonacion
  "impersonation_access_level": "READ_ONLY",
  "original_user_id": "10"              // Audit trail
}
```

### Tabla ImpersonationSessions

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | CHAR(36) UUID | PK |
| `super_admin_id` | INT | FK a Usuarios |
| `super_admin_email` | VARCHAR | Email del SA (snapshot) |
| `target_tenant_id` | INT | FK a Tenants |
| `target_tenant_name` | VARCHAR | Nombre del tenant (snapshot) |
| `reason` | TEXT | Justificacion obligatoria |
| `ticket_number` | VARCHAR | Ticket de soporte (opcional) |
| `access_level` | VARCHAR | READ_ONLY, READ_WRITE, ADMIN |
| `status` | VARCHAR | ACTIVE, ENDED, EXPIRED |
| `started_at` | DATETIME | Inicio de sesion |
| `ended_at` | DATETIME | Fin de sesion (NULL si activa) |
| `expires_at` | DATETIME | Expiracion (60 min default) |
| `ip_address` | VARCHAR | IP del SuperAdmin |
| `user_agent` | VARCHAR | Browser/client info |
| `actions_performed` | TEXT (JSON) | Log de acciones realizadas |
| `pages_visited` | TEXT (JSON) | Paginas visitadas |
| `notification_sent` | BOOLEAN | Si se notifico al tenant |

---

## 7. Rutas del SuperAdmin

### Frontend

| Ruta | Descripcion |
|------|-------------|
| `/admin/tenants` | Gestion de empresas (CRUD, batch toggle) |
| `/admin/tenants/{id}` | Detalle de empresa (stats, usuarios, impersonar) |
| `/admin/system-dashboard` | Dashboard del sistema (metricas globales) |
| `/global-settings` | Configuracion global de la plataforma |
| `/admin/users` | Gestion de usuarios (cross-tenant) |

### API Endpoints SuperAdmin-Only

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/tenants` | Listar todos los tenants |
| GET | `/api/tenants/{id}` | Detalle de tenant con stats |
| POST | `/api/tenants` | Crear tenant |
| PUT | `/api/tenants/{id}` | Actualizar tenant |
| PATCH | `/api/tenants/{id}/activo` | Toggle activo/inactivo |
| PATCH | `/api/tenants/batch-toggle` | Batch toggle tenants |
| GET | `/api/tenants/{id}/users` | Usuarios de un tenant |
| POST | `/api/tenants/{id}/users` | Crear usuario en tenant |
| POST | `/impersonation/start` | Iniciar impersonacion |
| POST | `/impersonation/end` | Finalizar impersonacion |
| GET | `/impersonation/current` | Estado actual de impersonacion |
| GET | `/impersonation/history` | Historial de sesiones |

---

## 8. Checklist para Alta de Nuevo SuperAdmin

1. [ ] Generar hash BCrypt del password
2. [ ] Insertar/actualizar usuario en DB con `es_super_admin=1, es_admin=1`
3. [ ] Asignar `tenant_id=1` (tenant del sistema)
4. [ ] Verificar login en `/login` con las credenciales
5. [ ] Confirmar redireccion a `/admin/system-dashboard`
6. [ ] Verificar acceso a `/admin/tenants`
7. [ ] Probar impersonacion de un tenant
8. [ ] Verificar que el banner de impersonacion aparece
9. [ ] Finalizar sesion de impersonacion
10. [ ] Verificar registro en `ImpersonationSessions`

---

## 9. Archivos Clave

| Componente | Archivo |
|------------|---------|
| Schema DB | `infra/database/schema/01_init_schema_multitenant.sql` |
| Migracion SA | `infra/database/migrations/06_add_super_admin_and_test_companies.sql` |
| Entity | `libs/HandySales.Domain/Entities/Usuario.cs` |
| Auth Service | `apps/api/src/HandySales.Api/Auth/AuthService.cs` |
| JWT Generator | `libs/HandySales.Shared/Security/JwtTokenGenerator.cs` |
| CurrentTenant | `libs/HandySales.Infrastructure/Repositories/Multitenancy/CurrentTenant.cs` |
| Tenant Endpoints | `apps/api/src/HandySales.Api/Endpoints/TenantEndpoints.cs` |
| Impersonation Endpoints | `apps/api/src/HandySales.Api/Endpoints/ImpersonationEndpoints.cs` |
| Impersonation Service | `libs/HandySales.Application/Impersonation/Services/ImpersonationService.cs` |
| Frontend Middleware | `apps/web/src/middleware.ts` |
| NextAuth Config | `apps/web/src/lib/auth.ts` |
| Roles Config | `apps/web/src/lib/roles.ts` |
| ImpersonationModal | `apps/web/src/components/impersonation/ImpersonationModal.tsx` |
| ImpersonationBanner | `apps/web/src/components/impersonation/ImpersonationBanner.tsx` |
| Impersonation Store | `apps/web/src/stores/useImpersonationStore.ts` |

---

## 10. SuperAdmin Actual en Desarrollo

| Campo | Valor |
|-------|-------|
| ID | 10 |
| Email | `superadmin@handysales.com` |
| Nombre | Super Admin |
| Tenant | 1 |
| Password | `test123` (dev only) |
