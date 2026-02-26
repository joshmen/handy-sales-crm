// Response types — re-exported from Zod schemas (source of truth)
export type { MobilePedido, MobileDetallePedido } from '@/api/schemas/order';

// Request types — re-exported from schemas (plain interfaces, no Zod)
export type { PedidoCreateRequest, DetallePedidoCreateRequest } from '@/api/schemas/order';
