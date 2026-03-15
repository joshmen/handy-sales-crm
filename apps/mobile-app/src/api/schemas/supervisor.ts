import { z } from 'zod';

export const VendedorEquipoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  email: z.string(),
  rol: z.string(),
  activo: z.boolean(),
  avatarUrl: z.string().nullable().optional(),
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

export const VendedorResumenSchema = z.object({
  vendedor: z.object({
    id: z.number(),
    nombre: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable().optional(),
    activo: z.boolean(),
  }),
  hoy: z.object({
    pedidos: z.number(),
    ventas: z.number(),
    visitas: z.number(),
    visitasCompletadas: z.number(),
    cobros: z.number(),
  }),
  totalClientes: z.number(),
  ultimaUbicacion: z.object({
    latitud: z.number(),
    longitud: z.number(),
    fecha: z.string(),
    clienteNombre: z.string().nullable().optional(),
  }).nullable().optional(),
});

export type VendedorEquipo = z.infer<typeof VendedorEquipoSchema>;
export type SupervisorDashboard = z.infer<typeof SupervisorDashboardSchema>;
export type UbicacionVendedor = z.infer<typeof UbicacionVendedorSchema>;
export type ActividadItem = z.infer<typeof ActividadItemSchema>;
export type VendedorResumen = z.infer<typeof VendedorResumenSchema>;
