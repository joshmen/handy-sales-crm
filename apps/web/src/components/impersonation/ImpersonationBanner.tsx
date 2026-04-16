'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { impersonationService } from '@/services/api/impersonation';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';
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
  const tc = useTranslations('common');
  const ti = useTranslations('impersonation');
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  // FIX-3: Validar con el servidor al montar — si la sesión expiró server-side, limpiar
  useEffect(() => {
    if (!isImpersonating || !sessionId) return;
    let cancelled = false;

    impersonationService.getCurrentState().then((state) => {
      if (cancelled) return;
      if (!state.isImpersonating) {
        // El servidor dice que no hay sesión activa — limpiar estado stale
        endImpersonation();
        updateSession({ isImpersonating: false });
        window.location.href = '/admin/tenants';
      }
    }).catch(() => {
      // Si falla la llamada (ej: token inválido), limpiar por seguridad
      if (cancelled) return;
      endImpersonation();
      updateSession({ isImpersonating: false });
      window.location.href = '/admin/tenants';
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImpersonating, sessionId]);

  useEffect(() => {
    if (!isImpersonating) return;

    const updateTime = () => {
      const remaining = updateTimeRemaining();
      setMinutesRemaining(remaining);
      return remaining;
    };
    const remaining = updateTime();

    // Si ya expiró al montar, terminar sesión inmediatamente
    if (remaining <= 0) {
      handleAutoEnd();
      return;
    }

    const interval = setInterval(() => {
      const r = updateTime();
      if (r <= 0) {
        clearInterval(interval);
        handleAutoEnd();
      }
    }, 30000); // Check cada 30s para detectar expiración más rápido
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImpersonating]);

  const handleAutoEnd = async () => {
    try {
      if (sessionId) {
        await impersonationService.endSession(sessionId).catch(() => {});
      }
    } finally {
      endImpersonation();
      updateSession({ isImpersonating: false });
      toast({
        title: ti('sessionExpired'),
        description: ti('sessionExpiredAuto'),
      });
      window.location.href = '/admin/tenants';
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      setIsEnding(true);
      await impersonationService.endSession(sessionId);
      endImpersonation();
      await updateSession({ isImpersonating: false });
      toast({
        title: ti('sessionEnded'),
        description: ti('exitedImpersonation'),
      });
      window.location.href = '/admin/tenants';
    } catch {
      toast({
        title: tc('error'),
        description: ti('couldNotEndSession'),
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
            <span className="font-semibold text-xs hidden sm:inline">{ti('supportMode')}</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-sm truncate">{tenant.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-amber-600/20 px-2 py-0.5 rounded text-xs flex-shrink-0">
            {isReadOnly ? <Eye className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
            <span>{isReadOnly ? ti('readOnlyLabel') : ti('readWriteLabel')}</span>
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
              {minutesRemaining > 0 ? ti('minutesShort', { minutes: minutesRemaining }) : ti('expiring')}
            </span>
            <span className="sm:hidden">
              {minutesRemaining > 0 ? ti('minutesShortMobile', { minutes: minutesRemaining }) : '!'}
            </span>
          </div>

          <button
            onClick={handleEndSession}
            disabled={isEnding}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">{isEnding ? ti('exitingButton') : ti('exitButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
