'use client';

import { Receipt } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { GastoCardList } from './GastoCardList';

interface RutaGastosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rutaId: number;
  rutaCodigo?: string;
  /** Fired when a gasto is invalidated so the parent can refetch totals. */
  onGastoInvalidated?: (gastoId: number) => void;
}

/**
 * Drawer lateral derecho que muestra los gastos imputados a una ruta.
 * El contenido (lista, lightbox, modal de invalidación) está encapsulado en
 * `GastoCardList` para compartir con `GastosTab` del route detail page.
 *
 * Nested dialogs: Modal lightbox y Modal invalidación se abren ENCIMA del Drawer.
 * El parche capture+stopImmediatePropagation en Modal.tsx asegura que ESC cierre
 * solo el Modal activo sin cerrar el Drawer.
 */
export function RutaGastosDrawer({
  isOpen,
  onClose,
  rutaId,
  rutaCodigo,
  onGastoInvalidated,
}: RutaGastosDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Gastos${rutaCodigo ? ` · ${rutaCodigo}` : ''}`}
      icon={<Receipt className="w-5 h-5 text-muted-foreground" />}
      width="xl"
    >
      <GastoCardList
        rutaId={rutaId}
        onGastoInvalidated={onGastoInvalidated}
        variant="drawer"
      />
    </Drawer>
  );
}
