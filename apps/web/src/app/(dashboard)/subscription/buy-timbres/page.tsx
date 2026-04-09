'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { SbBilling } from '@/components/layout/DashboardIcons';
import { useTranslations } from 'next-intl';
import { subscriptionService } from '@/services/api/subscriptions';
import type { TimbreBalance } from '@/types/subscription';
import { TIMBRE_PACKAGES } from '@/types/subscription';

export default function BuyTimbresPage() {
  const t = useTranslations('subscription');
  const tb = useTranslations('subscription.buyTimbres');
  const tc = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timbres, setTimbres] = useState<TimbreBalance | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<number>(50);
  const [purchasing, setPurchasing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await subscriptionService.getTimbres();
      setTimbres(data);
    } catch {
      toast({ title: tb('errorLoadingBalance'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { url } = await subscriptionService.createTimbreCheckout(selectedPackage);
      window.location.href = url;
    } catch {
      toast({ title: tb('errorStartingPurchase'), variant: 'destructive' });
      setPurchasing(false);
    }
  };

  const selectedPkg = TIMBRE_PACKAGES.find(p => p.cantidad === selectedPackage)!;
  const formatMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  if (loading) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title'), href: '/subscription' },
        { label: tb('title') },
      ]}
      title={tb('title')}
      subtitle={tb('subtitle')}
    >
      <div className="max-w-3xl mx-auto">
        {/* Current balance */}
        {timbres && (
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center"><SbBilling size={32} /></div>
              <div>
                <p className="text-sm font-medium">{tb('currentBalance')}</p>
                <p className="text-xs text-muted-foreground">
                  {tb('usedThisMonth', { used: timbres.usados, max: timbres.maximo })}
                  {timbres.extras > 0 && ` · ${tb('extrasAvailable', { extras: timbres.extras })}`}
                  {' · '}<span className="font-semibold text-green-600">{tb('available', { count: timbres.disponibles })}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Package selection */}
        <h2 className="text-lg font-bold mb-4">{tb('selectPackage')}</h2>
        <div role="radiogroup" aria-label={tb('selectPackageAria')} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TIMBRE_PACKAGES.map((pkg) => (
            <button
              key={pkg.cantidad}
              role="radio"
              aria-checked={selectedPackage === pkg.cantidad}
              onClick={() => setSelectedPackage(pkg.cantidad)}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                selectedPackage === pkg.cantidad
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              {pkg.badge && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-bold uppercase bg-success text-success-foreground rounded-full">
                  {pkg.badge}
                </span>
              )}
              {selectedPackage === pkg.cantidad && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              <p className="text-3xl font-bold mb-1">{pkg.cantidad}</p>
              <p className="text-xs text-muted-foreground mb-3">{tb('timbres')}</p>
              <p className="text-lg font-semibold">{formatMXN(pkg.precio)}</p>
              <p className="text-xs text-muted-foreground">{formatMXN(pkg.precioUnitario)}{tb('perTimbre')}</p>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {tc('cancel')}
          </button>
          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="h-11 px-8 bg-success hover:bg-success/90 text-white font-medium rounded-xl"
          >
            {purchasing ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {tb('processing')}</>
            ) : (
              <><ShieldCheck className="w-4 h-4 mr-2" /> {tb('pay', { amount: formatMXN(selectedPkg.precio) })}</>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {tb('securePayment')}
        </p>
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{tb('exitPurchase')}</h3>
            <p className="text-sm text-muted-foreground mb-5">{tb('noCharge')}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCancelConfirm(false)}>
                {tb('continueShopping')}
              </Button>
              <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => router.push('/subscription')}>
                {tb('exit')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageHeader>
  );
}
