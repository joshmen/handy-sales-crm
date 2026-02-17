# Plan: Rutas Full Stack - Siguiendo Diseños Pencil

## Contexto

El usuario quiere reestructurar el módulo de Rutas siguiendo los diseños de Pencil (`pencil-admin.pen`), que muestran un flujo operativo de **venta/entrega** con carga de inventario y cierre de ruta. Esto es crítico porque conecta con la app móvil.

**Flujo completo del negocio:**
1. Admin crea ruta (CRUD) → **Planificada**
2. Admin carga inventario + asigna pedidos/productos → **PendienteAceptar**
3. Vendedor acepta carga en móvil → **CargaAceptada**
4. Vendedor sale a ruta → **EnProgreso**
5. Vendedor termina → **Completada** (Terminada)
6. Admin cierra ruta (reconcilia inventario/efectivo) → **Cerrada**

**Diseños Pencil de referencia:**
- `1KZbz` - "Administrar rutas de venta y entrega" (listado operativo)
- `rcfLY` - "Cargar inventario de ruta" (asignar usuario, pedidos, productos)
- `jr5FJ` - "Cierre de ruta" (4 tabs, resumen financiero, inventario de retorno)

---

## Navegación (Sidebar)

```
Rutas (icon: Navigation, cyan)
├── Listado de rutas    → /routes           (icon: List)      ← CRUD existente
└── Administrar rutas   → /routes/manage    (icon: ClipboardList) ← Operativo NUEVO
```

Desde "Administrar rutas":
- Click "Nueva asignación" o click en fila → `/routes/manage/[id]/load` (Cargar inventario)
- Click en ruta terminada → `/routes/manage/[id]/close` (Cierre de ruta)

---

## Fase 1: Base de Datos

### 1.1 Modificar tabla `RutasVendedor`

```sql
ALTER TABLE RutasVendedor
  ADD COLUMN efectivo_inicial DOUBLE NULL COMMENT 'Monto de viático/efectivo inicial',
  ADD COLUMN comentarios_carga TEXT NULL COMMENT 'Comentarios al cargar inventario',
  ADD COLUMN monto_recibido DOUBLE NULL COMMENT 'Efectivo recibido al cierre',
  ADD COLUMN cerrado_en DATETIME NULL,
  ADD COLUMN cerrado_por VARCHAR(255) NULL;
```

### 1.2 Extender enum `EstadoRuta` (backward-compatible)

```csharp
public enum EstadoRuta
{
    Planificada = 0,      // sin cambio
    EnProgreso = 1,       // sin cambio
    Completada = 2,       // sin cambio (= "Terminada" en Pencil)
    Cancelada = 3,        // sin cambio
    PendienteAceptar = 4, // NUEVO: inventario cargado, esperando vendedor
    CargaAceptada = 5,    // NUEVO: vendedor aceptó carga
    Cerrada = 6           // NUEVO: ruta cerrada y reconciliada
}
```

### 1.3 Crear tabla `RutasCarga` (productos cargados a la ruta)

```sql
CREATE TABLE IF NOT EXISTS RutasCarga (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  producto_id INT NOT NULL,
  tenant_id INT NOT NULL,
  cantidad_entrega INT NOT NULL DEFAULT 0 COMMENT 'Cantidad asignada desde pedidos',
  cantidad_venta INT NOT NULL DEFAULT 0 COMMENT 'Cantidad asignada para venta directa',
  cantidad_total INT NOT NULL DEFAULT 0 COMMENT 'Total cargado',
  precio_unitario DOUBLE NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  version BIGINT NOT NULL DEFAULT 1,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);
```

### 1.4 Crear tabla `RutasPedidos` (pedidos asignados a la ruta para entrega)

```sql
CREATE TABLE IF NOT EXISTS RutasPedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  pedido_id INT NOT NULL,
  tenant_id INT NOT NULL,
  estado TINYINT NOT NULL DEFAULT 0 COMMENT '0=Asignado, 1=Entregado, 2=Devuelto',
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (pedido_id) REFERENCES Pedidos(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);
```

### 1.5 Crear tabla `RutasRetornoInventario` (reconciliación al cierre)

