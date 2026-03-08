import { api } from '@/lib/api';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/subscription';

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

  async cancelSubscription(): Promise<void> {
    await api.post('/api/subscription/cancel');
  },
};
