'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Lock, ChevronRight, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabBar } from '@/components/ui/TabBar';
import { getReportTierInfo, ReportTierInfo } from '@/services/api/reports';
import {
  SbDashboard,
  SbTrendingUp,
  SbClients,
  SbProducts,
  SbMap,
  SbBarChart,
  SbUserPlus,
  SbInventory,
  SbWallet,
  SbGoals,
  SbCompare,
  SbLightbulb,
  SbDollarSign,
  SbClock,
  SbPayments,
  SbCategory,
  SbMovements,
  SbBilling,
  SbCheckCircle,
  SbDownload,
} from '@/components/layout/DashboardIcons';
import { DashboardEjecutivoReport } from '@/components/reports/DashboardEjecutivoReport';
import { VentasPeriodoReport } from '@/components/reports/VentasPeriodoReport';
import { VentasVendedorReport } from '@/components/reports/VentasVendedorReport';
import { VentasProductoReport } from '@/components/reports/VentasProductoReport';
import { VentasZonaReport } from '@/components/reports/VentasZonaReport';
import { ActividadClientesReport } from '@/components/reports/ActividadClientesReport';
import { NuevosClientesReport } from '@/components/reports/NuevosClientesReport';
import { InventarioReport } from '@/components/reports/InventarioReport';
import { InvValorizadoReport } from '@/components/reports/InvValorizadoReport';
import { MargenReport } from '@/components/reports/MargenReport';
import { RotacionReport } from '@/components/reports/RotacionReport';
import { CarteraVencidaReport } from '@/components/reports/CarteraVencidaReport';
import { EstadoCuentaReport } from '@/components/reports/EstadoCuentaReport';
import { CobranzaPeriodoReport } from '@/components/reports/CobranzaPeriodoReport';
import { PorVencerReport } from '@/components/reports/PorVencerReport';
import { CumplimientoMetasReport } from '@/components/reports/CumplimientoMetasReport';
import { ComparativoPeriodosReport } from '@/components/reports/ComparativoPeriodosReport';
import { AutoInsightsReport } from '@/components/reports/AutoInsightsReport';
import { EfectividadVisitasReport } from '@/components/reports/EfectividadVisitasReport';
import { ComisionesReport } from '@/components/reports/ComisionesReport';
import { RentabilidadClienteReport } from '@/components/reports/RentabilidadClienteReport';
import { AnalisisABCReport } from '@/components/reports/AnalisisABCReport';
import { BalanzaReport } from '@/components/reports/BalanzaReport';
import { EstadoResultadosReport } from '@/components/reports/EstadoResultadosReport';
import { BalanceGeneralReport } from '@/components/reports/BalanceGeneralReport';
import { IvaReport } from '@/components/reports/IvaReport';
import { DiotReport } from '@/components/reports/DiotReport';
import { ContaElecReport } from '@/components/reports/ContaElecReport';
import { PaqueteContadorReport } from '@/components/reports/PaqueteContadorReport';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ReportUpsell } from '@/components/reports/ReportUpsell';
import { Sparkline } from '@/components/ui/Sparkline';
import { getReportSparklines } from '@/services/api/reports';

type ReportId =
  // General
  | 'ejecutivo'
  // Ventas
  | 'ventas-periodo'
  | 'ventas-vendedor'
  | 'ventas-producto'
  | 'analisis-abc'
  | 'ventas-zona'
  | 'ventas-cliente'
  // Cobranza (CxC)
  | 'cartera-vencida'
  | 'estado-cuenta'
  | 'cobranza-periodo'
  | 'por-vencer'
  // Inventario
  | 'inventario'
  | 'inv-valorizado'
  | 'kardex'
  | 'rotacion'
  | 'margen'
  // Desempeño
  | 'cumplimiento-metas'
  | 'efectividad-visitas'
  | 'comisiones'
  // Financieros
  | 'edo-resultados'
  | 'balance-general'
  | 'balanza'
  // Fiscal
  | 'iva'
  | 'diot'
  | 'conta-elec'
  | 'paquete-contador'
  // Análisis (extras existentes)
  | 'nuevos-clientes'
  | 'comparativo'
  | 'insights'
  | 'rentabilidad-cliente';