```sql
CREATE TABLE IF NOT EXISTS RutasRetornoInventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  producto_id INT NOT NULL,
  tenant_id INT NOT NULL,
  cantidad_inicial INT NOT NULL DEFAULT 0,
  vendidos INT NOT NULL DEFAULT 0,
  entregados INT NOT NULL DEFAULT 0,
  devueltos INT NOT NULL DEFAULT 0,
  mermas INT NOT NULL DEFAULT 0,
  rec_almacen INT NOT NULL DEFAULT 0 COMMENT 'Devuelto a almacén',
  carga_vehiculo INT NOT NULL DEFAULT 0 COMMENT 'Se queda en vehículo',
  diferencia INT NOT NULL DEFAULT 0,
  ventas_monto DOUBLE NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);
```

**Archivo:** `infra/database/migrations/13_create_rutas_carga_cierre_tables.sql`

---

## Fase 2: Backend - Entidades y DTOs

### 2.1 Nuevas entidades de dominio

| Archivo | Descripción |
|---------|-------------|
| `libs/HandySales.Domain/Entities/RutaCarga.cs` | Producto cargado a ruta |
| `libs/HandySales.Domain/Entities/RutaPedido.cs` | Pedido asignado a ruta |
| `libs/HandySales.Domain/Entities/RutaRetornoInventario.cs` | Reconciliación al cierre |

**Modificar:**
- `libs/HandySales.Domain/Entities/RutaVendedor.cs` → Agregar `EfectivoInicial`, `ComentariosCarga`, `MontoRecibido`, `CerradoEn`, `CerradoPor`, y navigation props a nuevas entidades. Agregar nuevos valores al enum `EstadoRuta`.

### 2.2 Registrar en DbContext

**Modificar:** `libs/HandySales.Infrastructure/Data/ApplicationDbContext.cs`
- Agregar `DbSet<RutaCarga>`, `DbSet<RutaPedido>`, `DbSet<RutaRetornoInventario>`
- Agregar configuración de mapeo en `OnModelCreating`

### 2.3 Nuevos DTOs

**Modificar:** `libs/HandySales.Application/Rutas/DTOs/RutaVendedorDto.cs`

```csharp
// DTOs para Carga de Inventario
public class RutaCargaDto { ... }           // Read: producto + cantidades + precio
public class AsignarCargaRequest { ... }    // Write: productoId, cantidadVenta
public class AsignarPedidoRequest { ... }   // Write: pedidoId

// DTOs para Cierre de Ruta
public class CierreRutaResumenDto { ... }   // Read: financiero + inventario retorno
public class RutaRetornoItemDto { ... }     // Read: per-product return data
public class ActualizarRetornoRequest { ... } // Write: mermas, recAlmacen, cargaVehiculo
public class CerrarRutaRequest { ... }      // Write: montoRecibido + retornos[]
```

### 2.4 Validadores

**Crear:** `libs/HandySales.Application/Rutas/Validators/RutaCargaValidators.cs`

---

## Fase 3: Backend - Repository, Service, Endpoints

### 3.1 Repository

**Modificar:** `libs/HandySales.Application/Rutas/IRutaVendedorRepository.cs` + implementación

Nuevos métodos:
```csharp
// Carga de inventario
Task<List<RutaCarga>> ObtenerCargaAsync(int rutaId, int tenantId);
Task AsignarProductoVentaAsync(int rutaId, int productoId, int cantidad, double precio, int tenantId);
Task RemoverProductoCargaAsync(int rutaId, int productoId, int tenantId);
Task AsignarPedidoAsync(int rutaId, int pedidoId, int tenantId);
Task RemoverPedidoAsync(int rutaId, int pedidoId, int tenantId);
Task<List<RutaPedido>> ObtenerPedidosAsignadosAsync(int rutaId, int tenantId);
Task ActualizarEfectivoInicialAsync(int rutaId, double monto, string? comentarios, int tenantId);
Task EnviarACargaAsync(int rutaId, int tenantId); // Planificada → PendienteAceptar

// Cierre de ruta
Task<CierreRutaResumenDto> ObtenerResumenCierreAsync(int rutaId, int tenantId);
Task<List<RutaRetornoInventario>> ObtenerRetornoInventarioAsync(int rutaId, int tenantId);
Task ActualizarRetornoAsync(int rutaId, int productoId, ActualizarRetornoRequest req, int tenantId);
Task CerrarRutaAsync(int rutaId, CerrarRutaRequest req, int tenantId); // Completada → Cerrada
```

