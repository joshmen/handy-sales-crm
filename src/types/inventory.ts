// src/types/inventory.ts
import { BaseEntity, Product } from './index';

// Inventory types
export interface InventoryItem extends BaseEntity {
  productId: string;
  warehouseQuantity: number;  // Existencia en almacén
  routeQuantity: number;      // Existencia en ruta
  totalQuantity: number;      // Existencia total
  minStock: number;
  maxStock?: number;
  lastUpdated: Date;
  
  // Relations
  product?: Product;
  adjustments?: InventoryAdjustment[];
}

export interface InventoryAdjustment extends BaseEntity {
  productId: string;
  type: InventoryAdjustmentType;
  quantity: number;           // Cantidad del ajuste
  previousQuantity: number;   // Cantidad anterior
  newQuantity: number;        // Nueva cantidad
  reason?: string;            // Motivo/Comentario
  userId: string;
  
  // Relations
  product?: Product;
}

export enum InventoryAdjustmentType {
  INCREASE = 'INCREASE',      // Cantidad a aumentar
  DECREASE = 'DECREASE',      // Cantidad a disminuir
  SET_NEW = 'SET_NEW',        // Nuevo inventario
}

// Form types for inventory adjustment
export interface InventoryAdjustmentForm {
  productId: string;
  type: InventoryAdjustmentType;
  quantity: number;
  reason?: string;
}

// Base form data
export interface BaseInventoryFormData {
  productId: string;
  quantity: number;
  reason?: string;
}

// Specific form types
export interface AdjustmentFormData extends BaseInventoryFormData {
  type: InventoryAdjustmentType;
}

export interface TransferFormData extends BaseInventoryFormData {
  fromLocation: 'warehouse' | 'route';
  toLocation: 'warehouse' | 'route';
}

// Union type for all inventory operations
export type InventoryFormData = AdjustmentFormData | TransferFormData;

// Filter types
export interface InventoryFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;        // Productos con stock bajo
  outOfStock?: boolean;      // Productos sin stock
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Dashboard types for inventory
export interface InventoryMetrics {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  lastUpdate: Date;
}
