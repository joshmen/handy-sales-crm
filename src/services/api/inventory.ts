// src/services/api/inventory.ts
import { ApiResponse } from '@/types';
import { InventoryItem, InventoryAdjustment, InventoryAdjustmentForm, InventoryFilters } from '@/types/inventory';

// Base API URL - En producción vendría del env
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const inventoryApi = {
  // Get all inventory items
  getInventoryItems: async (filters?: InventoryFilters): Promise<ApiResponse<InventoryItem[]>> => {
    const searchParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/inventory?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch inventory items');
    }
    
    return response.json();
  },

  // Get inventory item by product ID
  getInventoryByProductId: async (productId: string): Promise<ApiResponse<InventoryItem>> => {
    const response = await fetch(`${API_BASE_URL}/inventory/product/${productId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch inventory item');
    }
    
    return response.json();
  },

  // Create inventory adjustment
  createAdjustment: async (adjustment: InventoryAdjustmentForm): Promise<ApiResponse<InventoryAdjustment>> => {
    const response = await fetch(`${API_BASE_URL}/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adjustment),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create inventory adjustment');
    }
    
    return response.json();
  },

  // Get adjustment history
  getAdjustmentHistory: async (productId?: string): Promise<ApiResponse<InventoryAdjustment[]>> => {
    const url = productId 
      ? `${API_BASE_URL}/inventory/adjustments?productId=${productId}`
      : `${API_BASE_URL}/inventory/adjustments`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch adjustment history');
    }
    
    return response.json();
  },

  // Export inventory to CSV
  exportInventory: async (filters?: InventoryFilters): Promise<Blob> => {
    const searchParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/inventory/export?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to export inventory');
    }
    
    return response.blob();
  },
};
