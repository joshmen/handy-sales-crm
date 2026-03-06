import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour, scheduleTourContinuation } from './types';

/** Orders, Inventory, Movements, Routes (all variants), Deliveries, Calendar, Visits */
export const operationTours: Record<string, TourConfig> = {
  '/orders': {
    id: 'orders-tour',
    title: 'Tour de Pedidos',
    description: 'Aprende a crear pedidos, darles seguimiento y gestionar su estado.',
    steps: [
      {
        element: '[data-tour="orders-search"]',
        popover: {
          title: 'Buscar pedidos',
          description:
            'Escribe el número de pedido o nombre del cliente para encontrarlo rápidamente. La búsqueda filtra en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-date-filter"]',
        popover: {
          title: 'Filtro de fechas',
          description:
            'Selecciona un rango de fechas para ver solo los pedidos de ese período. Por defecto muestra los últimos 30 días.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-estado-filter"]',
        popover: {
          title: 'Filtro por estado',
          description:
            'Filtra pedidos por su estado: Borrador, Pendiente, Confirmado, En proceso, Entregado o Cancelado.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-user-filter"]',
        popover: {
          title: 'Filtro por vendedor',
          description:
            'Filtra los pedidos por vendedor para ver el desempeño individual de tu equipo. Solo visible para administradores.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-tipo-filter"]',
        popover: {
          title: 'Tipo de venta',
          description:
            'Filtra entre Preventa (pedido que se entrega después) y Venta Directa (se entrega en el momento).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-table"]',
        popover: {
          title: 'Lista de pedidos',
          description:
            'Cada pedido muestra su número, cliente, vendedor, fecha, estado, tipo y total. Haz clic en los iconos de acción para ver detalles, editar o eliminar.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="orders-create-btn"]',
        popover: {
          title: 'Crear nuevo pedido',
          description:
            'Haz clic aquí para crear un pedido. Se abrirá un formulario donde seleccionas cliente, agregas productos y el sistema calcula totales automáticamente.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="orders-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="order-client-selector"]',
        popover: {
          title: 'Seleccionar cliente',
          description:
            'Primero selecciona el cliente que hace el pedido. Puedes buscar por nombre para encontrarlo rápidamente.',
          side: 'bottom',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="order-add-product"]',
        popover: {
          title: 'Agregar productos',
          description:
            'Busca un producto, define la cantidad y haz clic en "Agregar". Puedes agregar varios productos al mismo pedido.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-tour="order-products-list"]',
        popover: {
          title: 'Lista de productos',
          description:
            'Aquí aparecen los productos agregados con su cantidad, precio unitario y total. Puedes modificar cantidades o eliminar productos. El sistema calcula subtotal, IVA y total automáticamente.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="order-notes"]',
        popover: {
          title: 'Notas del pedido',
          description:
            'Agrega comentarios o instrucciones especiales para este pedido (dirección de entrega, horario preferido, etc.).',
          side: 'top',
          align: 'start',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
    ],
  },

  '/inventory': {
    id: 'inventory-tour',
    title: 'Tour del Inventario',
    description: 'Aprende a gestionar el inventario de tu almacén y monitorear niveles de stock.',
    steps: [
      {
        element: '[data-tour="inventory-import-export"]',
        popover: {
          title: 'Importar / Exportar',
          description:
            'Exporta tu inventario completo a CSV (producto, código de barra, cantidad, stock mín/máx). También puedes importar desde un CSV — si el producto ya tiene inventario, se actualizan sus valores.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="inventory-add-btn"]',
        popover: {
          title: 'Agregar al inventario',
          description:
            'Haz clic aquí para registrar un nuevo producto en el inventario con su cantidad inicial, stock mínimo y stock máximo.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="inventory-add-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="inventory-product-selector"]',
        popover: {
          title: 'Seleccionar producto',
          description:
            'Elige el producto que deseas agregar al inventario. Solo aparecen productos que aún no tienen registro de inventario. La búsqueda es por nombre o código de barra.',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="inventory-quantity"]',
        popover: {
          title: 'Cantidad actual',
          description:
            'Define cuántas unidades hay disponibles en el almacén. Este es el punto de partida; luego los movimientos (entradas, salidas, ajustes) actualizan este valor automáticamente.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-stock-fields"]',
        popover: {
          title: 'Stock mínimo y máximo',
          description:
            'El stock mínimo te alerta cuando el producto está por agotarse. El stock máximo te ayuda a evitar sobreinventario. Cuando las existencias caen al mínimo, la fila se marca en rojo.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Agregar" para registrar el producto en el inventario o "Cancelar" para descartar.',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
      {
        element: '[data-tour="inventory-search"]',
        popover: {
          title: 'Buscar en inventario',
          description:
            'Filtra la lista escribiendo el nombre o código del producto que buscas. La búsqueda se aplica en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-table"]',
        popover: {
          title: 'Tabla de inventario',
          description:
            'Cada fila muestra producto, unidad, existencias, stock mín/máx. Haz clic en una fila para editar sus valores. Los productos con stock bajo se resaltan con un indicador de alerta.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="inventory-stock-columns"]',
        popover: {
          title: 'Columnas de stock mín./máx.',
          description:
            'Configura estos valores para cada producto. Cuando las existencias bajan del mínimo aparece un triángulo de alerta. Usa esto para saber cuándo reabastecer.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/inventory/movements': {
    id: 'movements-tour',
    title: 'Tour de Movimientos',
    description: 'Aprende a registrar entradas, salidas y ajustes de inventario.',
    steps: [
      {
        element: '[data-tour="movements-export-btn"]',
        popover: {
          title: 'Exportar inventario',
          description:
            'Descarga tu inventario completo a CSV desde aquí. Útil para respaldos o análisis en Excel.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="movements-new-btn"]',
        popover: {
          title: 'Nuevo movimiento',
          description:
            'Registra una entrada (mercancía de proveedores), salida (venta a clientes) o ajuste (corrección por conteo físico).',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="movements-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="movements-product-selector"]',
        popover: {
          title: 'Seleccionar producto',
          description:
            'Elige el producto al que quieres registrar el movimiento. Se muestra su stock actual para que sepas cuánto hay disponible.',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="movements-type-selector"]',
        popover: {
          title: 'Tipo de movimiento',
          description:
            'Selecciona Entrada (llega mercancía al almacén), Salida (sale mercancía) o Ajuste (corrección de inventario). Si no hay existencias, "Salida" se desactiva automáticamente.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-quantity"]',
        popover: {
          title: 'Cantidad',
          description:
            'Define cuántas unidades entran, salen o se ajustan. El sistema te muestra la proyección del stock resultante en tiempo real.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-reason"]',
        popover: {
          title: 'Motivo del movimiento',
          description:
            'Cada tipo tiene motivos específicos: Entrada → Compra, Devolución, Transferencia. Salida → Venta, Merma, Devolución a proveedor. Ajuste → Ajuste de inventario, Merma.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Guardar" para registrar el movimiento. El inventario se actualizará automáticamente con la cantidad indicada.',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
      {
        element: '[data-tour="movements-search"]',
        popover: {
          title: 'Buscar movimientos',
          description:
            'Filtra el historial escribiendo el nombre del producto. La búsqueda se aplica en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-type-filter"]',
        popover: {
          title: 'Filtro por tipo',
          description:
            'Filtra movimientos por tipo: Entrada (llega mercancía), Salida (sale mercancía) o Ajuste (correcciones de inventario).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-reason-filter"]',
        popover: {
          title: 'Filtro por motivo',
          description:
            'Filtra por motivo específico: Compra, Venta, Devolución, Merma, Ajuste de inventario o Transferencia.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-table"]',
        popover: {
          title: 'Historial de movimientos',
          description:
            'Cada fila muestra fecha, producto, tipo, cantidad (verde +entrada, rojo -salida), stock anterior → nuevo, motivo y usuario. Usa los filtros para encontrar movimientos específicos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/routes': {
    id: 'routes-tour',
    title: 'Tour de Rutas',
    description: 'Aprende a asignar rutas de visita a tus vendedores y dar seguimiento a su progreso.',
    steps: [
      {
        element: '[data-tour="routes-export-btn"]',
        popover: {
          title: 'Exportar rutas',
          description:
            'Descarga todas tus rutas en un archivo CSV con nombre, fecha, vendedor, zona, estado, paradas y horarios. Útil para reportes y análisis.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-new-btn"]',
        popover: {
          title: 'Nueva ruta',
          description:
            'Crea una ruta de venta asignada a un vendedor. Define zona, fecha y horario estimado.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="routes-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="routes-drawer-nombre"]',
        popover: {
          title: 'Nombre de la ruta',
          description:
            'Escribe un nombre descriptivo para identificar la ruta (ej. "Ruta Centro - Lunes", "Zona Norte AM"). Máximo 100 caracteres.',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="routes-drawer-vendedor"]',
        popover: {
          title: 'Vendedor asignado',
          description:
            'Selecciona el vendedor que realizará esta ruta. Solo aparece al crear; al editar no se puede cambiar el vendedor.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-zona"]',
        popover: {
          title: 'Zona (opcional)',
          description:
            'Asigna una zona geográfica a la ruta. Esto ayuda a organizar las rutas por territorio y facilita los filtros.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-fecha"]',
        popover: {
          title: 'Fecha de la ruta',
          description:
            'Selecciona la fecha programada. Por defecto se usa la fecha de hoy. Formato yyyy-MM-dd.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-horario"]',
        popover: {
          title: 'Horario estimado',
          description:
            'Define la hora de inicio y fin estimadas para la ruta. Son opcionales y sirven para planificar la jornada del vendedor.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-drawer-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Crear ruta" para guardar o "Cancelar" para descartar los cambios.',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
      {
        element: '[data-tour="routes-filters"]',
        popover: {
          title: 'Filtros de búsqueda',
          description:
            'Filtra rutas por texto, estado (Planificada, En progreso, Completada, etc.), zona y vendedor asignado. Los administradores ven el filtro de vendedor.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivas',
          description:
            'Activa este switch para ver también las rutas desactivadas. Por defecto solo se muestran las activas.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-table"]',
        popover: {
          title: 'Tabla de rutas',
          description:
            'Cada ruta muestra nombre, zona, vendedor, fecha, estado, paradas completadas/total y toggle activo. Selecciona varias con los checkboxes para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/routes/manage': {
    id: 'routes-manage-tour',
    title: 'Tour de Administrar Rutas',
    description: 'Aprende a gestionar las rutas operativas: cargar inventario, dar seguimiento y cerrar rutas.',
    doneBtnText: 'Ir al detalle →',
    steps: [
      {
        element: '[data-tour="routes-manage-export-btn"]',
        popover: {
          title: 'Exportar rutas',
          description:
            'Descarga un CSV con todas las rutas incluyendo nombre, fecha, vendedor, zona, estado, paradas y horarios.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-manage-filters"]',
        popover: {
          title: 'Filtros de búsqueda',
          description:
            'Filtra rutas por fecha, vendedor y estado. Usa "+ Más filtros" para ver el filtro de estado con opciones: Planificada, En progreso, Terminada, Cancelada, Pend. aceptar, Carga aceptada o Cerrada.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-date-filter"]',
        popover: {
          title: 'Filtro por fecha',
          description:
            'Selecciona un rango de fechas (desde/hasta) para ver solo las rutas programadas en ese período.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-user-filter"]',
        popover: {
          title: 'Filtro por usuario',
          description:
            'Filtra las rutas por vendedor asignado para ver su carga de trabajo y seguimiento.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-estado-filter"]',
        popover: {
          title: 'Más filtros',
          description:
            'Haz clic aquí para mostrar u ocultar el filtro de estado. Permite acotar aún más los resultados por la etapa operativa de cada ruta.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-refresh"]',
        popover: {
          title: 'Actualizar lista',
          description:
            'Recarga la lista con los datos más recientes del servidor. Útil cuando otro usuario está modificando rutas en paralelo.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-manage-table"]',
        popover: {
          title: 'Lista de rutas operativas',
          description:
            'Cada fila muestra nombre, vendedor, zona, fecha, estado y progreso de paradas. Haz clic en cualquier fila para abrir su detalle operativo.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-manage-row"]',
        popover: {
          title: 'Abrir detalle de una ruta',
          description:
            'Haz clic en una ruta para administrarla. Según su estado: "Planificada" abre la pantalla de carga de inventario, "En progreso" o "Pend. aceptar" muestra el seguimiento, y "Terminada" abre el cierre donde reconcilias inventario y efectivo.',
          side: 'bottom',
          align: 'start',
          onNextClick: (driverObj: Driver) => {
            const row = document.querySelector('[data-tour="routes-manage-row"]') as HTMLElement;
            if (!row) return;
            // Detect if the route goes to close page (Terminada/Cerrada) or load page
            const badge = row.querySelector('.rounded-full');
            const badgeText = badge?.textContent?.trim() || '';
            const isClose = badgeText === 'Terminada' || badgeText === 'Cerrada';
            scheduleTourContinuation(isClose ? 'routes-close-tour' : 'routes-load-tour');
            driverObj.destroy();
            row.click();
          },
        },
      },
    ],
  },

  '/routes/manage/[id]/load': {
    id: 'routes-load-tour',
    title: 'Tour de Carga de Inventario',
    description: 'Aprende a cargar inventario a una ruta antes de que el vendedor salga a campo.',
    steps: [
      {
        element: '[data-tour="routes-load-stats"]',
        popover: {
          title: 'Resumen de la carga',
          description:
            'Indicadores en tiempo real: total de entregas, productos cargados y monto total asignado. Se actualizan automáticamente al agregar productos o pedidos.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-load-header-actions"]',
        popover: {
          title: 'Guardar y actualizar',
          description:
            'Usa "Guardar" para guardar el efectivo inicial y comentarios. El botón de refrescar recarga los datos de la ruta desde el servidor.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-load-user-section"]',
        popover: {
          title: 'Vendedor y efectivo inicial',
          description:
            'Muestra el vendedor asignado a la ruta. Define el monto de efectivo inicial (viáticos/cambio) y comentarios para el vendedor.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-pedidos"]',
        popover: {
          title: 'Pedidos para entrega',
          description:
            'Pedidos confirmados que el vendedor debe entregar en su ruta. Sus productos se suman automáticamente a la carga. Usa "Agregar pedidos" para asignar pedidos del catálogo.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-add-products"]',
        popover: {
          title: 'Productos para venta directa',
          description:
            'Agrega productos adicionales para que el vendedor los lleve y venda directamente (sin pedido previo). Selecciona producto, cantidad y precio unitario.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-consolidated"]',
        popover: {
          title: 'Tabla consolidada de carga',
          description:
            'Resumen de TODO lo que se cargará: cantidad asignada para entrega, para venta directa, total, disponibilidad en almacén, precio y monto total. Si "Disponible" se muestra en rojo, no hay suficiente stock.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-load-submit"]',
        popover: {
          title: 'Enviar a carga',
          description:
            'Cuando todo esté listo, haz clic aquí para confirmar la carga y enviarla al vendedor. Recibirá una notificación en su app móvil para aceptar la carga.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },

  '/routes/manage/[id]/close': {
    id: 'routes-close-tour',
    title: 'Tour de Cierre de Ruta',
    description: 'Aprende a cerrar una ruta: reconciliar inventario, verificar efectivo y registrar devoluciones.',
    steps: [
      {
        element: '[data-tour="routes-close-tabs"]',
        popover: {
          title: 'Pestañas de estado',
          description:
            'Las pestañas reflejan la etapa de la ruta: Pendiente de aceptar, Carga aceptada, Terminada y Cerrada. La pestaña activa se selecciona automáticamente según el estado de la ruta.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-details"]',
        popover: {
          title: 'Detalles de la ruta',
          description:
            'Información del vendedor asignado, nombre de la ruta, zona geográfica y fecha de creación. Proporciona el contexto completo de la operación.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-financial"]',
        popover: {
          title: 'Resumen financiero',
          description:
            'Tres tarjetas: Efectivo entrante (ventas contado + entregas cobradas + cobranza), Movimientos a saldo (ventas crédito + entregas crédito) y Otros movimientos (preventas + devoluciones). Muestra el desglose completo de la operación.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-balance"]',
        popover: {
          title: 'Balance: Al inicio vs Al cierre',
          description:
            'Compara el valor de la ruta y efectivo inicial contra el monto a recibir, lo recibido y la diferencia. Un diferencia positiva (verde) indica sobrante, negativa (rojo) indica faltante.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-inventory"]',
        popover: {
          title: 'Inventario de retorno',
          description:
            'Tabla de reconciliación producto por producto: cantidad inicial, vendidos, entregados, devueltos, mermas, recibido a almacén y en vehículo. El sistema calcula la diferencia automáticamente — debe ser 0 al cerrar.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-actions"]',
        popover: {
          title: 'Acciones de inventario',
          description:
            'Botones rápidos: "Almacén" envía toda la diferencia a recepción de almacén, "Carga" la deja en el vehículo para la siguiente ruta. Ajusta con los steppers (+/-) de cada fila.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-btn"]',
        popover: {
          title: 'Cerrar ruta',
          description:
            'Cuando toda la reconciliación esté completa y hayas ingresado el monto recibido, haz clic aquí para cerrar la ruta definitivamente. Esta acción no se puede deshacer.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },

  '/deliveries': {
    id: 'deliveries-tour',
    title: 'Tour de Entregas',
    description: 'Aprende a dar seguimiento a las entregas de tus rutas de venta.',
    steps: [
      {
        element: '[data-tour="deliveries-stats"]',
        popover: {
          title: 'Indicadores de entregas',
          description:
            'Tarjetas resumen: entregas en progreso, completadas, pendientes y porcentaje de completado. Te dan una visión rápida del estado de tus entregas.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="deliveries-search"]',
        popover: {
          title: 'Buscar entregas',
          description:
            'Escribe el nombre de la ruta o del vendedor para filtrar la lista de entregas.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="deliveries-status-filter"]',
        popover: {
          title: 'Filtro por estado',
          description:
            'Filtra entregas por estado: En progreso, Completada, Pendiente o Cancelada.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="deliveries-table"]',
        popover: {
          title: 'Tabla de entregas',
          description:
            'Cada fila muestra la ruta, vendedor, progreso de paradas y estado. Usa los botones de acción para iniciar, completar o cancelar entregas.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="deliveries-refresh"]',
        popover: {
          title: 'Actualizar',
          description:
            'Recarga los datos de entregas para ver el estado más reciente.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },

  '/calendar': {
    id: 'calendar-tour',
    title: 'Tour del Calendario',
    description: 'Aprende a programar visitas a clientes y gestionar la agenda de tus vendedores.',
    steps: [
      {
        element: '[data-tour="calendar-schedule-visit"]',
        popover: {
          title: 'Programar visita',
          description:
            'Haz clic aquí para programar una nueva visita. Selecciona vendedor, cliente, fecha y hora.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="calendar-prospect-rules"]',
        popover: {
          title: 'Reglas de nuevos prospectos',
          description:
            'Configura reglas automáticas para programar visitas a clientes nuevos o sin actividad reciente.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="calendar-user-filter"]',
        popover: {
          title: 'Filtro por vendedor',
          description:
            'Selecciona un vendedor para ver solo sus visitas programadas en el calendario.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="calendar-nav"]',
        popover: {
          title: 'Navegación del calendario',
          description:
            'Usa las flechas para moverte entre meses. También puedes cambiar entre vista semanal y diaria.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="calendar-view"]',
        popover: {
          title: 'Vista del calendario',
          description:
            'Las visitas programadas aparecen como eventos en el calendario. Haz clic en un día para ver el detalle o agregar una nueva visita.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/visits': {
    id: 'visits-tour',
    title: 'Tour de Visitas',
    description: 'Aprende a gestionar el historial de visitas a clientes y registrar resultados.',
    steps: [
      {
        element: '[data-tour="visits-summary"]',
        popover: {
          title: 'Resumen del día',
          description:
            'KPIs de visitas: total programadas, completadas, con venta, pendientes y tasa de conversión.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-list"]',
        popover: {
          title: 'Lista de visitas',
          description:
            'Todas las visitas con su estado, cliente y resultado. Haz clic en una fila para ver los detalles. Desde ahí puedes iniciar (check-in) o finalizar (check-out) la visita.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-view-toggle"]',
        popover: {
          title: 'Vista de calendario',
          description:
            'Alterna entre vista de lista y calendario. En el calendario puedes hacer clic en un día para programar una visita.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-create"]',
        popover: {
          title: 'Programar visita',
          description:
            'Abre el formulario para programar una nueva visita.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="visits-create"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="visits-form-client"]',
        popover: {
          title: 'Seleccionar cliente',
          description:
            'Busca y selecciona el cliente que vas a visitar. Es el único campo obligatorio.',
          side: 'left',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="visits-form-type"]',
        popover: {
          title: 'Tipo de visita',
          description:
            'Selecciona el motivo: Rutina (visita regular), Cobranza, Entrega, Prospección, Seguimiento u Otro.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="visits-form-date"]',
        popover: {
          title: 'Fecha programada',
          description:
            'Selecciona fecha y hora. Deja vacío para visita inmediata (se registrará con la fecha de hoy).',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="visits-form-actions"]',
        popover: {
          title: 'Guardar o cancelar',
          description:
            'Haz clic en "Programar Visita" para guardar o "Cancelar" para descartar.',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
    ],
  },

  '/automations': {
    id: 'automations-tour',
    title: 'Tour de Automatizaciones',
    description: 'Aprende a activar recetas automáticas para que el sistema trabaje por ti.',
    steps: [
      {
        element: '[data-tour="automations-kpis"]',
        popover: {
          title: 'Resumen de automatizaciones',
          description:
            'Estas tarjetas muestran cuántas automatizaciones tienes activas, cuántas veces se han ejecutado y cuándo fue la última ejecución.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="automations-categories"]',
        popover: {
          title: 'Categorías',
          description:
            'Filtra las automatizaciones por tipo: Cobranza (recordatorios de pago), Ventas (clientes nuevos), Inventario (stock bajo) y Operación (resúmenes diarios).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="automations-grid"]',
        popover: {
          title: 'Recetas disponibles',
          description:
            'Cada tarjeta es una automatización. El ícono de persona indica a quién notifica: <b>Admin</b>, <b>Vendedores</b> o <b>Todos</b>. El sistema elige automáticamente si envía push (alertas) o email (reportes).',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="automations-toggle"]',
        popover: {
          title: 'Activar / Desactivar',
          description:
            'Usa el interruptor para activar o desactivar una automatización. Al activarla, el sistema empezará a ejecutarla automáticamente según su programación.',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '[data-tour="automations-config-btn"]',
        popover: {
          title: 'Configurar parámetros',
          description:
            'Haz clic en el engranaje para abrir la configuración. Veamos qué puedes ajustar dentro.',
          side: 'left',
          align: 'center',
          onNextClick: (driverObj: Driver) => {
            const btn = document.querySelector('[data-tour="automations-config-btn"]') as HTMLElement;
            btn?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      // ── DRAWER OPEN ──
      {
        element: '[data-tour="automations-drawer-desc"]',
        popover: {
          title: 'Descripción de la receta',
          description:
            'Aquí se describe exactamente qué hace esta automatización: cuándo se ejecuta, qué condición detecta y qué acción toma.',
          side: 'bottom',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="automations-drawer-form"]',
        popover: {
          title: 'Parámetros configurables',
          description:
            'Ajusta umbrales, frecuencias, horarios y especialmente <b>a quién notificar</b>: solo al administrador, solo a los vendedores, o a ambos. Cada automatización tiene parámetros distintos según su función.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="automations-drawer-actions"]',
        popover: {
          title: 'Guardar configuración',
          description:
            'Haz clic en "Guardar cambios" para aplicar tus ajustes. Los cambios se reflejan en la próxima ejecución de la automatización.',
          side: 'top',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      // ── DRAWER CLOSE ──
      {
        element: '[data-tour="automations-historial"]',
        popover: {
          title: 'Historial de ejecuciones',
          description:
            'Aquí puedes ver cuándo se ejecutó cada automatización y si fue exitosa. Muestra la acción tomada y cualquier error que haya ocurrido.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/cobranza': {
    id: 'cobranza-tour',
    title: 'Tour de Cobranza',
    description: 'Aprende a registrar cobros, revisar quién te debe y exportar tu cartera.',
    steps: [
      {
        element: '[data-tour="cobranza-kpis"]',
        popover: {
          title: 'Resumen de tu cartera',
          description:
            'Estas tarjetas muestran el resumen de tu cartera: cuánto se ha vendido, cuánto ya cobraste, cuánto falta por cobrar, y cuántos clientes tienen deuda.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="cobranza-date-filter"]',
        popover: {
          title: 'Filtro por período',
          description:
            'Selecciona un rango de fechas para consultar los cobros y saldos de ese período. Presiona Actualizar para aplicar.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="cobranza-new-btn"]',
        popover: {
          title: 'Registrar un cobro',
          description:
            'Haz clic aquí para registrar un pago de un cliente. Selecciona el cliente, su pedido pendiente, monto y método de pago.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            (document.querySelector('[data-tour="cobranza-new-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '[data-tour="cobro-client-selector"]',
        popover: {
          title: 'Seleccionar cliente',
          description:
            'Selecciona el cliente que hizo el pago. Se cargan automáticamente sus pedidos con saldo pendiente.',
          side: 'bottom',
          align: 'start',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
        },
      },
      {
        element: '[data-tour="cobro-pedido-selector"]',
        popover: {
          title: 'Pedido pendiente',
          description:
            'Al seleccionar un pedido, el monto se llena automáticamente con el saldo pendiente. Si el cliente tiene varios pedidos, puedes buscar por número.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="cobro-amount-method"]',
        popover: {
          title: 'Monto y método de pago',
          description:
            'Confirma el monto a cobrar y selecciona el método de pago (Efectivo, Transferencia, Cheque, Tarjeta). También puedes agregar fecha, referencia y notas.',
          side: 'top',
          align: 'start',
          onNextClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="cobranza-tabs"]',
        popover: {
          title: 'Vistas disponibles',
          description:
            'Usa estas pestañas para cambiar entre el historial de cobros recibidos y la lista de clientes que te deben dinero.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: Driver) => {
            // Switch to cobros tab before showing cobros table
            (document.querySelector('[data-tour="cobranza-tabs"] button:first-child') as HTMLElement)?.click();
            setTimeout(() => driverObj.moveNext(), 200);
          },
        },
      },
      {
        element: '[data-tour="cobranza-cobros-table"]',
        popover: {
          title: 'Historial de cobros',
          description:
            'Historial completo de pagos recibidos. Puedes ordenar por fecha, cliente o monto. Haz clic en el ojo para ver el estado de cuenta del cliente.',
          side: 'top',
          align: 'center',
          onNextClick: (driverObj: Driver) => {
            // Switch to saldos tab before showing saldos table
            (document.querySelector('[data-tour="cobranza-tabs"] button:last-child') as HTMLElement)?.click();
            setTimeout(() => driverObj.moveNext(), 200);
          },
        },
      },
      {
        element: '[data-tour="cobranza-saldos-table"]',
        popover: {
          title: '¿Quién te debe?',
          description:
            'Muestra cada cliente con su deuda pendiente y una barra de avance hacia el pago completo. Haz clic en un cliente para ver su estado de cuenta detallado por pedido.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
  '/reports': {
    id: 'reports-tour',
    title: 'Tour de Reportes',
    description: 'Conoce los reportes de ventas, clientes e inventario disponibles.',
    steps: [
      {
        element: '[data-tour="reports-cards"]',
        popover: {
          title: 'Catálogo de reportes',
          description:
            'Aquí están todos los reportes organizados por categoría: Ventas, Clientes e Inventario. Haz clic en cualquier tarjeta para ver el reporte completo con gráficas y tablas.',
          side: 'bottom',
          align: 'center',
        },
      },
    ],
  },
};
