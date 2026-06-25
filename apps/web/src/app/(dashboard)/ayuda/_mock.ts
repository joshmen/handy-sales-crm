// =============================================================================
// Datos de presentación para el Centro de ayuda.
// PRESENTACIÓN, PENDIENTE BACKEND: todo lo de este archivo es mock estático
// para maquetar la pantalla. Cuando exista el backend del centro de ayuda
// (categorías, artículos, changelog, estado del sistema) se debe reemplazar
// por datos reales vía API y eliminar este archivo.
// =============================================================================

/** Categoría de ayuda. `icon` es una clave que la página mapea a un icono Lucide. */
export interface HelpCategory {
  id: string;
  icon: string;
  title: string;
  count: number;
}

/** Entrada del registro de novedades. */
export interface ChangelogEntry {
  id: string;
  type: 'nuevo' | 'mejora';
  date: string;
  title: string;
  desc: string;
}

/** Servicio del sistema con su estado actual. */
export interface SystemService {
  name: string;
  status: 'operativo' | 'degradado';
}

/** Atajo de teclado: combinación de teclas + descripción. */
export interface Shortcut {
  keys: string[];
  desc: string;
}

// --- Categorías por tema -----------------------------------------------------
export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'primeros-pasos', icon: 'rocket', title: 'Primeros pasos', count: 10 },
  { id: 'pedidos-ventas', icon: 'cart', title: 'Pedidos y ventas', count: 14 },
  { id: 'cobranza', icon: 'card', title: 'Cobranza', count: 8 },
  { id: 'inventario', icon: 'box', title: 'Inventario y productos', count: 12 },
  { id: 'facturacion', icon: 'receipt', title: 'Facturación y SAT', count: 9 },
  { id: 'rutas', icon: 'route', title: 'Rutas y visitas', count: 7 },
  { id: 'equipo', icon: 'users', title: 'Equipo y permisos', count: 6 },
  { id: 'reportes', icon: 'chart', title: 'Reportes', count: 11 },
];

// --- Preguntas frecuentes ----------------------------------------------------
export const POPULAR_QUESTIONS: string[] = [
  '¿Cómo timbro una factura?',
  '¿Cómo registro un cobro?',
  '¿Cómo creo una ruta?',
  '¿Cómo agrego un vendedor?',
  '¿Cómo exporto un reporte?',
];

// --- Novedades (changelog) ---------------------------------------------------
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 'chg-1',
    type: 'nuevo',
    date: '18 jun 2026',
    title: 'Cobranza con pagos parciales',
    desc: 'Ahora puedes registrar abonos y dejar saldo pendiente en una sola operación.',
  },
  {
    id: 'chg-2',
    type: 'mejora',
    date: '12 jun 2026',
    title: 'Mapa de rutas más rápido',
    desc: 'Mejoramos la carga del mapa y la sincronización de paradas en equipos grandes.',
  },
  {
    id: 'chg-3',
    type: 'nuevo',
    date: '5 jun 2026',
    title: 'Exportación de reportes a Excel',
    desc: 'Descarga cualquier reporte en formato Excel directamente desde el panel.',
  },
  {
    id: 'chg-4',
    type: 'mejora',
    date: '28 may 2026',
    title: 'Catálogo de productos con claves SAT',
    desc: 'Asignación de claves de producto y unidad SAT de forma más simple al crear artículos.',
  },
];

// --- Estado del sistema ------------------------------------------------------
export const SYSTEM_SERVICES: SystemService[] = [
  { name: 'API principal', status: 'operativo' },
  { name: 'App móvil', status: 'operativo' },
  { name: 'Facturación (Finkok)', status: 'operativo' },
  { name: 'Sincronización', status: 'degradado' },
  { name: 'Notificaciones', status: 'operativo' },
];

// --- Atajos de teclado -------------------------------------------------------
export const SHORTCUTS: Shortcut[] = [
  { keys: ['G', 'D'], desc: 'Ir al Tablero' },
  { keys: ['G', 'P'], desc: 'Ir a Pedidos' },
  { keys: ['/'], desc: 'Buscar' },
  { keys: ['N'], desc: 'Nuevo pedido' },
  { keys: ['?'], desc: 'Ver atajos' },
];
