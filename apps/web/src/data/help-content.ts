export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
}

export interface HelpPage {
  title: string;
  description: string;
  articles: HelpArticle[];
}

export const helpPages: Record<string, HelpPage> = {
  '/dashboard': {
    title: 'dashboard.title',
    description: 'dashboard.desc',
    articles: [
      {
        id: 'dashboard-overview',
        title: 'dashboard.dashboardOverview.title',
        summary: 'dashboard.dashboardOverview.summary',
        body: 'dashboard.dashboardOverview.body',
      },
      {
        id: 'navegacion',
        title: 'dashboard.navegacion.title',
        summary: 'dashboard.navegacion.summary',
        body: 'dashboard.navegacion.body',
      },
      {
        id: 'help-system',
        title: 'dashboard.helpSystem.title',
        summary: 'dashboard.helpSystem.summary',
        body: 'dashboard.helpSystem.body',
      },
    ],
  },
  '/inventory': {
    title: 'inventory.title',
    description: 'inventory.desc',
    articles: [
      {
        id: 'que-es-inventario',
        title: 'inventory.queEsInventario.title',
        summary: 'inventory.queEsInventario.summary',
        body: 'inventory.queEsInventario.body',
      },
      {
        id: 'stock-minimo-maximo',
        title: 'inventory.stockMinimoMaximo.title',
        summary: 'inventory.stockMinimoMaximo.summary',
        body: 'inventory.stockMinimoMaximo.body',
      },
      {
        id: 'estados-stock',
        title: 'inventory.estadosStock.title',
        summary: 'inventory.estadosStock.summary',
        body: 'inventory.estadosStock.body',
      },
      {
        id: 'existencias-totales',
        title: 'inventory.existenciasTotales.title',
        summary: 'inventory.existenciasTotales.summary',
        body: 'inventory.existenciasTotales.body',
      },
    ],
  },
  '/inventory/movements': {
    title: 'inventoryMovements.title',
    description: 'inventoryMovements.desc',
    articles: [
      {
        id: 'tipos-movimiento',
        title: 'inventoryMovements.tiposMovimiento.title',
        summary: 'inventoryMovements.tiposMovimiento.summary',
        body: 'inventoryMovements.tiposMovimiento.body',
      },
      {
        id: 'cuando-usar',
        title: 'inventoryMovements.cuandoUsar.title',
        summary: 'inventoryMovements.cuandoUsar.summary',
        body: 'inventoryMovements.cuandoUsar.body',
      },
      {
        id: 'referencia-movimiento',
        title: 'inventoryMovements.referenciaMovimiento.title',
        summary: 'inventoryMovements.referenciaMovimiento.summary',
        body: 'inventoryMovements.referenciaMovimiento.body',
      },
    ],
  },
  '/promotions': {
    title: 'promotions.title',
    description: 'promotions.desc',
    articles: [
      {
        id: 'como-funcionan',
        title: 'promotions.comoFuncionan.title',
        summary: 'promotions.comoFuncionan.summary',
        body: 'promotions.comoFuncionan.body',
      },
      {
        id: 'traslape-fechas',
        title: 'promotions.traslapeFechas.title',
        summary: 'promotions.traslapeFechas.summary',
        body: 'promotions.traslapeFechas.body',
      },
      {
        id: 'importar-exportar-promociones',
        title: 'promotions.importarExportarPromociones.title',
        summary: 'promotions.importarExportarPromociones.summary',
        body: 'promotions.importarExportarPromociones.body',
      },
    ],
  },
  '/products': {
    title: 'products.title',
    description: 'products.desc',
    articles: [
      {
        id: 'unidad-medida',
        title: 'products.unidadMedida.title',
        summary: 'products.unidadMedida.summary',
        body: 'products.unidadMedida.body',
      },
      {
        id: 'codigo-barras',
        title: 'products.codigoBarras.title',
        summary: 'products.codigoBarras.summary',
        body: 'products.codigoBarras.body',
      },
      {
        id: 'categorias-familias',
        title: 'products.categoriasFamilias.title',
        summary: 'products.categoriasFamilias.summary',
        body: 'products.categoriasFamilias.body',
      },
      {
        id: 'importar-productos',
        title: 'products.importarProductos.title',
        summary: 'products.importarProductos.summary',
        body: 'products.importarProductos.body',
      },
    ],
  },
  '/clients': {
    title: 'clients.title',
    description: 'clients.desc',
    articles: [
      {
        id: 'categorias-clientes',
        title: 'clients.categoriasClientes.title',
        summary: 'clients.categoriasClientes.summary',
        body: 'clients.categoriasClientes.body',
      },
      {
        id: 'zonas',
        title: 'clients.zonas.title',
        summary: 'clients.zonas.summary',
        body: 'clients.zonas.body',
      },
    ],
  },
  '/clients/new': {
    title: 'clientsNew.title',
    description: 'clientsNew.desc',
    articles: [
      {
        id: 'campos-obligatorios',
        title: 'clientsNew.camposObligatorios.title',
        summary: 'clientsNew.camposObligatorios.summary',
        body: 'clientsNew.camposObligatorios.body',
      },
      {
        id: 'datos-fiscales',
        title: 'clientsNew.datosFiscales.title',
        summary: 'clientsNew.datosFiscales.summary',
        body: 'clientsNew.datosFiscales.body',
      },
      {
        id: 'mapa-ubicacion',
        title: 'clientsNew.mapaUbicacion.title',
        summary: 'clientsNew.mapaUbicacion.summary',
        body: 'clientsNew.mapaUbicacion.body',
      },
    ],
  },
  '/zones': {
    title: 'zones.title',
    description: 'zones.desc',
    articles: [
      {
        id: 'que-son-zonas',
        title: 'zones.queSonZonas.title',
        summary: 'zones.queSonZonas.summary',
        body: 'zones.queSonZonas.body',
      },
      {
        id: 'mapa-zonas',
        title: 'zones.mapaZonas.title',
        summary: 'zones.mapaZonas.summary',
        body: 'zones.mapaZonas.body',
      },
      {
        id: 'asignar-clientes',
        title: 'zones.asignarClientes.title',
        summary: 'zones.asignarClientes.summary',
        body: 'zones.asignarClientes.body',
      },
    ],
  },
  '/client-categories': {
    title: 'clientCategories.title',
    description: 'clientCategories.desc',
    articles: [
      {
        id: 'que-son-categorias',
        title: 'clientCategories.queSonCategorias.title',
        summary: 'clientCategories.queSonCategorias.summary',
        body: 'clientCategories.queSonCategorias.body',
      },
      {
        id: 'crear-categoria',
        title: 'clientCategories.crearCategoria.title',
        summary: 'clientCategories.crearCategoria.summary',
        body: 'clientCategories.crearCategoria.body',
      },
      {
        id: 'importar-categorias',
        title: 'clientCategories.importarCategorias.title',
        summary: 'clientCategories.importarCategorias.summary',
        body: 'clientCategories.importarCategorias.body',
      },
    ],
  },
  '/product-categories': {
    title: 'productCategories.title',
    description: 'productCategories.desc',
    articles: [
      {
        id: 'que-son-categorias-productos',
        title: 'productCategories.queSonCategoriasProductos.title',
        summary: 'productCategories.queSonCategoriasProductos.summary',
        body: 'productCategories.queSonCategoriasProductos.body',
      },
      {
        id: 'crear-categoria-producto',
        title: 'productCategories.crearCategoriaProducto.title',
        summary: 'productCategories.crearCategoriaProducto.summary',
        body: 'productCategories.crearCategoriaProducto.body',
      },
      {
        id: 'importar-categorias-productos',
        title: 'productCategories.importarCategoriasProductos.title',
        summary: 'productCategories.importarCategoriasProductos.summary',
        body: 'productCategories.importarCategoriasProductos.body',
      },
    ],
  },
  '/product-families': {
    title: 'productFamilies.title',
    description: 'productFamilies.desc',
    articles: [
      {
        id: 'que-son-familias',
        title: 'productFamilies.queSonFamilias.title',
        summary: 'productFamilies.queSonFamilias.summary',
        body: 'productFamilies.queSonFamilias.body',
      },
      {
        id: 'crear-familia',
        title: 'productFamilies.crearFamilia.title',
        summary: 'productFamilies.crearFamilia.summary',
        body: 'productFamilies.crearFamilia.body',
      },
      {
        id: 'importar-familias',
        title: 'productFamilies.importarFamilias.title',
        summary: 'productFamilies.importarFamilias.summary',
        body: 'productFamilies.importarFamilias.body',
      },
    ],
  },
  '/units': {
    title: 'units.title',
    description: 'units.desc',
    articles: [
      {
        id: 'que-son-unidades',
        title: 'units.queSonUnidades.title',
        summary: 'units.queSonUnidades.summary',
        body: 'units.queSonUnidades.body',
      },
      {
        id: 'crear-unidad',
        title: 'units.crearUnidad.title',
        summary: 'units.crearUnidad.summary',
        body: 'units.crearUnidad.body',
      },
      {
        id: 'importar-unidades',
        title: 'units.importarUnidades.title',
        summary: 'units.importarUnidades.summary',
        body: 'units.importarUnidades.body',
      },
    ],
  },
  '/price-lists': {
    title: 'priceLists.title',
    description: 'priceLists.desc',
    articles: [
      {
        id: 'que-son-listas',
        title: 'priceLists.queSonListas.title',
        summary: 'priceLists.queSonListas.summary',
        body: 'priceLists.queSonListas.body',
      },
      {
        id: 'crear-lista',
        title: 'priceLists.crearLista.title',
        summary: 'priceLists.crearLista.summary',
        body: 'priceLists.crearLista.body',
      },
      {
        id: 'importar-listas',
        title: 'priceLists.importarListas.title',
        summary: 'priceLists.importarListas.summary',
        body: 'priceLists.importarListas.body',
      },
    ],
  },
  '/discounts': {
    title: 'discounts.title',
    description: 'discounts.desc',
    articles: [
      {
        id: 'como-funcionan-descuentos',
        title: 'discounts.comoFuncionanDescuentos.title',
        summary: 'discounts.comoFuncionanDescuentos.summary',
        body: 'discounts.comoFuncionanDescuentos.body',
      },
      {
        id: 'como-crear-descuento',
        title: 'discounts.comoCrearDescuento.title',
        summary: 'discounts.comoCrearDescuento.summary',
        body: 'discounts.comoCrearDescuento.body',
      },
      {
        id: 'importar-exportar-descuentos',
        title: 'discounts.importarExportarDescuentos.title',
        summary: 'discounts.importarExportarDescuentos.summary',
        body: 'discounts.importarExportarDescuentos.body',
      },
    ],
  },
  '/routes': {
    title: 'routes.title',
    description: 'routes.desc',
    articles: [
      {
        id: 'que-son-rutas',
        title: 'routes.queSonRutas.title',
        summary: 'routes.queSonRutas.summary',
        body: 'routes.queSonRutas.body',
      },
      {
        id: 'crear-ruta',
        title: 'routes.crearRuta.title',
        summary: 'routes.crearRuta.summary',
        body: 'routes.crearRuta.body',
      },
      {
        id: 'exportar-rutas',
        title: 'routes.exportarRutas.title',
        summary: 'routes.exportarRutas.summary',
        body: 'routes.exportarRutas.body',
      },
    ],
  },
  '/routes/manage': {
    title: 'routesManage.title',
    description: 'routesManage.desc',
    articles: [
      {
        id: 'que-es-admin-rutas',
        title: 'routesManage.queEsAdminRutas.title',
        summary: 'routesManage.queEsAdminRutas.summary',
        body: 'routesManage.queEsAdminRutas.body',
      },
      {
        id: 'flujo-ruta',
        title: 'routesManage.flujoRuta.title',
        summary: 'routesManage.flujoRuta.summary',
        body: 'routesManage.flujoRuta.body',
      },
      {
        id: 'exportar-admin-rutas',
        title: 'routesManage.exportarAdminRutas.title',
        summary: 'routesManage.exportarAdminRutas.summary',
        body: 'routesManage.exportarAdminRutas.body',
      },
    ],
  },
  '/routes/manage/[id]/load': {
    title: 'routesLoad.title',
    description: 'routesLoad.desc',
    articles: [
      {
        id: 'como-cargar-ruta',
        title: 'routesLoad.comoCargarRuta.title',
        summary: 'routesLoad.comoCargarRuta.summary',
        body: 'routesLoad.comoCargarRuta.body',
      },
      {
        id: 'tipos-carga',
        title: 'routesLoad.tiposCarga.title',
        summary: 'routesLoad.tiposCarga.summary',
        body: 'routesLoad.tiposCarga.body',
      },
      {
        id: 'disponibilidad-stock',
        title: 'routesLoad.disponibilidadStock.title',
        summary: 'routesLoad.disponibilidadStock.summary',
        body: 'routesLoad.disponibilidadStock.body',
      },
    ],
  },
  '/routes/manage/[id]/close': {
    title: 'routesClose.title',
    description: 'routesClose.desc',
    articles: [
      {
        id: 'como-cerrar-ruta',
        title: 'routesClose.comoCerrarRuta.title',
        summary: 'routesClose.comoCerrarRuta.summary',
        body: 'routesClose.comoCerrarRuta.body',
      },
      {
        id: 'inventario-retorno',
        title: 'routesClose.inventarioRetorno.title',
        summary: 'routesClose.inventarioRetorno.summary',
        body: 'routesClose.inventarioRetorno.body',
      },
      {
        id: 'diferencia-financiera',
        title: 'routesClose.diferenciaFinanciera.title',
        summary: 'routesClose.diferenciaFinanciera.summary',
        body: 'routesClose.diferenciaFinanciera.body',
      },
    ],
  },
  '/cobranza': {
    title: 'cobranza.title',
    description: 'cobranza.desc',
    articles: [
      {
        id: 'que-es-cobranza',
        title: 'cobranza.queEsCobranza.title',
        summary: 'cobranza.queEsCobranza.summary',
        body: 'cobranza.queEsCobranza.body',
      },
      {
        id: 'estado-cuenta',
        title: 'cobranza.estadoCuenta.title',
        summary: 'cobranza.estadoCuenta.summary',
        body: 'cobranza.estadoCuenta.body',
      },
      {
        id: 'exportar-cobros',
        title: 'cobranza.exportarCobros.title',
        summary: 'cobranza.exportarCobros.summary',
        body: 'cobranza.exportarCobros.body',
      },
    ],
  },
  '/orders': {
    title: 'orders.title',
    description: 'orders.desc',
    articles: [
      {
        id: 'tipos-venta',
        title: 'orders.tiposVenta.title',
        summary: 'orders.tiposVenta.summary',
        body: 'orders.tiposVenta.body',
      },
      {
        id: 'estados-pedido',
        title: 'orders.estadosPedido.title',
        summary: 'orders.estadosPedido.summary',
        body: 'orders.estadosPedido.body',
      },
      {
        id: 'crear-pedido',
        title: 'orders.crearPedido.title',
        summary: 'orders.crearPedido.summary',
        body: 'orders.crearPedido.body',
      },
      {
        id: 'filtros-pedidos',
        title: 'orders.filtrosPedidos.title',
        summary: 'orders.filtrosPedidos.summary',
        body: 'orders.filtrosPedidos.body',
      },
    ],
  },
  '/automations': {
    title: 'automations.title',
    description: 'automations.desc',
    articles: [
      {
        id: 'que-son-automatizaciones',
        title: 'automations.queSonAutomatizaciones.title',
        summary: 'automations.queSonAutomatizaciones.summary',
        body: 'automations.queSonAutomatizaciones.body',
      },
      {
        id: 'como-activar',
        title: 'automations.comoActivar.title',
        summary: 'automations.comoActivar.summary',
        body: 'automations.comoActivar.body',
      },
      {
        id: 'destinatario-y-canales',
        title: 'automations.destinatarioYCanales.title',
        summary: 'automations.destinatarioYCanales.summary',
        body: 'automations.destinatarioYCanales.body',
      },
      {
        id: 'categorias',
        title: 'automations.categorias.title',
        summary: 'automations.categorias.summary',
        body: 'automations.categorias.body',
      },
      {
        id: 'historial',
        title: 'automations.historial.title',
        summary: 'automations.historial.summary',
        body: 'automations.historial.body',
      },
    ],
  },
  '/visits': {
    title: 'visits.title',
    description: 'visits.desc',
    articles: [
      {
        id: 'visits-overview',
        title: 'visits.visitsOverview.title',
        summary: 'visits.visitsOverview.summary',
        body: 'visits.visitsOverview.body',
      },
      {
        id: 'visits-checkin-checkout',
        title: 'visits.visitsCheckinCheckout.title',
        summary: 'visits.visitsCheckinCheckout.summary',
        body: 'visits.visitsCheckinCheckout.body',
      },
      {
        id: 'visits-calendar',
        title: 'visits.visitsCalendar.title',
        summary: 'visits.visitsCalendar.summary',
        body: 'visits.visitsCalendar.body',
      },
      {
        id: 'visits-filters',
        title: 'visits.visitsFilters.title',
        summary: 'visits.visitsFilters.summary',
        body: 'visits.visitsFilters.body',
      },
    ],
  },
  '/reports': {
    title: 'reports.title',
    description: 'reports.desc',
    articles: [
      {
        id: 'reports-overview',
        title: 'reports.reportsOverview.title',
        summary: 'reports.reportsOverview.summary',
        body: 'reports.reportsOverview.body',
      },
      {
        id: 'reports-filters',
        title: 'reports.reportsFilters.title',
        summary: 'reports.reportsFilters.summary',
        body: 'reports.reportsFilters.body',
      },
      {
        id: 'reports-charts',
        title: 'reports.reportsCharts.title',
        summary: 'reports.reportsCharts.summary',
        body: 'reports.reportsCharts.body',
      },
      {
        id: 'reports-tables',
        title: 'reports.reportsTables.title',
        summary: 'reports.reportsTables.summary',
        body: 'reports.reportsTables.body',
      },
    ],
  },
};

export const tooltips: Record<string, string> = {
  // Inventory
  'min-stock': 'tooltips.minStock',
  'max-stock': 'tooltips.maxStock',
  'total-quantity': 'tooltips.totalQuantity',
  'warehouse-quantity': 'tooltips.warehouseQuantity',
  'route-quantity': 'tooltips.routeQuantity',

  // Movements
  'movement-type': 'tooltips.movementType',
  'movement-reference': 'tooltips.movementReference',
  'movement-quantity': 'tooltips.movementQuantity',

  // Promotions
  'discount-type': 'tooltips.discountType',
  'promo-dates': 'tooltips.promoDates',
  'promo-products': 'tooltips.promoProducts',

  // Products
  'unit-of-measure': 'tooltips.unitOfMeasure',
  'barcode': 'tooltips.barcode',
  'product-category': 'tooltips.productCategory',
  'product-family': 'tooltips.productFamily',

  // Cobranza
  'cobranza-total-vendido': 'tooltips.cobranzaTotalVendido',
  'cobranza-cobrado': 'tooltips.cobranzaCobrado',
  'cobranza-por-cobrar': 'tooltips.cobranzaPorCobrar',
  'cobranza-clientes-deben': 'tooltips.cobranzaClientesDeben',
};
