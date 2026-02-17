// src/types/catalogs.ts

// ============================================================================
// Categoría de Cliente
// ============================================================================

export interface ClientCategory {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface ClientCategoryForm {
  nombre: string;
  descripcion?: string;
}

// ============================================================================
// Categoría de Producto
// ============================================================================

export interface ProductCategory {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface ProductCategoryForm {
  nombre: string;
  descripcion?: string;
}

// ============================================================================
// Unidad de Medida
// ============================================================================

export interface Unit {
  id: number;
  nombre: string;
  abreviatura?: string;
}

export interface UnitForm {
  nombre: string;
  abreviatura?: string;
}

// ============================================================================
// Common Types
// ============================================================================

export interface CatalogFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
