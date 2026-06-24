'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Check, CheckCircle, X as XIcon, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { getCancelacionesPendientes, responderCancelacion } from '@/services/api/billing';
import { extractBillingError } from '@/lib/billingApi';

/**
 * Bloque receptor-facing: lista los CFDI que OTROS emisores le emitieron a este tenant
 * y para los que solicitaron cancelacion (SAT da 72h para aceptar o rechazar).
 * Siempre visible: muestra estado-cero informativo cuando no hay pendientes,
 * para que el admin sepa que esta seccion existe y debe revisarla periodicamente.
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

  const hasPending = uuids.length > 0;

  return (
    <div
      className={`border rounded-xl p-5 mb-6 ${
        hasPending
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
          : 'bg-card border-border'
      }`}
      data-testid="pending-cancellations-section"
    >
      <div className="flex items-start gap-3 mb-3">
        {hasPending ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <CheckCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {hasPending ? t('title', { count: uuids.length }) : t('titleSection')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasPending ? t('subtitle') : t('subtitleInfo')}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>...</span>
        </div>
      )}

      {!loading && !hasPending && (
        <p className="text-sm text-muted-foreground" data-testid="pending-cancellations-zero">
          {t('zeroState')}
        </p>
      )}

      {!loading && hasPending && (
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
                    className="border-primary/40 text-primary hover:bg-primary/5 dark:border-primary/50 dark:text-primary"
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
      )}

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
