import { TourConfig } from './types';

/** Dashboard, Profile, Global Settings, Roles, Reports */
export const generalTours: Record<string, TourConfig> = {
  '/dashboard': {
    id: 'dashboard-general',
    title: 'Tour general del sistema',
    description: 'Conoce las secciones principales de Handy Suites y cómo navegar el sistema.',
    steps: [
      {
        element: '[data-tour="sidebar-nav"]',
        popover: {
          title: 'Menú de navegación',
          description:
            'Usa este menú lateral para moverte entre las secciones del sistema: Clientes, Productos, Inventario, Pedidos, Rutas y más. Puedes colapsarlo para más espacio.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="header-search"]',
        popover: {
          title: 'Barra de búsqueda',
          description:
            'Busca rápidamente clientes, productos o pedidos escribiendo aquí. Los resultados aparecen al instante.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="header-notifications"]',
        popover: {
          title: 'Notificaciones',
          description:
            'Aquí verás alertas de stock bajo, pedidos nuevos, visitas programadas y otras notificaciones importantes de tu negocio.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="header-help"]',
        popover: {
          title: 'Ayuda contextual',
          description:
            'Abre el panel de ayuda para ver artículos específicos de cada página. También puedes repetir este tour desde ahí.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="header-user-menu"]',
        popover: {
          title: 'Menú de usuario',
          description:
            'Accede a tu perfil, configuración de la empresa y cierra sesión desde aquí.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="dashboard-metrics"]',
        popover: {
          title: 'Métricas del negocio',
          description:
            'Estos indicadores muestran un resumen en tiempo real de tus ventas, pedidos, clientes activos y productos. El porcentaje muestra el cambio respecto al período anterior.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard-chart"]',
        popover: {
          title: 'Gráfico de ventas semanales',
          description:
            'Visualiza tus ventas día por día. Usa el filtro de período para cambiar el rango de fechas.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard-activity"]',
        popover: {
          title: 'Actividad reciente',
          description:
            'Aquí verás los últimos movimientos: pedidos completados, clientes registrados, alertas de inventario y más.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="dashboard-goal"]',
        popover: {
          title: 'Meta de venta semanal',
          description:
            'Muestra el progreso de la meta de ventas de la semana: monto objetivo, logrado y porcentaje de avance. La barra se llena conforme te acercas a la meta.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/reports': {
    id: 'reports-tour',
    title: 'Tour de Reportes',
    description: 'Conoce los reportes disponibles para analizar tu negocio.',
    steps: [
      {
        element: '[data-tour="reports-cards"]',
        popover: {
          title: 'Catálogo de reportes',
          description:
            'Aquí ves todos los reportes organizados por sección: Ventas, Clientes e Inventario. Haz clic en cualquier tarjeta para abrir ese reporte.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tour="report-filters"]',
        popover: {
          title: 'Filtros de fecha',
          description:
            'Selecciona un rango de fechas y haz clic en "Consultar" para generar el reporte. Algunos reportes tienen filtros adicionales como agrupación o zona.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="report-kpis"]',
        popover: {
          title: 'Indicadores clave',
          description:
            'Tarjetas con los KPIs principales del reporte: totales, promedios y métricas relevantes. Los colores indican la categoría de cada métrica.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="report-table"]',
        popover: {
          title: 'Tabla de datos',
          description:
            'Tabla detallada con los datos del reporte. Haz clic en los encabezados con flechas para ordenar por columna. Algunos reportes incluyen una fila de totales al final.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/global-settings': {
    id: 'global-settings-tour',
    title: 'Tour de Configuración',
    description: 'Conoce las opciones de configuración global de tu empresa.',
    steps: [
      {
        element: '[data-tour="settings-platform"]',
        popover: {
          title: 'Nombre y logo',
          description:
            'Configura el nombre de tu empresa y sube tu logotipo. Estos aparecerán en el sistema y en documentos generados.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="settings-colors"]',
        popover: {
          title: 'Colores de la plataforma',
          description:
            'Personaliza los colores primario y secundario de la interfaz para que coincidan con la identidad visual de tu empresa.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="settings-regional"]',
        popover: {
          title: 'Configuración regional',
          description:
            'Selecciona el idioma y zona horaria predeterminados para tu empresa.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="settings-save"]',
        popover: {
          title: 'Guardar configuración',
          description:
            'Haz clic aquí para guardar todos los cambios de configuración.',
          side: 'top',
          align: 'end',
        },
      },
    ],
  },

  '/roles': {
    id: 'roles-tour',
    title: 'Tour de Roles',
    description: 'Aprende a gestionar los roles y permisos de los usuarios del sistema.',
    steps: [
      {
        element: '[data-tour="roles-create-btn"]',
        popover: {
          title: 'Crear rol',
          description:
            'Crea un nuevo rol con nombre, descripción y conjunto de permisos. Los roles definen qué puede hacer cada tipo de usuario.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="roles-stats"]',
        popover: {
          title: 'Estadísticas de roles',
          description:
            'Resumen rápido: total de roles, activos, inactivos y roles del sistema (que no se pueden eliminar).',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="roles-table"]',
        popover: {
          title: 'Tabla de roles',
          description:
            'Lista de todos los roles con nombre, descripción, permisos asignados y acciones. Los roles del sistema están protegidos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },

  '/profile': {
    id: 'profile-tour',
    title: 'Tour del Perfil',
    description: 'Conoce las opciones de configuración de tu perfil de usuario.',
    steps: [
      {
        element: '[data-tour="profile-avatar"]',
        popover: {
          title: 'Foto de perfil',
          description:
            'Haz clic para cambiar tu foto de perfil. Se recomienda una imagen cuadrada de al menos 200x200 píxeles.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="profile-tabs"]',
        popover: {
          title: 'Secciones del perfil',
          description:
            'Navega entre las secciones: Información personal, Seguridad (contraseña y 2FA), Preferencias (idioma, tema), Dispositivos y Actividad.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="profile-personal"]',
        popover: {
          title: 'Información personal',
          description:
            'Edita tu nombre, email, teléfono, departamento y ubicación. Haz clic en "Editar" para modificar los datos.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  },
};
