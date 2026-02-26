import { z } from 'zod';

export const MobileVisitaSchema = z
  .object({
    id: z.number(),
    clienteId: z.number(),
    clienteNombre: z.string(),
    clienteDireccion: z.string().optional(),
    usuarioId: z.number(),
    usuarioNombre: z.string(),
    pedidoId: z.number().optional(),
    numeroPedido: z.string().optional(),
    fechaProgramada: z.string().optional(),
    fechaHoraInicio: z.string().optional(),
    fechaHoraFin: z.string().optional(),
    tipoVisita: z.number(),
    tipoVisitaNombre: z.string(),
    resultado: z.number(),
    resultadoNombre: z.string(),
    latitudInicio: z.number().optional(),
    longitudInicio: z.number().optional(),
    latitudFin: z.number().optional(),
    longitudFin: z.number().optional(),
    distanciaCliente: z.number().optional(),
    notas: z.string().optional(),
    notasPrivadas: z.string().optional(),
    fotos: z.array(z.string()).optional(),
    duracionMinutos: z.number().optional(),
    creadoEn: z.string(),
  })
  .passthrough();

export type MobileVisita = z.infer<typeof MobileVisitaSchema>;

export const ResumenDiarioSchema = z
  .object({
    fecha: z.string(),
    totalVisitas: z.number(),
    visitasCompletadas: z.number(),
    visitasConVenta: z.number(),
    visitasPendientes: z.number(),
    visitasCanceladas: z.number(),
    tasaConversion: z.number(),
  })
  .passthrough();

export type ResumenDiario = z.infer<typeof ResumenDiarioSchema>;

export const ResumenSemanalSchema = z
  .object({
    fechaInicio: z.string(),
    fechaFin: z.string(),
    totalVisitas: z.number(),
    visitasCompletadas: z.number(),
    visitasConVenta: z.number(),
    tasaConversion: z.number(),
    promedioVisitasDiarias: z.number(),
  })
  .passthrough();

export type ResumenSemanal = z.infer<typeof ResumenSemanalSchema>;

// Request types (outgoing — no Zod validation needed)
export interface VisitaCreateRequest {
  clienteId: number;
  fechaProgramada?: string;
  tipoVisita?: number;
  notas?: string;
}

export interface CheckInRequest {
  latitud: number;
  longitud: number;
  notas?: string;
}

export interface CheckOutRequest {
  latitud?: number;
  longitud?: number;
  resultado: number;
  notas?: string;
  notasPrivadas?: string;
  fotos?: string[];
  pedidoId?: number;
}
