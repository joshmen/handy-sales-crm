'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Shield,
  Lock,
  WifiHigh,
  Monitor,
  Info,
} from '@phosphor-icons/react';
import { api, handleApiError } from '@/lib/api';
import { useTranslations } from 'next-intl';

// ---------- Types ----------

interface RateLimitPolicy {
  policyName: string;
  limit: number;
  windowSeconds: number;
  description: string;
  api: string;
}

interface AuthenticationConfig {
  jwtExpirationMinutes: number;
  refreshTokenExpirationDays: number;
  passwordMinLength: number;
  twoFactorEnabled: boolean;
  hashingAlgorithm: string;
}

interface SessionConfig {
  deviceBinding: boolean;
  sessionVersionValidation: boolean;
  singleSessionPerDevice: boolean;
}

interface SecurityConfig {
  rateLimiting: RateLimitPolicy[];
  authentication: AuthenticationConfig;
  sessions: SessionConfig;
}

// ---------- Helpers ----------

function EnabledBadge({ enabled, enabledLabel, disabledLabel }: { enabled: boolean; enabledLabel: string; disabledLabel: string }) {
  if (enabled) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        {enabledLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-semibold text-foreground/70">
      {disabledLabel}
    </span>
  );
}

function formatWindow(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes}min`;
  }
  return `${seconds}s`;
}

// ---------- Loading Skeleton ----------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="h-6 w-64 bg-surface-3 rounded-md animate-pulse" />

      {/* Header Skeleton */}
      <div>
        <div className="h-8 w-64 bg-surface-3 rounded-md animate-pulse mb-2" />
        <div className="h-5 w-96 bg-surface-3 rounded-md animate-pulse" />
      </div>

      {/* Cards Skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-surface-2 rounded-xl border border-border-subtle p-6 shadow-sm">
          <div className="h-6 w-48 bg-surface-3 rounded-md animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-5 w-full bg-surface-3 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Main Page ----------

export default function SecurityConfigPage() {
  const t = useTranslations('admin.security');
  const ta = useTranslations('admin');
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const response = await api.get<SecurityConfig>('/api/admin/security-config');
        setConfig(response.data);
      } catch (err) {
        const apiErr = handleApiError(err);
        setError(apiErr.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !config) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Administracion</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Seguridad</span>
        </nav>
        <div className="bg-surface-2 rounded-xl border border-border-subtle p-12 shadow-sm text-center">
          <Shield size={48} weight="duotone" className="mx-auto text-gray-300 mb-3" />
          <p className="text-muted-foreground text-sm">{error || t('loadError')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>{ta('breadcrumb')}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{t('breadcrumb')}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={28} weight="duotone" className="text-blue-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Rate Limiting Section */}
      <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-cyan-100">
            <WifiHigh size={18} weight="duotone" className="text-cyan-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t('rateLimiting')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface-1">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                  {t('colApi')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                  {t('colPolicy')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                  {t('colLimit')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                  {t('colWindow')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                  {t('colDescription')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-2 divide-y divide-gray-100">
              {config.rateLimiting.map((policy, idx) => (
                <tr key={idx} className="hover:bg-surface-1 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                      {policy.api}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {policy.policyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
                    {policy.limit.toLocaleString()} req
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
                    {formatWindow(policy.windowSeconds)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {policy.description}
                  </td>
                </tr>
              ))}
              {config.rateLimiting.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    {t('noRateLimitPolicies')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authentication Section */}
      <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100">
            <Lock size={18} weight="duotone" className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t('authentication')}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('jwtExpiration')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.jwtExpirationMinutes} {t('minutes')}
              </p>
            </div>
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('refreshTokenExpiration')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.refreshTokenExpirationDays} {t('days')}
              </p>
            </div>
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('passwordMinLength')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.passwordMinLength} {t('characters')}
              </p>
            </div>
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('twoFactorAuth')}</p>
              <EnabledBadge enabled={config.authentication.twoFactorEnabled} enabledLabel={t('enabled')} disabledLabel={t('disabled')} />
            </div>
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('hashingAlgorithm')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.hashingAlgorithm}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Section */}
      <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-100">
            <Monitor size={18} weight="duotone" className="text-violet-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t('sessions')}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('deviceBinding')}</p>
              <EnabledBadge enabled={config.sessions.deviceBinding} enabledLabel={t('enabled')} disabledLabel={t('disabled')} />
            </div>
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('sessionVersionValidation')}</p>
              <EnabledBadge enabled={config.sessions.sessionVersionValidation} enabledLabel={t('enabled')} disabledLabel={t('disabled')} />
            </div>
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('singleSessionPerDevice')}</p>
              <EnabledBadge enabled={config.sessions.singleSessionPerDevice} enabledLabel={t('enabled')} disabledLabel={t('disabled')} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
        <Info size={20} weight="fill" className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          {t('footerNote')}
        </p>
      </div>
    </div>
  );
}