### 3.2 Service

**Modificar:** `libs/HandySales.Application/Rutas/RutaVendedorService.cs`
- Agregar métodos correspondientes que delegan al repository

### 3.3 Endpoints

**Modificar:** `apps/api/src/HandySales.Api/Endpoints/RutaVendedorEndpoints.cs`

Nuevos endpoints:
```
// Carga de inventario
GET    /rutas/{id}/carga                    → Lista productos cargados
POST   /rutas/{id}/carga/productos          → Agregar producto para venta
DELETE /rutas/{id}/carga/productos/{prodId}  → Quitar producto
POST   /rutas/{id}/carga/pedidos            → Asignar pedido
DELETE /rutas/{id}/carga/pedidos/{pedId}     → Quitar pedido
GET    /rutas/{id}/carga/pedidos            → Lista pedidos asignados
PATCH  /rutas/{id}/carga/efectivo           → Actualizar efectivo inicial
POST   /rutas/{id}/carga/enviar             → Enviar a aceptar (estado → PendienteAceptar)

// Cierre
GET    /rutas/{id}/cierre/resumen           → Resumen financiero calculado
GET    /rutas/{id}/cierre/retorno           → Inventario de retorno (per-product)
PATCH  /rutas/{id}/cierre/retorno/{prodId}  → Actualizar mermas/almacén/vehículo
POST   /rutas/{id}/cierre/cerrar            → Cerrar ruta (estado → Cerrada)
```

---

## Fase 4: Frontend - Navegación y Servicio API

### 4.1 Sidebar

**Modificar:** `apps/web/src/components/layout/Sidebar.tsx`

```
Rutas (Navigation, cyan)
├── Listado de rutas    → /routes         (List)
└── Administrar rutas   → /routes/manage  (ClipboardList)
```

### 4.2 Servicio API

**Modificar:** `apps/web/src/services/api/routes.ts`

Agregar interfaces y métodos:
```typescript
// Carga
getCarga(rutaId): Promise<RutaCargaItem[]>
addProductoVenta(rutaId, data): Promise<void>
removeProductoCarga(rutaId, productoId): Promise<void>
addPedido(rutaId, pedidoId): Promise<void>
removePedido(rutaId, pedidoId): Promise<void>
getPedidosAsignados(rutaId): Promise<PedidoAsignado[]>
updateEfectivoInicial(rutaId, monto, comentarios): Promise<void>
enviarACarga(rutaId): Promise<void>

// Cierre
getResumenCierre(rutaId): Promise<CierreResumen>
getRetornoInventario(rutaId): Promise<RetornoItem[]>
updateRetorno(rutaId, productoId, data): Promise<void>
cerrarRuta(rutaId, data): Promise<void>
```

---

## Fase 5: Frontend - Listado de Rutas (`/routes/page.tsx`)

**Modificar** (mínimo):
- Título: → "Listado de rutas"
- Quitar icono Eye y Link (ya no navega a detalle desde aquí)
- Columna Acciones: solo lápiz de editar
- Todo lo demás igual: crear, editar, toggle, batch

---

## Fase 6: Frontend - Administrar Rutas (`/routes/manage/page.tsx`) - CREAR

**Pencil ref:** `1KZbz`

Página de listado operativo. Sin CRUD, sin toggles.

### Layout
```
Header:
  Breadcrumb: Inicio > Administrar rutas
  Título: "Administrar rutas de venta y entrega"
  Botones: "Nueva asignación" (verde, navega a crear ruta + /load)

Filtros:
  Rango de fechas | Usuario | + Más filtros | Actualizar

Tabla (filas clickeables):
  | Nombre | Usuario | Zona | Fecha | Estado | Progreso | Acciones |

  Click en fila:
    - Si estado < Completada → /routes/manage/{id}/load (cargar inventario)
    - Si estado == Completada → /routes/manage/{id}/close (cierre)
    - Si estado == Cerrada → /routes/manage/{id}/close (ver cierre, readonly)
```

### Columna Estado (con badges de color)
- Planificada → gris
- PendienteAceptar → amarillo
- CargaAceptada → azul
- EnProgreso → cyan
- Completada/Terminada → verde
- Cerrada → verde oscuro
- Cancelada → rojo

