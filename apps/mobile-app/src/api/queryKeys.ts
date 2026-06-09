/**
 * Sprint 3 audit code-quality: query keys factory tipada.
 *
 * Antes: 30+ usos de queryClient.invalidateQueries({ queryKey: ['orders'] })
 * con strings literales. Cambio de schema requiere grep + replace, riesgo
 * de typo silente (typo = no invalidacion = stale cache).
 *
 * Ahora: factory tipada estilo TanStack Query docs. Usage:
 *   const { data } = useQuery({ queryKey: queryKeys.orders(), queryFn: ... });
 *   queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
 *
 * Refactoring safe: cambiar nombre de un key actualiza TODOS los usos via TS.
 * Pattern oficial: https://tanstack.com/query/latest/docs/eslint/exhaustive-deps
 */

export const queryKeys = {
  // Auth + user
  me: () => ['me'] as const,
  session: () => ['session'] as const,

  // Empresa / tenant
  empresa: () => ['empresa'] as const,
  empresaConfig: () => ['empresa', 'config'] as const,

  // Catalogos read-only
  catalogos: {
    zonas: () => ['catalogos', 'zonas'] as const,
    categoriasCliente: () => ['catalogos', 'categorias-cliente'] as const,
    categoriasProducto: () => ['catalogos', 'categorias-producto'] as const,
    familiasProducto: () => ['catalogos', 'familias-producto'] as const,
    listasPrecio: () => ['catalogos', 'listas-precio'] as const,
    metodosPago: () => ['catalogos', 'metodos-pago'] as const,
  },

  // Negocio - clientes
  clients: () => ['clients'] as const,
  client: (id: string | number) => ['clients', String(id)] as const,
  clientsByZona: (zonaId: string | number) => ['clients', 'zona', String(zonaId)] as const,

  // Negocio - productos
  productos: () => ['productos'] as const,
  producto: (id: string | number) => ['productos', String(id)] as const,
  productosByFamilia: (familiaId: string | number) => ['productos', 'familia', String(familiaId)] as const,

  // Negocio - pedidos
  orders: () => ['orders'] as const,
  order: (id: string | number) => ['orders', String(id)] as const,
  ordersByCliente: (clienteId: string | number) => ['orders', 'cliente', String(clienteId)] as const,
  ordersPendingCount: () => ['orders', 'pending-count'] as const,

  // Negocio - cobros
  cobros: () => ['cobros'] as const,
  cobro: (id: string | number) => ['cobros', String(id)] as const,
  cobrosByPedido: (pedidoId: string | number) => ['cobros', 'pedido', String(pedidoId)] as const,

  // Negocio - rutas
  rutas: () => ['rutas'] as const,
  ruta: (id: string | number) => ['rutas', String(id)] as const,
  rutaActiva: () => ['rutas', 'activa'] as const,
  rutaDetalles: (rutaId: string | number) => ['rutas', String(rutaId), 'detalles'] as const,

  // Negocio - visitas
  visitas: () => ['visitas'] as const,
  visita: (id: string | number) => ['visitas', String(id)] as const,
  visitaActiva: () => ['visitas', 'activa'] as const,

  // Inventario
  inventario: () => ['inventario'] as const,
  inventarioPorProducto: (productoId: string | number) => ['inventario', String(productoId)] as const,

  // Supervisor / Admin
  supervisor: () => ['supervisor'] as const,
  supervisorMetricas: () => ['supervisor', 'metricas'] as const,
  supervisorEquipo: () => ['supervisor', 'equipo'] as const,

  // Notificaciones
  notificaciones: () => ['notificaciones'] as const,
  notificacionesUnread: () => ['notificaciones', 'unread'] as const,

  // Sync / counts
  pendingCount: () => ['sync', 'pending-count'] as const,
  pendingAttachmentCount: () => ['sync', 'pending-attachments'] as const,

  // Anuncios
  anuncios: () => ['anuncios'] as const,

  // Dashboard / home metrics
  dashboard: () => ['dashboard'] as const,
  dashboardMetrics: () => ['dashboard', 'metrics'] as const,

  // Pricing
  precios: () => ['precios'] as const,
  precioCliente: (clienteId: string | number, productoId: string | number) =>
    ['precios', 'cliente', String(clienteId), 'producto', String(productoId)] as const,
  descuentos: () => ['descuentos'] as const,
  promociones: () => ['promociones'] as const,
} as const;

// Type helper: extract a query key tuple type if needed externally.
export type QueryKey = ReturnType<
  | typeof queryKeys.me
  | typeof queryKeys.session
  | typeof queryKeys.empresa
  | typeof queryKeys.clients
  | typeof queryKeys.productos
  | typeof queryKeys.orders
  | typeof queryKeys.cobros
  | typeof queryKeys.rutas
  | typeof queryKeys.visitas
  | typeof queryKeys.inventario
  | typeof queryKeys.supervisor
  | typeof queryKeys.notificaciones
  | typeof queryKeys.dashboard
>;
