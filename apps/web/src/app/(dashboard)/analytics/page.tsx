'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { BarChart3, RefreshCw, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

interface Dashboard {
  id: number;
  title: string;
  slug: string | null;
  uuid: string | null;
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const supersetUrl = process.env.NEXT_PUBLIC_SUPERSET_URL || 'http://localhost:1084';

  // Fetch available dashboards
  const fetchDashboards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Dashboard[]>('/api/analytics/dashboards');
      setDashboards(res.data);
      if (res.data.length > 0 && !selectedDashboard) {
        setSelectedDashboard(res.data[0]);
      }
    } catch (err) {
      setError(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Get guest token for embedding
  const fetchGuestToken = useCallback(async (dashboard: Dashboard) => {
    try {
      setTokenLoading(true);
      const res = await api.post<{ token: string }>('/api/analytics/guest-token', {
        dashboardIds: [dashboard.uuid || String(dashboard.id)],
      });
      setGuestToken(res.data.token);
    } catch (err) {
      toast.error(t('errorToken'));
    } finally {
      setTokenLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  useEffect(() => {
    if (selectedDashboard) {
      fetchGuestToken(selectedDashboard);
    }
  }, [selectedDashboard, fetchGuestToken]);

  const embedUrl = selectedDashboard && guestToken
    ? `${supersetUrl}/embedded/${selectedDashboard.uuid || selectedDashboard.id}/?standalone=true&guest_token=${guestToken}`
    : null;

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={fetchDashboards} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Dashboard selector */}
        {dashboards.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {dashboards.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDashboard(d)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedDashboard?.id === d.id
                    ? 'bg-primary text-primary-foreground shadow-elevation-1'
                    : 'bg-surface-2 text-foreground/70 border border-border-subtle hover:bg-surface-3'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">{t('loadingDashboards')}</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 text-destructive/50" />
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs mt-1">{t('errorHint')}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchDashboards}>
              {tc('retry')}
            </Button>
          </div>
        )}

        {/* Empty state — no dashboards */}
        {!loading && !error && dashboards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <BarChart3 className="w-16 h-16 mb-4 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('noDashboards')}</p>
            <p className="text-xs mt-1 text-center max-w-md">{t('noDashboardsHint')}</p>
          </div>
        )}

        {/* Embedded dashboard */}
        {!loading && !error && selectedDashboard && (
          <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-elevation-1 overflow-hidden">
            {tokenLoading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : embedUrl ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full border-0"
                style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                title={selectedDashboard.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm">{t('errorToken')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageHeader>
  );
}
