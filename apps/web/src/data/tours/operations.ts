import type { Driver } from 'driver.js';
import { TourConfig, boostDrawerForTour, closeDrawerForTour } from './types';

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
      {
        popover: {
          title: 'Formulario de inventario',
          description:
            'Selecciona el producto, define la cantidad inicial, stock mínimo y stock máximo para mantener control de tu almacén.',
          side: 'over',
          onPrevClick: (driverObj: Driver) => {
            closeDrawerForTour();
            setTimeout(() => driverObj.movePrevious(), 400);
          },
          onNextClick: (driverObj: Driver) => {
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
            'Cada tarjeta es una automatización que el sistema puede ejecutar por ti. Lee la descripción para entender qué hace cada una.',
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
        element: '[data-tour="automations-historial"]',
        popover: {
          title: 'Historial de ejecuciones',
          description:
            'Aquí puedes ver cuándo se ejecutó cada automatización y si fue exitosa. Útil para verificar que todo funciona correctamente.',
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
};
