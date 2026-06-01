'use client';

import { RotateCcw } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { DevolucionCardList } from './DevolucionCardList';

interface RutaDevolucionesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rutaId: number;
  rutaCodigo?: string;
  /** Fired when a devolucion is anulada so the parent can refetch totals (aRecibir cambia si Efectivo, cliente.saldo cambia si SaldoFavor). */
  onDevolucionAnulada?: (devolucionId: number) => void;
}

/**
 * Drawer lateral derecho que muestra las devoluciones de pedidos imputadas a una ruta.
 * El contenido (lista, lightbox, modal de anulación) está encapsulado en
 * `DevolucionCardList` para compartir con `DevolucionesTab` del route detail page.
 *
 * Nested dialogs: Modal lightbox y Modal anulación se abren ENCIMA del Drawer.
 * El parche capture+stopImmediatePropagation en Modal.tsx asegura que ESC cierre
 * solo el Modal activo sin cerrar el Drawer.
 */
export function RutaDevolucionesDrawer({
  isOpen,
  onClose,
  rutaId,
  rutaCodigo,
  onDevolucionAnulada,
}: RutaDevolucionesDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Devoluciones${rutaCodigo ? ` · ${rutaCodigo}` : ''}`}
      icon={<RotateCcw className="w-5 h-5 text-muted-foreground" />}
      width="xl"
    >
      <DevolucionCardList
        rutaId={rutaId}
        onDevolucionAnulada={onDevolucionAnulada}
        variant="drawer"
      />
    </Drawer>
  );
}
