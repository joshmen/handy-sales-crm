'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, DollarSign, TrendingUp, CheckCircle2, CalendarClock, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import {
  subscriptionsAdminService,
  type SubscripcionDto,
  type SubscripcionesResumenDto,
} from '@/services/api/subscriptionsAdmin';

// Formateador de moneda MXN.
const currencyFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return currencyFmt.format(value);
}

// Formatea una fecha ISO a fecha local es-MX. Si es null/invalida, "Sin datos".
function formatFecha(iso: string | null): string {
  if (!iso) return 'Sin datos';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Sin datos';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Mapea el estado de la suscripcion a una variante de Badge.
function estadoVariant(estado: string): BadgeProps['variant'] {
  switch (estado.toLowerCase()) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
    case 'unpaid':
      return 'warning';
    case 'canceled':
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// Etiqueta legible en espanol para el estado.
function estadoLabel(estado: string): string {
  switch (estado.toLowerCase()) {
    case 'active':
      return 'Activa';
    case 'trialing':
      return 'Prueba';
    case 'past_due':
      return 'Pago vencido';
    case 'unpaid':
      return 'Sin pagar';
    case 'canceled':
    case 'cancelled':
      return 'Cancelada';
    default:
      return estado || 'Sin datos';
  }
}

// Escapa un valor para CSV (comillas + separadores + saltos de linea).
function csvCell(value: string): string {
  const needsQuotes = /[",\n;]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function exportarCsv(items: SubscripcionDto[]): void {
  const encabezados = ['Empresa', 'Plan', 'MRR', 'Ciclo', 'Proxima renovacion', 'Metodo', 'Estado'];
  const filas = items.map((item) =>
    [
      item.empresa,
      item.plan,
      item.mrr.toFixed(2),
      item.ciclo,
      formatFecha(item.proximaRenovacion),
      item.metodo,
      estadoLabel(item.estado),
    ]
      .map(csvCell)
      .join(',')
  );
  const contenido = [encabezados.map(csvCell).join(','), ...filas].join('\n');
  // BOM para que Excel reconozca UTF-8.
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suscripciones-${fecha}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<SubscripcionesResumenDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const resumen = await subscriptionsAdminService.getResumen();
      setData(resumen);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const items = data?.items ?? [];

  const actions = (
    <Button
      variant="wbOutline"
      size="sm"
      onClick={() => exportarCsv(items)}
      disabled={loading || error || items.length === 0}
    >
      <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
      Exportar
    </Button>
  );

  return (
    <PageHeader
      section="superadmin"
      icon={RefreshCw}
      title="Suscripciones"
      subtitle="Suscripciones activas e ingresos recurrentes."
      actions={actions}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={loading || !data ? 0 : formatCurrency(data.mrr)}
          tone="success"
          icon={DollarSign}
          loading={loading}
          sub="Ingreso mensual recurrente"
        />
        <StatCard
          label="ARR"
          value={loading || !data ? 0 : formatCurrency(data.arr)}
          tone="primary"
          icon={TrendingUp}
          loading={loading}
          sub="Ingreso anual recurrente"
        />
        <StatCard
          label="Activas"
          value={loading || !data ? 0 : data.activas}
          icon={CheckCircle2}
          loading={loading}
          sub="Suscripciones activas"
        />
        <StatCard
          label="Renovaciones 7d"
          value={loading || !data ? 0 : data.renovaciones7d}
          tone="warning"
          icon={CalendarClock}
          loading={loading}
          sub="Vencen en los proximos 7 dias"
        />
      </div>

      {/* Tabla */}
      <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <ErrorState
            title="No se pudieron cargar las suscripciones"
            description="Ocurrio un error al consultar la informacion. Intenta de nuevo."
            onRetry={() => void cargar()}
          />
        ) : loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="Sin suscripciones activas"
            description="Cuando haya empresas con una suscripcion activa apareceran aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Empresa</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-right">MRR</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Ciclo</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Proxima renovacion</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Metodo</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={`${item.empresa}-${idx}`}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{item.empresa}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.plan}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatCurrency(item.mrr)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.ciclo}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {formatFecha(item.proximaRenovacion)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.metodo || 'Sin datos'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={estadoVariant(item.estado)}>{estadoLabel(item.estado)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageHeader>
  );
}
