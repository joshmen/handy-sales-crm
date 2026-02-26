import { z } from 'zod';

export const MobileRutaDetalleSchema = z
  .object({
    id: z.number(),
    rutaId: z.number(),
    clienteId: z.number(),
    clienteNombre: z.string(),
    clienteDireccion: z.string().optional(),
    clienteLatitud: z.number().optional(),
    clienteLongitud: z.number().optional(),
    ordenVisita: z.number(),
    horaEstimadaLlegada: z.string().optional(),
    duracionEstimadaMinutos: z.number().optional(),
    horaLlegadaReal: z.string().optional(),
    horaSalidaReal: z.string().optional(),
    estado: z.number(),
    estadoNombre: z.string(),
    visitaId: z.number().optional(),
    pedidoId: z.number().optional(),
    notas: z.string().optional(),
    razonOmision: z.string().optional(),
    distanciaDesdeAnterior: z.number().optional(),
  })
  .passthrough();

export type MobileRutaDetalle = z.infer<typeof MobileRutaDetalleSchema>;

export const MobileRutaSchema = z
  .object({
    id: z.number(),
    usuarioId: z.number(),
    usuarioNombre: z.string(),
    zonaId: z.number().optional(),
    zonaNombre: z.string().optional(),
    nombre: z.string(),
    descripcion: z.string().optional(),
    fecha: z.string(),
    horaInicioEstimada: z.string().optional(),
    horaFinEstimada: z.string().optional(),
    horaInicioReal: z.string().optional(),
    horaFinReal: z.string().optional(),
    estado: z.number(),
    estadoNombre: z.string(),
    kilometrosEstimados: z.number().optional(),
    kilometrosReales: z.number().optional(),
    notas: z.string().optional(),
    efectivoInicial: z.number().optional(),
    totalParadas: z.number(),
    paradasCompletadas: z.number(),
    paradasPendientes: z.number(),
    detalles: z.array(MobileRutaDetalleSchema),
    creadoEn: z.string(),
  })
  .passthrough();

export type MobileRuta = z.infer<typeof MobileRutaSchema>;
