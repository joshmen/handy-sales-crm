'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Lightning } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useFormatters } from '@/hooks/useFormatters';
import type { AutomationExecution } from '@/types/automations';
import { TEMPLATE_KEYS } from '@/types/automations';

interface Props {
  execution: AutomationExecution | null;
  onClose: () => void;
}

export function ExecutionDetailDrawer({ execution, onClose }: Props) {
  const t = useTranslations('automations');
  const { formatDate } = useFormatters();

  if (!execution) {
    return <Drawer isOpen={false} onClose={onClose} width="lg">{null}</Drawer>;
  }

  let detalle: unknown = null;
  let parseError = false;
  if (execution.resultadoJson) {
    try {
      detalle = JSON.parse(execution.resultadoJson);
    } catch {
      parseError = true;
    }
  }

  const templateKey = TEMPLATE_KEYS[execution.templateSlug];
  // Si la traducción no existe, next-intl lanza error; usamos un IIFE try/catch
  // para fallback silencioso al campo del backend.
  const templateName = (() => {
    if (!templateKey) return execution.templateNombre;
    try { return t(templateKey.nameKey as never); } catch { return execution.templateNombre; }
  })();
  const templateDesc = (() => {
    if (!templateKey) return '';
    try { return t(templateKey.descKey as never); } catch { return ''; }
  })();

  return (
    <Drawer
      isOpen={!!execution}
      onClose={onClose}
      width="lg"
      title={templateName}
      icon={<Lightning size={20} className="text-amber-500" />}
    >
      <div className="space-y-5">
        {/* Header info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="font-medium">{t('detailDrawer.dateLabel')}: </span>
            {formatDate(execution.ejecutadoEn, {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </div>
          <div>
            <span className="font-medium">{t('detailDrawer.statusLabel')}: </span>
            <span className={
              execution.status === 'Success' ? 'text-green-600' :
              execution.status === 'Failed' ? 'text-red-600' :
              'text-amber-600'
            }>{t(`status.${execution.status.toLowerCase()}` as never)}</span>
          </div>
        </div>

        {/* Description */}
        {templateDesc && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
            <div className="font-semibold text-xs uppercase tracking-wide text-blue-700 mb-1">
              {t('detailDrawer.whatItDoes')}
            </div>
            {templateDesc}
          </div>
        )}

        {/* ActionTaken */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
            {t('detailDrawer.resultSummary')}
          </div>
          <div className="text-sm text-foreground">{execution.actionTaken}</div>
        </div>

        {/* Error */}
        {execution.errorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">
            <div className="font-semibold text-xs uppercase tracking-wide text-red-700 mb-1">
              {t('detailDrawer.errorLabel')}
            </div>
            {execution.errorMessage}
          </div>
        )}

        {/* Detail */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            {t('detailDrawer.fullDetail')}
          </div>
          {parseError ? (
            <p className="text-sm text-muted-foreground italic">{t('detailDrawer.parseError')}</p>
          ) : !detalle ? (
            <p className="text-sm text-muted-foreground italic">{t('detailDrawer.noDetail')}</p>
          ) : (
            <DetailRenderer slug={execution.templateSlug} data={detalle} />
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────
// DetailRenderer — switch por template slug
// ─────────────────────────────────────────────────────────

function DetailRenderer({ slug, data }: { slug: string; data: unknown }) {
  switch (slug) {
    case 'resumen-diario':       return <ResumenDiarioDetail data={data as ResumenDiarioData} />;
    case 'pedido-recurrente':    return <PedidoRecurrenteDetail data={data as PedidoRecurrenteData} />;
    case 'meta-auto-renovacion': return <MetaAutoRenovacionDetail data={data as MetaAutoRenovacionData} />;
    case 'bienvenida-cliente':   return <BienvenidaClienteDetail data={data as BienvenidaClienteData} />;
    case 'cobro-exitoso-aviso':  return <CobroExitosoDetail data={data as CobroExitosoData} />;
    case 'cobro-vencido-recordatorio': return <CobroVencidoDetail data={data as CobroVencidoData} />;
    case 'cliente-inactivo-visita':    return <ClienteInactivoDetail data={data as ClienteInactivoData} />;
    case 'ruta-semanal-auto':    return <RutaSemanalDetail data={data as RutaSemanalData} />;
    case 'meta-no-cumplida':     return <MetaNoCumplidaDetail data={data as MetaNoCumplidaData} />;
    case 'inventario-critico':   return <InventarioCriticoDetail data={data as InventarioCriticoData} />;
    case 'stock-bajo-alerta':    return <StockBajoDetail data={data as StockBajoData} />;
    default:
      return (
        <pre className="text-xs bg-surface-1 border border-border-subtle rounded-lg p-3 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

// ─────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg bg-surface-1 border border-border-subtle px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${accent ?? 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-1 border-b border-border-subtle">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border-subtle hover:bg-surface-1/50">
              {r.map((cell, j) => <td key={j} className="px-3 py-2 text-foreground/80">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground italic">{text}</p>;
}

// ─────────────────────────────────────────────────────────
// Per-slug detail components
// ─────────────────────────────────────────────────────────

interface ResumenDiarioData {
  fecha?: string;
  ventasCount: number;
  ventasTotal: number;
  cobrosCount: number;
  cobrosTotal: number;
  visitasHoy: number;
  clientesNuevos: number;
  topVendedores: { nombre: string; pedidos: number; total: number }[];
  topClientes: { nombre: string; pedidos: number; total: number }[];
}

function ResumenDiarioDetail({ data }: { data: ResumenDiarioData }) {
  const t = useTranslations('automations.detailDrawer.resumenDiario');
  const fmtMoney = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label={t('ventas')} value={`${data.ventasCount} (${fmtMoney(data.ventasTotal)})`} />
        <Kpi label={t('cobros')} value={`${data.cobrosCount} (${fmtMoney(data.cobrosTotal)})`} />
        <Kpi label={t('visitas')} value={data.visitasHoy} />
        <Kpi label={t('clientesNuevos')} value={data.clientesNuevos} />
      </div>

      {data.topVendedores?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1.5">{t('topVendedores')}</div>
          <DataTable
            headers={[t('cVendedor'), t('cPedidos'), t('cTotal')]}
            rows={data.topVendedores.map(v => [v.nombre, v.pedidos, fmtMoney(v.total)])}
          />
        </div>
      )}

      {data.topClientes?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1.5">{t('topClientes')}</div>
          <DataTable
            headers={[t('cCliente'), t('cPedidos'), t('cTotal')]}
            rows={data.topClientes.map(c => [c.nombre, c.pedidos, fmtMoney(c.total)])}
          />
        </div>
      )}
    </div>
  );
}

interface PedidoRecurrenteData {
  clientesEvaluados: number;
  notificacionesEnviadas?: number;
  urgentes: {
    clienteNombre: string;
    vendedorNombre: string;
    intervaloDias: number;
    diasSinPedido: number;
    urgenciaPct: number;
    montoPromedio: number;
  }[];
}

function PedidoRecurrenteDetail({ data }: { data: PedidoRecurrenteData }) {
  const t = useTranslations('automations.detailDrawer.pedidoRecurrente');
  const fmtMoney = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label={t('evaluados')} value={data.clientesEvaluados} />
        <Kpi label={t('flagged')} value={data.urgentes.length} accent="text-amber-700" />
      </div>
      {data.urgentes.length === 0 ? (
        <EmptyHint text={t('allOk')} />
      ) : (
        <DataTable
          headers={[t('cCliente'), t('cVendedor'), t('cIntervalo'), t('cSinPedido'), t('cUrgencia'), t('cMontoPromedio')]}
          rows={data.urgentes.map(u => [
            u.clienteNombre,
            u.vendedorNombre,
            `${u.intervaloDias}d`,
            `${u.diasSinPedido}d`,
            <span key="u" className={u.urgenciaPct >= 200 ? 'text-red-600 font-semibold' : u.urgenciaPct >= 150 ? 'text-amber-600 font-semibold' : 'text-blue-600'}>{u.urgenciaPct}%</span>,
            fmtMoney(u.montoPromedio),
          ])}
        />
      )}
    </div>
  );
}

interface MetaAutoRenovacionData {
  metasRenovadas: {
    vendedorNombre: string;
    tipo: string;
    periodo: string;
    montoMeta: number;
    periodoAnterior: string;
    periodoNuevo: string;
  }[];
}

function MetaAutoRenovacionDetail({ data }: { data: MetaAutoRenovacionData }) {
  const t = useTranslations('automations.detailDrawer.metaAutoRenovacion');
  if (data.metasRenovadas.length === 0) return <EmptyHint text={t('noneToRenew')} />;
  return (
    <DataTable
      headers={[t('cVendedor'), t('cTipo'), t('cPeriodo'), t('cMonto'), t('cPeriodoNuevo')]}
      rows={data.metasRenovadas.map(m => [m.vendedorNombre, m.tipo, m.periodo, m.montoMeta.toLocaleString('es-MX'), m.periodoNuevo])}
    />
  );
}

interface BienvenidaClienteData {
  notificacionesEnviadas?: number;
  clientesNuevos: { nombre: string; contacto: string | null; vendedorNombre: string }[];
}

function BienvenidaClienteDetail({ data }: { data: BienvenidaClienteData }) {
  const t = useTranslations('automations.detailDrawer.bienvenida');
  if (data.clientesNuevos.length === 0) return <EmptyHint text={t('noNew')} />;
  return (
    <DataTable
      headers={[t('cCliente'), t('cContacto'), t('cVendedor')]}
      rows={data.clientesNuevos.map(c => [c.nombre, c.contacto ?? '—', c.vendedorNombre])}
    />
  );
}

interface CobroExitosoData {
  totalMonto?: number;
  cobros: { clienteNombre: string; monto: number; fecha: string }[];
}

function CobroExitosoDetail({ data }: { data: CobroExitosoData }) {
  const t = useTranslations('automations.detailDrawer.cobroExitoso');
  const fmtMoney = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  if (data.cobros.length === 0) return <EmptyHint text={t('none')} />;
  return (
    <div className="space-y-4">
      {data.totalMonto !== undefined && (
        <Kpi label={t('totalCobrado')} value={fmtMoney(data.totalMonto)} accent="text-green-700" />
      )}
      <DataTable
        headers={[t('cCliente'), t('cMonto'), t('cFecha')]}
        rows={data.cobros.map(c => [
          c.clienteNombre,
          fmtMoney(c.monto),
          new Date(c.fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        ])}
      />
    </div>
  );
}

interface CobroVencidoData {
  totalVencido?: number;
  notificacionesEnviadas?: number;
  vencidos: { clienteNombre: string; montoSaldo: number; diasVencido: number; vendedorNombre: string }[];
}

function CobroVencidoDetail({ data }: { data: CobroVencidoData }) {
  const t = useTranslations('automations.detailDrawer.cobroVencido');
  const fmtMoney = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  if (data.vencidos.length === 0) return <EmptyHint text={t('none')} />;
  return (
    <div className="space-y-4">
      {data.totalVencido !== undefined && (
        <Kpi label={t('totalVencido')} value={fmtMoney(data.totalVencido)} accent="text-red-700" />
      )}
      <DataTable
        headers={[t('cCliente'), t('cMonto'), t('cDias'), t('cVendedor')]}
        rows={data.vencidos.map(v => [
          v.clienteNombre,
          <span key="m" className="text-red-600 font-semibold">{fmtMoney(v.montoSaldo)}</span>,
          `${v.diasVencido}d`,
          v.vendedorNombre,
        ])}
      />
    </div>
  );
}

interface ClienteInactivoData {
  visitasAgendadas?: number;
  notificacionesEnviadas?: number;
  inactivos: { clienteNombre: string; vendedorNombre: string; diasInactivo: number | null; ultimaVisita: string | null }[];
}

function ClienteInactivoDetail({ data }: { data: ClienteInactivoData }) {
  const t = useTranslations('automations.detailDrawer.clienteInactivo');
  if (data.inactivos.length === 0) return <EmptyHint text={t('allActive')} />;
  return (
    <div className="space-y-4">
      {data.visitasAgendadas !== undefined && (
        <Kpi label={t('visitasAgendadas')} value={data.visitasAgendadas} accent="text-green-700" />
      )}
      <DataTable
        headers={[t('cCliente'), t('cVendedor'), t('cDiasInactivo'), t('cUltimaVisita')]}
        rows={data.inactivos.map(c => [
          c.clienteNombre,
          c.vendedorNombre,
          c.diasInactivo !== null ? `${c.diasInactivo}d` : '—',
          c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('es-MX') : '—',
        ])}
      />
    </div>
  );
}

interface RutaSemanalData {
  rutas: { vendedorNombre: string; fecha: string; clientesCount: number; geoOptimizado?: boolean }[];
  semana?: string;
}

function RutaSemanalDetail({ data }: { data: RutaSemanalData }) {
  const t = useTranslations('automations.detailDrawer.rutaSemanal');
  if (data.rutas.length === 0) return <EmptyHint text={t('noneCreated')} />;
  return (
    <DataTable
      headers={[t('cVendedor'), t('cFecha'), t('cClientes'), t('cGeo')]}
      rows={data.rutas.map(r => [
        r.vendedorNombre,
        new Date(r.fecha).toLocaleDateString('es-MX'),
        r.clientesCount,
        r.geoOptimizado ? t('geoYes') : t('geoNo'),
      ])}
    />
  );
}

interface MetaNoCumplidaData {
  umbralPct?: number;
  vendedores: { nombre: string; tipo: string; metaTotal: number; alcanzado: number; porcentaje: number }[];
}

function MetaNoCumplidaDetail({ data }: { data: MetaNoCumplidaData }) {
  const t = useTranslations('automations.detailDrawer.metaNoCumplida');
  if (data.vendedores.length === 0) return <EmptyHint text={t('allOk')} />;
  return (
    <div className="space-y-4">
      {data.umbralPct !== undefined && (
        <Kpi label={t('umbral')} value={`< ${data.umbralPct}%`} />
      )}
      <DataTable
        headers={[t('cVendedor'), t('cTipo'), t('cMeta'), t('cAlcanzado'), t('cCumplimiento')]}
        rows={data.vendedores.map(v => [
          v.nombre,
          v.tipo,
          v.metaTotal.toLocaleString('es-MX'),
          v.alcanzado.toLocaleString('es-MX'),
          <span key="p" className={v.porcentaje < 50 ? 'text-red-600 font-semibold' : v.porcentaje < 70 ? 'text-amber-600 font-semibold' : 'text-blue-600 font-semibold'}>{v.porcentaje}%</span>,
        ])}
      />
    </div>
  );
}

interface InventarioCriticoData {
  productos: { nombre: string; stockActual: number; stockMinimo: number }[];
}

function InventarioCriticoDetail({ data }: { data: InventarioCriticoData }) {
  const t = useTranslations('automations.detailDrawer.inventarioCritico');
  if (data.productos.length === 0) return <EmptyHint text={t('allOk')} />;
  return (
    <DataTable
      headers={[t('cProducto'), t('cStock'), t('cMinimo')]}
      rows={data.productos.map(p => [
        p.nombre,
        <span key="s" className="text-red-600 font-semibold">{p.stockActual.toLocaleString('es-MX')}</span>,
        p.stockMinimo > 0 ? p.stockMinimo.toLocaleString('es-MX') : '—',
      ])}
    />
  );
}

interface StockBajoData {
  umbralPorcentaje?: number;
  productos: { nombre: string; stockActual: number; stockMinimo: number; sinStock?: boolean }[];
}

function StockBajoDetail({ data }: { data: StockBajoData }) {
  const t = useTranslations('automations.detailDrawer.stockBajo');
  if (data.productos.length === 0) return <EmptyHint text={t('allOk')} />;
  return (
    <div className="space-y-4">
      {data.umbralPorcentaje !== undefined && (
        <Kpi label={t('umbral')} value={`${data.umbralPorcentaje}%`} />
      )}
      <DataTable
        headers={[t('cProducto'), t('cStock'), t('cMinimo'), t('cEstado')]}
        rows={data.productos.map(p => [
          p.nombre,
          <span key="s" className={p.sinStock ? 'text-red-600 font-semibold' : 'text-foreground/80'}>{p.stockActual.toLocaleString('es-MX')}</span>,
          p.stockMinimo.toLocaleString('es-MX'),
          p.sinStock
            ? <span key="e" className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold uppercase">{t('sinStock')}</span>
            : <span key="e" className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold uppercase">{t('stockBajo')}</span>,
        ])}
      />
    </div>
  );
}
