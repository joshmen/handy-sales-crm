import { z } from 'zod';

// Schema de validación para clientes - Completo según diseño Pencil
export const clientSchema = z.object({
  // === Información General ===
  habilitado: z.boolean().default(true),
  esProspecto: z.boolean().default(false),
  esClienteMovil: z.boolean().default(true),
  facturable: z.boolean().default(false),
  pedidosEnLinea: z.boolean().default(false),

  descripcion: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(255, 'La descripción no puede exceder 255 caracteres'),

  categoriaId: z
    .string()
    .min(1, 'Debe seleccionar una categoría'),

  comentarios: z.string().max(500).optional(),

  // === Precios y descuento ===
  listaPreciosId: z.string().optional(),
  descuento: z.number().min(0).max(100).default(0),

  // === Pago, venta y crédito ===
  saldo: z.number().min(0).default(0),
  limiteCredito: z.number().min(0).default(0),
  ventaMinimaEfectiva: z.number().min(0).default(0),

  // === Config entregas ===
  tiposPagoPermitidos: z.enum(['contado_credito', 'contado', 'credito']).default('contado_credito'),
  tipoPagoPredeterminado: z.enum(['contado', 'credito']).default('contado'),
  diasCredito: z.number().min(0).default(0),

  // === Datos fiscales ===
  rfc: z
    .string()
    .max(13, 'El RFC debe tener máximo 13 caracteres')
    .optional()
    .default(''),

  // === Dirección y geolocalización ===
  direccion: z
    .string()
    .min(1, 'La dirección es obligatoria')
    .max(500, 'La dirección no puede exceder 500 caracteres'),
  ciudad: z.string().max(100).optional(),
  colonia: z.string().max(100).optional(),
  codigoPostal: z.string().max(10).optional(),

  zonaId: z
    .number({ required_error: 'Debe seleccionar una zona' })
    .int()
    .positive('Debe seleccionar una zona válida'),

  latitud: z.number().default(0),
  longitud: z.number().default(0),

  // === Datos de contacto ===
  encargado: z.string().max(255).optional(),
  telefono: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos'),
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('El formato del correo es inválido'),
});

// Tipo inferido del schema (salida - después de aplicar defaults)
export type ClientFormData = z.infer<typeof clientSchema>;
// Tipo de entrada del formulario (antes de aplicar defaults - para useForm)
export type ClientFormInput = z.input<typeof clientSchema>;

// Valores por defecto completos (para inicializar el formulario)
export const clientDefaultValues: ClientFormData = {
  habilitado: true,
  esProspecto: false,
  esClienteMovil: true,
  facturable: false,
  pedidosEnLinea: false,
  descripcion: '',
  categoriaId: '',
  comentarios: '',
  listaPreciosId: '',
  descuento: 0,
  saldo: 0,
  limiteCredito: 0,
  ventaMinimaEfectiva: 0,
  tiposPagoPermitidos: 'contado_credito',
  tipoPagoPredeterminado: 'contado',
  diasCredito: 0,
  rfc: '',
  direccion: '',
  ciudad: '',
  colonia: '',
  codigoPostal: '',
  zonaId: 0,
  latitud: 0,
  longitud: 0,
  encargado: '',
  telefono: '',
  email: '',
};

// Mapeo de datos del formulario al DTO del backend
export function mapFormToBackendDto(data: ClientFormData) {
  return {
    nombre: data.descripcion,
    rfc: data.rfc || '',
    correo: data.email || '',
    telefono: data.telefono || '',
    direccion: [data.direccion, data.colonia, data.ciudad, data.codigoPostal].filter(Boolean).join(', '),
    idZona: data.zonaId,
    categoriaClienteId: data.categoriaId ? parseInt(data.categoriaId) : 1,
  };
}

// Mensajes de error del backend mapeados a campos del formulario
export function mapBackendErrorsToForm(errors: Record<string, string[]>): Record<string, string> {
  const formErrors: Record<string, string> = {};

  const fieldMapping: Record<string, string> = {
    'Nombre': 'descripcion',
    'RFC': 'rfc',
    'Correo': 'email',
    'Telefono': 'telefono',
    'Direccion': 'direccion',
    'IdZona': 'zonaId',
    'CategoriaClienteId': 'categoriaId',
  };

  for (const [backendField, messages] of Object.entries(errors)) {
    const formField = fieldMapping[backendField] || backendField.toLowerCase();
    if (messages && messages.length > 0) {
      formErrors[formField] = messages[0];
    }
  }

  return formErrors;
}
