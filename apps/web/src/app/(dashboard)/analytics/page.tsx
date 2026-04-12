'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { BarChart3, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

interface Dashboard {
  id: number;
  title: string;
  slug: string | null;
  uuid: string; // embedded UUID
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [embedding, setEmbedding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);

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
    } catch {
      setError(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Get guest token for embedding
  const fetchGuestToken = useCallback(async (dashboardUuid: string): Promise<string> => {
    const res = await api.post<{ token: string }>('/api/analytics/guest-token', {
      dashboardIds: [dashboardUuid],
    });
    return res.data.token;
  }, []);

  // Embed the dashboard using Superset SDK
  const doEmbed = useCallback(async (dashboard: Dashboard) => {
    if (!mountRef.current) return;

    try {
      setEmbedding(true);
      // Clear previous embed
      mountRef.current.innerHTML = '';

      await embedDashboard({
        id: dashboard.uuid,
        supersetDomain: supersetUrl,
        mountPoint: mountRef.current,
        fetchGuestToken: () => fetchGuestToken(dashboard.uuid),
        dashboardUiConfig: {
          hideTitle: true,
          hideChartControls: false,
          hideTab: false,
        },
      });

      // Style the iframe that Superset SDK creates
      const iframe = mountRef.current.querySelector('iframe');
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100vh - 280px)';
        iframe.style.minHeight = '500px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '0.75rem';
      }
    } catch (err) {
      toast.error(t('errorToken'));
    } finally {
      setEmbedding(false);
    }
  }, [supersetUrl, fetchGuestToken]);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  useEffect(() => {
    if (selectedDashboard) {
      doEmbed(selectedDashboard);
    }
  }, [selectedDashboard, doEmbed]);

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <Button variant="outline" size="sm" onClick={fetchDashboards} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
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

        {/* Empty state */}
        {!loading && !error && dashboards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <BarChart3 className="w-16 h-16 mb-4 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('noDashboards')}</p>
            <p className="text-xs mt-1 text-center max-w-md">{t('noDashboardsHint')}</p>
          </div>
        )}

        {/* Embedded dashboard mount point */}
        {!loading && !error && selectedDashboard && (
          <div className="bg-surface-2 rounded-xl border border-border-subtle shadow-elevation-1 overflow-hidden">
            {embedding && (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <div ref={mountRef} className={embedding ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'} />
          </div>
        )}
      </div>
    </PageHeader>
  );
}
