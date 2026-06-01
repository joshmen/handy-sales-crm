'use client';

import { DevolucionCardList } from '@/components/devoluciones/DevolucionCardList';
import type { RouteTabProps } from './types';

/**
 * Tab "Devoluciones" del detalle de ruta — auditoría contextual mientras la ruta
 * está activa (sin esperar al close screen). Mirror exacto de GastosTab.
 *
 * El contenido vive en `DevolucionCardList` para compartir lógica de lista +
 * lightbox foto + modal de anulación con `RutaDevolucionesDrawer` del close screen.
 */
export function DevolucionesTab({ route }: RouteTabProps) {
  return (
    <div>
      <DevolucionCardList rutaId={route.id} showHeader variant="tab" />
    </div>
  );
}
