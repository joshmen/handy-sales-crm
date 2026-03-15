'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { toast } from '@/hooks/useToast';
import { SbBilling } from '@/components/layout/DashboardIcons';
import { subscriptionService } from '@/services/api/subscriptions';
import type { TimbreBalance } from '@/types/subscription';
import { TIMBRE_PACKAGES } from '@/types/subscription';

export default function BuyTimbresPage() {
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
      toast({ title: 'Error al cargar balance de timbres', variant: 'destructive' });
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
      toast({ title: 'Error al iniciar la compra', variant: 'destructive' });
      setPurchasing(false);
    }
  };

  const selectedPkg = TIMBRE_PACKAGES.find(p => p.cantidad === selectedPackage)!;
  const formatMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  if (loading) return <BrandedLoadingScreen />;

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Suscripción', href: '/subscription' },
        { label: 'Comprar timbres' },
      ]}
      title="Comprar timbres adicionales"
      subtitle="Los timbres extras no expiran y se suman a tu balance mensual"
    >
      <div className="max-w-3xl mx-auto">
        {/* Current balance */}
        {timbres && (
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center"><SbBilling size={32} /></div>
              <div>
                <p className="text-sm font-medium">Tu balance actual</p>
                <p className="text-xs text-muted-foreground">
                  {timbres.usados}/{timbres.maximo} usados este mes
                  {timbres.extras > 0 && ` · ${timbres.extras} extras disponibles`}
                  {' · '}<span className="font-semibold text-green-600">{timbres.disponibles} disponibles</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Package selection */}
        <h2 className="text-lg font-bold mb-4">Selecciona un paquete</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TIMBRE_PACKAGES.map((pkg) => (
            <button
              key={pkg.cantidad}
              onClick={() => setSelectedPackage(pkg.cantidad)}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                selectedPackage === pkg.cantidad
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              {pkg.badge && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-bold uppercase bg-green-600 text-white rounded-full">
                  {pkg.badge}
                </span>
              )}
              {selectedPackage === pkg.cantidad && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              <p className="text-3xl font-bold mb-1">{pkg.cantidad}</p>
              <p className="text-xs text-muted-foreground mb-3">timbres</p>
              <p className="text-lg font-semibold">{formatMXN(pkg.precio)}</p>
              <p className="text-xs text-muted-foreground">{formatMXN(pkg.precioUnitario)}/timbre</p>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancelar
          </button>
          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="h-11 px-8 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
          >
            {purchasing ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Procesando...</>
            ) : (
              <><ShieldCheck className="w-4 h-4 mr-2" /> Pagar {formatMXN(selectedPkg.precio)}</>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Pago seguro procesado por Stripe. Los timbres se acreditan inmediatamente.
        </p>
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">¿Salir de la compra?</h3>
            <p className="text-sm text-muted-foreground mb-5">No se realizará ningún cargo.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCancelConfirm(false)}>
                Continuar comprando
              </Button>
              <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => router.push('/subscription')}>
                Salir
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageHeader>
  );
}
