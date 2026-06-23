'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Compat: el detalle GPS por vendedor se fusionó con la lista en la pantalla
 * master-detail `/team/gps` (rediseño Claude Design). Esta ruta redirige al
 * nuevo layout con el vendedor preseleccionado (`?v=`), preservando los
 * deep-links existentes (filas de Equipo, "Ver GPS" en Rutas, bookmarks).
 */
export default function TeamGpsDetailRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = parseInt(params.id, 10);
    router.replace(Number.isNaN(id) ? '/team/gps' : `/team/gps?v=${id}`);
  }, [params.id, router]);

  return (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
    </div>
  );
}
