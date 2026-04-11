"use client";

import React, { useState, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ReportFilters } from "./ReportFilters";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getRentabilidadCliente, RentabilidadCliente, RentabilidadClienteResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function RentabilidadClienteReport() {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations("reports.rentabilidad");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<RentabilidadClienteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "rentabilidad-cliente",
    title: t("chartTitle"),
    dateRange: dates,
    chartRef,
    table: data ? {
      headers: [t("client"), t("totalSales"), t("orders"), t("avgTicket"), t("daysBetweenOrders")],
      rows: data.clientes.map(c => [c.nombre, fmt(c.totalVentas), c.cantidadPedidos, fmt(c.ticketPromedio), c.diasEntrePedidos]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try { setLoading(true); setData(await getRentabilidadCliente(dates)); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates]);

  const columns: ReportColumn<RentabilidadCliente>[] = [
    { key: "nombre", header: t("client"), sortable: true },
    { key: "totalVentas", header: t("totalSales"), align: "right", sortable: true, render: r => fmt(r.totalVentas) },
    { key: "cantidadPedidos", header: t("orders"), align: "right", sortable: true },
    { key: "ticketPromedio", header: t("avgTicket"), align: "right", sortable: true, render: r => fmt(r.ticketPromedio) },
    { key: "diasEntrePedidos", header: t("daysBetweenOrders"), align: "right", sortable: true },
    { key: "ultimoPedido" as keyof RentabilidadCliente, header: t("lastOrder"), render: r => r.ultimoPedido ? formatDate(r.ultimoPedido) : "—" },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          {data.clientes.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("chartTitle")}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.clientes.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={v => [fmt(Number(v)), t("salesLabel")]} />
                  <Bar dataKey="totalVentas" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ReportTable data={data.clientes as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
