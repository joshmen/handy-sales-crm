// src/services/api/index.ts

// 1) Importa las instancias para usarlas localmente
import { authService } from './auth';
import { clientService } from './clients';
import { dashboardService } from './dashboard';
import { productService } from './products';
import { inventoryService } from './inventory';
import { inventoryMovementService } from './inventoryMovements';
import { promotionService } from './promotions';
import { zoneService } from './zones';
import { orderService } from './orders';
import { discountService } from './discounts';
import { deliveryService } from './deliveries';
import { priceListService, productPriceService } from './priceLists';
import { clientCategoryService } from './clientCategories';
import { productCategoryService } from './productCategories';
import { productFamilyService } from './productFamilies';
import { unitService } from './units';
import { impersonationService } from './impersonation';

// 2) Re-exporta todo (tipos, funciones, etc.)
export * from './auth';
export * from './clients';
export * from './dashboard';
export * from './products';
export * from './inventory';
export * from './inventoryMovements';
export * from './promotions';
export * from './zones';
export * from './orders';
export * from './discounts';
export * from './deliveries';
export * from './priceLists';
export * from './clientCategories';
export * from './productCategories';
export * from './productFamilies';
export * from './units';
export * from './impersonation';

// 3) (Opcional) re-exporta también las instancias por nombre
export {
  authService,
  clientService,
  dashboardService,
  productService,
  inventoryService,
  inventoryMovementService,
  promotionService,
  zoneService,
  orderService,
  discountService,
  deliveryService,
  priceListService,
  productPriceService,
  clientCategoryService,
  productCategoryService,
  productFamilyService,
  unitService,
  impersonationService,
};

// 4) Objeto centralizado
export const services = {
  auth: authService,
  clients: clientService,
  dashboard: dashboardService,
  products: productService,
  inventory: inventoryService,
  inventoryMovements: inventoryMovementService,
  promotions: promotionService,
  zones: zoneService,
  orders: orderService,
  discounts: discountService,
  deliveries: deliveryService,
  priceLists: priceListService,
  productPrices: productPriceService,
  clientCategories: clientCategoryService,
  productCategories: productCategoryService,
  productFamilies: productFamilyService,
  units: unitService,
  impersonation: impersonationService,
} as const;

export default services;
