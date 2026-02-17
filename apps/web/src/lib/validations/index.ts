/**
 * Schemas de validación Zod - Sincronizados con FluentValidation del backend
 * Cada schema debe coincidir con su validador correspondiente en:
 * libs/HandySales.Application/{Entity}/Validators/
 */

import { z } from 'zod';

// ============================================================================
// ZONAS
// Backend: ZonaCreateDtoValidator, ZonaUpdateDtoValidator
// ============================================================================

export const zonaCreateSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  descripcion: z.string().max(255).optional(),
});

export const zonaUpdateSchema = z.object({
  id: z.number().int().positive('ID inválido'),
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().max(255).optional(),
});

export type ZonaCreateFormData = z.infer<typeof zonaCreateSchema>;
export type ZonaUpdateFormData = z.infer<typeof zonaUpdateSchema>;

// ============================================================================
// CATEGORÍAS DE CLIENTES
// Backend: CategoriaClienteCreateDtoValidator
// ============================================================================

export const categoriaClienteSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
});

export type CategoriaClienteFormData = z.infer<typeof categoriaClienteSchema>;

// ============================================================================
// CATEGORÍAS DE PRODUCTOS
// Backend: CategoriaProductoCreateDtoValidator
// ============================================================================

export const categoriaProductoSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().max(255).optional(),
});

export type CategoriaProductoFormData = z.infer<typeof categoriaProductoSchema>;

// ============================================================================
// FAMILIAS DE PRODUCTOS
// Backend: FamiliaProductoCreateDtoValidator
// ============================================================================

export const familiaProductoSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string().max(255).optional(),
});

export type FamiliaProductoFormData = z.infer<typeof familiaProductoSchema>;

// ============================================================================
// UNIDADES DE MEDIDA
// Backend: UnidadMedidaCreateDtoValidator
// ============================================================================

export const unidadMedidaSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  abreviatura: z.string().max(10).optional(),
});

export type UnidadMedidaFormData = z.infer<typeof unidadMedidaSchema>;

// ============================================================================
// PRODUCTOS
// Backend: ProductoCreateDtoValidator
// ============================================================================

export const productoSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  codigoBarra: z
    .string()
    .min(1, 'El código de barras es obligatorio'),
  descripcion: z
    .string()
    .min(1, 'La descripción es obligatoria'),
  familiaId: z.number().int().positive().optional(),
  categoriaId: z.number().int().positive().optional(),
  unidadMedidaId: z.number().int().positive().optional(),
  precioBase: z
    .number()
    .min(0, 'El precio base no puede ser negativo'),
});

export type ProductoFormData = z.infer<typeof productoSchema>;

// ============================================================================
// INVENTARIO
// Backend: InventarioCreateDtoValidator, InventarioUpdateDtoValidator
// ============================================================================

export const inventarioCreateSchema = z.object({
  productoId: z
    .number()
    .int()
    .positive('Debe seleccionar un producto'),
  cantidadActual: z
    .number()
    .min(0, 'La cantidad no puede ser negativa'),
  stockMinimo: z
    .number()
    .min(0, 'El stock mínimo no puede ser negativo'),
  stockMaximo: z
    .number()
    .min(0, 'El stock máximo no puede ser negativo'),
}).refine(data => data.stockMaximo >= data.stockMinimo, {
  message: 'El stock máximo debe ser mayor o igual al stock mínimo',
  path: ['stockMaximo'],
});

export const inventarioUpdateSchema = z.object({
  cantidadActual: z
    .number()
    .min(0, 'La cantidad no puede ser negativa'),
  stockMinimo: z
    .number()
    .min(0, 'El stock mínimo no puede ser negativo'),
  stockMaximo: z
    .number()
    .min(0, 'El stock máximo no puede ser negativo'),
}).refine(data => data.stockMaximo >= data.stockMinimo, {
  message: 'El stock máximo debe ser mayor o igual al stock mínimo',
  path: ['stockMaximo'],
});

export type InventarioCreateFormData = z.infer<typeof inventarioCreateSchema>;
export type InventarioUpdateFormData = z.infer<typeof inventarioUpdateSchema>;

// ============================================================================
// LISTAS DE PRECIOS
// Backend: ListaPrecioCreateDtoValidator
// ============================================================================

export const listaPrecioSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
});

export type ListaPrecioFormData = z.infer<typeof listaPrecioSchema>;

// ============================================================================
// PRECIOS POR PRODUCTO
// Backend: PrecioPorProductoCreateDtoValidator
// ============================================================================

export const precioPorProductoSchema = z.object({
  productoId: z
    .number()
    .int()
    .positive('Debe seleccionar un producto'),
  listaPrecioId: z
    .number()
    .int()
    .positive('Debe seleccionar una lista de precios'),
  precio: z
    .number()
    .min(0, 'El precio no puede ser negativo'),
});

export type PrecioPorProductoFormData = z.infer<typeof precioPorProductoSchema>;

// ============================================================================
// DESCUENTOS POR CANTIDAD
// Backend: DescuentoPorCantidadCreateDtoValidator
// ============================================================================

export const descuentoSchema = z.object({
  productoId: z
    .number()
    .int()
    .positive('Debe seleccionar un producto'),
  cantidadMinima: z
    .number()
    .positive('La cantidad mínima debe ser mayor a 0'),
  descuentoPorcentaje: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede exceder 100%'),
  tipoAplicacion: z.enum(['Producto', 'Global'], {
    errorMap: () => ({ message: 'Tipo de aplicación inválido' }),
  }),
});

