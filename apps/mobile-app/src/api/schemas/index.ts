// Common (generic wrappers)
export {
  ApiResponseSchema,
  PaginatedApiResponseSchema,
  PaginationSchema,
  ApiErrorSchema,
} from './common';
export type { Pagination, ApiError } from './common';

// Auth
export {
  AuthUserSchema,
  LoginResponseSchema,
} from './auth';
export type { AuthUser, LoginResponse, LoginRequest, RefreshRequest } from './auth';

// Client
export {
  MobileClienteSchema,
  ClienteLocationSchema,
} from './client';
export type { MobileCliente, ClienteLocation, ClienteCreateRequest } from './client';

// Product
export {
  MobileProductoSchema,
  ProductStockSchema,
} from './product';
export type { MobileProducto, ProductStock } from './product';

// Order
export {
  MobilePedidoSchema,
  MobileDetallePedidoSchema,
} from './order';
export type {
  MobilePedido,
  MobileDetallePedido,
  PedidoCreateRequest,
  DetallePedidoCreateRequest,
} from './order';

// Visit
export {
  MobileVisitaSchema,
  ResumenDiarioSchema,
  ResumenSemanalSchema,
} from './visit';
export type {
  MobileVisita,
  ResumenDiario,
  ResumenSemanal,
  VisitaCreateRequest,
  CheckInRequest,
  CheckOutRequest,
} from './visit';

// Route
export {
  MobileRutaSchema,
  MobileRutaDetalleSchema,
} from './route';
export type { MobileRuta, MobileRutaDetalle } from './route';

// Cobro
export {
  SaldoClienteSchema,
  ResumenCarteraSchema,
  EstadoCuentaSchema,
  EstadoCuentaMovimientoSchema,
  MobileCobroSchema,
} from './cobro';
export type {
  SaldoCliente,
  ResumenCartera,
  EstadoCuenta,
  EstadoCuentaMovimiento,
  MobileCobro,
  CobroCreateRequest,
} from './cobro';

// Catalogos
export { CatalogoItemSchema } from './catalogos';
export type { CatalogoItem } from './catalogos';
