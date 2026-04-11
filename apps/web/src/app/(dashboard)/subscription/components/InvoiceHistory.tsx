"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { SbWallet } from "@/components/layout/DashboardIcons";
import type { StripeInvoice } from "@/types/subscription";
import { Loader2, FileText, Download, Receipt } from "lucide-react";

// ── Invoice Status Badge ──────────────────────────────────
const invoiceStatusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Pagado", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  open: { label: "Pendiente", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  draft: { label: "Borrador", className: "bg-surface-3 text-foreground dark:bg-foreground dark:text-muted-foreground/60" },
  uncollectible: { label: "Incobrable", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  void: { label: "Anulado", className: "bg-surface-3 text-foreground/70 dark:bg-foreground dark:text-muted-foreground" },
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const info = invoiceStatusMap[status] || { label: status, className: "bg-surface-3 text-foreground dark:bg-foreground dark:text-muted-foreground/60" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${info.className}`}>
      {info.label}
    </span>
  );
}

interface InvoiceHistoryProps {
  invoices: StripeInvoice[];
  billingLoading: boolean;
}

export function InvoiceHistory({ invoices, billingLoading }: InvoiceHistoryProps) {
  return (
    <Card className="page-animate-delay-2">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <SbWallet size={20} />
          <h3 className="text-sm font-semibold text-foreground">Historial de facturación</h3>
        </div>
        {billingLoading ? (
          <div className="flex items-center gap-2 p-4 border border-border rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando historial...</span>
          </div>
        ) : invoices.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Fecha</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">No. Factura</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Período</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Monto</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className={`border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Date(inv.created).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {inv.number || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(inv.periodStart).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        {" \u2014 "}
                        {new Date(inv.periodEnd).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground text-right font-medium">
                        ${(inv.amountPaid / 100).toLocaleString("es-MX", { minimumFractionDigits: 2 })} {inv.currency.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.hostedInvoiceUrl && (
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-blue-700 border border-border hover:bg-muted/40 dark:text-blue-300 dark:border-border dark:hover:bg-muted/30 transition-colors"
                              title="Ver factura"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Ver
                            </a>
                          )}
                          {inv.invoicePdfUrl && (
                            <a
                              href={inv.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-red-700 border border-border hover:bg-muted/40 dark:text-red-300 dark:border-border dark:hover:bg-muted/30 transition-colors"
                              title="Descargar PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {new Date(inv.created).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">{inv.number || "Sin número"}</span>
                    <span className="text-sm font-semibold text-foreground">
                      ${(inv.amountPaid / 100).toLocaleString("es-MX", { minimumFractionDigits: 2 })} {inv.currency.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(inv.periodStart).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    {" \u2014 "}
                    {new Date(inv.periodEnd).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {inv.hostedInvoiceUrl && (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 border border-border hover:bg-muted/40 dark:text-blue-300 dark:border-border dark:hover:bg-muted/30 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver factura
                      </a>
                    )}
                    {inv.invoicePdfUrl && (
                      <a
                        href={inv.invoicePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-red-700 border border-border hover:bg-muted/40 dark:text-red-300 dark:border-border dark:hover:bg-muted/30 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border border-dashed border-border rounded-xl">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No hay facturas todavía</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
