import { TourConfig, boostDrawerForTour, closeDrawerForTour } from './types';

/** Orders, Inventory, Movements, Routes (all variants), Deliveries, Calendar, Visits */
export const operationTours: Record<string, TourConfig> = {
  '/orders': {
    id: 'orders-tour',
    title: 'Tour de Pedidos',
    description: 'Aprende a crear pedidos, darles seguimiento y gestionar su estado.',
    steps: [
      {
        element: '[data-tour="orders-create-btn"]',
        popover: {
          title: 'Crear nuevo pedido',
          description:
            'Haz clic aquí para crear un pedido. Selecciona un cliente, agrega productos con cantidades y precios, y el sistema calculará totales automáticamente.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: any) => {
            (document.querySelector('[data-tour="orders-create-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        popover: {
          title: 'Formulario de nuevo pedido',
          description:
            'Selecciona el cliente, agrega productos con cantidades, define prioridad y método de pago. El sistema calcula subtotales, IVA y total automáticamente.',
          side: 'over',
          onPrevClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
          onNextClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="orders-date-filter"]',
        popover: {
          title: 'Filtro de fechas',
          description:
            'Selecciona un rango de fechas para ver solo los pedidos de ese período. Por defecto muestra los del día actual.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-user-filter"]',
        popover: {
          title: 'Filtro por vendedor',
          description:
            'Filtra los pedidos por vendedor para ver el desempeño individual de tu equipo.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="orders-search"]',
        popover: {
          title: 'Buscar por número de pedido',
          description:
            'Escribe el número de pedido para encontrarlo rápidamente.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="orders-table"]',
        popover: {
          title: 'Lista de pedidos',
          description:
            'Cada pedido muestra su número, cliente, vendedor, fecha, estado y total. Los estados pueden ser: Borrador, Pendiente, Confirmado, En proceso, Entregado o Cancelado.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="orders-total"]',
        popover: {
          title: 'Total de pedidos',
          description:
            'Aquí ves la cantidad total de pedidos y el monto acumulado del período seleccionado.',
          side: 'bottom',
          align: 'start',
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
        element: '[data-tour="inventory-add-btn"]',
        popover: {
          title: 'Agregar al inventario',
          description:
            'Haz clic aquí para registrar un nuevo producto en el inventario con su cantidad inicial, stock mínimo y stock máximo.',
          side: 'bottom',
          align: 'end',
          onNextClick: (driverObj: any) => {
            (document.querySelector('[data-tour="inventory-add-btn"]') as HTMLElement)?.click();
            setTimeout(() => {
              boostDrawerForTour();
              driverObj.moveNext();
            }, 400);
          },
        },
      },
      {
        popover: {
          title: 'Formulario de inventario',
          description:
            'Selecciona el producto, define la cantidad inicial, stock mínimo y stock máximo para mantener control de tu almacén.',
          side: 'over',
          onPrevClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
          onNextClick: (driverObj: any) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.moveNext(), 400);
          },
        },
      },
      {
        element: '[data-tour="inventory-search"]',
        popover: {
          title: 'Buscar en inventario',
          description:
            'Filtra la lista escribiendo el nombre o código del producto que buscas.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="inventory-table"]',
        popover: {
          title: 'Tabla de inventario',
          description:
            'Aquí ves todos los productos con sus existencias. Los indicadores de color te ayudan: verde = disponible, amarillo = stock bajo, rojo = sin stock o por debajo del mínimo.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="inventory-stock-columns"]',
        popover: {
          title: 'Columnas de stock mín./máx.',
          description:
            'El stock mínimo te alerta cuando un producto está por agotarse. El stock máximo te ayuda a evitar sobreinventario. Configura estos valores para cada producto.',
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
        element: '[data-tour="movements-new-btn"]',
        popover: {
          title: 'Nuevo movimiento',
          description:
            'Registra una entrada (mercancía de proveedores), salida (venta a clientes) o ajuste (corrección por conteo físico). Selecciona producto, tipo, cantidad y motivo.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="movements-type-filter"]',
        popover: {
          title: 'Filtro por tipo',
          description:
            'Filtra movimientos: Entrada (llega mercancía), Salida (sale mercancía) o Ajuste (correcciones de inventario).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-reason-filter"]',
        popover: {
          title: 'Filtro por motivo',
          description:
            'Filtra por motivo específico: Compra a proveedor, Venta a cliente, Devolución, Merma, Conteo físico, etc.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="movements-table"]',
        popover: {
          title: 'Historial de movimientos',
          description:
            'Cada fila muestra un movimiento con su tipo, producto, cantidad, stock anterior y nuevo. Las entradas se muestran en verde (+) y las salidas en rojo (-).',
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
        element: '[data-tour="routes-new-btn"]',
        popover: {
          title: 'Nueva asignación de ruta',
          description:
            'Asigna una ruta de visita a un vendedor. Selecciona zona, clientes a visitar y fecha programada.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-date-filter"]',
        popover: {
          title: 'Filtro de fecha',
          description:
            'Selecciona la fecha para ver las rutas programadas para ese día.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-user-filter"]',
        popover: {
          title: 'Filtro por vendedor',
          description:
            'Filtra las rutas por vendedor asignado para ver su agenda del día.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-table"]',
        popover: {
          title: 'Tabla de rutas',
          description:
            'Cada ruta muestra zona, vendedor asignado, estado, clientes por visitar, progreso de visitas y monto de ventas del día.',
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
    steps: [
      {
        element: '[data-tour="routes-manage-new-btn"]',
        popover: {
          title: 'Nueva asignación',
          description:
            'Haz clic aquí para ir a la pantalla de asignación de nuevas rutas a tus vendedores.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="routes-manage-date-filter"]',
        popover: {
          title: 'Filtro por fecha',
          description:
            'Selecciona un rango de fechas para ver las rutas programadas en ese período.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-user-filter"]',
        popover: {
          title: 'Filtro por usuario',
          description:
            'Filtra las rutas por vendedor asignado para ver su carga de trabajo.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-estado-filter"]',
        popover: {
          title: 'Filtro por estado',
          description:
            'Usa "+ Más filtros" para ver el filtro de estado. Filtra por: Planificada, En progreso, Terminada, Cancelada, Pend. aceptar, Carga aceptada o Cerrada.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-manage-table"]',
        popover: {
          title: 'Lista de rutas',
          description:
            'Cada fila muestra nombre, vendedor, zona, fecha, estado y progreso. Haz clic en una ruta para ir a su detalle: si está pendiente verás la pantalla de carga; si ya fue completada verás el cierre.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-manage-refresh"]',
        popover: {
          title: 'Actualizar lista',
          description:
            'Haz clic aquí para recargar la lista de rutas con los datos más recientes.',
          side: 'bottom',
          align: 'end',
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
        element: '[data-tour="routes-load-user-section"]',
        popover: {
          title: 'Vendedor y efectivo inicial',
          description:
            'Aquí ves el vendedor asignado y puedes definir el monto de viático o efectivo inicial que se le entrega.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-pedidos"]',
        popover: {
          title: 'Pedidos asignados',
          description:
            'Estos son los pedidos de clientes que el vendedor debe entregar en la ruta. Los productos de estos pedidos se suman automáticamente a la carga.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-add-products"]',
        popover: {
          title: 'Agregar productos para venta directa',
          description:
            'Agrega productos adicionales que el vendedor llevará para venta directa (sin pedido previo). Selecciona producto y define la cantidad.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-load-consolidated"]',
        popover: {
          title: 'Tabla consolidada de carga',
          description:
            'Aquí ves el resumen de todos los productos que se cargarán: cantidad para entrega, cantidad para venta directa, total y precio unitario.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-load-stats"]',
        popover: {
          title: 'Resumen de la carga',
          description:
            'Indicadores resumen: total de productos, pedidos asignados, monto estimado y efectivo inicial.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-load-submit"]',
        popover: {
          title: 'Enviar a carga',
          description:
            'Cuando todo esté listo, haz clic aquí para confirmar la carga de inventario. El vendedor recibirá la notificación en su app móvil.',
          side: 'top',
          align: 'end',
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
          title: 'Pestañas de cierre',
          description:
            'Navega entre las pestañas: Detalles de la ruta, Resumen financiero y Retorno de inventario.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-details"]',
        popover: {
          title: 'Detalles de la ruta',
          description:
            'Información general: vendedor, zona, fecha, estado y comentarios. Aquí puedes ver el contexto completo de la ruta.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-financial"]',
        popover: {
          title: 'Resumen financiero',
          description:
            'Muestra efectivo inicial, ventas totales, cobros realizados, efectivo recibido y la diferencia. Verifica que los montos cuadren.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-inventory"]',
        popover: {
          title: 'Retorno de inventario',
          description:
            'Tabla de reconciliación: cantidad cargada al inicio, vendidos, entregados, devueltos, mermas y lo que regresa al almacén. El sistema calcula las diferencias automáticamente.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="routes-close-actions"]',
        popover: {
          title: 'Acciones de inventario',
          description:
            'Usa estos botones para marcar productos como "Regresa a almacén" o "Se queda en vehículo" para la siguiente ruta.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="routes-close-btn"]',
        popover: {
          title: 'Cerrar ruta',
          description:
            'Cuando toda la reconciliación esté completa, haz clic aquí para cerrar la ruta definitivamente. Esta acción no se puede deshacer.',
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
        element: '[data-tour="visits-list"]',
        popover: {
          title: 'Lista de visitas',
          description:
            'Aquí ves todas las visitas programadas y realizadas con su estado, cliente, vendedor y resultado.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-checkin"]',
        popover: {
          title: 'Iniciar visita (Check-In)',
          description:
            'Al iniciar una visita se registra la hora y ubicación de llegada del vendedor al cliente.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-checkout"]',
        popover: {
          title: 'Finalizar visita (Check-Out)',
          description:
            'Al finalizar, selecciona el resultado: Con venta, Sin venta, No encontrado o Reprogramada.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="visits-create"]',
        popover: {
          title: 'Crear nueva visita',
          description:
            'Programa una nueva visita seleccionando vendedor, cliente, fecha y hora.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
};
