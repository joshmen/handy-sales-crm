'use client';

import { GastoCardList } from '@/components/gastos/GastoCardList';
import type { RouteTabProps } from './types';

/**
 * Tab "Gastos" del detalle de ruta — auditoría contextual mientras la ruta
 * está activa (sin esperar al close screen). El contenido vive en
 * `GastoCardList` para compartir lógica de lista + lightbox + invalidación
 * con `RutaGastosDrawer` del close screen.
 */
export function GastosTab({ route }: RouteTabProps) {
  return (
    <div>
      <GastoCardList rutaId={route.id} showHeader variant="tab" />
    </div>
  );
}
