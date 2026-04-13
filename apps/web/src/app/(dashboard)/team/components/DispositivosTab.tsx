'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@/hooks/useToast';
import { formatTimeAgo } from '@/lib/utils';
import { deviceSessionService } from '@/services/api';
import type { DeviceSessionDto } from '@/services/api/deviceSessions';
import { Modal } from '@/components/ui/Modal';
import {
  Smartphone,
  Monitor,
  HelpCircle,
  Shield,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Wifi,
  TabletSmartphone,
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

// ============ Helpers ============

function getDeviceIcon(deviceType: number) {
  switch (deviceType) {
    case 2: case 3: return Smartphone;
    case 1: case 4: return Monitor;
    default: return HelpCircle;
  }
}

function getStatusKey(status: number): string {
  switch (status) {
    case 0: return 'activeStatus';
    case 1: return 'loggedOut';
    case 2: return 'expired';
    case 3: return 'revokedAdmin';
    case 4: return 'revokedUser';
    case 5: return 'unbinding';
    case 6: return 'unbound';
    default: return 'unknown';
  }
}

function getStatusClassName(status: number): string {
  switch (status) {
    case 0: return 'text-green-700 bg-green-100';
    case 1: case 2: return 'text-foreground/70 bg-surface-3';
    case 3: return 'text-red-700 bg-red-100';
    case 4: return 'text-orange-700 bg-orange-100';
    case 5: return 'text-yellow-700 bg-yellow-100 animate-pulse';
    case 6: return 'text-purple-700 bg-purple-100';
    default: return 'text-foreground/70 bg-surface-3';
  }
}

// ============ Component ============

export function DispositivosTab() {
  const t = useTranslations('team.devices');
  const tc = useTranslations('common');
  const { formatDate } = useFormatters();
  const [sessions, setSessions] = useState<DeviceSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ type: 'revoke' | 'clean'; session?: DeviceSessionDto } | null>(null);
  const pageSize = 15;

  const fetchSessions = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true); setError(null);
      const data = await deviceSessionService.getActiveSessions();
      setSessions(data);
      return true;
    } catch (err) {
      console.error('Error loading devices:', err);
      setError(t('errorLoadingMsg'));
      return false;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleRefresh = useCallback(async () => {
    const success = await fetchSessions();
    if (success) toast.success(t('deviceListUpdated'));
  }, [fetchSessions]);

  const handleRevokeSession = useCallback((session: DeviceSessionDto) => {
    if (session.esSesionActual) { toast.warning(t('cannotRevokeSelf')); return; }
    setConfirmAction({ type: 'revoke', session });
  }, []);

  const executeRevoke = useCallback(async () => {
    const session = confirmAction?.session;
    if (!session) return;
    setConfirmAction(null);
    try {
      setRevokingId(session.id);
      await deviceSessionService.revokeSession(session.id, t('revokeReasonAdmin'));
      toast.success(t('sessionRevokedSuccess', { name: session.usuarioNombre }));
      await fetchSessions();
    } catch (err) {
      console.error('Error revoking session:', err);
      toast.error(t('errorRevokingSession'));
    } finally { setRevokingId(null); }
  }, [confirmAction, fetchSessions]);

  const handleCleanExpired = useCallback(() => { setConfirmAction({ type: 'clean' }); }, []);

  const executeCleanExpired = useCallback(async () => {
    setConfirmAction(null);
    try {
      setCleaningExpired(true);
      const count = await deviceSessionService.cleanExpiredSessions(30);
      toast.success(t('expiredCleaned', { count }));
      await fetchSessions();
    } catch (err) {
      console.error('Error cleaning expired sessions:', err);
      toast.error(t('errorRevokingSession'));
    } finally { setCleaningExpired(false); }
  }, [fetchSessions]);

  const filteredSessions = useMemo(() => sessions.filter(session => {
    const matchesSearch = searchTerm === '' ||
      session.usuarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.deviceTypeNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.ipAddress || '').includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || session.status === parseInt(filterStatus);
    return matchesSearch && matchesStatus;
  }), [sessions, searchTerm, filterStatus]);

  const totalItems = filteredSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedSessions = filteredSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(prev => Math.min(prev, totalPages)); }, [totalPages]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const active = sessions.filter(s => s.status === 0).length;
    const android = sessions.filter(s => s.deviceType === 2).length;
    const ios = sessions.filter(s => s.deviceType === 3).length;
    const web = sessions.filter(s => s.deviceType === 1 || s.deviceType === 4).length;
    return { total: sessions.length, active, android, ios, web };
  }, [sessions]);

  const renderSkeleton = () => (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border animate-pulse">
          <div className="w-[180px] space-y-2"><div className="h-4 bg-muted rounded w-28" /><div className="h-3 bg-muted/50 rounded w-20" /></div>
          <div className="w-[200px] flex items-center gap-2"><div className="w-5 h-5 bg-muted rounded" /><div className="space-y-1.5"><div className="h-4 bg-muted rounded w-32" /><div className="h-3 bg-muted/50 rounded w-24" /></div></div>
          <div className="w-[130px] space-y-1.5"><div className="h-4 bg-muted rounded w-16" /><div className="h-3 bg-muted/50 rounded w-12" /></div>
          <div className="w-[130px]"><div className="h-4 bg-muted rounded w-20" /></div>
          <div className="w-[100px]"><div className="h-5 bg-muted rounded-full w-16" /></div>
          <div className="flex-1 flex justify-end"><div className="h-7 bg-muted rounded w-20" /></div>
        </div>
      ))}
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4"><Shield className="w-8 h-8 text-red-400" /></div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{t('errorLoadingDevices')}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-4">{error}</p>
      <button onClick={fetchSessions} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 transition-colors">
        <RefreshCw className="w-4 h-4" />{t('retry')}
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Smartphone className="w-8 h-8 text-muted-foreground" /></div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{t('noActiveSessions')}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {searchTerm || filterStatus !== 'all' ? t('noDevicesFiltered') : t('noDevicesConnected')}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button onClick={handleCleanExpired} disabled={cleaningExpired || loading} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50">
          {cleaningExpired ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />}
          <span>{t('cleanExpired')}</span>
        </button>
        <button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>{t('refresh')}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder={t('searchPlaceholder')} aria-label={t('searchLabel')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label={t('filterLabel')} className="w-full sm:w-48 px-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-surface-2">
          <option value="all">{t('allStatuses')}</option>
          <option value="0">{t('activeStatus')}</option>
          <option value="1">{t('loggedOut')}</option>
          <option value="2">{t('expired')}</option>
          <option value="3">{t('revokedAdmin')}</option>
          <option value="4">{t('revokedUser')}</option>
          <option value="5">{t('unbinding')}</option>
          <option value="6">{t('unbound')}</option>
        </select>
        <div className="hidden sm:block ml-auto text-xs text-muted-foreground">{!loading && t('sessionCount', { count: totalItems })}</div>
      </div>

      {!loading && !error && sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: t('total'), value: stats.total, icon: TabletSmartphone, color: 'text-foreground/80 bg-surface-1 border-border-subtle' },
            { label: t('activeLabel'), value: stats.active, icon: Wifi, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Android', value: stats.android, icon: Smartphone, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'iOS', value: stats.ios, icon: Smartphone, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Web', value: stats.web, icon: Monitor, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          ].map((stat) => (
            <div key={stat.label} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${stat.color}`}>
              <stat.icon className="w-5 h-5 flex-shrink-0 opacity-60" />
              <div><p className="text-lg font-bold leading-none">{stat.value}</p><p className="text-[11px] opacity-70 mt-0.5">{stat.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">{renderError()}</div>}

      {!error && (<>
        <div className="md:hidden space-y-3">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border-subtle rounded-lg p-4 bg-surface-2 animate-pulse space-y-3">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-surface-3 rounded-full" /><div className="flex-1 space-y-1.5"><div className="h-4 bg-surface-3 rounded w-32" /><div className="h-3 bg-surface-3 rounded w-24" /></div></div>
              <div className="flex justify-between"><div className="h-5 bg-surface-3 rounded-full w-16" /><div className="h-7 bg-surface-3 rounded w-20" /></div>
            </div>
          ))}
          {!loading && paginatedSessions.length === 0 && renderEmpty()}
          {!loading && paginatedSessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.deviceType);
            const sKey = getStatusKey(session.status);
            const sClass = getStatusClassName(session.status);
            return (
              <div key={session.id} className={`border border-border-subtle rounded-lg p-4 bg-surface-2 ${session.esSesionActual ? 'ring-2 ring-green-200 border-green-300' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0"><DeviceIcon className="w-5 h-5 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{session.usuarioNombre}</span>
                      {session.esSesionActual && <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{t('yourSession')}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{session.deviceName || session.deviceTypeNombre}{session.osVersion && ` - ${session.osVersion}`}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                  {session.appVersion && <span>v{session.appVersion}</span>}
                  <span>{t('since')} {formatDate(session.loggedInAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{formatTimeAgo(session.lastActivity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${sClass}`}>{t(sKey)}</span>
                  {session.status === 0 && !session.esSesionActual && (
                    <button onClick={() => handleRevokeSession(session)} disabled={revokingId === session.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50">
                      {revokingId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      <span>{t('revoke')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
          {loading ? renderSkeleton() : paginatedSessions.length === 0 ? renderEmpty() : (
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-surface-1">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-[180px]">{t('vendorCol')}</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-[220px]">{t('deviceCol')}</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-[130px]">{t('connectedSince')}</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-[130px]">{t('lastActivity')}</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-[110px]">{t('statusCol')}</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-foreground w-[100px]">{tc('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {paginatedSessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.deviceType);
                  const sKey = getStatusKey(session.status);
                  const sClass = getStatusClassName(session.status);
                  return (
                    <tr key={session.id} className={`hover:bg-amber-50 transition-colors ${session.esSesionActual ? 'bg-green-50/40' : ''}`}>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div><div className="text-sm font-medium text-foreground">{session.usuarioNombre}</div>{session.ipAddress && <div className="text-[11px] text-muted-foreground">{session.ipAddress}</div>}</div>{session.esSesionActual && <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{t('yourSession')}</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><DeviceIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" /><div><div className="text-sm text-foreground">{session.deviceName || session.deviceTypeNombre}</div><div className="text-[11px] text-muted-foreground">{[session.osVersion, session.appVersion ? `v${session.appVersion}` : null, session.deviceModel].filter(Boolean).join(' / ')}</div></div></div></td>
                      <td className="px-4 py-3"><div className="text-sm text-foreground/80" title={formatDate(session.loggedInAt)}>{formatDate(session.loggedInAt, { day: '2-digit', month: 'short' })}</div><div className="text-[11px] text-muted-foreground">{formatDate(session.loggedInAt, { hour: '2-digit', minute: '2-digit' })}</div></td>
                      <td className="px-4 py-3"><div className="text-sm text-foreground/80" title={formatDate(session.lastActivity)}>{formatTimeAgo(session.lastActivity)}</div></td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 text-[11px] font-medium rounded-full ${sClass}`}>{t(sKey)}</span></td>
                      <td className="px-4 py-3 text-right">{session.status === 0 && !session.esSesionActual ? (
                        <button onClick={() => handleRevokeSession(session)} disabled={revokingId === session.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50">
                          {revokingId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}<span>{t('revoke')}</span>
                        </button>
                      ) : <span className="text-xs text-muted-foreground">&mdash;</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalItems > pageSize && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">{t('showing', { start: startItem, end: endItem, total: totalItems })}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label={t('prevPage')} className="px-3 py-2 border border-border-subtle rounded-md text-foreground/70 hover:bg-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter((page) => { if (totalPages <= 5) return true; if (page === 1 || page === totalPages) return true; return Math.abs(page - currentPage) <= 1; }).reduce<(number | string)[]>((acc, page, idx, arr) => { if (idx > 0) { const prev = arr[idx - 1]; if (page - prev > 1) acc.push('...'); } acc.push(page); return acc; }, []).map((page, idx) => (
                <button key={typeof page === 'number' ? `page-${page}` : `ellipsis-${idx}`} onClick={() => typeof page === 'number' && setCurrentPage(page)} disabled={page === '...'} className={`min-w-[32px] px-2 py-1.5 text-sm rounded-md transition-colors ${page === currentPage ? 'bg-success text-success-foreground' : page === '...' ? 'text-muted-foreground cursor-default' : 'text-foreground/70 hover:bg-surface-3'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label={t('nextPage')} className="px-3 py-2 border border-border-subtle rounded-md text-foreground/70 hover:bg-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </>)}

      <Modal isOpen={confirmAction !== null} onClose={() => setConfirmAction(null)} title={confirmAction?.type === 'revoke' ? t('revokeSession') : t('cleanExpiredSessions')} size="sm">
        {confirmAction?.type === 'revoke' && confirmAction.session && (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">{t('revokeConfirm', { user: confirmAction.session.usuarioNombre, device: confirmAction.session.deviceName || confirmAction.session.deviceTypeNombre })}</p>
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2"><p className="text-xs text-red-700">{t('revokeWarning')}</p></div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-xs font-medium text-foreground/80 border border-border-subtle rounded-md hover:bg-surface-1 transition-colors">{tc('cancel')}</button>
              <button onClick={executeRevoke} className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">{t('revokeSessionBtn')}</button>
            </div>
          </div>
        )}
        {confirmAction?.type === 'clean' && (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">{t('cleanConfirm')}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2"><p className="text-xs text-amber-700">{t('cleanWarning')}</p></div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-xs font-medium text-foreground/80 border border-border-subtle rounded-md hover:bg-surface-1 transition-colors">{tc('cancel')}</button>
              <button onClick={executeCleanExpired} className="px-4 py-2 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors">{t('cleanExpiredBtn')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
