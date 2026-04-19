import { api } from '@/lib/api';
import type { SubscriptionPlan, SubscriptionStatus, StripeInvoice, StripePaymentMethod, TimbreBalance, TimbrePurchaseRecord, TimbrePackage, PaginatedStripeResult } from '@/types/subscription';

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await api.get<SubscriptionPlan[]>('/api/subscription/plans');
    return data;
  },

  async getCurrentSubscription(): Promise<SubscriptionStatus> {
    const { data } = await api.get<SubscriptionStatus>('/api/subscription/current');
    return data;
  },

  async createCheckoutSession(
    planCode: string,
    interval: 'month' | 'year',
    returnUrl: string
  ): Promise<{ clientSecret: string; sessionId: string }> {
    const { data } = await api.post<{ clientSecret: string; sessionId: string }>('/api/subscription/checkout', {
      planCode,
      interval,
      returnUrl,
    });
    return data;
  },

  async createPortalSession(returnUrl: string): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>('/api/subscription/portal', {
      returnUrl,
    });
    return data;
  },

  async createTrialCheckoutSession(
    planCode: string,
    interval: 'month' | 'year',
    returnUrl: string
  ): Promise<{ clientSecret: string; sessionId: string }> {
    const { data } = await api.post<{ clientSecret: string; sessionId: string }>('/api/subscription/trial-checkout', {
      planCode,
      interval,
      returnUrl,
    });
    return data;
  },

  async cancelSubscription(): Promise<void> {
    await api.post('/api/subscription/cancel');
  },

  async reactivateSubscription(): Promise<void> {
    await api.post('/api/subscription/reactivate');
  },

  async getInvoices(cursor?: string): Promise<PaginatedStripeResult<StripeInvoice>> {
    const params = cursor ? { cursor } : {};
    const { data } = await api.get<PaginatedStripeResult<StripeInvoice>>('/api/subscription/invoices', { params });
    return data;
  },

  async getPaymentMethods(cursor?: string): Promise<PaginatedStripeResult<StripePaymentMethod>> {
    const params = cursor ? { cursor } : {};
    const { data } = await api.get<PaginatedStripeResult<StripePaymentMethod>>('/api/subscription/payment-methods', { params });
    return data;
  },

  async createSetupIntent(): Promise<{ clientSecret: string }> {
    const { data } = await api.post<{ clientSecret: string }>('/api/subscription/setup-intent');
    return data;
  },

  async getTimbres(): Promise<TimbreBalance> {
    const { data } = await api.get<TimbreBalance>('/api/subscription/timbres');
    return data;
  },

  async getTimbrePackages(): Promise<TimbrePackage[]> {
    const { data } = await api.get<TimbrePackage[]>('/api/subscription/timbre-packages');
    return data;
  },

  async createTimbreCheckout(timbrePackageId: number): Promise<{ clientSecret: string }> {
    const { data } = await api.post<{ clientSecret: string }>('/api/subscription/timbres/checkout', { timbrePackageId });
    return data;
  },

  async getTimbrePurchases(): Promise<TimbrePurchaseRecord[]> {
    const { data } = await api.get<TimbrePurchaseRecord[]>('/api/subscription/timbres/purchases');
    return data;
  },

  async redimirCupon(codigo: string): Promise<CuponRedeemResponse> {
    const { data } = await api.post<CuponRedeemResponse>('/api/subscription/redimir-cupon', { codigo });
    return data;
  },
};

export interface CuponRedeemResponse {
  message: string;
  beneficio: string;
  tipo: 'MesesGratis' | 'UpgradePlan' | 'DescuentoPorcentaje' | 'PlanGratisPermanente';
}
