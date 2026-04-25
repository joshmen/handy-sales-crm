import { z } from 'zod';

export const MobileClienteSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    rfc: z.string(),
    correo: z.string(),
    telefono: z.string(),
    direccion: z.string(),
    // Dirección desglosada
    numeroExterior: z.string().nullable().optional(),
    colonia: z.string().nullable().optional(),
    ciudad: z.string().nullable().optional(),
    codigoPostal: z.string().nullable().optional(),
    encargado: z.string().nullable().optional(),
    idZona: z.number(),
    categoriaClienteId: z.number(),
    latitud: z.number().optional(),
    longitud: z.number().optional(),
    vendedorId: z.number().optional(),
    esProspecto: z.boolean().optional(),
    activo: z.boolean(),
    // Comerciales
    descuento: z.number().nullable().optional(),
    saldo: z.number().nullable().optional(),
    ventaMinimaEfectiva: z.number().nullable().optional(),
    tiposPagoPermitidos: z.string().nullable().optional(),
    tipoPagoPredeterminado: z.string().nullable().optional(),
    comentarios: z.string().nullable().optional(),
    // Fiscal
    rfcFiscal: z.string().nullable().optional(),
    razonSocial: z.string().nullable().optional(),
    regimenFiscal: z.string().nullable().optional(),
    usoCFDIPredeterminado: z.string().nullable().optional(),
    codigoPostalFiscal: z.string().nullable().optional(),
    facturable: z.boolean().optional(),
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
  telefono?: string;
  correo?: string;
  rfc?: string;
  direccion: string;
  numeroExterior: string;
  // Dirección desglosada
  colonia?: string;
  ciudad?: string;
  codigoPostal?: string;
  encargado?: string;
  idZona: number;
  categoriaClienteId: number;
  latitud?: number;
  longitud?: number;
  // Comerciales
  descuento?: number;
  ventaMinimaEfectiva?: number;
  comentarios?: string;
  // Fiscal
  rfcFiscal?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  usoCFDIPredeterminado?: string;
  codigoPostalFiscal?: string;
  facturable?: boolean;
}
