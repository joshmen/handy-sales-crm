'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { impersonationService } from '@/services/api/impersonation';
import { toast } from '@/hooks/useToast';
import { AlertTriangle, Clock, Eye, Edit, LogOut, Building2 } from 'lucide-react';

/**
 * Banner slim que se muestra arriba del header cuando un SUPER_ADMIN
 * está impersonando un tenant. Altura fija h-10 (40px).
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

  const { update: updateSession } = useSession();
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (!isImpersonating) return;

    const updateTime = () => setMinutesRemaining(updateTimeRemaining());
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [isImpersonating, updateTimeRemaining]);

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      setIsEnding(true);
      await impersonationService.endSession(sessionId);
      endImpersonation();
      await updateSession({ isImpersonating: false });
      toast({
        title: 'Sesión finalizada',
        description: 'Has salido del modo de impersonación',
      });
      window.location.href = '/admin/tenants';
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo finalizar la sesión',
        variant: 'destructive',
      });
    } finally {
      setIsEnding(false);
    }
  };

  if (!isImpersonating || !tenant) return null;

  const isReadOnly = accessLevel === 'READ_ONLY';
  const isLowTime = minutesRemaining <= 10;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-amber-500 text-amber-950 shadow-md">
      <div className="h-full max-w-screen-2xl mx-auto px-3 flex items-center justify-between gap-2">
        {/* Left: Badge + tenant */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-amber-600/30 px-2.5 py-0.5 rounded-full flex-shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-semibold text-xs hidden sm:inline">MODO SOPORTE</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-sm truncate">{tenant.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-amber-600/20 px-2 py-0.5 rounded text-xs flex-shrink-0">
            {isReadOnly ? <Eye className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
            <span>{isReadOnly ? 'Solo lectura' : 'Lectura/Escritura'}</span>
          </div>
        </div>

        {/* Right: Time + exit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
              isLowTime ? 'bg-red-500 text-white' : 'bg-amber-600/20'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">
              {minutesRemaining > 0 ? `${minutesRemaining} min` : 'Expirando...'}
            </span>
            <span className="sm:hidden">
              {minutesRemaining > 0 ? `${minutesRemaining}m` : '!'}
            </span>
          </div>

          <button
            onClick={handleEndSession}
            disabled={isEnding}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">{isEnding ? 'Saliendo...' : 'Salir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
