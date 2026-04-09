'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Trash2, Download, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';
import { useTheme } from '@/stores/useUIStore';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

interface SystemTabProps {
  companySettings: {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export const SystemTab: React.FC<SystemTabProps> = ({
  companySettings,
  isAdmin,
  isSuperAdmin
}) => {
  const t = useTranslations('settings.system');
  const { formatDate } = useFormatters();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setHealthLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';
        const res = await fetch(`${apiUrl}/health`);
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
          setHealthError(false);
        } else {
          setHealthError(true);
        }
      } catch {
        setHealthError(true);
      } finally {
        setHealthLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const formatTimestamp = (ts: string) => {
    try {
      return formatDate(ts, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('appVersion')}</Label>
            {healthLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {health?.version ? `v${health.version}` : t('notAvailable')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('lastCheck')}</Label>
            <p className="text-sm text-muted-foreground">
              {health?.timestamp ? formatTimestamp(health.timestamp) : t('notAvailable')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('database')}</Label>
            <div className="flex items-center gap-2">
              {healthLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : healthError ? (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              )}
              <p className="text-sm text-muted-foreground">
                {healthLoading ? t('verifying') : healthError ? t('connectionError') : t('connected')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('server')}</Label>
            <div className="flex items-center gap-2">
              {healthLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : healthError ? (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              )}
              <p className="text-sm text-muted-foreground">
                {healthLoading ? t('verifying') : healthError ? t('noResponse') : health?.status === 'healthy' ? t('online') : t('degraded')}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('systemActions')}</h3>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{t('clearCache')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('clearCacheDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Only clear app-specific keys, preserve auth session
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && (key.startsWith('handy') || key.startsWith('company_') || key === 'sidebar-collapsed')) {
                        keysToRemove.push(key);
                      }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    sessionStorage.clear();
                    toast({
                      title: t('cacheCleared'),
                      description: t('cacheDesc'),
                    });
                  }}
                >
                  {t('clear')}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{t('exportConfig')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('exportConfigDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const config = {
                      theme: isDarkMode ? 'dark' : 'light',
                      companySettings: isAdmin ? companySettings : undefined,
                      exportDate: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(config, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `handysuites-config-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({
                      title: t('configExported'),
                      description: t('configExportedDesc'),
                    });
                  }}
                >
                  {t('exportBtn')}
                </Button>
              </div>
            </div>

            {(isAdmin || isSuperAdmin) && (
              <div className="rounded-lg border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-300">
                      {t('adminInfo')}
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      {t('adminInfoDesc')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
