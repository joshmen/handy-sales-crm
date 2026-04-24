export { useLogin, useLogout } from './useAuth';
export { useRealtime } from './useRealtime';
export { useClientsList, useClientDetail } from './useClients';
export { useOrdersList, useOrderDetail, useConfirmarPedido, useEnRutaPedido, useEntregarPedido, useCancelarPedido } from './useOrders';
export { useVisitsToday, useVisitsSummary, useVisitsSummaryWeekly, useActiveVisit } from './useVisits';
export { useRouteToday, useRoutePending, useRouteDetail, useIniciarRuta, useCompletarRuta } from './useRoutes';
export { useSaldos, useResumenCartera, useEstadoCuenta, useMisCobros, useCrearCobro } from './useCobros';
export { useZonas, useCategoriasCliente, useCategoriasProducto, useFamiliasProducto } from './useCatalogos';
export { useProductsList, useProductDetail, useProductStock } from './useProducts';
export { useUserLocation } from './useLocation';
export { useNetworkStatus } from './useNetworkStatus';
export { useAutoSync } from './useAutoSync';

// Offline-first hooks (WatermelonDB)
export { useObservable } from './useObservable';
export { useOfflineClients, useOfflineClientById } from './useOfflineClients';
export { useOfflineProducts, useOfflineProductById } from './useOfflineProducts';
export { useOfflineOrders, useOfflineOrderById, useOfflineOrderDetalles } from './useOfflineOrders';
export { useOfflineRoutes, useOfflineRutaHoy, useOfflineRutaById, useOfflineRutaDetalles } from './useOfflineRoutes';
export { useOfflineVisits, useOfflineVisitById, useOfflineTodayVisits } from './useOfflineVisits';
export { useOfflineCobros, useOfflineCobroById, useOfflineTodayCobros } from './useOfflineCobros';
export { usePendingCount } from './usePendingCount';
export { useClientNameMap } from './useClientNameMap';

// Evidence hooks
export { useAttachmentsForEvent, usePendingAttachmentCount } from './useOfflineAttachments';

// Notification hooks
export { useUnreadNotificationCount } from './useNotificationCount';

// Map hooks
export { useMapData } from './useMapData';
export { useLocationTracking } from './useLocationTracking';
