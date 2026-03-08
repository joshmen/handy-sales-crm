'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  Users,
  UserPlus,
  Package,
  Map,
  BarChart3,
  Boxes,
  LayoutDashboard,
  Wallet,
  Target,
  GitCompare,
  Lightbulb,
  Activity,
  DollarSign,
  Crown,
  Layers,
} from 'lucide-react';
import { getReportTierInfo, ReportTierInfo } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { Lock } from 'lucide-react';
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
  icon: React.ElementType;
  color: string;
  section: string;
}

const reports: ReportCard[] = [
  {
    id: 'ejecutivo',
    label: 'Dashboard Ejecutivo',
    description: 'Resumen general con KPIs de ventas, pedidos, clientes y tendencias del período.',
    icon: LayoutDashboard,
    color: 'green',
    section: 'General',
  },
  {
    id: 'ventas-periodo',
    label: 'Ventas por Período',
    description: 'Analiza ventas agrupadas por día, semana o mes con gráficas de tendencia.',
    icon: TrendingUp,
    color: 'green',
    section: 'Ventas',
  },
  {
    id: 'ventas-vendedor',
    label: 'Ventas por Vendedor',
    description: 'Ranking de vendedores con métricas de ventas, pedidos y efectividad.',
    icon: Users,
    color: 'blue',
    section: 'Ventas',
  },
  {
    id: 'ventas-producto',
    label: 'Ventas por Producto',
    description: 'Productos más vendidos, con mayor venta y productos sin movimiento.',
    icon: Package,
    color: 'purple',
    section: 'Ventas',
  },
  {
    id: 'ventas-zona',
    label: 'Ventas por Zona',
    description: 'Distribución de ventas por zona geográfica con totales y clientes.',
    icon: Map,
    color: 'amber',
    section: 'Ventas',
  },
  {
    id: 'actividad-clientes',
    label: 'Actividad de Clientes',
    description: 'Historial de pedidos, visitas y ventas por cliente con filtros por zona.',
    icon: BarChart3,
    color: 'indigo',
    section: 'Clientes',
  },
  {
    id: 'nuevos-clientes',
    label: 'Nuevos Clientes',
    description: 'Clientes registrados en el período seleccionado con tendencia mensual.',
    icon: UserPlus,
    color: 'teal',
    section: 'Clientes',
  },
  {
    id: 'inventario',
    label: 'Inventario Actual',
    description: 'Estado del inventario con semáforo de stock: normal, bajo, sin stock y exceso.',
    icon: Boxes,
    color: 'red',
    section: 'Inventario',
  },
  {
    id: 'cartera-vencida',
    label: 'Cartera Vencida',
    description: 'Análisis de cuentas por cobrar agrupadas por antigüedad (0-30, 31-60, 61-90, 90+ días).',
    icon: Wallet,
    color: 'red',
    section: 'Cobranza',
  },
  {
    id: 'cumplimiento-metas',
    label: 'Cumplimiento de Metas',
    description: 'Progreso de vendedores vs sus metas de ventas, visitas y pedidos asignadas.',
    icon: Target,
    color: 'green',
    section: 'Desempeño',
  },
  {
    id: 'comparativo',
    label: 'Comparativo de Períodos',
    description: 'Compara métricas clave entre dos períodos personalizados con deltas y tendencias.',
    icon: GitCompare,
    color: 'blue',
    section: 'Análisis',
  },
  {
    id: 'insights',
    label: 'Auto-Insights',
    description: 'Análisis automático que detecta tendencias, oportunidades y alertas en tu negocio.',
    icon: Lightbulb,
    color: 'amber',
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

const colorStyles: Record<string, { bg: string; border: string; iconBg: string; iconText: string; badge: string }> = {
  green:  { bg: 'hover:bg-green-50',  border: 'hover:border-green-200',  iconBg: 'bg-green-100',  iconText: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
  blue:   { bg: 'hover:bg-blue-50',   border: 'hover:border-blue-200',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'hover:bg-purple-50', border: 'hover:border-purple-200', iconBg: 'bg-purple-100', iconText: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  amber:  { bg: 'hover:bg-amber-50',  border: 'hover:border-amber-200',  iconBg: 'bg-amber-100',  iconText: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  indigo: { bg: 'hover:bg-indigo-50', border: 'hover:border-indigo-200', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  teal:   { bg: 'hover:bg-teal-50',   border: 'hover:border-teal-200',   iconBg: 'bg-teal-100',   iconText: 'text-teal-600',   badge: 'bg-teal-100 text-teal-700' },
  red:    { bg: 'hover:bg-red-50',    border: 'hover:border-red-200',    iconBg: 'bg-red-100',    iconText: 'text-red-600',    badge: 'bg-red-100 text-red-700' },
  orange: { bg: 'hover:bg-orange-50', border: 'hover:border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2 text-[13px] mb-3">
          <span className="text-gray-500">Administración</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {activeCard ? (
            <>
              <button
                onClick={() => setActiveReport(null)}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Reportes
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-semibold">{activeCard.label}</span>
            </>
          ) : (
            <span className="text-gray-900 font-semibold">Reportes</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeCard && (
            <button
              onClick={() => setActiveReport(null)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {activeCard ? activeCard.label : 'Reportes y Análisis'}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {ActiveComponent && activeReport ? (
          <div className="p-6" data-tour="reports-content">
            <ActiveComponent />
          </div>
        ) : (
          <div className="p-6 space-y-6" data-tour="reports-cards">
            {Object.entries(sections).map(([sectionName, sectionReports]) => (
              <div key={sectionName}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                  {sectionName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sectionReports.map(report => {
                    const Icon = report.icon;
                    const cs = colorStyles[report.color];
                    return (
                      <button
                        key={report.id}
                        onClick={() => handleReportClick(report.id)}
                        className={`text-left bg-white border border-gray-200 rounded-xl p-5 transition-all ${cs.bg} ${cs.border} hover:shadow-sm group ${isReportLocked(report.id) ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${cs.iconBg}`}>
                            <Icon className={`w-5 h-5 ${cs.iconText}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-gray-900">{report.label}</h3>
                          {isReportLocked(report.id) && <Lock className="w-3.5 h-3.5 text-gray-400" />}
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
      </div>
    </div>
  );
}
