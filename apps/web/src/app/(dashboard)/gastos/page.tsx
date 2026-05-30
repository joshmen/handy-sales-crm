'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { gastosService, type GastoListItem, TIPO_GASTO_LABEL, TIPO_GASTO_ICON, TIPO_GASTO_COLOR } from '@/services/api/gastos';
import { toast } from '@/hooks/useToast';

const TIPO_ICON = TIPO_GASTO_ICON;
const TIPO_COLOR = TIPO_GASTO_COLOR;

export default function GastosPage() {
  const [items, setItems] = useState<GastoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [kpi, setKpi] = useState({ totalActivos: 0, totalInvalidados: 0, countActivos: 0, countInvalidados: 0 });
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<number | undefined>(undefined);
  const [soloActivos, setSoloActivos] = useState(true);
  const [invalidatingId, setInvalidatingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await gastosService.list({
        pagina: 1,
        tamanoPagina: 50,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        tipoGasto: tipoFiltro,
        soloActivos,
      });
      setItems(data.items);
      setTotalCount(data.totalCount);
      setKpi(data.kpi);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'Error cargando gastos', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fechaDesde, fechaHasta, tipoFiltro, soloActivos]); // eslint-disable-line

  const handleInvalidar = async (gasto: GastoListItem) => {
    const motivo = window.prompt(`Invalidar gasto de ${gasto.usuarioNombre} ($${gasto.monto.toFixed(2)})?\n\nMotivo (opcional):`);
    if (motivo === null) return; // cancelado
    setInvalidatingId(gasto.id);
    try {
      await gastosService.invalidar(gasto.id, motivo || undefined);
      toast({ title: 'Gasto invalidado' });
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'Error al invalidar', description: message, variant: 'destructive' });
    } finally {
      setInvalidatingId(null);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <PageHeader
      breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'Gastos' }]}
      title="Gastos del vendedor"
      subtitle="Gastos registrados por los vendedores durante su ruta del día"
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-surface-2 border border-border-subtle px-4 py-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total activos</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kpi.totalActivos)}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.countActivos} gastos</div>
          </div>
          <div className="rounded-xl bg-surface-2 border border-border-subtle px-4 py-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Invalidados</div>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(kpi.totalInvalidados)}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.countInvalidados} gastos</div>
          </div>
          <div className="rounded-xl bg-surface-2 border border-border-subtle px-4 py-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total registros</div>
            <div className="text-2xl font-bold text-foreground">{totalCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-foreground/70 block mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="text-sm px-3 py-2 border border-border-default rounded bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground/70 block mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="text-sm px-3 py-2 border border-border-default rounded bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground/70 block mb-1">Tipo</label>
            <select
              value={tipoFiltro === undefined ? '' : tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value === '' ? undefined : parseInt(e.target.value))}
              className="text-sm px-3 py-2 border border-border-default rounded bg-background"
            >
              <option value="">Todos</option>
              {Object.entries(TIPO_GASTO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
            />
            Solo activos
          </label>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-border-subtle bg-surface-2 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No hay gastos en este rango.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-1 border-b border-border-subtle">
                    <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Concepto</th>
                    <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Ruta</th>
                    <th className="text-right px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Monto</th>
                    <th className="text-center px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Foto</th>
                    <th className="text-center px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Estado</th>
                    <th className="text-right px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((g) => {
                    const Icon = TIPO_ICON[g.tipoGasto] ?? TIPO_ICON[99];
                    const colorClass = TIPO_COLOR[g.tipoGasto] ?? 'text-slate-400';
                    const isInvalid = g.estado === 1;
                    return (
                      <tr key={g.id} className={`border-b border-border-subtle hover:bg-surface-1/50 ${isInvalid ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 text-xs text-foreground/80">{formatDate(g.fechaGasto)}</td>
                        <td className="px-4 py-2.5 text-foreground/80">{g.usuarioNombre}</td>
                        <td className="px-4 py-2.5">
                          <div className="inline-flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${colorClass}`} />
                            <span className="text-xs">{TIPO_GASTO_LABEL[g.tipoGasto] ?? 'Otro'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">{g.concepto}</td>
                        <td className="px-4 py-2.5">
                          {g.rutaCodigo ? (
                            <span className="text-xs font-mono text-foreground/70">{g.rutaCodigo}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">sin ruta</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">-{formatCurrency(g.monto)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {g.comprobanteUrl ? (
                            <a href={g.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver</a>
                          ) : (
                            <span className="text-xs text-amber-600">Sin</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${isInvalid ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {isInvalid ? 'Invalidado' : 'Activo'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {!isInvalid && (
                            <button
                              onClick={() => handleInvalidar(g)}
                              disabled={invalidatingId === g.id}
                              className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            >
                              {invalidatingId === g.id ? '...' : 'Invalidar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageHeader>
  );
}
