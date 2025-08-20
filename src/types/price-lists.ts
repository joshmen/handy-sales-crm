export interface PriceList {
  id: string;
  code: string;
  description: string;
  isEnabled: boolean;
  productCount: number;
  lastModified: Date;
  modifiedBy: string;
  createdAt: Date;
  createdBy: string;
}

export interface PriceListProduct {
  id: string;
  priceListId: string;
  productId: string;
  productCode: string;
  productName: string;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePriceListDto {
  code: string;
  description: string;
  isEnabled: boolean;
}

export interface UpdatePriceListDto {
  code?: string;
  description?: string;
  isEnabled?: boolean;
}

export interface PriceListFilters {
  search?: string;
  isEnabled?: boolean;
  sortBy?: 'code' | 'description' | 'lastModified' | 'productCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Estados para el formulario
export interface PriceListFormData {
  code: string;
  description: string;
  isEnabled: boolean;
}

// Para validaciones
export interface PriceListValidation {
  code: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
    unique: boolean;
  };
  description: {
    required: boolean;
    maxLength: number;
  };
}
