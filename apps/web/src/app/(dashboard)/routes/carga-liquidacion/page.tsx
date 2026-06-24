'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { SoftBadge, type SoftBadgeTone } from '@/components/ui/SoftBadge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useFormatters } from '@/hooks/useFormatters';
import {
  routeService,
  type RouteListItem,
  ESTADO_RUTA,
  ESTADO_RUTA_KEYS,
} from '@/services/api/routes';
import { Package, Wallet, ChevronRight, MapPin, Calendar } from 'lucide-react';

type Queue = 'porCargar' | 'porLiquidar';

// Tono del SoftBadge por estado de ruta (espejo de ESTADO_RUTA_COLORS).
const ESTADO_TONE: Record<number, SoftBadgeTone> = {
  0: 'default', // Planificada
  1: 'info', // EnProgreso
  2: 'success', // Completada
  3: 'danger', // Cancelada
  4: 'warning', // PendienteAceptar
  5: 'info', // CargaAceptada
  6: 'success', // Cerrada
};

export default function CargaLiquidacionPage() {
  const t = useTranslations('routes.cargaLiquidacion');
  const ts = useTranslations('routes.status');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const tr = useTranslations('routes');
  const router = useRouter();
  const { formatDateOnly } = useFormatters();

  const [activeQueue, setActiveQueue] = useState<Queue>('porCargar');
  const [searchTerm, setSearchTerm] = useState('');

  // "Por cargar" = Planificada(0) + PendienteAceptar(4). "Por liquidar" = Completada(2).
  const [porCargar, setPorCargar] = useState<RouteListItem[]>([]);
  const [porLiquidar, setPorLiquidar] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [planificadas, pendientes, completadas] = await Promise.all([
        routeService.getRutas({ estado: ESTADO_RUTA.Planificada, limit: 200 }),
        routeService.getRutas({ estado: ESTADO_RUTA.PendienteAceptar, limit: 200 }),
        routeService.getRutas({ estado: ESTADO_RUTA.Completada, limit: 200 }),
      ]);
      // Merge ambas colas "por cargar" y ordena por fecha descendente.
      const cargar = [...planificadas.items, ...pendientes.items].sort(
        (a, b) => b.fecha.getTime() - a.fecha.getTime(),
      );
      const liquidar = [...completadas.items].sort(
        (a, b) => b.fecha.getTime() - a.fecha.getTime(),
      );
      setPorCargar(cargar);
      setPorLiquidar(liquidar);
    } catch {
      setError(tr('errorLoadingRetry'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Limpia la búsqueda al cambiar de cola.
  useEffect(() => {
    setSearchTerm('');
  }, [activeQueue]);

  const rows = activeQueue === 'porCargar' ? porCargar : porLiquidar;

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.codigo || '').toLowerCase().includes(q) ||
        (r.nombre || '').toLowerCase().includes(q) ||
        (r.usuarioNombre || '').toLowerCase().includes(q) ||
        (r.zonaNombre || '').toLowerCase().includes(q),
    );
  }, [rows, searchTerm]);

  const goToRoute = useCallback(
    (r: RouteListItem) => {
      const tab = activeQueue === 'porCargar' ? 'carga' : 'corte';
      router.push(`/routes/${r.id}?tab=${tab}`);
    },
    [activeQueue, router],
  );

  const statusLabel = (estado: number) => {
    const key = ESTADO_RUTA_KEYS[estado];
    return key ? ts(key) : ts('unknown');
  };

  const columns: DataGridColumn<RouteListItem>[] = [
    {
      key: 'ruta',
      label: t('colRuta'),
      width: 'flex',
      cellRenderer: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            {activeQueue === 'porCargar' ? (
              <Package className="w-[18px] h-[18px]" />
            ) : (
              <Wallet className="w-[18px] h-[18px]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{r.nombre}</p>
            {r.codigo && <p className="text-xs text-muted-foreground truncate">{r.codigo}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'vendedor',
      label: t('colVendedor'),
      width: 'flex',
      cellRenderer: (r) => (
        <span className="text-[13px] text-foreground/70 truncate">{r.usuarioNombre || '·'}</span>
      ),
    },
    {
      key: 'zona',
      label: t('colZona'),
      width: 160,
      hiddenOnMobile: true,
      cellRenderer: (r) => (
        <span className="text-[13px] text-foreground/70 truncate">{r.zonaNombre || '·'}</span>
      ),
    },
    {
      key: 'fecha',
      label: t('colFecha'),
      width: 130,
      hiddenOnMobile: true,
      cellRenderer: (r) => (
        <span className="text-[13px] text-foreground/70 tabular-nums">{formatDateOnly(r.fecha)}</span>
      ),
    },
    {
      key: 'avance',
      label: t('colAvance'),
      width: 90,
      align: 'center',
      cellRenderer: (r) => (
        <span className="text-[13px] text-foreground tabular-nums">
          {r.paradasCompletadas}/{r.totalParadas}
        </span>
      ),
    },
    {
      key: 'estado',
      label: t('colEstado'),
      width: 140,
      align: 'center',
      cellRenderer: (r) => (
        <SoftBadge tone={ESTADO_TONE[r.estado] ?? 'default'}>{statusLabel(r.estado)}</SoftBadge>
      ),
    },
    {
      key: 'chev',
      label: '',
      width: 44,
      align: 'center',
      cellRenderer: () => <ChevronRight className="w-4 h-4 text-muted-foreground/50" />,
    },
  ];

  return (
    <PageHeader
      section="operacion"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: tn('sectionOperations') },
        { label: tr('title'), href: '/routes' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle', { porCargar: porCargar.length, porLiquidar: porLiquidar.length })}
    >
      <div className="space-y-5">
        <ErrorBanner error={error} onRetry={fetchData} />

        {/* Tabs segmentadas + búsqueda */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-1 p-1">
            {(['porCargar', 'porLiquidar'] as const).map((tab) => {
              const active = activeQueue === tab;
              const count = tab === 'porCargar' ? porCargar.length : porLiquidar.length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveQueue(tab)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab === 'porCargar' ? (
                    <Package className="w-3.5 h-3.5" />
                  ) : (
                    <Wallet className="w-3.5 h-3.5" />
                  )}
                  <span>{t(tab)}</span>
                  <span className={`tabular-nums ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="w-full sm:w-72 lg:w-80">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={tr('searchPlaceholder')}
              className="w-full"
            />
          </div>
        </div>

        {/* Tabla de la cola activa */}
        <DataGrid<RouteListItem>
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          onRowClick={goToRoute}
          loading={loading}
          loadingMessage={t('loading')}
          emptyIcon={
            activeQueue === 'porCargar' ? (
              <Package className="w-8 h-8 text-muted-foreground/60" />
            ) : (
              <Wallet className="w-8 h-8 text-muted-foreground/60" />
            )
          }
          emptyTitle={activeQueue === 'porCargar' ? t('emptyPorCargar') : t('emptyPorLiquidar')}
          mobileCardRenderer={(r) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    {activeQueue === 'porCargar' ? (
                      <Package className="w-[18px] h-[18px]" />
                    ) : (
                      <Wallet className="w-[18px] h-[18px]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.usuarioNombre || r.codigo}</p>
                  </div>
                </div>
                <SoftBadge tone={ESTADO_TONE[r.estado] ?? 'default'}>{statusLabel(r.estado)}</SoftBadge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {r.zonaNombre || '·'}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateOnly(r.fecha)}
                  </span>
                  <span>· {r.paradasCompletadas}/{r.totalParadas}</span>
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </PageHeader>
  );
}
