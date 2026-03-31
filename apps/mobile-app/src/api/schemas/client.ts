import { z } from 'zod';

export const MobileClienteSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    rfc: z.string(),
    correo: z.string(),
    telefono: z.string(),
    direccion: z.string(),
    idZona: z.number(),
    categoriaClienteId: z.number(),
    latitud: z.number().optional(),
    longitud: z.number().optional(),
    vendedorId: z.number().optional(),
    esProspecto: z.boolean().optional(),
    activo: z.boolean(),
    zonaNombre: z.string().optional(),
    categoriaNombre: z.string().optional(),
    creadoEn: z.string().optional(),
    actualizadoEn: z.string().optional(),
  })
  .passthrough();

export type MobileCliente = z.infer<typeof MobileClienteSchema>;

export const ClienteLocationSchema = z
  .object({
    latitud: z.number(),
    longitud: z.number(),
    direccion: z.string(),
  })
  .passthrough();

export type ClienteLocation = z.infer<typeof ClienteLocationSchema>;

// Request types (outgoing — no Zod validation needed)
export interface ClienteCreateRequest {
  nombre: string;
  telefono: string;
  correo: string;
  rfc?: string;
  direccion: string;
  numeroExterior: string;
  idZona: number;
  categoriaClienteId: number;
  latitud?: number;
  longitud?: number;
}
