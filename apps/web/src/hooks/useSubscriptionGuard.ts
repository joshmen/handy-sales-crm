'use client';

import { useSession } from 'next-auth/react';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Hook to check if the current tenant's subscription is expired or past-due.
 *
 * Usage:
 *   const { isReadOnly } = useSubscriptionGuard();
 *   <Button disabled={isReadOnly}>Guardar</Button>
 *
 * The backend enforces write blocks via 403 SUBSCRIPTION_EXPIRED,
 * so this hook is for proactive UI disabling only.
 */
export function useSubscriptionGuard() {
  const { data: session } = useSession();
  const companyCtx = useCompanySettingsSafe();

  // Primary source: CompanyContext (loaded from API)
  // Fallback: session user cast (set by some auth callbacks)
  const status =
    companyCtx?.subscriptionStatus ??
    ((session?.user as Record<string, unknown>)?.subscriptionStatus as string | undefined);

  const isExpired = status === 'Expired' || status === 'PastDue';
  const isReadOnly = isExpired;

  return { isExpired, isReadOnly, subscriptionStatus: status ?? null };
}

/**
 * Safe wrapper — returns null if CompanyProvider is not mounted yet
 * (e.g., on public pages or during SSR).
 */
function useCompanySettingsSafe() {
  try {
    // useCompany throws if called outside CompanyProvider
    const { settings } = useCompany();
    return settings;
  } catch {
    return null;
  }
}
