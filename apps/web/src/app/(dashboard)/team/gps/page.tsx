'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { teamLocationService, UltimaUbicacionVendedor } from '@/services/api/teamLocation';
import { getInitials } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { RefreshCw, MapPin, ChevronRight, Users } from 'lucide-react';

/**
 * Índice de "Histórico GPS" — lista de vendedores del tenant con su última
 * actividad GPS conocida. Sigue el patrón de catálogos (clients, products):
 * PageHeader root + filter row + ErrorBanner + DataGrid con mobileCardRenderer.
 *
 * Reusa endpoint `/api/team/ubicaciones-recientes` que ya funde ambas fuentes
 * (`ClienteVisitas + UbicacionesVendedor`).
 */
export default function TeamGpsPage() {
  const t = useTranslations('team.gpsHistorial');
  const tc = useTranslations('common');
  const router = useRouter();

  const [data, setData] = useState<UltimaUbicacionVendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await teamLocationService.getUltimasUbicaciones();
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await teamLocationService.getUltimasUbicaciones();
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error desconocido';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.trim().toLowerCase();
    return data.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }, [data, searchTerm]);

  const formatTimeAgo = (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return t('justNow');
    if (min < 60) return t('minutesAgo', { count: min });
    const horas = Math.floor(min / 60);
    if (horas < 24) return t('hoursAgo', { count: horas });
    const dias = Math.floor(horas / 24);
    return t('daysAgo', { count: dias });
  };

  const fuenteLabel = (f: string): string => {
    switch (f) {
      case 'visita': return t('source.visit');
      case 'parada': return t('source.stop');
      case 'pedido': return t('source.order');
      case 'cobro': return t('source.payment');
      case 'inicio_jornada': return t('source.workdayStart');
      case 'fin_jornada': return t('source.workdayEnd');
      case 'stop_automatico': return t('source.autoStop');
      case 'inicio_ruta': return t('source.routeStart');
      case 'fin_ruta': return t('source.routeEnd');
      case 'checkpoint': return t('source.checkpoint');
      case 'tracking': return t('source.tracking');
      default: return f;
    }
  };

  const columns: DataGridColumn<UltimaUbicacionVendedor>[] = useMemo(() => [
    {
      key: 'nombre',
      label: t('columnVendor'),
      width: 'flex',
      sortable: true,
      cellRenderer: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-foreground text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            {getInitials(u.nombre)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{u.nombre}</p>
            <p className="text-[11px] text-muted-foreground truncate">{u.email ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'fuente',
      label: t('columnLastEvent'),
      width: 160,
      cellRenderer: (u) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
          {fuenteLabel(u.fuente)}
        </span>
      ),
    },
    {
      key: 'ultimaActividad',
      label: t('columnLastSeen'),
      width: 140,
      sortable: true,
      cellRenderer: (u) => (
        <span className="text-[12px] text-foreground/80">{formatTimeAgo(u.ultimaActividad)}</span>
      ),
    },
    {
      key: 'cliente',
      label: t('columnNearClient'),
      width: 200,
      cellRenderer: (u) => (
        <span className="text-[12px] text-muted-foreground">
          {u.clienteNombre ?? '—'}
        </span>
      ),
    },
    {
      key: 'coords',
      label: t('columnCoords'),
      width: 160,
      cellRenderer: (u) => (
        <span className="text-[11px] text-muted-foreground font-mono">
          {u.ultimaLat.toFixed(5)}, {u.ultimaLng.toFixed(5)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 50,
      align: 'right',
      cellRenderer: (u) => (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/team/${u.usuarioId}/gps`); }}
          className="p-1 hover:bg-emerald-50 rounded transition-colors"
          title={t('viewDetail')}
        >
          <ChevronRight className="w-4 h-4 text-emerald-500 hover:text-emerald-600" />
        </button>
      ),
    },
  ], [t, router]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('teamLabel'), href: '/team' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={data.length > 0 ? t('subtitleWithCount', { count: data.length }) : t('subtitle')}
    >
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('searchPlaceholder')}
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>
        </div>

        {/* Error message */}
        <ErrorBanner error={error} onRetry={fetchData} />

        {/* DataGrid */}
        <DataGrid<UltimaUbicacionVendedor>
          data={filtered}
          columns={columns}
          loading={loading}
          loadingMessage={t('loading')}
          keyExtractor={(u) => u.usuarioId}
          emptyIcon={<Users className="w-10 h-10" />}
          emptyTitle={t('emptyTitle')}
          emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
          onRowClick={(u) => router.push(`/team/${u.usuarioId}/gps`)}
          mobileCardRenderer={(u) => (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-foreground text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                {getInitials(u.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                    {fuenteLabel(u.fuente)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatTimeAgo(u.ultimaActividad)}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/team/${u.usuarioId}/gps`); }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('viewDetail')}</span>
              </button>
            </div>
          )}
        />
      </div>
    </PageHeader>
  );
}
