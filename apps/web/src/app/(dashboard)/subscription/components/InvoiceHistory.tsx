"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/Card";
import { SbWallet } from "@/components/layout/DashboardIcons";
import type { StripeInvoice } from "@/types/subscription";
import { Loader2, FileText, Download, Receipt } from "lucide-react";

// ── Invoice Status Badge ──────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  draft: "bg-surface-3 text-foreground dark:bg-foreground dark:text-muted-foreground/60",
  uncollectible: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  void: "bg-surface-3 text-foreground/70 dark:bg-foreground dark:text-muted-foreground",
};

const STATUS_KEYS: Record<string, string> = {
  paid: "statusPaid",
  open: "statusOpen",
  draft: "statusDraft",
  uncollectible: "statusUncollectible",
  void: "statusVoid",
};

function InvoiceStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const color = STATUS_COLORS[status] || "bg-surface-3 text-foreground dark:bg-foreground dark:text-muted-foreground/60";
  const key = STATUS_KEYS[status];
  const label = key ? t(key) : status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

interface InvoiceHistoryProps {
  invoices: StripeInvoice[];
  billingLoading: boolean;
}

export function InvoiceHistory({ invoices, billingLoading }: InvoiceHistoryProps) {
  const t = useTranslations('subscription.invoiceHistory');

  return (
    <Card className="page-animate-delay-2">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <SbWallet size={20} />
          <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
        </div>
        {billingLoading ? (
          <div className="flex items-center gap-2 p-4 border border-border rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('loading')}</span>
          </div>
        ) : invoices.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t('date')}</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t('invoiceNumber')}</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t('period')}</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">{t('amount')}</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">{t('status')}</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className={`border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Date(inv.created).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {inv.number || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(inv.periodStart).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                        {" \u2014 "}
                        {new Date(inv.periodEnd).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground text-right font-medium">
                        ${(inv.amountPaid / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InvoiceStatusBadge status={inv.status} t={t} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.hostedInvoiceUrl && (
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-blue-700 border border-border hover:bg-muted/40 dark:text-blue-300 dark:border-border dark:hover:bg-muted/30 transition-colors"
                              title={t('viewInvoice')}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {t('view')}
                            </a>
                          )}
                          {inv.invoicePdfUrl && (
                            <a
                              href={inv.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-red-700 border border-border hover:bg-muted/40 dark:text-red-300 dark:border-border dark:hover:bg-muted/30 transition-colors"
                              title={t('downloadPdf')}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {t('pdf')}
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
                      {new Date(inv.created).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <InvoiceStatusBadge status={inv.status} t={t} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">{inv.number || t('noNumber')}</span>
                    <span className="text-sm font-semibold text-foreground">
                      ${(inv.amountPaid / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(inv.periodStart).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    {" \u2014 "}
                    {new Date(inv.periodEnd).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
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
                        {t('viewInvoice')}
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
                        {t('pdf')}
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
            <span className="text-sm text-muted-foreground">{t('noInvoices')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
