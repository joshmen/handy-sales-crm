import { z } from 'zod';

export const VendedorEquipoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  email: z.string(),
  rol: z.string(),
  activo: z.boolean(),
  avatarUrl: z.string().nullable().optional(),
  // isOnline = vendedor con GPS ping en últimos 15 min (real "en línea").
  // Optional/default false para retrocompat con APKs viejas o si el endpoint
  // no incluye el campo (graceful degradation a "desconectado").
  isOnline: z.boolean().optional().default(false),
  // Backend serializa con .NET DateTime ToString("o"): formato
  // "2026-05-04T00:59:18.3231698+00:00" (7 decimales, offset, sin Z).
  // zod `.datetime()` por defecto rechaza offsets y +7 decimales — causaba
  // "Invalid ISO datetime" en prod (admin@jeyma.com 2026-05-04 reportó tab
  // Equipo cargando infinito). No validamos el formato — el backend es la
  // fuente de verdad y el frontend solo lo muestra/parsea con new Date().
  ultimoPing: z.string().nullable().optional(),
});

export const SupervisorDashboardSchema = z.object({
  totalVendedores: z.number(),
  pedidosHoy: z.number(),
  pedidosMes: z.number(),
  totalClientes: z.number(),
  ventasMes: z.number(),
  visitasHoy: z.number(),
  visitasCompletadasHoy: z.number(),
});

export const UbicacionVendedorSchema = z.object({
  usuarioId: z.number(),
  nombre: z.string(),
  avatarUrl: z.string().nullable().optional(),
  latitud: z.number(),
  longitud: z.number(),
  fechaUbicacion: z.string(),
  clienteNombre: z.string().nullable().optional(),
});

export const ActividadItemSchema = z.object({
  tipo: z.enum(['pedido', 'visita', 'cobro']),
  id: z.number(),
  descripcion: z.string(),
  monto: z.number().nullable().optional(),
  estado: z.string(),
  fecha: z.string(),
  usuarioId: z.number(),
});

export const VendedorDiaSchema = z.object({
  pedidos: z.number(),
  ventas: z.number(),
  visitas: z.number(),
  visitasCompletadas: z.number(),
  cobros: z.number(),
});

export const VendedorDiaConFechaSchema = VendedorDiaSchema.extend({
  fecha: z.string(), // YYYY-MM-DD en TZ del tenant
});

export const VendedorResumenSchema = z.object({
  vendedor: z.object({
    id: z.number(),
    nombre: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable().optional(),
    activo: z.boolean(),
  }),
  // `rango` indica el shape de la respuesta:
  // - "dia": `hoy` poblado con stats de ese día. `dias` = null
  // - "7d": `dias` array de 7 días. `hoy` = null
  // Backwards-compat: si el server no manda rango, asumimos "dia".
  rango: z.enum(['dia', '7d']).optional().default('dia'),
  fecha: z.string().optional(), // YYYY-MM-DD si rango=dia
  hoy: VendedorDiaSchema.nullable().optional(),
  dias: z.array(VendedorDiaConFechaSchema).nullable().optional(),
  totalClientes: z.number(),
  ultimaUbicacion: z.object({
    latitud: z.number(),
    longitud: z.number(),
    fecha: z.string(),
    clienteNombre: z.string().nullable().optional(),
  }).nullable().optional(),
});

// Resumen tenant (admin only) — agregados del día calculados con TZ del tenant.
// Acompaña el endpoint /api/mobile/supervisor/resumen-tenant.
export const TenantResumenSchema = z.object({
  pedidosCount: z.number(),
  pedidosTotal: z.number(),
  cobrosCount: z.number(),
  cobrosTotal: z.number(),
  visitasCount: z.number(),
  vendedoresActivos: z.number(),
});

// Pedido / Cobro list items para admin (tab Vender/Cobrar tenant-wide).
// Devuelto por GET /api/mobile/supervisor/pedidos y /cobros (paginated).
export const TenantPedidoListItemSchema = z.object({
  id: z.number(),
  clienteId: z.number(),
  clienteNombre: z.string(),
  monto: z.number(),
  fecha: z.string(),
  usuarioId: z.number(),
  usuarioNombre: z.string(),
  estado: z.string(),
});

export const TenantCobroListItemSchema = z.object({
  id: z.number(),
  clienteId: z.number(),
  clienteNombre: z.string(),
  monto: z.number(),
  fecha: z.string(),
  usuarioId: z.number(),
  usuarioNombre: z.string(),
  metodoPago: z.string(),
});

export type VendedorEquipo = z.infer<typeof VendedorEquipoSchema>;
export type SupervisorDashboard = z.infer<typeof SupervisorDashboardSchema>;
export type UbicacionVendedor = z.infer<typeof UbicacionVendedorSchema>;
export type ActividadItem = z.infer<typeof ActividadItemSchema>;
export type VendedorResumen = z.infer<typeof VendedorResumenSchema>;
export type VendedorDia = z.infer<typeof VendedorDiaSchema>;
export type VendedorDiaConFecha = z.infer<typeof VendedorDiaConFechaSchema>;
export type TenantResumen = z.infer<typeof TenantResumenSchema>;
export type TenantPedidoListItem = z.infer<typeof TenantPedidoListItemSchema>;
export type TenantCobroListItem = z.infer<typeof TenantCobroListItemSchema>;