export type DescuentoFormData = z.infer<typeof descuentoSchema>;

// ============================================================================
// PROMOCIONES
// Backend: PromocionCreateDtoValidator
// ============================================================================

export const promocionSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  productoId: z
    .number()
    .int()
    .positive('Debe seleccionar un producto'),
  descuentoPorcentaje: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede exceder 100%'),
  fechaInicio: z
    .string()
    .min(1, 'La fecha de inicio es obligatoria'),
  fechaFin: z.string().optional(),
});

export type PromocionFormData = z.infer<typeof promocionSchema>;

// ============================================================================
// PEDIDOS
// Backend: PedidoCreateDtoValidator, DetallePedidoCreateDtoValidator
// ============================================================================

export const detallePedidoSchema = z.object({
  productoId: z
    .number()
    .int()
    .positive('Debe seleccionar un producto'),
  cantidad: z
    .number()
    .positive('La cantidad debe ser mayor a 0')
    .max(99999, 'La cantidad no puede exceder 99,999'),
  precioUnitario: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .optional(),
  descuento: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede exceder 100%')
    .optional(),
});

export const pedidoSchema = z.object({
  clienteId: z
    .number()
    .int()
    .positive('Debe seleccionar un cliente'),
  detalles: z
    .array(detallePedidoSchema)
    .min(1, 'Debe agregar al menos un producto'),
  fechaEntregaEstimada: z.string().optional(),
  notas: z.string().max(2000).optional(),
  direccionEntrega: z.string().max(500).optional(),
  latitud: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida')
    .optional(),
  longitud: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida')
    .optional(),
});

export type DetallePedidoFormData = z.infer<typeof detallePedidoSchema>;
export type PedidoFormData = z.infer<typeof pedidoSchema>;

// ============================================================================
// VISITAS A CLIENTES
// Backend: ClienteVisitaCreateDtoValidator, CheckInDtoValidator, CheckOutDtoValidator
// ============================================================================

export const visitaCreateSchema = z.object({
  clienteId: z
    .number()
    .int()
    .positive('Debe seleccionar un cliente'),
  fechaProgramada: z.string().optional(),
  notas: z.string().max(2000).optional(),
});

export const checkInSchema = z.object({
  latitud: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida'),
  longitud: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida'),
  notas: z.string().max(2000).optional(),
});

export const checkOutSchema = z.object({
  resultado: z.enum(['Venta', 'SinVenta', 'NoEncontrado', 'Reprogramada'], {
    errorMap: () => ({ message: 'Resultado inválido' }),
  }),
  latitud: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida')
    .optional(),
  longitud: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida')
    .optional(),
  notas: z.string().max(2000).optional(),
  notasPrivadas: z.string().max(2000).optional(),
  fotos: z.array(z.string().url()).max(10).optional(),
  pedidoId: z.number().int().positive().optional(),
});

export type VisitaCreateFormData = z.infer<typeof visitaCreateSchema>;
export type CheckInFormData = z.infer<typeof checkInSchema>;
export type CheckOutFormData = z.infer<typeof checkOutSchema>;

// ============================================================================
// USUARIOS - AUTH
// Backend: UsuarioLoginDtoValidator, UsuarioRegisterDtoValidator
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('El formato del email es inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('El formato del email es inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener minúsculas, mayúsculas y números'),
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio'),
  nombreEmpresa: z
    .string()
    .min(1, 'El nombre de empresa es obligatorio'),
  rfc: z.string().max(13).optional(),
  contacto: z.string().max(100).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================================
// USUARIOS - PERFIL
// Backend: UsuarioUpdateDtoValidator, UsuarioProfileUpdateDtoValidator
// ============================================================================

const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

export const usuarioUpdateSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('El formato del email es inválido')
    .max(255),
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100)
    .regex(nombreRegex, 'El nombre solo puede contener letras y espacios'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener minúsculas, mayúsculas y números')
    .optional()
    .or(z.literal('')),
});

export const usuarioProfileSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100)
    .regex(nombreRegex, 'El nombre solo puede contener letras y espacios'),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener minúsculas, mayúsculas y números')
    .optional()
    .or(z.literal('')),
}).refine(
  data => {
    // Si hay nueva contraseña, debe haber contraseña actual
    if (data.newPassword && data.newPassword.length > 0) {
      return data.currentPassword && data.currentPassword.length > 0;
    }
    return true;
  },
  {
    message: 'Debe ingresar la contraseña actual para cambiar la contraseña',
    path: ['currentPassword'],
  }
).refine(
  data => {
    // La nueva contraseña debe ser diferente a la actual
    if (data.newPassword && data.currentPassword) {
      return data.newPassword !== data.currentPassword;
    }
    return true;
  },
  {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  }
);

export type UsuarioUpdateFormData = z.infer<typeof usuarioUpdateSchema>;
export type UsuarioProfileFormData = z.infer<typeof usuarioProfileSchema>;

// ============================================================================
// HELPER: Mapeo de errores del backend a campos del formulario
// ============================================================================

export function mapBackendErrorsToForm(
  errors: Record<string, string[]>,
  fieldMapping?: Record<string, string>
): Record<string, string> {
  const formErrors: Record<string, string> = {};

  for (const [backendField, messages] of Object.entries(errors)) {
    const formField = fieldMapping?.[backendField] || backendField.charAt(0).toLowerCase() + backendField.slice(1);
    if (messages && messages.length > 0) {
      formErrors[formField] = messages[0];
    }
  }

  return formErrors;
}
