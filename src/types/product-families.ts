export interface ProductFamily {
  id: string;
  description: string;
  isEnabled: boolean;
  enabledProducts: number;
  disabledProducts: number;
  lastModified: Date;
  modifiedBy: string;
  createdAt: Date;
  createdBy: string;
}

export interface CreateProductFamilyDto {
  description: string;
  isEnabled?: boolean;
}

export interface UpdateProductFamilyDto {
  description?: string;
  isEnabled?: boolean;
}

export interface ProductFamilyFilters {
  search?: string;
  isEnabled?: boolean;
  sortBy?: 'description' | 'lastModified' | 'enabledProducts' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Estados para el formulario
export interface ProductFamilyFormData {
  description: string;
  isEnabled: boolean;
}

// Para validaciones
export interface ProductFamilyValidation {
  description: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
}