type ReportTier = 'free' | 'pro' | 'contabilidad';

interface ReportCard {
  id: ReportId;
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  sectionKey: string;
  tier: ReportTier;
  /** true = sin vista aun (placeholder "Proximamente"). */
  comingSoon?: boolean;
}

// Catalogo canonico (orden por seccion). El campo `tier` controla el badge y el
// gating del backend devuelve los ids permitidos en tierInfo.allowedReports.
const reports: ReportCard[] = [
  // General
  { id: 'ejecutivo', labelKey: 'cards.ejecutivo', descKey: 'cards.ejecutivoDesc', icon: SbDashboard, sectionKey: 'sections.general', tier: 'free' },

  // Ventas
  { id: 'ventas-periodo', labelKey: 'cards.ventasPeriodo', descKey: 'cards.ventasPeriodoDesc', icon: SbTrendingUp, sectionKey: 'sections.sales', tier: 'free' },
  { id: 'ventas-vendedor', labelKey: 'cards.ventasVendedor', descKey: 'cards.ventasVendedorDesc', icon: SbClients, sectionKey: 'sections.sales', tier: 'free' },
  { id: 'ventas-producto', labelKey: 'cards.ventasProducto', descKey: 'cards.ventasProductoDesc', icon: SbProducts, sectionKey: 'sections.sales', tier: 'pro' },
  { id: 'analisis-abc', labelKey: 'cards.analisisAbc', descKey: 'cards.analisisAbcDesc', icon: SbCompare, sectionKey: 'sections.sales', tier: 'pro' },
  { id: 'ventas-zona', labelKey: 'cards.ventasZona', descKey: 'cards.ventasZonaDesc', icon: SbMap, sectionKey: 'sections.sales', tier: 'pro' },
  { id: 'ventas-cliente', labelKey: 'cards.ventasCliente', descKey: 'cards.ventasClienteDesc', icon: SbBarChart, sectionKey: 'sections.sales', tier: 'pro' },

  // Cobranza (CxC)
  { id: 'cartera-vencida', labelKey: 'cards.carteraVencida', descKey: 'cards.carteraVencidaDesc', icon: SbWallet, sectionKey: 'sections.collections', tier: 'free' },
  { id: 'estado-cuenta', labelKey: 'cards.estadoCuenta', descKey: 'cards.estadoCuentaDesc', icon: SbPayments, sectionKey: 'sections.collections', tier: 'free' },
  { id: 'cobranza-periodo', labelKey: 'cards.cobranzaPeriodo', descKey: 'cards.cobranzaPeriodoDesc', icon: SbDollarSign, sectionKey: 'sections.collections', tier: 'free' },
  { id: 'por-vencer', labelKey: 'cards.porVencer', descKey: 'cards.porVencerDesc', icon: SbClock, sectionKey: 'sections.collections', tier: 'pro' },

  // Inventario
  { id: 'inventario', labelKey: 'cards.inventario', descKey: 'cards.inventarioDesc', icon: SbInventory, sectionKey: 'sections.inventory', tier: 'free' },
  { id: 'inv-valorizado', labelKey: 'cards.invValorizado', descKey: 'cards.invValorizadoDesc', icon: SbDollarSign, sectionKey: 'sections.inventory', tier: 'free' },
  { id: 'kardex', labelKey: 'cards.kardex', descKey: 'cards.kardexDesc', icon: SbMovements, sectionKey: 'sections.inventory', tier: 'free', comingSoon: true },
  { id: 'rotacion', labelKey: 'cards.rotacion', descKey: 'cards.rotacionDesc', icon: SbCategory, sectionKey: 'sections.inventory', tier: 'pro' },
  { id: 'margen', labelKey: 'cards.margen', descKey: 'cards.margenDesc', icon: SbTrendingUp, sectionKey: 'sections.inventory', tier: 'pro' },

  // Desempeño
  { id: 'cumplimiento-metas', labelKey: 'cards.cumplimientoMetas', descKey: 'cards.cumplimientoMetasDesc', icon: SbGoals, sectionKey: 'sections.performance', tier: 'free' },
  { id: 'efectividad-visitas', labelKey: 'cards.efectividadVisitas', descKey: 'cards.efectividadVisitasDesc', icon: SbCheckCircle, sectionKey: 'sections.performance', tier: 'free' },
  { id: 'comisiones', labelKey: 'cards.comisiones', descKey: 'cards.comisionesDesc', icon: SbWallet, sectionKey: 'sections.performance', tier: 'pro' },

  // Financieros
  { id: 'edo-resultados', labelKey: 'cards.edoResultados', descKey: 'cards.edoResultadosDesc', icon: SbBarChart, sectionKey: 'sections.financial', tier: 'contabilidad' },
  { id: 'balance-general', labelKey: 'cards.balanceGeneral', descKey: 'cards.balanceGeneralDesc', icon: SbBilling, sectionKey: 'sections.financial', tier: 'contabilidad' },
  { id: 'balanza', labelKey: 'cards.balanza', descKey: 'cards.balanzaDesc', icon: SbDollarSign, sectionKey: 'sections.financial', tier: 'contabilidad' },

  // Fiscal
  { id: 'iva', labelKey: 'cards.iva', descKey: 'cards.ivaDesc', icon: SbBilling, sectionKey: 'sections.fiscal', tier: 'contabilidad' },
  { id: 'diot', labelKey: 'cards.diot', descKey: 'cards.diotDesc', icon: SbCheckCircle, sectionKey: 'sections.fiscal', tier: 'contabilidad' },
  { id: 'conta-elec', labelKey: 'cards.contaElec', descKey: 'cards.contaElecDesc', icon: SbBilling, sectionKey: 'sections.fiscal', tier: 'contabilidad' },
  { id: 'paquete-contador', labelKey: 'cards.paqueteContador', descKey: 'cards.paqueteContadorDesc', icon: SbDownload, sectionKey: 'sections.fiscal', tier: 'contabilidad' },

  // Análisis (extras existentes, conservados)
  { id: 'nuevos-clientes', labelKey: 'cards.nuevosClientes', descKey: 'cards.nuevosClientesDesc', icon: SbUserPlus, sectionKey: 'sections.analysis', tier: 'free' },
  { id: 'comparativo', labelKey: 'cards.comparativo', descKey: 'cards.comparativoDesc', icon: SbCompare, sectionKey: 'sections.analysis', tier: 'pro' },
  { id: 'insights', labelKey: 'cards.insights', descKey: 'cards.insightsDesc', icon: SbLightbulb, sectionKey: 'sections.analysis', tier: 'pro' },
  { id: 'rentabilidad-cliente', labelKey: 'cards.rentabilidadCliente', descKey: 'cards.rentabilidadClienteDesc', icon: SbBarChart, sectionKey: 'sections.analysis', tier: 'pro' },
];

