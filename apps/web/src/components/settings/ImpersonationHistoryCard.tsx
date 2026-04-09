'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { impersonationService } from '@/services/api/impersonation';
import { ImpersonationSession } from '@/types/impersonation';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

export const ImpersonationHistoryCard: React.FC = () => {
  const { formatDate } = useFormatters();
  const t = useTranslations('impersonationHistory');
  const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 5;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await impersonationService.getTenantHistory({ page, pageSize });
      setSessions(data.sessions);
      setTotalCount(data.totalCount);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="warning" className="text-xs">{t('statusActive')}</Badge>;
      case 'ENDED':
        return <Badge variant="success" className="text-xs">{t('statusEnded')}</Badge>;
      case 'EXPIRED':
        return <Badge variant="secondary" className="text-xs">{t('statusExpired')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const accessBadge = (level: string) => {
    if (level === 'READ_ONLY') {
      return <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">{t('readOnly')}</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">{t('readWrite')}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('loadingHistory')}</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ShieldCheck className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium">{t('noAccessTitle')}</p>
            <p className="text-xs">{t('noAccessDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact table for desktop, cards for mobile */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">{t('columnAdmin')}</th>
                    <th className="text-left py-2 font-medium">{t('columnReason')}</th>
                    <th className="text-left py-2 font-medium">{t('columnAccess')}</th>
                    <th className="text-left py-2 font-medium">{t('columnDate')}</th>
                    <th className="text-left py-2 font-medium">{t('columnDuration')}</th>
                    <th className="text-left py-2 font-medium">{t('columnStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{s.superAdminName}</td>
                      <td className="py-2.5 text-muted-foreground max-w-[200px] truncate">{s.reason}</td>
                      <td className="py-2.5">{accessBadge(s.accessLevel)}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatDate(s.startedAt, {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 text-muted-foreground">{s.durationFormatted}</td>
                      <td className="py-2.5">{statusBadge(s.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.superAdminName}</span>
                    {statusBadge(s.status)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(s.startedAt, {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}</span>
                    <span>·</span>
                    <span>{s.durationFormatted}</span>
                    <span>·</span>
                    {accessBadge(s.accessLevel)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {t('totalAccess', { count: totalCount })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs px-2">{page} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
