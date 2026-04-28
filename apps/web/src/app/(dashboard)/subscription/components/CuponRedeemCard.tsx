'use client';

import { useState } from 'react';
import { Ticket, CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { subscriptionService } from '@/services/api/subscriptions';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';

interface CuponRedeemCardProps {
  onRedeemed: () => void | Promise<void>;
}

export function CuponRedeemCard({ onRedeemed }: CuponRedeemCardProps) {
  const t = useTranslations('subscription.cupon');
  const { tApi } = useBackendTranslation();
  const [codigo, setCodigo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ beneficio: string } | null>(null);

  const handleRedeem = async () => {
    const trimmed = codigo.trim().toUpperCase();
    if (!trimmed) {
      toast.error(t('requiredCode'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await subscriptionService.redimirCupon(trimmed);
      setCodigo('');
      // Refrescar datos primero, luego mostrar success state (así el hero card arriba
      // ya refleja el nuevo plan cuando el usuario ve "aplicado")
      await onRedeemed();
      setSuccess({ beneficio: result.beneficio });
      toast.success(result.message);
      // Scroll al top para que el usuario vea el PlanHeroCard actualizado
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const backendMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      // Seguridad: solo mostramos el mensaje exacto del backend si es accionable para el user
      // (ej. "ya canjeaste este cupón"). Para el resto (no encontrado / inactivo / expirado /
      // max usos), mostramos un genérico — así no permitimos enumerar qué códigos existen.
      const isAlreadyRedeemed = backendMsg === 'Tu empresa ya ha utilizado este cupón';
      if (isAlreadyRedeemed) {
        toast.error(tApi(backendMsg!));
      } else {
        toast.error(t('errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border-2 border-success/50 bg-success/10 dark:bg-success/15 px-5 py-4 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{t('successTitle')}</h3>
            <p className="text-sm text-foreground/80 mt-1">{success.beneficio}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('checkAboveHint')}
            </p>
            <button
              onClick={() => setSuccess(null)}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
            >
              {t('redeemAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/30 shrink-0">
          <Ticket className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder={t('placeholder')}
              maxLength={64}
              disabled={submitting}
              className="uppercase font-mono"
              onKeyDown={e => {
                if (e.key === 'Enter' && !submitting) handleRedeem();
              }}
            />
            <Button
              onClick={handleRedeem}
              disabled={submitting || !codigo.trim()}
              className="bg-success hover:bg-success/90 text-success-foreground shrink-0"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
