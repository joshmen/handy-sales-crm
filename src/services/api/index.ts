// src/services/api/index.ts

// 1) Importa las instancias para usarlas localmente
import { authService } from './auth';
import { clientService } from './clients';
import { dashboardService } from './dashboard';
import { productService } from './products';
import { inventoryApi } from './inventory';
import { promotionsApi } from './promotions';

// 2) Re-exporta todo (tipos, funciones, etc.)
export * from './auth';
export * from './clients';
export * from './dashboard';
export * from './products';
export * from './inventory';
export * from './promotions';

// 3) (Opcional) re-exporta también las instancias por nombre
export { authService, clientService, dashboardService, productService, inventoryApi, promotionsApi };

// 4) Objeto centralizado
export const services = {
  auth: authService,
  clients: clientService,
  dashboard: dashboardService,
  products: productService,
  inventory: inventoryApi,
  promotions: promotionsApi,
} as const;

export default services;
