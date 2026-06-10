'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Check, X as XIcon, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { getCancelacionesPendientes, responderCancelacion } from '@/services/api/billing';
import { extractBillingError } from '@/lib/billingApi';

/**
 * Bloque receptor-facing: lista los CFDI que OTROS emisores le emitieron a este tenant
 * y para los que solicitaron cancelacion (SAT da 72h para aceptar o rechazar).
 * Solo se renderiza cuando hay solicitudes pendientes, para no ensuciar el dashboard.
 */
export function PendingCancellationsCard() {
  const t = useTranslations('billing.pendingCancellations');
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';
  const canRespond = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [uuids, setUuids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ uuid: string; aceptar: boolean } | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCancelacionesPendientes();
      setUuids(data.uuids ?? []);
    } catch {
      // Silencioso: el endpoint falla si el tenant no tiene PAC configurado; no es bloqueante.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async () => {
    if (!confirm) return;
    setProcessing(true);
    try {
      await responderCancelacion(confirm.uuid, confirm.aceptar);
      toast({ title: confirm.aceptar ? t('acceptedToast') : t('rejectedToast') });
      setUuids(prev => prev.filter(u => u !== confirm.uuid));
      setConfirm(null);
    } catch (err) {
      const { message } = extractBillingError(err);
      toast({ title: t('errorToast'), description: message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // No mostrar nada mientras carga o si no hay pendientes (dashboard limpio).
  if (loading || uuids.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('title', { count: uuids.length })}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {uuids.map(uuid => (
          <li
            key={uuid}
            className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-3 py-2"
          >
            <span className="font-mono text-xs text-foreground truncate" title={uuid}>
              {uuid}
            </span>
            {canRespond ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                  onClick={() => setConfirm({ uuid, aceptar: true })}
                  data-testid={`accept-cancel-${uuid}`}
                >
                  <Check className="w-4 h-4 mr-1" /> {t('accept')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  onClick={() => setConfirm({ uuid, aceptar: false })}
                  data-testid={`reject-cancel-${uuid}`}
                >
                  <XIcon className="w-4 h-4 mr-1" /> {t('reject')}
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">{t('adminOnly')}</span>
            )}
          </li>
        ))}
      </ul>

      <Modal
        isOpen={!!confirm}
        onClose={() => !processing && setConfirm(null)}
        title={confirm?.aceptar ? t('confirmAcceptTitle') : t('confirmRejectTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirm?.aceptar ? t('confirmAcceptBody') : t('confirmRejectBody')}
          </p>
          <p className="text-xs font-mono text-foreground break-all">{confirm?.uuid}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={processing}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className={
                confirm?.aceptar
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
              data-testid="confirm-responder"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {confirm?.aceptar ? t('accept') : t('reject')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
