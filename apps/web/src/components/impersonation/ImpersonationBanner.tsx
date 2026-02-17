'use client';

import { useEffect, useState } from 'react';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { impersonationService } from '@/services/api/impersonation';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Clock, Eye, LogOut, Building2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';

/**
 * Banner que se muestra cuando un SUPER_ADMIN está impersonando un tenant.
 * Incluye información de la sesión, tiempo restante y botón para salir.
 */
export function ImpersonationBanner() {
  const {
    isImpersonating,
    sessionId,
    tenant,
    accessLevel,
    endImpersonation,
    updateTimeRemaining,
  } = useImpersonationStore();

  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  // Actualizar tiempo restante cada minuto
  useEffect(() => {
    if (!isImpersonating) return;

    const updateTime = () => {
      setMinutesRemaining(updateTimeRemaining());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [isImpersonating, updateTimeRemaining]);

  // Manejar fin de sesión
  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      setIsEnding(true);
      await impersonationService.endSession(sessionId);
      endImpersonation();
      toast({
        title: 'Sesión finalizada',
        description: 'Has salido del modo de impersonación',
      });
      // Recargar la página para limpiar el estado
      window.location.href = '/dashboard';
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo finalizar la sesión',
        variant: 'destructive',
      });
    } finally {
      setIsEnding(false);
    }
  };

  if (!isImpersonating || !tenant) {
    return null;
  }

  const isReadOnly = accessLevel === 'READ_ONLY';
  const isLowTime = minutesRemaining <= 10;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Info de la sesión */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold text-sm">MODO SOPORTE</span>
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">{tenant.name}</span>
            </div>

            <div className="flex items-center gap-1 bg-amber-600/20 px-2 py-0.5 rounded text-xs">
              <Eye className="h-3 w-3" />
              {isReadOnly ? 'Solo lectura' : 'Lectura/Escritura'}
            </div>
          </div>

          {/* Tiempo y acciones */}
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm ${
                isLowTime ? 'bg-red-500 text-white' : 'bg-amber-600/20'
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>
                {minutesRemaining > 0
                  ? `${minutesRemaining} min restantes`
                  : 'Sesión expirando...'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleEndSession}
              disabled={isEnding}
              className="bg-white hover:bg-amber-100 text-amber-900 border-amber-300"
            >
              <LogOut className="h-4 w-4 mr-1" />
              {isEnding ? 'Saliendo...' : 'Salir'}
            </Button>
          </div>
        </div>

        {/* Advertencia de auditoría */}
        <div className="text-xs text-amber-800 mt-1 text-center">
          Todas las acciones están siendo registradas. Esta sesión cumple con la política de
          impersonación.
        </div>
      </div>
    </div>
  );
}