---

## Fase 7: Frontend - Cargar Inventario (`/routes/manage/[id]/load/page.tsx`) - CREAR

**Pencil ref:** `rcfLY`

### Layout (siguiendo Pencil exacto)
```
Header:
  Breadcrumb: Rutas / Admin. rutas / Cargar inventario de ruta
  Título: "Cargar inventario de ruta"
  Botones: "Guardar" (verde) + "Refrescar inventario"
  Stats: Entregas count | Productos count | Total asignado $

Body:
  Section 1: "Asigna la ruta a un usuario"
    - Card de usuario seleccionado (avatar + nombre + email)
    - Input "Efectivo inicial" ($)
    - Textarea "Comentarios"

  Section 2: "Asignar pedidos para entrega"
    - Badge con conteo de pedidos
    - Botón "Agregar pedidos" (abre modal con lista de pedidos disponibles)

  Section 3: "Asignar productos para venta"
    - Botón "Agregar última carga realizada"
    - Buscador de productos (con autocompletado)

  Section 4: "Total asignado a la ruta (pedidos y venta)"
    - Tabla: Producto | Asig. entrega | Asig. venta | Total | Disponible | Precio | Total $ | Acc.
    - Botón delete por fila
    - Totales al pie

  Footer: Botón "Enviar a carga" (cambia estado a PendienteAceptar)
```

---

## Fase 8: Frontend - Cierre de Ruta (`/routes/manage/[id]/close/page.tsx`) - CREAR

**Pencil ref:** `jr5FJ`

### Layout (siguiendo Pencil exacto)
```
Header:
  Breadcrumb: Rutas / Admin. rutas / Cierre de ruta
  Título: "Cierre de ruta"
  Botones: "Cerrar" | "Iniciar" | "X Cancelar"
  Status badge + fecha asignación
  4 Tabs: Pendiente de aceptar | Carga aceptada | Terminada | Cerrada

Body:
  Alert (si aplica): "Inventario pendiente de aceptar" (amarillo/rojo)

  Section 1: "Detalles de la ruta"
    - Card usuario (avatar + nombre + email)
    - Info: ruta, zona, creación
    - Botón "Acceso a ruta en línea"

  Financial Row (3 cards):
    - "Efectivo entrante": Ventas contado | Entregas cobradas | Cobranza adeudos
    - "Movimientos a saldo": Ventas crédito | Entregas crédito | Entregas con saldo a favor
    - "Otros movimientos": Pedidos preventa | Devoluciones

  Summary Row (2 cards):
    - "Al inicio": Valor de la ruta + Efectivo inicial
    - "Al cierre": A recibir + Recibido (input editable) + Diferencia (auto, rojo si negativo)

  Section 7: "Inventario de retorno"
    - Acciones: "Diferencia a:" Almacén | Carga | Cerrar con plantilla
    - Tabla 10 columnas:
      Producto | Ventas($) | Cant. inicial | Vendidos | Entregados | Devueltos |
      Mermas (stepper +-) | Rec. almacén (stepper +-) | Carga vehículo (stepper +-) | Diferencias (badge)
    - Diferencia = inicial - vendidos - entregados - devueltos - mermas - rec_almacen - carga_vehiculo
    - Badge rojo si diferencia > 0 (faltante)
```

---

## Archivos completos a crear/modificar

### CREAR (8 archivos)
| Archivo | Fase |
|---------|------|
| `infra/database/migrations/13_create_rutas_carga_cierre_tables.sql` | 1 |
| `libs/HandySales.Domain/Entities/RutaCarga.cs` | 2 |
| `libs/HandySales.Domain/Entities/RutaPedido.cs` | 2 |
| `libs/HandySales.Domain/Entities/RutaRetornoInventario.cs` | 2 |
| `libs/HandySales.Application/Rutas/Validators/RutaCargaValidators.cs` | 2 |
| `apps/web/src/app/(dashboard)/routes/manage/page.tsx` | 6 |
| `apps/web/src/app/(dashboard)/routes/manage/[id]/load/page.tsx` | 7 |
| `apps/web/src/app/(dashboard)/routes/manage/[id]/close/page.tsx` | 8 |

