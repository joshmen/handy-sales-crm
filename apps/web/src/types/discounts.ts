// src/types/discounts.ts
import type { BaseEntity, Product, User } from './index';

// ===== BACKEND DTOs (Match .NET API) =====

// Matches DescuentoPorCantidadDto from backend
export interface DescuentoPorCantidadDto {
  id: number;
  productoId: number | null;  // null para descuentos globales
  productoNombre?: string;
  productoCodigo?: string;
  cantidadMinima: number;
  descuentoPorcentaje: number;
  tipoAplicacion: 'Global' | 'Producto';
  activo: boolean;
  creadoEn: string; // ISO date string
  creadoPor?: string;
  actualizadoEn?: string; // ISO date string
  actualizadoPor?: string;
}

// Matches DescuentoPorCantidadCreateDto from backend
export interface DescuentoPorCantidadCreateDto {
  productoId: number | null;  // null para descuentos globales
  cantidadMinima: number;
  descuentoPorcentaje: number;
  tipoAplicacion: 'Global' | 'Producto';
}

// ===== FRONTEND ENUMS (For legacy compatibility) =====

// Enum para tipos de descuento
export enum DiscountType {
  GLOBAL = 'GLOBAL',           // Descuento por cantidad global
  PRODUCT_SPECIFIC = 'PRODUCT_SPECIFIC', // Descuento por producto específico
}

// Enum para método de cálculo
export enum DiscountMethod {
  PERCENTAGE = 'PERCENTAGE',   // Porcentaje
  FIXED_AMOUNT = 'FIXED_AMOUNT', // Monto fijo
}

// Enum para estados
export enum DiscountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
}

// Rango de cantidad para descuentos por cantidad
export interface QuantityRange {
  id: string;
  minQuantity: number;
  maxQuantity?: number; // null = sin límite superior (51+)
  discountValue: number; // porcentaje o monto fijo según el método
  description?: string;
}

// Interface principal para descuentos
export interface Discount extends BaseEntity {
  name: string;
  description?: string;
  type: DiscountType;
  method: DiscountMethod;
  status: DiscountStatus;
  
  // Fechas de vigencia
  isPermanent: boolean;
  validFrom?: Date;
  validTo?: Date;
  
  // Rangos de cantidad
  quantityRanges: QuantityRange[];
  
  // Para descuentos por producto específico
  productId?: string;
  product?: Product;
  
  // Configuraciones adicionales
  isStackable: boolean; // ¿Se puede combinar con otros descuentos?
  minimumAmount?: number; // Monto mínimo de compra para aplicar
  maximumDiscount?: number; // Descuento máximo aplicable
  
  // Auditoría
  createdBy: string;
  updatedBy?: string;
  createdByUser?: User;
  updatedByUser?: User;
  
  // Estadísticas
  totalUsed?: number;
  totalSavings?: number;
  lastUsed?: Date;
}

// Para crear nuevos descuentos
export interface CreateDiscountDto {
  name: string;
  description?: string;
  type: DiscountType;
  method: DiscountMethod;
  isPermanent: boolean;
  validFrom?: Date;
  validTo?: Date;
  quantityRanges: Omit<QuantityRange, 'id'>[];
  productId?: string;
  isStackable: boolean;
  minimumAmount?: number;
  maximumDiscount?: number;
}

// Para actualizar descuentos
export interface UpdateDiscountDto extends Partial<CreateDiscountDto> {
  status?: DiscountStatus;
}

// Filtros para buscar descuentos
export interface DiscountFilters {
  search?: string;
  type?: DiscountType;
  method?: DiscountMethod;
  status?: DiscountStatus;
  productId?: string;
  isActive?: boolean; // basado en fechas de vigencia
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Para aplicar descuentos en órdenes
export interface DiscountApplication {
  discountId: string;
  discount: Discount;
  quantity: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedRange: QuantityRange;
}

// Estadísticas de descuentos
export interface DiscountStats {
  totalDiscounts: number;
  activeDiscounts: number;
  totalSavingsGenerated: number;
  mostUsedDiscount: {
    discount: Discount;
    timesUsed: number;
  };
  averageDiscountPercentage: number;
  discountsByType: {
    [key in DiscountType]: number;
  };
  discountsByStatus: {
    [key in DiscountStatus]: number;
  };
}

// Para reportes
export interface DiscountReport {
  period: {
    from: Date;
    to: Date;
  };
  totalOrders: number;
  ordersWithDiscount: number;
  discountPenetration: number; // porcentaje de órdenes con descuento
  totalSavings: number;
  averageSavingPerOrder: number;
  topDiscounts: Array<{
    discount: Discount;
    timesUsed: number;
    totalSavings: number;
  }>;
  discountTrends: Array<{
    date: string;
    totalSavings: number;
    ordersWithDiscount: number;
  }>;
}

// Para importación masiva
export interface DiscountImportRow {
  name: string;
  description?: string;
  type: string;
  method: string;
  productCode?: string; // código del producto
  isPermanent: boolean;
  validFrom?: string;
  validTo?: string;
  quantityRanges: string; // JSON string con los rangos
  isStackable: boolean;
  minimumAmount?: number;
  maximumDiscount?: number;
}

export interface DiscountImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: DiscountImportRow;
  }>;
  createdDiscounts: Discount[];
}

// Plantillas predefinidas de descuentos
export interface DiscountTemplate {
  id: string;
  name: string;
  description: string;
  type: DiscountType;
  method: DiscountMethod;
  quantityRanges: Omit<QuantityRange, 'id'>[];
  isStackable: boolean;
  minimumAmount?: number;
  maximumDiscount?: number;
  isDefault: boolean;
  category: 'bulk' | 'loyalty' | 'promotional' | 'seasonal';
}

// Para validación de descuentos
export interface DiscountValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canApply: boolean;
  applicableRanges: QuantityRange[];
}
