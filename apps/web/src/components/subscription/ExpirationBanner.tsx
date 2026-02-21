'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { subscriptionService } from '@/services/api/subscriptions';
import type { SubscriptionStatus } from '@/types/subscription';
import { UserRole } from '@/types/users';

export function ExpirationBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't fetch for SuperAdmin or if no session
    if (!session?.accessToken || session.user?.role === UserRole.SUPER_ADMIN) return;

    let mounted = true;
    subscriptionService.getCurrentSubscription()
      .then((data) => {
        if (mounted) setSubscription(data);
      })
      .catch(() => {
        // Silently fail — banner is non-critical
      });

    return () => { mounted = false; };
  }, [session?.accessToken, session?.user?.role]);

  if (dismissed || !subscription) return null;

  const now = new Date();
  const expDate = subscription.fechaExpiracion ? new Date(subscription.fechaExpiracion) : null;
  const graceEnd = subscription.gracePeriodEnd ? new Date(subscription.gracePeriodEnd) : null;
  const status = subscription.subscriptionStatus;

  // Don't show banner for active subscriptions with plenty of time
  // Don't show for Free plan (no expiration)
  if (subscription.planTipo === 'free' || subscription.planTipo === 'FREE') return null;

  let bannerType: 'warning' | 'danger' | null = null;
  let message = '';
  let actionLabel = '';

  if (status === 'PastDue') {
    bannerType = 'danger';
    message = 'Hubo un problema con tu pago. Actualiza tu método de pago para evitar la suspensión del servicio.';
    actionLabel = 'Actualizar pago';
  } else if (status === 'Expired' && graceEnd && graceEnd > now) {
    const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    bannerType = 'danger';
    message = `Tu suscripción ha expirado. Tienes ${daysLeft} día${daysLeft !== 1 ? 's' : ''} para renovar antes de que se suspenda el acceso.`;
    actionLabel = 'Renovar ahora';
  } else if (status === 'Cancelled') {
    if (expDate && expDate > now) {
      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      bannerType = 'warning';
      message = `Tu suscripción fue cancelada. El acceso continúa hasta el ${expDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} (${daysLeft} día${daysLeft !== 1 ? 's' : ''}).`;
      actionLabel = 'Reactivar';
    }
  } else if (expDate && status === 'Active') {
    const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      bannerType = 'warning';
      message = `Tu suscripción expira en ${daysUntilExpiry} día${daysUntilExpiry !== 1 ? 's' : ''}. Renueva para mantener el acceso sin interrupciones.`;
      actionLabel = 'Renovar';
    }
  }

  if (!bannerType) return null;

  const isWarning = bannerType === 'warning';
  const bgClass = isWarning
    ? 'bg-amber-50 border-amber-200'
    : 'bg-red-50 border-red-200';
  const textClass = isWarning ? 'text-amber-800' : 'text-red-800';
  const iconClass = isWarning ? 'text-amber-500' : 'text-red-500';
  const btnClass = isWarning
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white';

  return (
    <div className={`border-b ${bgClass} px-4 py-2.5`}>
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        {isWarning ? (
          <Clock className={`h-4 w-4 flex-shrink-0 ${iconClass}`} />
        ) : (
          <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${iconClass}`} />
        )}
        <p className={`text-sm flex-1 ${textClass}`}>{message}</p>
        <button
          onClick={() => router.push('/subscription')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex-shrink-0 ${btnClass}`}
        >
          {actionLabel}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className={`p-1 rounded hover:bg-black/5 transition-colors flex-shrink-0 ${textClass}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
