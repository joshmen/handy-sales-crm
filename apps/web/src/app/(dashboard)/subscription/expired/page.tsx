'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { subscriptionService } from '@/services/api/subscriptions';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/subscription';
import { useTranslations } from 'next-intl';
import { useFormatters } from '@/hooks/useFormatters';

export default function SubscriptionExpiredPage() {
  const te = useTranslations('subscription.expired');
  const { formatCurrency } = useFormatters();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      subscriptionService.getPlans(),
      subscriptionService.getCurrentSubscription(),
    ]).then(([plansResult, subResult]) => {
      if (plansResult.status === 'fulfilled') setPlans(plansResult.value);
      if (subResult.status === 'fulfilled') setSubscription(subResult.value);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.codigo === 'FREE') {
      router.push('/subscription');
      return;
    }

    try {
      setCheckoutLoading(plan.codigo);
      // Redirect to main subscription page which handles embedded checkout
      router.push(`/subscription?upgrade=${plan.codigo}`);
    } catch {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (price: number) =>
    formatCurrency(price);

  const graceEnd = subscription?.gracePeriodEnd ? new Date(subscription.gracePeriodEnd) : null;
  const daysLeft = graceEnd
    ? Math.max(0, Math.ceil((graceEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/30 dark:via-background dark:to-orange-950/30 p-4">
      <div className="max-w-5xl mx-auto pt-8">
        {/* Alert Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-red-900 mb-1">
                {te('title')}
              </h1>
              <p className="text-red-700 text-sm">
                {daysLeft !== null && daysLeft > 0
                  ? te('graceMessage', { days: daysLeft, plural: daysLeft !== 1 ? 's' : '' })
                  : te('renewMessage')}
              </p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-1">
            {te('choosePlan')}
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-8">
            {te('allPlansInclude')}
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.filter(p => p.codigo !== 'FREE').map((plan) => {
                const isMostPopular = plan.codigo === 'PRO' || plan.orden === plans.length;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-6 bg-surface-2 ${
                      isMostPopular
                        ? 'border-2 border-blue-500 shadow-xl relative'
                        : 'border-border-subtle'
                    }`}
                  >
                    {isMostPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {te('mostPopular')}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold mb-1">{plan.nombre}</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        {te('upToUsers', { count: plan.maxUsuarios })}
                      </p>
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(plan.precioMensual)}
                        <span className="text-sm font-normal text-muted-foreground">{te('perMonth')}</span>
                      </div>
                      {plan.precioAnual > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          {formatPrice(plan.precioAnual)}{te('perYear')} ({te('savePercent', { percent: Math.round((1 - plan.precioAnual / (plan.precioMensual * 12)) * 100) })})
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {te('upToUsers', { count: plan.maxUsuarios })}
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {plan.maxProductos > 0 ? te('products', { count: plan.maxProductos }) : te('unlimitedProducts')}
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {plan.maxClientesPorMes > 0 ? te('clientsPerMonth', { count: plan.maxClientesPorMes }) : te('unlimitedClients')}
                      </li>
                      {plan.incluyeReportes && (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {te('advancedReports')}
                        </li>
                      )}
                      {plan.incluyeSoportePrioritario && (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {te('prioritySupport')}
                        </li>
                      )}
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={checkoutLoading !== null}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                        isMostPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {checkoutLoading === plan.codigo ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        te('activatePlan')
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Options */}
        <div className="bg-surface-2 border border-border-subtle rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold mb-5 text-center">
            {te('needHelp')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-blue-50 rounded-full inline-block mb-3">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-medium text-sm mb-1">{te('callUs')}</h4>
              <p className="text-sm text-muted-foreground">+52 555 123 4567</p>
              <p className="text-xs text-muted-foreground">{te('monFri')}</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-green-50 rounded-full inline-block mb-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-medium text-sm mb-1">WhatsApp</h4>
              <p className="text-sm text-muted-foreground">+52 555 123 4567</p>
              <p className="text-xs text-muted-foreground">{te('immediateResponse')}</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-purple-50 rounded-full inline-block mb-3">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <h4 className="font-medium text-sm mb-1">Email</h4>
              <p className="text-sm text-muted-foreground">ventas@handysuites.com</p>
              <p className="text-xs text-muted-foreground">{te('responseTime')}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-surface-2 border border-border-subtle rounded-xl p-5 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-sm mb-0.5">{te('paymentMethods')}</h3>
              <p className="text-xs text-muted-foreground">{te('securePayment')}</p>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <CreditCard className="h-6 w-6" />
              <span className="text-xs">VISA</span>
              <span className="text-xs">MasterCard</span>
              <span className="text-xs">AMEX</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="text-center pb-8">
          <button
            onClick={handleLogout}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 transition-colors"
          >
            {te('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
