/**
 * Tipos compartidos entre los tabs del detalle de ruta.
 * Cada tab recibe el `route` desde el shell padre + un `onRefetch` para
 * recargar datos tras cambios.
 */
import type { RouteDetail, PedidoAsignado } from '@/services/api/routes';

export interface PedidoOption {
  id: number;
  numeroPedido?: string;
  clienteNombre?: string;
  total?: number;
  estado?: string;
}

export interface ZoneOption {
  id: number;
  name: string;
}

export interface UsuarioOption {
  id: number;
  nombre: string;
}

export interface ProductoOption {
  id: number;
  nombre: string;
  codigoBarra: string;
  precioBase: number;
}

/**
 * Props base que todos los tabs reciben desde el shell.
 * - `route`: data fetched en shell (page.tsx), prop drill para evitar API calls duplicados.
 * - `isEditable`: derivado de `route.estado === Planificada`. Cuando false, los tabs
 *   muestran el contenido en modo read-only (sin botones de add/remove).
 * - `onRefetch`: callback que el shell expone — los tabs lo llaman tras agregar/eliminar
 *   para que el padre re-fetchee `route` + `pedidos` y todos los tabs vean data fresca.
 */
export interface RouteTabProps {
  route: RouteDetail;
  isEditable: boolean;
  onRefetch: () => Promise<void>;
}

/**
 * Props para tabs que también necesitan acceso a la lista de pedidos asignados
 * (Pedidos tab mismo, y Resumen para mostrar el contador).
 */
export interface RouteTabPropsWithPedidos extends RouteTabProps {
  pedidos: PedidoAsignado[];
  setPedidos: (pedidos: PedidoAsignado[]) => void;
}
