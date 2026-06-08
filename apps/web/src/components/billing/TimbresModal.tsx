'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SbBilling, SbSubscription } from '@/components/layout/DashboardIcons';

interface TimbresModalProps {
  open: boolean;
  onClose: () => void;
  errorMessage: string;
}

/**
 * Reusable modal for timbres/billing errors.
 * Two states based on the backend error message:
 *   1. "no incluye" → Plan doesn't include billing → Upgrade CTA
 *   2. Otherwise → Timbres exhausted → Buy more CTA
 *
 * Uses the canonical <Modal/> wrapper for focus trap, Escape handling, and
 * scroll lock (finding 4.21). Renders without a header bar so the body can
 * keep its centered icon-title-CTA composition.
 *
 * Visual deltas from the previous bespoke implementation (intentional, to
 * align with the design system):
 *   - panel: bg-card → bg-surface-4 (theme token)
 *   - panel: rounded-2xl → rounded-xl
 *   - panel: shadow-2xl → shadow-elevation-3
 *   - overlay: bg-black/60 → bg-black/50
 *   - enter animation: animate-in fade-in zoom-in-95 → opacity/scale transition
 *     (both 200ms, visually equivalent)
 */
export function TimbresModal({ open, onClose, errorMessage }: TimbresModalProps) {
  const t = useTranslations('billing.timbres');

  const isNoPlan = errorMessage.includes('no incluye') || errorMessage.includes('does not include');

  return (
    <Modal isOpen={open} onClose={onClose} size="sm" showCloseButton={false}>
      {/* Modal already applies p-4; this -m-4 + p-8 brings padding back to
          the original p-8 without losing Modal's container semantics. */}
      <div className="-m-4 p-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 flex items-center justify-center">
            {isNoPlan ? <SbSubscription size={56} /> : <SbBilling size={56} />}
          </div>
        </div>

        {isNoPlan ? (
          <>
            <h3 id="timbres-modal-title" className="text-xl font-bold text-foreground mb-2">
              {t('noPlanTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/subscription">
                <Button className="w-full h-11 bg-success hover:bg-success/90 text-white font-medium text-sm rounded-xl">
                  {t('upgradePlan')}
                </Button>
              </Link>
              <Button variant="outline" className="w-full h-11 rounded-xl" onClick={onClose}>
                {t('close')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="timbres-modal-title" className="text-xl font-bold text-foreground mb-2">
              {t('exhaustedTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-1.5 leading-relaxed">
              {errorMessage}
            </p>
            <p className="text-xs text-muted-foreground/70 mb-6">
              {t('exhaustedDescription')}
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/subscription/buy-timbres">
                <Button className="w-full h-11 bg-success hover:bg-success/90 text-white font-medium text-sm rounded-xl">
                  {t('buyStamps')}
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="outline" className="w-full h-11 rounded-xl">
                  {t('viewPlan')}
                </Button>
              </Link>
              <button
                className="text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
                onClick={onClose}
              >
                {t('close')}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
