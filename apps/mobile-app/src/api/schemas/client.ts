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

// Request schema (outgoing) — Zod schema para validar el form ANTES de submit.
// Antes los campos se validaban manualmente con regex inline en clients/crear.tsx.
// Esto centraliza las reglas y permite type-inference desde el schema.
const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CP_REGEX = /^\d{5}$/;

export const ClienteCreateRequestSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres'),
    telefono: z.string().trim().regex(PHONE_REGEX, 'Teléfono inválido').optional().or(z.literal('')),
    correo: z.string().trim().regex(EMAIL_REGEX, 'Correo inválido').optional().or(z.literal('')),
    rfc: z.string().trim().toUpperCase().regex(RFC_REGEX, 'RFC inválido').optional().or(z.literal('')),
    direccion: z.string().trim().min(3, 'Dirección requerida'),
    numeroExterior: z.string().trim().min(1, 'Número exterior requerido'),
    colonia: z.string().trim().optional().or(z.literal('')),
    ciudad: z.string().trim().optional().or(z.literal('')),
    codigoPostal: z.string().trim().regex(CP_REGEX, 'Código postal debe tener 5 dígitos').optional().or(z.literal('')),
    encargado: z.string().trim().optional().or(z.literal('')),
    idZona: z.number().int().positive('Selecciona una zona'),
    categoriaClienteId: z.number().int().positive('Selecciona una categoría'),
    latitud: z.number().optional(),
    longitud: z.number().optional(),
    descuento: z.number().min(0, 'Descuento no puede ser negativo').max(100, 'Descuento no puede exceder 100%').optional(),
    ventaMinimaEfectiva: z.number().min(0).optional(),
    comentarios: z.string().optional().or(z.literal('')),
    rfcFiscal: z.string().trim().toUpperCase().regex(RFC_REGEX, 'RFC fiscal inválido').optional().or(z.literal('')),
    razonSocial: z.string().trim().optional().or(z.literal('')),
    regimenFiscal: z.string().optional().or(z.literal('')),
    usoCFDIPredeterminado: z.string().optional().or(z.literal('')),
    codigoPostalFiscal: z.string().trim().regex(CP_REGEX, 'CP fiscal debe tener 5 dígitos').optional().or(z.literal('')),
    facturable: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Si es facturable, RFC fiscal + razón social + CP fiscal + régimen fiscal son obligatorios.
    if (data.facturable) {
      if (!data.rfcFiscal) ctx.addIssue({ code: 'custom', path: ['rfcFiscal'], message: 'RFC fiscal requerido para clientes facturables' });
      if (!data.razonSocial) ctx.addIssue({ code: 'custom', path: ['razonSocial'], message: 'Razón social requerida para clientes facturables' });
      if (!data.codigoPostalFiscal) ctx.addIssue({ code: 'custom', path: ['codigoPostalFiscal'], message: 'CP fiscal requerido para clientes facturables' });
      if (!data.regimenFiscal) ctx.addIssue({ code: 'custom', path: ['regimenFiscal'], message: 'Régimen fiscal requerido para clientes facturables' });
    }
  });

export type ClienteCreateRequest = z.infer<typeof ClienteCreateRequestSchema>;
