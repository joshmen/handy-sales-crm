"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@tremor/react";
import { ReportFilters } from "./ReportFilters";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getRentabilidadCliente, RentabilidadCliente, RentabilidadClienteResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function RentabilidadClienteReport() {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations("reports.rentabilidad");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<RentabilidadClienteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "rentabilidad-cliente", title: t("reportTitle"), dateRange: dates, chartRef,
    table: data ? {
      headers: [t("client"), t("totalSales"), t("orders"), t("avgTicket"), t("daysBetweenOrders")],
      rows: data.clientes.map(c => [c.nombre, fmt(c.totalVentas), c.cantidadPedidos, fmt(c.ticketPromedio), c.diasEntrePedidos]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
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

  const top10 = data?.clientes.slice(0, 10) || [];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: true }, animations: { enabled: true, speed: 800 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "65%" } },
    colors: ["#10b981"],
    grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v) => fmt(Number(v)), style: { fontSize: "11px", colors: ["#374151"] }, offsetX: 5 },
    xaxis: { labels: { formatter: (v) => `$${(Number(v) / 1000).toFixed(0)}k`, style: { fontSize: "11px", colors: "#9ca3af" } } },
    yaxis: { labels: { style: { fontSize: "10px", colors: "#374151" } } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          {top10.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t("chartTitle")}</h3>
              <Chart type="bar" options={chartOptions} series={[{ name: t("salesLabel"), data: top10.map(c => ({ x: c.nombre, y: c.totalVentas })) }]} height={Math.max(250, top10.length * 45)} />
            </Card>
          )}
          <ReportTable data={data.clientes as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
