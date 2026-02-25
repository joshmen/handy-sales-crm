'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/hooks/useToast';
import { deviceSessionService } from '@/services/api';
import type { DeviceSessionDto } from '@/services/api/deviceSessions';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
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
} from 'lucide-react';

// ============ Helpers ============

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'hace unos segundos';
  if (diffMin < 2) return 'hace 1 min';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHr < 2) return 'hace 1 hora';
  if (diffHr < 24) return `hace ${diffHr} horas`;
  if (diffDays < 2) return 'hace 1 día';
  if (diffDays < 30) return `hace ${diffDays} días`;
  if (diffDays < 60) return 'hace 1 mes';
  return `hace ${Math.floor(diffDays / 30)} meses`;
}

function getDeviceIcon(deviceType: number) {
  switch (deviceType) {
    case 2: // Android
    case 3: // iOS
      return Smartphone;
    case 1: // Web
    case 4: // Desktop
      return Monitor;
    default:
      return HelpCircle;
  }
}

interface StatusConfig {
  label: string;
  className: string;
}

function getStatusConfig(status: number): StatusConfig {
  switch (status) {
    case 0: // Active
      return {
        label: 'Activo',
        className: 'text-green-700 bg-green-100',
      };
    case 1: // LoggedOut
      return {
        label: 'Cerrada',
        className: 'text-gray-600 bg-gray-100',
      };
    case 2: // Expired
      return {
        label: 'Expirada',
        className: 'text-gray-600 bg-gray-100',
      };
    case 3: // RevokedByAdmin
      return {
        label: 'Revocada (Admin)',
        className: 'text-red-700 bg-red-100',
      };
    case 4: // RevokedByUser
      return {
        label: 'Revocada (Usuario)',
        className: 'text-orange-700 bg-orange-100',
      };
    case 5: // PendingUnbind
      return {
        label: 'Desvinculando...',
        className: 'text-yellow-700 bg-yellow-100 animate-pulse',
      };
    case 6: // Unbound
      return {
        label: 'Desvinculado',
        className: 'text-purple-700 bg-purple-100',
      };
    default:
      return {
        label: 'Desconocido',
        className: 'text-gray-600 bg-gray-100',
      };
  }
}

// ============ Component ============

