import { TourConfig, imageStep } from './types';

/** Users, Devices, Notifications, Activity Logs, Forms */
export const adminTours: Record<string, TourConfig> = {
  '/users': {
    id: 'users-tour',
    title: 'Tour de Usuarios',
    description: 'Aprende a gestionar los usuarios del sistema: vendedores, supervisores y administradores.',
    steps: [
      {
        element: '[data-tour="users-create-btn"]',
        popover: {
          title: 'Crear nuevo usuario',
          description:
            'Registra un nuevo usuario con nombre, email, contraseña y rol. Los roles disponibles son: Administrador, Supervisor y Usuario móvil (vendedor).',
          side: 'bottom',
          align: 'end',
        },
      },
      imageStep(
        'Formulario de nuevo usuario',
        '/images/tour/usuarios-crear.jpg',
        'Formulario de registro con nombre, email, rol y permisos',
      ),
      {
        element: '[data-tour="users-role-filter"]',
        popover: {
          title: 'Filtrar por rol',
          description:
            'Filtra la lista por tipo de usuario: Administrador, Supervisor o Usuario móvil. Útil para gestionar permisos por grupo.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="users-cards"]',
        popover: {
          title: 'Tarjetas de usuarios',
          description:
            'Cada tarjeta muestra el nombre, rol, estado, última sesión y métricas del vendedor: pedidos, devoluciones y efectividad de visitas. Puedes seleccionar varios para activar/desactivar en lote.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/forms': {
    id: 'forms-tour',
    title: 'Tour de Formularios',
    description: 'Conoce la gestión de formularios personalizados del sistema.',
    steps: [
      {
        element: '[data-tour="forms-create-btn"]',
        popover: {
          title: 'Crear formulario',
          description:
            'Crea un nuevo formulario personalizado con los campos que necesites para tus procesos.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="forms-toggle-inactive"]',
        popover: {
          title: 'Mostrar inactivos',
          description:
            'Activa este switch para ver los formularios desactivados.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="forms-table"]',
        popover: {
          title: 'Lista de formularios',
          description:
            'Tabla con todos los formularios disponibles. Cada uno muestra nombre, tipo, estado y acciones.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/devices': {
    id: 'devices-tour',
    title: 'Tour de Dispositivos',
    description: 'Aprende a gestionar los dispositivos y sesiones activas de tu equipo.',
    steps: [
      {
        element: '[data-tour="devices-search"]',
        popover: {
          title: 'Buscar dispositivos',
          description:
            'Filtra dispositivos por nombre, modelo o usuario.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="devices-filter-user"]',
        popover: {
          title: 'Filtro por usuario',
          description:
            'Selecciona un usuario para ver solo sus dispositivos y sesiones activas.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="devices-table"]',
        popover: {
          title: 'Tabla de dispositivos',
          description:
            'Lista de dispositivos con usuario, modelo, última conexión y estado. Puedes revocar sesiones activas desde aquí.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="devices-refresh"]',
        popover: {
          title: 'Actualizar',
          description:
            'Recarga la lista de dispositivos para ver los datos más recientes.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },

  '/notifications': {
    id: 'notifications-tour',
    title: 'Tour de Notificaciones',
    description: 'Aprende a enviar y gestionar notificaciones para tu equipo.',
    steps: [
      {
        element: '[data-tour="notifications-create-btn"]',
        popover: {
          title: 'Enviar notificación',
          description:
            'Crea y envía una nueva notificación a uno o más usuarios. Puedes seleccionar tipo, destinatarios y mensaje.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="notifications-search"]',
        popover: {
          title: 'Buscar notificaciones',
          description:
            'Filtra notificaciones por texto del mensaje o destinatario.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="notifications-filter-type"]',
        popover: {
          title: 'Filtro por tipo',
          description:
            'Filtra por tipo de notificación: Información, Alerta, Urgente, etc.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="notifications-list"]',
        popover: {
          title: 'Lista de notificaciones',
          description:
            'Historial de todas las notificaciones enviadas con tipo, mensaje, destinatario, fecha y estado de lectura.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/activity-logs': {
    id: 'activity-logs-tour',
    title: 'Tour de Logs de Actividad',
    description: 'Conoce el registro de actividad del sistema para auditoría y seguimiento.',
    steps: [
      {
        element: '[data-tour="logs-export-btn"]',
        popover: {
          title: 'Exportar logs',
          description:
            'Descarga los logs de actividad en formato Excel o CSV para análisis externo.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="logs-search"]',
        popover: {
          title: 'Buscar en logs',
          description:
            'Filtra los registros por texto: nombre de usuario, descripción de acción o entidad.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="logs-filter-action"]',
        popover: {
          title: 'Filtro por acción',
          description:
            'Filtra por tipo de acción: Crear, Actualizar, Eliminar, Login, Logout, etc.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="logs-filter-entity"]',
        popover: {
          title: 'Filtro por entidad',
          description:
            'Filtra por entidad afectada: Cliente, Producto, Pedido, Usuario, Inventario, etc.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="logs-table"]',
        popover: {
          title: 'Tabla de actividad',
          description:
            'Cada registro muestra fecha, usuario, acción realizada, entidad afectada y detalles. Útil para auditoría y resolución de problemas.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
