// src/types/promotions.ts
import type { BaseEntity, Product, User } from './index';

// Enum para tipos de promoción
export enum PromotionType {
  PERCENTAGE = 'PERCENTAGE',           // Por porcentaje
  SPECIAL_CLUB = 'SPECIAL_CLUB',       // Club especial por recomendación
  BUY_X_GET_Y = 'BUY_X_GET_Y',        // Compra X obtén Y
}

// Enum para estados
export enum PromotionStatus {
  ACTIVE = 'ACTIVE',       // Promociones activas
  PAUSED = 'PAUSED',       // Promociones pausadas  
  FINISHED = 'FINISHED',   // Promociones finalizadas
  DRAFT = 'DRAFT',         // Borradores
}

// Enum para método de recompensa
export enum RewardMethod {
  FREE = 'FREE',                    // Gratis
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT', // Descuento por porcentaje
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',          // Descuento fijo
}

// Rango de clientes para promociones
export interface ClientRange {
  id: string;
  minQuantity: number;
  maxQuantity?: number; // null = sin límite superior
  rewardValue: number; // porcentaje descuento, monto fijo, o cantidad gratis
  rewardMethod: RewardMethod;
  description?: string;
}

// Productos de aplicación (para obtener el incentivo)
export interface ApplicationProduct {
  id: string;
  productId: string;
  product?: Product;
  minimumQuantity: number;
  description?: string;
}

// Productos de recompensa (que se descontarán/regalarán)
export interface RewardProduct {
  id: string;
  productId: string;
  product?: Product;
  maxQuantity?: number; // límite de productos gratis/con descuento
  discountValue: number; // porcentaje o monto según el método
  discountMethod: RewardMethod;
  description?: string;
}

// Limitantes de la promoción
export interface PromotionLimits {
  // Limitantes de uso
  maxUsagePerClient?: number;    // Veces que un cliente puede usar la promoción
  maxTotalUsage?: number;        // Uso total de la promoción
  maxBudget?: number;            // Presupuesto máximo para la promoción
  
  // Limitantes de productos
  maxRewardPieces?: number;      // Límite de piezas de recompensa
  
  // Limitantes geográficos
  allowedZones?: string[];       // Zonas donde aplica
  
  // Limitantes de categorías
  allowedCategories?: string[];  // Categorías de clientes permitidas
  
  // Limitantes temporales
  startDate?: Date;
  endDate?: Date;
  validDays?: number[];          // Días de la semana válidos (0=domingo, 6=sábado)
  validHours?: {
    start: string;  // "09:00"
    end: string;    // "18:00"
  };
}

// Interface principal para promociones
export interface Promotion extends BaseEntity {
  name: string;
  description?: string;
  type: PromotionType;
  status: PromotionStatus;
  
  // Configuración de la promoción
  applicationProducts: ApplicationProduct[];  // Productos para obtener incentivo
  rewardProducts: RewardProduct[];           // Productos de recompensa
  clientRanges: ClientRange[];               // Rangos de clientes
  
  // Limitantes y restricciones
  limits: PromotionLimits;
  
  // Configuraciones adicionales
  isStackable: boolean;         // ¿Se puede combinar con otras promociones?
  requiresApproval: boolean;    // ¿Requiere aprobación manual?
  isVisible: boolean;           // ¿Visible para los vendedores?
  
  // Auditoría
  createdBy: string;
  updatedBy?: string;
  createdByUser?: User;
  updatedByUser?: User;
  
  // Estadísticas
  totalUsed?: number;
  totalSavings?: number;
  lastUsed?: Date;
  currentBudgetUsed?: number;
  remainingBudget?: number;
}

// Para crear nuevas promociones
export interface CreatePromotionDto {
  name: string;
  description?: string;
  type: PromotionType;
  applicationProducts: Omit<ApplicationProduct, 'id'>[];
  rewardProducts: Omit<RewardProduct, 'id'>[];
  clientRanges: Omit<ClientRange, 'id'>[];
  limits: PromotionLimits;
  isStackable: boolean;
  requiresApproval: boolean;
  isVisible: boolean;
}

// Para actualizar promociones
export interface UpdatePromotionDto extends Partial<CreatePromotionDto> {
  status?: PromotionStatus;
}

// Filtros para buscar promociones
export interface PromotionFilters {
  search?: string;
  type?: PromotionType;
  status?: PromotionStatus;
  productId?: string;
  zone?: string;
  category?: string;
  isActive?: boolean; // basado en fechas y estado
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Para aplicar promociones en órdenes
export interface PromotionApplication {
  promotionId: string;
  promotion: Promotion;
  appliedProducts: ApplicationProduct[];
  rewardedProducts: Array<{
    product: RewardProduct;
    quantity: number;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  }>;
  totalSavings: number;
  appliedRange: ClientRange;
}

// Estadísticas de promociones
export interface PromotionStats {
  totalPromotions: number;
  activePromotions: number;
  pausedPromotions: number;
  finishedPromotions: number;
  totalSavingsGenerated: number;
  totalBudgetUsed: number;
  mostUsedPromotion: {
    promotion: Promotion;
    timesUsed: number;
  };
  averageUsagePerPromotion: number;
  promotionsByType: {
    [key in PromotionType]: number;
  };
  promotionsByStatus: {
    [key in PromotionStatus]: number;
  };
}

// Para reportes
export interface PromotionReport {
  period: {
    from: Date;
    to: Date;
  };
  totalOrders: number;
  ordersWithPromotion: number;
  promotionPenetration: number; // porcentaje de órdenes con promoción
  totalSavings: number;
  totalBudgetUsed: number;
  averageSavingPerOrder: number;
  topPromotions: Array<{
    promotion: Promotion;
    timesUsed: number;
    totalSavings: number;
    budgetUsed: number;
  }>;
  promotionTrends: Array<{
    date: string;
    totalSavings: number;
    ordersWithPromotion: number;
    budgetUsed: number;
  }>;
}

// Para validación de promociones
export interface PromotionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canApply: boolean;
  applicableProducts: ApplicationProduct[];
  availableRewards: RewardProduct[];
  budgetRemaining: number;
}

// Plantillas predefinidas de promociones
export interface PromotionTemplate {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  applicationProducts: Omit<ApplicationProduct, 'id'>[];
  rewardProducts: Omit<RewardProduct, 'id'>[];
  clientRanges: Omit<ClientRange, 'id'>[];
  defaultLimits: PromotionLimits;
  isDefault: boolean;
  category: 'seasonal' | 'loyalty' | 'product_launch' | 'clearance' | 'special_club';
}

// Para importación masiva
export interface PromotionImportRow {
  name: string;
  description?: string;
  type: string;
  applicationProducts: string; // JSON string
  rewardProducts: string;      // JSON string
  clientRanges: string;        // JSON string
  limits: string;              // JSON string
  isStackable: boolean;
  requiresApproval: boolean;
  isVisible: boolean;
}

export interface PromotionImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: PromotionImportRow;
  }>;
  createdPromotions: Promotion[];
}