export default function DevicesPage() {
  const [sessions, setSessions] = useState<DeviceSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deviceSessionService.getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error al cargar dispositivos:', err);
      setError('Error al cargar las sesiones de dispositivos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRefresh = useCallback(async () => {
    await fetchSessions();
    if (!error) {
      toast.success('Lista de dispositivos actualizada');
    }
  }, [fetchSessions, error]);

  const handleRevokeSession = useCallback(async (session: DeviceSessionDto) => {
    if (session.esSesionActual) {
      toast.warning('No puedes revocar tu propia sesión activa');
      return;
    }

    const confirmed = window.confirm(
      `¿Revocar la sesión de ${session.usuarioNombre} en ${session.deviceName || session.deviceTypeNombre}?\n\nEl usuario será desconectado inmediatamente.`
    );
    if (!confirmed) return;

    try {
      setRevokingId(session.id);
      await deviceSessionService.revokeSession(session.id, 'Revocada por administrador');
      setSessions(prev => prev.filter(s => s.id !== session.id));
      toast.success(`Sesión de ${session.usuarioNombre} revocada exitosamente`);
    } catch (err) {
      console.error('Error al revocar sesión:', err);
      toast.error('Error al revocar la sesión. Intenta de nuevo.');
    } finally {
      setRevokingId(null);
    }
  }, []);

  const handleCleanExpired = useCallback(async () => {
    const confirmed = window.confirm(
      '¿Limpiar todas las sesiones expiradas?\n\nEsto eliminará sesiones inactivas por más de 30 días.'
    );
    if (!confirmed) return;

    try {
      setCleaningExpired(true);
      const count = await deviceSessionService.cleanExpiredSessions(30);
      toast.success(`${count} sesión${count !== 1 ? 'es' : ''} expirada${count !== 1 ? 's' : ''} eliminada${count !== 1 ? 's' : ''}`);
      await fetchSessions();
    } catch (err) {
      console.error('Error al limpiar sesiones expiradas:', err);
      toast.error('Error al limpiar sesiones expiradas');
    } finally {
      setCleaningExpired(false);
    }
  }, [fetchSessions]);

  // Filtering
  const filteredSessions = sessions.filter(session => {
    const matchesSearch =
      searchTerm === '' ||
      session.usuarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.deviceTypeNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.ipAddress || '').includes(searchTerm);

    const matchesStatus =
      filterStatus === 'all' || session.status === parseInt(filterStatus);

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalItems = filteredSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem = totalItems > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);
  const paginatedSessions = filteredSessions.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // ============ Skeleton ============
  const renderSkeleton = () => (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 animate-pulse"
        >
          <div className="w-[180px] space-y-2">
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="w-[200px] flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded" />
            <div className="space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          </div>
          <div className="w-[140px]">
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
          <div className="w-[100px]">
            <div className="h-5 bg-gray-200 rounded-full w-16" />
          </div>
          <div className="flex-1 flex justify-end">
            <div className="h-7 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );

  // ============ Error State ============
  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Error al cargar dispositivos
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-md mb-4">
        {error}
      </p>
      <button
        onClick={fetchSessions}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );

  // ============ Empty State ============
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <Smartphone className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        No hay sesiones activas
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-md">
        {searchTerm || filterStatus !== 'all'
          ? 'No se encontraron dispositivos con los filtros aplicados'
          : 'No hay dispositivos conectados en este momento'}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-8 py-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Dispositivos' },
          ]}
        />

        {/* Title Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-1">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Dispositivos
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestiona las sesiones activas de los dispositivos conectados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanExpired}
              disabled={cleaningExpired || loading}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {cleaningExpired ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span>Limpiar Expiradas</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 sm:px-8 py-4 overflow-auto space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Buscar por vendedor, dispositivo o IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <option value="all">Todos los estados</option>
            <option value="0">Activo</option>
            <option value="1">Sesión cerrada</option>
            <option value="2">Expirada</option>
            <option value="3">Revocada (Admin)</option>
            <option value="4">Revocada (Usuario)</option>
            <option value="5">Desvinculando</option>
            <option value="6">Desvinculado</option>
          </select>
          <div className="hidden sm:block ml-auto text-xs text-gray-500">
            {!loading && `${totalItems} sesión${totalItems !== 1 ? 'es' : ''}`}
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {renderError()}
          </div>
        )}

        {/* Content */}
        {!error && (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 bg-gray-200 rounded w-32" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-5 bg-gray-200 rounded-full w-16" />
                      <div className="h-7 bg-gray-200 rounded w-20" />
                    </div>
                  </div>
                ))}

              {!loading && paginatedSessions.length === 0 && renderEmpty()}

              {!loading &&
                paginatedSessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.deviceType);
                  const statusCfg = getStatusConfig(session.status);

                  return (
                    <div
                      key={session.id}
                      className={`border border-gray-200 rounded-lg p-4 bg-white ${
                        session.esSesionActual
                          ? 'ring-2 ring-green-200 border-green-300'
                          : ''
                      }`}
                    >
                      {/* Row 1: Device info */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <DeviceIcon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-medium text-gray-900 truncate"
                              style={{
                                fontFamily: 'Space Grotesk, sans-serif',
                              }}
                            >
                              {session.usuarioNombre}
                            </span>
                            {session.esSesionActual && (
                              <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                Tu sesión
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {session.deviceName || session.deviceTypeNombre}
                            {session.osVersion && ` - ${session.osVersion}`}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                        {session.ipAddress && (
                          <span>IP: {session.ipAddress}</span>
                        )}
                        {session.appVersion && (
                          <span>v{session.appVersion}</span>
                        )}
                        <span>{timeAgo(session.lastActivity)}</span>
                      </div>

                      {/* Row 3: Status + Actions */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-1 text-[11px] font-medium rounded-full ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                        {session.status === 0 && !session.esSesionActual && (
                          <button
                            onClick={() => handleRevokeSession(session)}
                            disabled={revokingId === session.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                            style={{
                              fontFamily: 'Space Grotesk, sans-serif',
                            }}
                          >
                            {revokingId === session.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Shield className="w-3.5 h-3.5" />
                            )}
                            <span>Revocar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                renderSkeleton()
              ) : paginatedSessions.length === 0 ? (
                renderEmpty()
              ) : (
                <>
                  {/* Table Header */}
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 w-[180px]">
                          Vendedor
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 w-[220px]">
                          Dispositivo
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 w-[140px]">
                          Última Actividad
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 w-[130px]">
                          Estado
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700 w-[100px]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedSessions.map((session) => {
                        const DeviceIcon = getDeviceIcon(session.deviceType);
                        const statusCfg = getStatusConfig(session.status);

                        return (
                          <tr
                            key={session.id}
                            className={`hover:bg-gray-50 transition-colors ${
                              session.esSesionActual ? 'bg-green-50/40' : ''
                            }`}
                          >
                            {/* Vendedor */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div
                                    className="text-sm font-medium text-gray-900"
                                    style={{
                                      fontFamily: 'Space Grotesk, sans-serif',
                                    }}
                                  >
                                    {session.usuarioNombre}
                                  </div>
                                  {session.ipAddress && (
                                    <div className="text-[11px] text-gray-400">
                                      {session.ipAddress}
                                    </div>
                                  )}
                                </div>
                                {session.esSesionActual && (
                                  <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    Tu sesión
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Dispositivo */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <DeviceIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div>
                                  <div
                                    className="text-sm text-gray-900"
                                    style={{
                                      fontFamily: 'Space Grotesk, sans-serif',
                                    }}
                                  >
                                    {session.deviceName ||
                                      session.deviceTypeNombre}
                                  </div>
                                  <div className="text-[11px] text-gray-400">
                                    {[
                                      session.osVersion,
                                      session.appVersion
                                        ? `v${session.appVersion}`
                                        : null,
                                      session.deviceModel,
                                    ]
                                      .filter(Boolean)
                                      .join(' / ')}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Última Actividad */}
                            <td className="px-4 py-3">
                              <div
                                className="text-sm text-gray-700"
                                style={{
                                  fontFamily: 'Space Grotesk, sans-serif',
                                }}
                                title={new Date(
                                  session.lastActivity
                                ).toLocaleString('es-MX')}
                              >
                                {timeAgo(session.lastActivity)}
                              </div>
                            </td>

                            {/* Estado */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-[11px] font-medium rounded-full ${statusCfg.className}`}
                              >
                                {statusCfg.label}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="px-4 py-3 text-right">
                              {session.status === 0 &&
                              !session.esSesionActual ? (
                                <button
                                  onClick={() => handleRevokeSession(session)}
                                  disabled={revokingId === session.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                                  style={{
                                    fontFamily: 'Space Grotesk, sans-serif',
                                  }}
                                >
                                  {revokingId === session.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Shield className="w-3.5 h-3.5" />
                                  )}
                                  <span>Revocar</span>
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  &mdash;
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalItems > pageSize && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span
                  className="text-sm text-gray-500"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Mostrando {startItem}-{endItem} de {totalItems} sesiones
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      return Math.abs(page - safeCurrentPage) <= 1;
                    })
                    .reduce<(number | string)[]>((acc, page, idx, arr) => {
                      if (idx > 0) {
                        const prev = arr[idx - 1];
                        if (page - prev > 1) acc.push('...');
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          typeof page === 'number' && setCurrentPage(page)
                        }
                        disabled={page === '...'}
                        className={`min-w-[32px] px-2 py-1.5 text-sm rounded-md transition-colors ${
                          page === safeCurrentPage
                            ? 'bg-green-600 text-white'
                            : page === '...'
                            ? 'text-gray-400 cursor-default'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safeCurrentPage === totalPages}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
