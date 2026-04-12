'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Lock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getReportTierInfo, ReportTierInfo } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
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
} from '@/components/layout/DashboardIcons';
import { DashboardEjecutivoReport } from '@/components/reports/DashboardEjecutivoReport';
import { VentasPeriodoReport } from '@/components/reports/VentasPeriodoReport';
import { VentasVendedorReport } from '@/components/reports/VentasVendedorReport';
import { VentasProductoReport } from '@/components/reports/VentasProductoReport';
import { VentasZonaReport } from '@/components/reports/VentasZonaReport';
import { ActividadClientesReport } from '@/components/reports/ActividadClientesReport';
import { NuevosClientesReport } from '@/components/reports/NuevosClientesReport';
import { InventarioReport } from '@/components/reports/InventarioReport';
import { CarteraVencidaReport } from '@/components/reports/CarteraVencidaReport';
import { CumplimientoMetasReport } from '@/components/reports/CumplimientoMetasReport';
import { ComparativoPeriodosReport } from '@/components/reports/ComparativoPeriodosReport';
import { AutoInsightsReport } from '@/components/reports/AutoInsightsReport';
import { EfectividadVisitasReport } from '@/components/reports/EfectividadVisitasReport';
import { ComisionesReport } from '@/components/reports/ComisionesReport';
import { RentabilidadClienteReport } from '@/components/reports/RentabilidadClienteReport';
import { AnalisisABCReport } from '@/components/reports/AnalisisABCReport';
import { ReportBuilder } from '@/components/reports/ReportBuilder';

type ReportId =
  | 'ejecutivo'
  | 'ventas-periodo'
  | 'ventas-vendedor'
  | 'ventas-producto'
  | 'ventas-zona'
  | 'actividad-clientes'
  | 'nuevos-clientes'
  | 'inventario'
  | 'cartera-vencida'
  | 'cumplimiento-metas'
  | 'comparativo'
  | 'insights'
  | 'efectividad-visitas'
  | 'comisiones'
  | 'rentabilidad-cliente'
  | 'analisis-abc';

interface ReportCard {
  id: ReportId;
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  sectionKey: string;
}

const reports: ReportCard[] = [
  { id: 'ejecutivo', labelKey: 'cards.ejecutivo', descKey: 'cards.ejecutivoDesc', icon: SbDashboard, sectionKey: 'sections.general' },
  { id: 'ventas-periodo', labelKey: 'cards.ventasPeriodo', descKey: 'cards.ventasPeriodoDesc', icon: SbTrendingUp, sectionKey: 'sections.sales' },
  { id: 'ventas-vendedor', labelKey: 'cards.ventasVendedor', descKey: 'cards.ventasVendedorDesc', icon: SbClients, sectionKey: 'sections.sales' },
  { id: 'ventas-producto', labelKey: 'cards.ventasProducto', descKey: 'cards.ventasProductoDesc', icon: SbProducts, sectionKey: 'sections.sales' },
  { id: 'ventas-zona', labelKey: 'cards.ventasZona', descKey: 'cards.ventasZonaDesc', icon: SbMap, sectionKey: 'sections.sales' },
  { id: 'actividad-clientes', labelKey: 'cards.actividadClientes', descKey: 'cards.actividadClientesDesc', icon: SbBarChart, sectionKey: 'sections.clients' },
  { id: 'nuevos-clientes', labelKey: 'cards.nuevosClientes', descKey: 'cards.nuevosClientesDesc', icon: SbUserPlus, sectionKey: 'sections.clients' },
  { id: 'inventario', labelKey: 'cards.inventario', descKey: 'cards.inventarioDesc', icon: SbInventory, sectionKey: 'sections.inventory' },
  { id: 'cartera-vencida', labelKey: 'cards.carteraVencida', descKey: 'cards.carteraVencidaDesc', icon: SbWallet, sectionKey: 'sections.collections' },
  { id: 'cumplimiento-metas', labelKey: 'cards.cumplimientoMetas', descKey: 'cards.cumplimientoMetasDesc', icon: SbGoals, sectionKey: 'sections.performance' },
  { id: 'comparativo', labelKey: 'cards.comparativo', descKey: 'cards.comparativoDesc', icon: SbCompare, sectionKey: 'sections.analysis' },
  { id: 'insights', labelKey: 'cards.insights', descKey: 'cards.insightsDesc', icon: SbLightbulb, sectionKey: 'sections.analysis' },
];

