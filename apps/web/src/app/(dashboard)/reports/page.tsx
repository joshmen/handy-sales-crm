'use client';

import React, { useState } from 'react';
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
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: string;
}

const reports: ReportCard[] = [
  {
    id: 'ejecutivo',
    label: 'Dashboard Ejecutivo',
    description: 'Resumen general con KPIs de ventas, pedidos, clientes y tendencias del período.',
    icon: SbDashboard,
    section: 'General',
  },
  {
    id: 'ventas-periodo',
    label: 'Ventas por Período',
    description: 'Analiza ventas agrupadas por día, semana o mes con gráficas de tendencia.',
    icon: SbTrendingUp,
    section: 'Ventas',
  },
  {
    id: 'ventas-vendedor',
    label: 'Ventas por Vendedor',
    description: 'Ranking de vendedores con métricas de ventas, pedidos y efectividad.',
    icon: SbClients,
    section: 'Ventas',
  },
  {
    id: 'ventas-producto',
    label: 'Ventas por Producto',
    description: 'Productos más vendidos, con mayor venta y productos sin movimiento.',
    icon: SbProducts,
    section: 'Ventas',
  },
  {
    id: 'ventas-zona',
    label: 'Ventas por Zona',
    description: 'Distribución de ventas por zona geográfica con totales y clientes.',
    icon: SbMap,
    section: 'Ventas',
  },
  {
    id: 'actividad-clientes',
    label: 'Actividad de Clientes',
    description: 'Historial de pedidos, visitas y ventas por cliente con filtros por zona.',
    icon: SbBarChart,
    section: 'Clientes',
  },
  {
    id: 'nuevos-clientes',
    label: 'Nuevos Clientes',
    description: 'Clientes registrados en el período seleccionado con tendencia mensual.',
    icon: SbUserPlus,
    section: 'Clientes',
  },
  {
    id: 'inventario',
    label: 'Inventario Actual',
    description: 'Estado del inventario con semáforo de stock: normal, bajo, sin stock y exceso.',
    icon: SbInventory,
    section: 'Inventario',
  },
  {
    id: 'cartera-vencida',
    label: 'Cartera Vencida',
    description: 'Análisis de cuentas por cobrar agrupadas por antigüedad (0-30, 31-60, 61-90, 90+ días).',
    icon: SbWallet,
    section: 'Cobranza',
  },
  {
    id: 'cumplimiento-metas',
    label: 'Cumplimiento de Metas',
    description: 'Progreso de vendedores vs sus metas de ventas, visitas y pedidos asignadas.',
    icon: SbGoals,
    section: 'Desempeño',
  },
  {
    id: 'comparativo',
    label: 'Comparativo de Períodos',
    description: 'Compara métricas clave entre dos períodos personalizados con deltas y tendencias.',
    icon: SbCompare,
    section: 'Análisis',
  },
  {
    id: 'insights',
    label: 'Auto-Insights',
    description: 'Análisis automático que detecta tendencias, oportunidades y alertas en tu negocio.',
    icon: SbLightbulb,
    section: 'Análisis',
  },
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
  const [activeReport, setActiveReport] = useState<ReportId | null>(null);
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
      toast.error(`Este reporte requiere un plan superior. Tu plan actual: ${tierInfo?.currentTier?.toUpperCase() || 'FREE'}`);
      return;
    }
    setActiveReport(reportId);
  };

  const activeCard = reports.find(r => r.id === activeReport);
  const ActiveComponent = activeReport ? reportComponents[activeReport] : null;

  // Group reports by section
  const sections = reports.reduce<Record<string, ReportCard[]>>((acc, r) => {
    (acc[r.section] ??= []).push(r);
    return acc;
  }, {});

  const breadcrumbs = [
    { label: 'Inicio', href: '/dashboard' },
    ...(activeCard
      ? [{ label: 'Reportes', href: '#', onClick: () => setActiveReport(null) }, { label: activeCard.label }]
      : [{ label: 'Reportes' }]
    ),
  ];

  return (
    <PageHeader
      breadcrumbs={breadcrumbs}
      title={activeCard ? activeCard.label : 'Reportes y Análisis'}
      actions={activeCard ? (
        <button
          onClick={() => setActiveReport(null)}
          aria-label="Volver a reportes"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
      ) : undefined}
    >
        {ActiveComponent && activeReport ? (
          <div data-tour="reports-content">
            <ActiveComponent />
          </div>
        ) : (
          <div className="space-y-6" data-tour="reports-cards">
            {Object.entries(sections).map(([sectionName, sectionReports]) => (
              <div key={sectionName}>
                <h2 className="text-xs font-semibold text-gray-400 mb-3 px-1">
                  {sectionName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sectionReports.map(report => {
                    const Icon = report.icon;
                    return (
                      <button
                        key={report.id}
                        onClick={() => handleReportClick(report.id)}
                        className={`text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 hover:shadow-sm group ${isReportLocked(report.id) ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Icon size={36} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{report.label}</h3>
                          {isReportLocked(report.id) && <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
    </PageHeader>
  );
}
