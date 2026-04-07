import { z } from 'zod';

// Schema de validación para clientes
export const clientSchema = z.object({
  // === Información General ===
  habilitado: z.boolean().default(true),
  esProspecto: z.boolean().default(false),

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
  tiposPagoPermitidos: z.enum(['contado_credito', 'contado', 'credito', 'efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'otro'], { errorMap: () => ({ message: 'Seleccione un tipo de pago válido' }) }).default('efectivo'),
  tipoPagoPredeterminado: z.enum(['contado', 'credito', 'efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'otro'], { errorMap: () => ({ message: 'Seleccione un método de pago válido' }) }).default('efectivo'),
  diasCredito: z.number().min(0).default(0),

  // === Datos fiscales ===
  facturable: z.boolean().default(false),
  rfc: z
    .string()
    .max(13, 'El RFC debe tener máximo 13 caracteres')
    .optional()
    .default(''),
  razonSocial: z.string().max(300, 'La razón social no puede exceder 300 caracteres').optional().default(''),
  codigoPostalFiscal: z.string().optional().default(''),
  regimenFiscal: z.string().optional().default(''),
  usoCFDIPredeterminado: z.string().optional().default(''),

  // === Dirección y geolocalización ===
  direccion: z
    .string()
    .min(1, 'La dirección es obligatoria')
    .max(500, 'La dirección no puede exceder 500 caracteres'),
  numeroExterior: z
    .string()
    .min(1, 'El número exterior es obligatorio')
    .max(20, 'El número exterior no puede exceder 20 caracteres'),
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
}).superRefine((data, ctx) => {
  // Validación condicional: si facturable=true, los campos fiscales son obligatorios
  if (data.facturable) {
    if (!data.razonSocial || data.razonSocial.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La razón social es obligatoria para clientes facturables', path: ['razonSocial'] });
    }
    if (!data.rfc || data.rfc.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El RFC es obligatorio para clientes facturables', path: ['rfc'] });
    } else if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(data.rfc.toUpperCase())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El RFC no tiene un formato válido', path: ['rfc'] });
    }
    if (!data.codigoPostalFiscal || !/^\d{5}$/.test(data.codigoPostalFiscal)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El código postal fiscal debe tener 5 dígitos', path: ['codigoPostalFiscal'] });
    }
    if (!data.regimenFiscal || data.regimenFiscal.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El régimen fiscal es obligatorio para clientes facturables', path: ['regimenFiscal'] });
    }
  }
});

// Tipo inferido del schema (salida - después de aplicar defaults)
export type ClientFormData = z.infer<typeof clientSchema>;
// Tipo de entrada del formulario (antes de aplicar defaults - para useForm)
export type ClientFormInput = z.input<typeof clientSchema>;

// Valores por defecto completos (para inicializar el formulario)
export const clientDefaultValues: ClientFormData = {
  habilitado: true,
  esProspecto: false,
  descripcion: '',
  categoriaId: '',
  comentarios: '',
  listaPreciosId: '',
  descuento: 0,
  saldo: 0,
  limiteCredito: 0,
  ventaMinimaEfectiva: 0,
  tiposPagoPermitidos: 'efectivo',
  tipoPagoPredeterminado: 'efectivo',
  diasCredito: 0,
  facturable: false,
  rfc: '',
  razonSocial: '',
  codigoPostalFiscal: '',
  regimenFiscal: '',
  usoCFDIPredeterminado: '',
  direccion: '',
  numeroExterior: '',
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

// Catálogos SAT para regimen fiscal y uso CFDI
export const REGIMEN_FISCAL_OPTIONS = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Enajenación o Adquisición de Bienes' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero' },
  { value: '611', label: '611 - Dividendos (socios y accionistas)' },
  { value: '612', label: '612 - Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 - Ingresos por intereses' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Producción' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { value: '625', label: '625 - Actividades Empresariales (Plataformas Tecnológicas)' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza (RESICO)' },
];

export const USO_CFDI_OPTIONS = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 - Honorarios médicos y gastos hospitalarios' },
  { value: 'D02', label: 'D02 - Gastos médicos por incapacidad' },
  { value: 'D03', label: 'D03 - Gastos funerales' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'D05', label: 'D05 - Intereses por créditos hipotecarios' },
  { value: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
  { value: 'CP01', label: 'CP01 - Pagos' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' },
];

// Mapeo de datos del formulario al DTO del backend
export function mapFormToBackendDto(data: ClientFormData) {
  return {
    nombre: data.descripcion,
    rfc: data.rfc || '',
    correo: data.email || '',
    telefono: data.telefono || '',
    direccion: data.direccion,
    numeroExterior: data.numeroExterior,
    idZona: data.zonaId,
    categoriaClienteId: data.categoriaId ? parseInt(data.categoriaId) : 1,
    // Campos adicionales
    esProspecto: data.esProspecto,
    comentarios: data.comentarios || null,
    listaPreciosId: data.listaPreciosId ? parseInt(data.listaPreciosId) : null,
    descuento: data.descuento,
    saldo: data.saldo,
    limiteCredito: data.limiteCredito,
    ventaMinimaEfectiva: data.ventaMinimaEfectiva,
    tiposPagoPermitidos: data.tiposPagoPermitidos,
    tipoPagoPredeterminado: data.tipoPagoPredeterminado,
    diasCredito: data.diasCredito,
    // Dirección desglosada
    ciudad: data.ciudad || null,
    colonia: data.colonia || null,
    codigoPostal: data.codigoPostal || null,
    // Contacto
    encargado: data.encargado || null,
    // Geolocalización
    latitud: data.latitud || null,
    longitud: data.longitud || null,
    // Datos fiscales
    facturable: data.facturable,
    razonSocial: data.razonSocial || null,
    codigoPostalFiscal: data.codigoPostalFiscal || null,
    regimenFiscal: data.regimenFiscal || null,
    usoCFDIPredeterminado: data.usoCFDIPredeterminado || null,
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
    'NumeroExterior': 'numeroExterior',
    'IdZona': 'zonaId',
    'CategoriaClienteId': 'categoriaId',
    'Descuento': 'descuento',
    'Saldo': 'saldo',
    'LimiteCredito': 'limiteCredito',
    'VentaMinimaEfectiva': 'ventaMinimaEfectiva',
    'DiasCredito': 'diasCredito',
    'Encargado': 'encargado',
    'RazonSocial': 'razonSocial',
    'CodigoPostalFiscal': 'codigoPostalFiscal',
    'RegimenFiscal': 'regimenFiscal',
    'UsoCFDIPredeterminado': 'usoCFDIPredeterminado',
  };

  for (const [backendField, messages] of Object.entries(errors)) {
    const formField = fieldMapping[backendField] || backendField.toLowerCase();
    if (messages && messages.length > 0) {
      formErrors[formField] = messages[0];
    }
  }

  return formErrors;
}