### MODIFICAR (10 archivos)
| Archivo | Fase | Cambios |
|---------|------|---------|
| `libs/HandySales.Domain/Entities/RutaVendedor.cs` | 2 | Nuevas props + enum values |
| `libs/HandySales.Infrastructure/Data/ApplicationDbContext.cs` | 2 | DbSets + mappings |
| `libs/HandySales.Application/Rutas/DTOs/RutaVendedorDto.cs` | 2 | DTOs carga + cierre |
| `libs/HandySales.Application/Rutas/IRutaVendedorRepository.cs` | 3 | Nuevos métodos |
| `libs/HandySales.Infrastructure/Repositories/RutaVendedorRepository.cs` | 3 | Implementación |
| `libs/HandySales.Application/Rutas/RutaVendedorService.cs` | 3 | Nuevos métodos |
| `apps/api/src/HandySales.Api/Endpoints/RutaVendedorEndpoints.cs` | 3 | Nuevos endpoints |
| `apps/web/src/services/api/routes.ts` | 4 | Nuevos métodos API |
| `apps/web/src/components/layout/Sidebar.tsx` | 4 | Segundo sub-ítem |
| `apps/web/src/app/(dashboard)/routes/page.tsx` | 5 | Título, quitar Eye |

---

## Orden de implementación

1. **DB**: Ejecutar migration SQL (ALTER + CREATE tables)
2. **Domain**: Nuevas entidades + modificar RutaVendedor + enum
3. **Infrastructure**: DbContext + Repository
4. **Application**: DTOs + Validators + Service
5. **API**: Nuevos endpoints
6. **Rebuild API**: `docker-compose -f docker-compose.dev.yml up -d --build api_main`
7. **Frontend service**: routes.ts + Sidebar
8. **Frontend pages**: Listado (ajuste) → Administrar → Cargar inventario → Cierre
9. **Rebuild Web**: `docker-compose -f docker-compose.dev.yml up -d --build web`

---

## Verificación

1. `GET /rutas` devuelve rutas con nuevos estados
2. `POST /rutas/{id}/carga/productos` agrega producto a ruta
3. `POST /rutas/{id}/carga/enviar` cambia estado a PendienteAceptar(4)
4. `GET /rutas/{id}/cierre/resumen` devuelve resumen financiero
5. `POST /rutas/{id}/cierre/cerrar` cierra ruta con reconciliación
6. Sidebar muestra 2 sub-ítems bajo "Rutas"
7. `/routes` = CRUD sin Eye icon
8. `/routes/manage` = listado operativo con filas clickeables
9. `/routes/manage/{id}/load` = carga de inventario siguiendo Pencil
10. `/routes/manage/{id}/close` = cierre de ruta siguiendo Pencil
11. Tabs de cierre muestran estado correcto
12. Steppers de retorno calculan diferencia en tiempo real

---

## Tour: Recorrido del Módulo de Rutas

### Visión General

El módulo de Rutas es el corazón operativo de HandySales. Conecta la administración web con la app móvil del vendedor, gestionando todo el ciclo de vida de una ruta de venta/entrega: desde la planificación hasta el cierre financiero.

### Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────┐
│                      WEB ADMIN                               │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Listado de   │   │  Cargar      │   │  Cierre de   │    │
│  │  rutas (CRUD) │   │  inventario  │   │  ruta        │    │
│  │  /routes      │   │  /manage/    │   │  /manage/    │    │
│  │               │   │  [id]/load   │   │  [id]/close  │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                   │                   │            │
│         └───────────┬───────┴───────────────────┘            │
│                     │                                        │
│              ┌──────▼──────┐                                 │
│              │ Administrar  │                                 │
│              │ rutas        │                                 │
│              │ /routes/     │                                 │
│              │ manage       │                                 │
│              └──────────────┘                                │
└─────────────────────┬───────────────────────────────────────┘
                      │ API REST (/rutas/*)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    BACKEND .NET 8                             │
│                                                              │
│  Endpoints → Service → Repository → MySQL                    │
│                                                              │
│  Tablas: RutasVendedor, RutasDetalle, RutasCarga,           │
│          RutasPedidos, RutasRetornoInventario                │
└─────────────────────┬───────────────────────────────────────┘
                      │ API REST (/mobile/rutas/*)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    APP MÓVIL                                  │
│                                                              │
│  Vendedor: Acepta carga → Ejecuta ruta → Completa           │
│  (GPS tracking, visitas, pedidos en campo)                   │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Negocio Paso a Paso

#### Paso 1: Crear Ruta (Admin - Web)
**Página:** `/routes` (Listado de rutas)
**Acción:** Click "Crear ruta" → Modal con nombre, fecha, zona, usuario asignado
**Estado resultante:** `Planificada (0)`

> El admin crea la estructura básica de la ruta. Puede asignar paradas (clientes a visitar) usando el detalle `/routes/[id]`.

#### Paso 2: Cargar Inventario (Admin - Web)
**Página:** `/routes/manage/[id]/load` (Cargar inventario de ruta)
**Acciones:**
1. Verificar/cambiar usuario asignado
2. Establecer **efectivo inicial** (viático/cambio)
3. Agregar **pedidos para entrega** (pedidos existentes de clientes)
4. Agregar **productos para venta** (inventario para venta directa en campo)
5. Revisar tabla consolidada de productos cargados
6. Click "Enviar a carga"

**Estado resultante:** `PendienteAceptar (4)`

> La tabla "Total asignado" muestra la suma de productos de pedidos + venta directa. El admin ve inventario disponible para no sobrecargar.

#### Paso 3: Aceptar Carga (Vendedor - Móvil)
**App:** Pantalla de ruta pendiente
**Acción:** Vendedor revisa la carga asignada y acepta
**Estado resultante:** `CargaAceptada (5)`

> El vendedor confirma que recibió los productos y el efectivo. Esto es importante para responsabilidad.

#### Paso 4: Iniciar Ruta (Vendedor - Móvil)
**App:** Botón "Iniciar ruta"
**Acción:** Se registra hora de inicio + coordenadas GPS
**Estado resultante:** `EnProgreso (1)`

> Comienza el tracking GPS. El vendedor ve las paradas en orden y puede navegar a cada cliente.

#### Paso 5: Ejecutar Ruta (Vendedor - Móvil)
**App:** Lista de paradas con acciones
**Acciones por parada:**
- **Llegar**: Registra GPS de llegada
- **Entregar pedido**: Entrega el pedido asignado
- **Venta directa**: Crea pedido nuevo en campo
- **Cobrar**: Registra pago (contado/crédito)
- **Omitir**: Salta parada con razón
- **Salir**: Registra hora de salida

> Durante la ejecución, el admin puede ver el progreso en tiempo real desde "Administrar rutas".

#### Paso 6: Completar Ruta (Vendedor - Móvil)
**App:** Botón "Completar ruta"
**Acción:** Se registra hora de fin + kilómetros recorridos
**Estado resultante:** `Completada (2)` (= "Terminada" en Pencil)

> El vendedor regresa a la oficina/almacén. La ruta queda pendiente de cierre administrativo.

#### Paso 7: Cierre de Ruta (Admin - Web)
**Página:** `/routes/manage/[id]/close` (Cierre de ruta)
**4 tabs muestran la historia completa:**

**Tab "Pendiente de aceptar"** → Estado PendienteAceptar
**Tab "Carga aceptada"** → Estado CargaAceptada/EnProgreso
**Tab "Terminada"** → Estado Completada (contenido activo para cierre)
**Tab "Cerrada"** → Estado Cerrada (solo lectura)

**Secciones del cierre:**

1. **Detalles de la ruta** - Resumen del usuario, zona, fechas
2. **Resumen financiero** (3 cards):
   - *Efectivo entrante*: Dinero que debería tener el vendedor (ventas contado + entregas cobradas + cobranza de adeudos)
   - *Movimientos a saldo*: Ventas/entregas a crédito (no es efectivo, se registra como cuenta por cobrar)
   - *Otros movimientos*: Pedidos preventa + devoluciones
3. **Al inicio vs Al cierre** (2 cards):
   - *Al inicio*: Valor total de la carga + efectivo inicial entregado
   - *Al cierre*: Cuánto debería devolver (a recibir) vs cuánto entregó (recibido) → **Diferencia** (rojo si falta)
4. **Inventario de retorno** - Tabla por producto:
   - Cant. inicial (lo que se cargó)
   - Vendidos + Entregados + Devueltos (vienen del móvil)
   - **Mermas** (stepper editable: productos dañados/perdidos)
   - **Rec. almacén** (stepper: devuelto al almacén)
   - **Carga vehículo** (stepper: se queda en vehículo para mañana)
   - **Diferencia** = inicial - vendidos - entregados - devueltos - mermas - almacén - vehículo

**Acción final:** Click "Cerrar ruta"
**Estado resultante:** `Cerrada (6)`

> Al cerrar, se crean automáticamente los MovimientosInventario correspondientes (mermas como SALIDA/MERMA, rec_almacen como ENTRADA, etc.)

### Diseños Pencil de Referencia

Los diseños están en `docs/design/pencil/pencil-admin.pen`:

| Node ID | Pantalla | Descripción |
|---------|----------|-------------|
| `1KZbz` | Administrar rutas de venta y entrega | Listado operativo con filtros de fecha/usuario |
| `tpeeF` | Cargar inventario de ruta (vacía) | Formulario vacío sin asignaciones |
| `rcfLY` | Cargar inventario de ruta (llena) | Formulario con usuario, pedidos y productos asignados |
| `jr5FJ` | Cierre de ruta | Vista completa con 4 tabs, financiero e inventario de retorno |

### Base de Datos - Diagrama de Relaciones

```
RutasVendedor (principal)
├── RutasDetalle (paradas/clientes a visitar)
├── RutasCarga (productos cargados para la ruta)
├── RutasPedidos (pedidos asignados para entrega)
└── RutasRetornoInventario (reconciliación al cierre)

Relaciones externas:
├── → Usuarios (vendedor asignado)
├── → Zonas (zona geográfica)
├── → Clientes (via RutasDetalle)
├── → Productos (via RutasCarga y RutasRetornoInventario)
├── → Pedidos (via RutasPedidos)
├── → ClienteVisitas (via RutasDetalle.visita_id)
└── → MovimientosInventario (generados al cerrar ruta)
```

### API Endpoints - Mapa Completo

```
/rutas
├── CRUD básico
│   ├── POST   /                              Crear ruta
│   ├── GET    /                              Listar con filtros
│   ├── GET    /{id}                          Obtener detalle
│   ├── PUT    /{id}                          Actualizar
│   └── DELETE /{id}                          Eliminar
│
├── Estado de ruta
│   ├── POST   /{id}/iniciar                  Planificada → EnProgreso
│   ├── POST   /{id}/completar                EnProgreso → Completada
│   └── POST   /{id}/cancelar                 * → Cancelada
│
├── Paradas (detalle)
│   ├── POST   /{rutaId}/paradas              Agregar parada
│   ├── DELETE /{rutaId}/paradas/{detalleId}  Eliminar parada
│   ├── POST   /{rutaId}/paradas/reordenar    Reordenar paradas
│   ├── POST   /paradas/{detalleId}/llegar    Registrar llegada (GPS)
│   ├── POST   /paradas/{detalleId}/salir     Registrar salida
│   └── POST   /paradas/{detalleId}/omitir    Omitir parada
│
├── Carga de inventario (NUEVO)
│   ├── GET    /{id}/carga                    Productos cargados
│   ├── POST   /{id}/carga/productos          Agregar producto venta
│   ├── DELETE /{id}/carga/productos/{prodId} Quitar producto
│   ├── POST   /{id}/carga/pedidos            Asignar pedido
│   ├── DELETE /{id}/carga/pedidos/{pedId}    Quitar pedido
│   ├── GET    /{id}/carga/pedidos            Pedidos asignados
│   ├── PATCH  /{id}/carga/efectivo           Efectivo inicial
│   └── POST   /{id}/carga/enviar            → PendienteAceptar
│
├── Cierre de ruta (NUEVO)
│   ├── GET    /{id}/cierre/resumen           Resumen financiero
│   ├── GET    /{id}/cierre/retorno           Inventario de retorno
│   ├── PATCH  /{id}/cierre/retorno/{prodId}  Actualizar retorno
│   └── POST   /{id}/cierre/cerrar           → Cerrada
│
├── Toggle activo
│   ├── PATCH  /{id}/activo                   Toggle individual
│   └── PATCH  /batch-toggle                  Toggle masivo
│
└── Consultas del vendedor
    ├── GET    /mi-ruta-hoy                   Ruta del día
    ├── GET    /mis-rutas-pendientes          Rutas pendientes
    └── GET    /usuario/{usuarioId}           Rutas por usuario
```

### Frontend - Mapa de Páginas

```
/routes                           Listado de rutas (CRUD)
  ├── Crear ruta (modal)
  ├── Editar ruta (modal)
  ├── Toggle activo
  └── Batch toggle

/routes/[id]                      Detalle de ruta (paradas)
  ├── Ver/agregar/eliminar paradas
  ├── Reordenar paradas
  ├── Iniciar/completar/cancelar ruta
  └── Back → /routes o /routes/manage

/routes/manage                    Administrar rutas (operativo)
  ├── Filtros: fecha, usuario, estado
  ├── Click en fila → /load o /close según estado
  └── "Nueva asignación" → crear + /load

/routes/manage/[id]/load          Cargar inventario de ruta
  ├── Asignar usuario + viático
  ├── Asignar pedidos de entrega
  ├── Asignar productos de venta
  ├── Tabla consolidada de carga
  └── "Enviar a carga" → PendienteAceptar

/routes/manage/[id]/close         Cierre de ruta
  ├── 4 tabs (estados de la ruta)
  ├── Detalles de la ruta
  ├── Resumen financiero (3 cards)
  ├── Al inicio vs Al cierre (2 cards)
  ├── Inventario de retorno (tabla 10 cols)
  └── "Cerrar ruta" → Cerrada
```

### Estados de la Ruta - Diagrama de Transiciones

```
              ┌──────────────┐
              │  Planificada │ ← Crear ruta (CRUD)
              │     (0)      │
              └──────┬───────┘
                     │ Cargar inventario + "Enviar a carga"
                     ▼
         ┌───────────────────────┐
         │  PendienteAceptar (4) │ ← Admin cargó inventario
         └───────────┬───────────┘
                     │ Vendedor acepta en móvil
                     ▼
         ┌───────────────────────┐
         │   CargaAceptada (5)   │ ← Vendedor confirmó recepción
         └───────────┬───────────┘
                     │ Vendedor inicia ruta
                     ▼
         ┌───────────────────────┐
         │    EnProgreso (1)     │ ← Vendedor en campo
         └───────────┬───────────┘
                     │ Vendedor completa ruta
                     ▼
         ┌───────────────────────┐
         │   Completada (2)      │ ← "Terminada" en Pencil
         └───────────┬───────────┘
                     │ Admin cierra ruta (reconciliación)
                     ▼
         ┌───────────────────────┐
         │     Cerrada (6)       │ ← Reconciliada y cerrada
         └───────────────────────┘

    Cancelada (3) ← Puede ocurrir desde cualquier estado
```

### Glosario de Términos

| Término | Significado |
|---------|-------------|
| **Carga** | Inventario (productos) asignado a una ruta para venta/entrega |
| **Efectivo inicial** | Dinero en efectivo que se le da al vendedor (viático/cambio) |
| **Viático** | Término informal para el efectivo inicial |
| **Pedido para entrega** | Pedido existente de un cliente que será entregado en esta ruta |
| **Producto para venta** | Producto cargado para venta directa en campo (sin pedido previo) |
| **Merma** | Producto dañado o perdido durante la ruta |
| **Rec. almacén** | Producto devuelto al almacén al cierre |
| **Carga vehículo** | Producto que se queda en el vehículo para la siguiente ruta |
| **Diferencia** | Discrepancia entre inventario esperado y real (faltante) |
| **Efectivo entrante** | Dinero que el vendedor debe traer de vuelta |
| **Movimientos a saldo** | Transacciones a crédito (no efectivo) |
| **Parada** | Cliente a visitar en la ruta (RutasDetalle) |

### Conexión con App Móvil

La app móvil (React Native) consume los endpoints de Mobile API (`/api/mobile/rutas/`). Los puntos de integración clave son:

1. **Sincronización de carga**: Vendedor descarga la carga asignada (productos + pedidos)
2. **Aceptar carga**: Vendedor confirma recepción → estado CargaAceptada
3. **Tracking GPS**: Se registra posición en cada acción
4. **Reportar ventas/entregas**: Se registran en tiempo real
5. **Completar ruta**: Se envían datos finales (km, hora fin)
6. **Datos offline**: La app debe funcionar sin conexión y sincronizar al volver