const reportComponents: Record<ReportId, React.ComponentType> = {
  'ejecutivo': DashboardEjecutivoReport,
  'ventas-periodo': VentasPeriodoReport,
  'ventas-vendedor': VentasVendedorReport,
  'ventas-producto': VentasProductoReport,
  'ventas-zona': VentasZonaReport,
  'actividad-clientes': ActividadClientesReport,
  'nuevos-clientes': NuevosClientesReport,
  'inventario': InventarioReport,
  'cartera-vencida': CarteraVencidaReport,
  'cumplimiento-metas': CumplimientoMetasReport,
  'comparativo': ComparativoPeriodosReport,
  'insights': AutoInsightsReport,
  'efectividad-visitas': EfectividadVisitasReport,
  'comisiones': ComisionesReport,
  'rentabilidad-cliente': RentabilidadClienteReport,
  'analisis-abc': AnalisisABCReport,
};


export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const [activeReport, setActiveReport] = useState<ReportId | null>(null);
  const [view, setView] = useState<'reports' | 'builder'>('reports');
  const [tierInfo, setTierInfo] = useState<ReportTierInfo | null>(null);

  React.useEffect(() => {
    getReportTierInfo().then(setTierInfo).catch(() => {});
  }, []);

  const isReportLocked = (reportId: string) => {
    if (!tierInfo) return false; // Allow while loading
    return !tierInfo.allowedReports.includes(reportId);
  };

  const handleReportClick = (reportId: ReportId) => {
    if (isReportLocked(reportId)) {
      toast.error(t('lockedReport', { plan: tierInfo?.currentTier?.toUpperCase() || 'FREE' }));
      return;
    }
    setActiveReport(reportId);
  };

  const activeCard = reports.find(r => r.id === activeReport);
  const ActiveComponent = activeReport ? reportComponents[activeReport] : null;

  // Group reports by sectionKey
  const sections = reports.reduce<Record<string, ReportCard[]>>((acc, r) => {
    (acc[r.sectionKey] ??= []).push(r);
    return acc;
  }, {});

  const activeLabel = activeCard ? t(activeCard.labelKey) : '';

  const breadcrumbs = [
    { label: tc('home'), href: '/dashboard' },
    ...(activeCard
      ? [{ label: t('title'), onClick: () => setActiveReport(null) }, { label: activeLabel }]
      : [{ label: t('title') }]
    ),
  ];

  return (
    <PageHeader
      breadcrumbs={breadcrumbs}
      title={activeCard ? activeLabel : t('title')}
      actions={activeCard ? (
        <button
          onClick={() => setActiveReport(null)}
          aria-label={t('backToReports')}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground/70" />
        </button>
      ) : undefined}
    >
        {ActiveComponent && activeReport ? (
          <div data-tour="reports-content">
            <ActiveComponent />
          </div>
        ) : (
          <>
            {/* Tabs: Reports | Report Builder */}
            <div className="flex gap-1 bg-surface-3 rounded-lg p-1 w-fit mb-4">
              <button
                onClick={() => setView('reports')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  view === 'reports' ? 'bg-surface-2 text-foreground shadow-elevation-1' : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {t('tabs.reports')}
              </button>
              <button
                onClick={() => setView('builder')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  view === 'builder' ? 'bg-surface-2 text-foreground shadow-elevation-1' : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {t('tabs.builder')}
              </button>
            </div>

            {/* Reports grid */}
            {view === 'reports' && (
              <div className="space-y-6 animate-fade-in" data-tour="reports-cards">
                {Object.entries(sections).map(([sectionKey, sectionReports]) => (
                  <div key={sectionKey}>
                    <h2 className="text-xs font-semibold text-muted-foreground mb-3 px-1">
                      {t(sectionKey)}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sectionReports.map(report => {
                        const Icon = report.icon;
                        return (
                          <button
                            key={report.id}
                            onClick={() => handleReportClick(report.id)}
                            className={`text-left bg-surface-2 dark:bg-foreground border border-border-subtle dark:border-border-strong rounded-xl p-5 transition-all hover:bg-surface-1 dark:hover:bg-foreground hover:border-border-default hover:shadow-sm group ${isReportLocked(report.id) ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <Icon size={36} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-semibold text-foreground dark:text-white">{t(report.labelKey)}</h3>
                              {isReportLocked(report.id) && <Lock className="w-3.5 h-3.5 text-muted-foreground dark:text-muted-foreground" />}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t(report.descKey)}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
