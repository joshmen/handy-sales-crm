import { api, handleApiResponse, handleApiError, ApiResponse } from '@/lib/api'
import { Product } from '@/types'

export interface ProductsListParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  family?: string
  isActive?: boolean
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ProductsListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateProductRequest {
  name: string
  code: string
  description?: string
  price: number
  stock: number
  category: string
  family: string
  isActive?: boolean
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string
}

export interface StockUpdateRequest {
  productId: string
  quantity: number
  operation: 'add' | 'subtract' | 'set'
  reason?: string
}

export interface ProductStatsResponse {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalValue: number
  categoriesCount: number
  familiesCount: number
}

class ProductService {
  private readonly basePath = '/products'

  async getProducts(params: ProductsListParams = {}): Promise<ProductsListResponse> {
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })

      const response = await api.get<ApiResponse<ProductsListResponse>>(
        `${this.basePath}?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await api.get<ApiResponse<Product>>(`${this.basePath}/${id}`)
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getProductByCode(code: string): Promise<Product> {
    try {
      const response = await api.get<ApiResponse<Product>>(`${this.basePath}/code/${code}`)
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async createProduct(productData: CreateProductRequest): Promise<Product> {
    try {
      const response = await api.post<ApiResponse<Product>>(
        this.basePath,
        productData
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async updateProduct(productData: UpdateProductRequest): Promise<Product> {
    try {
      const { id, ...updateData } = productData
      const response = await api.put<ApiResponse<Product>>(
        `${this.basePath}/${id}`,
        updateData
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete<ApiResponse<{ message: string }>>(
        `${this.basePath}/${id}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async toggleProductStatus(id: string): Promise<Product> {
    try {
      const response = await api.patch<ApiResponse<Product>>(
        `${this.basePath}/${id}/toggle-status`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async updateStock(stockData: StockUpdateRequest): Promise<Product> {
    try {
      const response = await api.patch<ApiResponse<Product>>(
        `${this.basePath}/${stockData.productId}/stock`,
        stockData
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<Product[]>>(
        `${this.basePath}/by-category/${category}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getProductsByFamily(family: string): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<Product[]>>(
        `${this.basePath}/by-family/${family}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<Product[]>>(
        `${this.basePath}/low-stock?threshold=${threshold}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<Product[]>>(
        `${this.basePath}/out-of-stock`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getProductStats(): Promise<ProductStatsResponse> {
    try {
      const response = await api.get<ApiResponse<ProductStatsResponse>>(
        `${this.basePath}/stats`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<string[]>>(
        `${this.basePath}/categories`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getFamilies(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<string[]>>(
        `${this.basePath}/families`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<Product[]>>(
        `${this.basePath}/search?q=${encodeURIComponent(query)}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async exportProducts(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    try {
      const response = await api.get(
        `${this.basePath}/export?format=${format}`,
        { responseType: 'blob' }
      )
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async importProducts(file: File): Promise<{ message: string; imported: number; errors: string[] }> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post<ApiResponse<{ message: string; imported: number; errors: string[] }>>(
        `${this.basePath}/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

export const productService = new ProductService()
export default productService