// Color por seccion (hex). Financieros/Fiscal en tonos sobrios (slate).
const SECTION_COLORS: Record<string, string> = {
  'sections.general': '#0176D3',
  'sections.sales': '#1F8A5B',
  'sections.collections': '#D97706',
  'sections.inventory': '#0EA5A4',
  'sections.performance': '#2563EB',
  'sections.financial': '#475569',
  'sections.fiscal': '#64748B',
  'sections.analysis': '#7C3AED',
};
// Tint suave del color de seccion sobre la card (fiel al color-mix del diseño).
const sectionTint = (color: string) => `color-mix(in srgb, ${color} 12%, hsl(var(--card)))`;
const SECTION_ORDER = [
  'sections.general',
  'sections.sales',
  'sections.collections',
  'sections.inventory',
  'sections.performance',
  'sections.financial',
  'sections.fiscal',
  'sections.analysis',
];

// Acento por tier para el badge (PRO ambar, Contabilidad slate). free = sin badge.
const TIER_ACCENT: Record<Exclude<ReportTier, 'free'>, string> = {
  pro: '#D97706',
  contabilidad: '#64748B',
};

// Componentes reales por reporte. Los reportes `comingSoon` NO estan aqui
// (no existe vista): se renderiza el placeholder "Proximamente".
const reportComponents: Partial<Record<ReportId, React.ComponentType>> = {
  'ejecutivo': DashboardEjecutivoReport,
  'ventas-periodo': VentasPeriodoReport,
  'ventas-vendedor': VentasVendedorReport,
  'ventas-producto': VentasProductoReport,
  'analisis-abc': AnalisisABCReport,
  'ventas-zona': VentasZonaReport,
  'ventas-cliente': ActividadClientesReport,
  'cartera-vencida': CarteraVencidaReport,
  'estado-cuenta': EstadoCuentaReport,
  'cobranza-periodo': CobranzaPeriodoReport,
  'por-vencer': PorVencerReport,
  'inventario': InventarioReport,
  'inv-valorizado': InvValorizadoReport,
  'rotacion': RotacionReport,
  'margen': MargenReport,
  'cumplimiento-metas': CumplimientoMetasReport,
  'efectividad-visitas': EfectividadVisitasReport,
  'comisiones': ComisionesReport,
  'nuevos-clientes': NuevosClientesReport,
  'comparativo': ComparativoPeriodosReport,
  'insights': AutoInsightsReport,
  'rentabilidad-cliente': RentabilidadClienteReport,
  // Financieros
  'edo-resultados': EstadoResultadosReport,
  'balance-general': BalanceGeneralReport,
  'balanza': BalanzaReport,
  // Fiscal
  'iva': IvaReport,
  'diot': DiotReport,
  'conta-elec': ContaElecReport,
  'paquete-contador': PaqueteContadorReport,
};

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const [activeReport, setActiveReport] = useState<ReportId | null>(null);
  const [view, setView] = useState<'reports' | 'builder'>('reports');
  const [tierInfo, setTierInfo] = useState<ReportTierInfo | null>(null);
  // Cuando se abre un reporte bloqueado mostramos la pantalla de upsell con el
  // tier requerido (en vez de un toast).
  const [upsellTier, setUpsellTier] = useState<Exclude<ReportTier, 'free'> | null>(null);
  // Sparklines reales por reporte (mini-tendencia). Vacío = sin dato → no se dibuja.
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  React.useEffect(() => {
    getReportTierInfo()
      .then(setTierInfo)
      .catch((err) => console.warn('[Reports] failed to load tier info; allowing all reports:', err));
    getReportSparklines()
      .then(setSparklines)
      .catch((err) => console.warn('[Reports] failed to load sparklines:', err));
  }, []);

  const isReportLocked = (reportId: string) => {
    if (!tierInfo) return false; // Allow while loading
    return !tierInfo.allowedReports.includes(reportId);
  };

  const handleReportClick = (report: ReportCard) => {
    if (isReportLocked(report.id)) {
      // Reporte bloqueado por plan: mostrar pantalla de upsell del tier requerido.
      setUpsellTier(report.tier === 'free' ? 'pro' : report.tier);
      setActiveReport(null);
      return;
    }
    setUpsellTier(null);
    setActiveReport(report.id);
  };

  const backToCatalog = () => {
    setActiveReport(null);
    setUpsellTier(null);
  };

  // Catálogo agrupado por sección (preserva el orden de `reports` dentro de cada una).
  const groupedReports = reports.reduce((acc, r) => {
    (acc[r.sectionKey] ??= []).push(r);
    return acc;
  }, {} as Record<string, ReportCard[]>);

  const activeCard = reports.find(r => r.id === activeReport);
  const ActiveComponent = activeReport ? reportComponents[activeReport] : null;
  // comingSoon (o sin componente) cuando el reporte esta permitido pero aun sin vista.
  const showComingSoon = !!activeCard && !ActiveComponent;

  const activeLabel = activeCard ? t(activeCard.labelKey) : '';
  const inDetail = !!activeCard || !!upsellTier;

  const detailTitle = activeCard ? activeLabel : upsellTier ? t('upsell.title', { tier: t(`tiers.${upsellTier}`) }) : '';

  const breadcrumbs = [
    { label: tc('home'), href: '/dashboard' },
    ...(inDetail
      ? [{ label: t('title'), onClick: backToCatalog }, { label: detailTitle }]
      : [{ label: t('title') }]
    ),
  ];

  return (
    <PageHeader
      section="herramientas"
      breadcrumbs={breadcrumbs}
      title={inDetail ? detailTitle : t('title')}
      subtitle={inDetail ? undefined : t('subtitle')}
      actions={inDetail ? (
        <button
          onClick={backToCatalog}
          aria-label={t('backToReports')}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground/70" />
        </button>
      ) : undefined}
    >
        {upsellTier ? (
          <ReportUpsell tier={upsellTier} onBack={backToCatalog} />
        ) : activeCard && ActiveComponent ? (
          <div data-tour="reports-content">
            <ActiveComponent />
          </div>
        ) : showComingSoon ? (
          <div className="flex flex-col items-center justify-center text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-5">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1.5">{t('comingSoon')}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{t('comingSoonDesc')}</p>
          </div>
        ) : (
          <>
            {/* Tabs: Reports | Report Builder (TabBar subrayado, azul herramientas) */}
            <div className="mb-5">
              <TabBar
                items={[
                  { id: 'reports', label: t('tabs.reports') },
                  { id: 'builder', label: t('tabs.builder') },
                ]}
                value={view}
                onChange={(id) => setView(id as 'reports' | 'builder')}
              />
            </div>

            {/* Reports: catálogo en lista por secciones (directo, sin hero — fiel al diseño) */}
            {view === 'reports' && (
              <div className="space-y-5 animate-fade-in" data-tour="reports-cards">
                {SECTION_ORDER.filter(sec => groupedReports[sec]?.length).map(sec => {
                  const color = SECTION_COLORS[sec] ?? '#6B7280';
                  return (
                    <div key={sec}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-2 h-2 rounded-[3px]" style={{ background: color }} />
                        <h3 className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-muted-foreground">{t(sec)}</h3>
                      </div>
                      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                        {groupedReports[sec].map(report => {
                          const Icon = report.icon;
                          const locked = isReportLocked(report.id);
                          const spark = sparklines[report.id];
                          const tierAccent = report.tier !== 'free' ? TIER_ACCENT[report.tier] : null;
                          const hasComponent = !!reportComponents[report.id];
                          return (
                            <button
                              key={report.id}
                              onClick={() => handleReportClick(report)}
                              className={`w-full flex items-center gap-3.5 text-left px-4 py-[13px] transition-colors ${locked ? 'opacity-70 hover:bg-surface-1' : 'hover:bg-surface-1'}`}
                            >
                              <div
                                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
                                style={{ background: sectionTint(color) }}
                              >
                                <Icon size={19} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-[13.5px] font-bold text-foreground truncate">{t(report.labelKey)}</h4>
                                  {/* Badge dinamico de tier: siempre visible para pro/contabilidad. */}
                                  {tierAccent && (
                                    <span
                                      className="inline-flex items-center py-[2px] px-1.5 rounded-[5px] text-[9.5px] font-bold uppercase tracking-wide shrink-0"
                                      style={{ background: sectionTint(tierAccent), color: tierAccent }}
                                    >
                                      {t(`tiers.${report.tier}`)}
                                    </span>
                                  )}
                                  {/* Candado adicional solo cuando el plan no lo incluye. */}
                                  {locked && (
                                    <Lock className="w-[11px] h-[11px] text-muted-foreground shrink-0" />
                                  )}
                                </div>
                                <p className="text-[12px] text-muted-foreground truncate">{t(report.descKey)}</p>
                              </div>
                              {!locked && hasComponent && spark && spark.length > 1 && (
                                <Sparkline data={spark} color={color} width={80} height={26} className="shrink-0 hidden sm:block" />
                              )}
                              <ChevronRight className="w-[17px] h-[17px] text-muted-foreground shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Report Builder */}
            {view === 'builder' && (
              <div className="animate-fade-in">
                <ReportBuilder />
              </div>
            )}
          </>
        )}
    </PageHeader>
  );
}
