'use client';

import { useState } from 'react';
import { Ticket, Loader2, CheckCircle2 } from 'lucide-react';
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
      setSuccess({ beneficio: result.beneficio });
      toast.success(result.message);
      setCodigo('');
      await onRedeemed();
    } catch (err: unknown) {
      const backendMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(backendMsg ? tApi(backendMsg) : t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 dark:bg-success/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{t('successTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{success.beneficio}</p>
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
