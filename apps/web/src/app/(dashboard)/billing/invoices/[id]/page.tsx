'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  getFactura,
  timbrarFactura,
  cancelarFactura,
  downloadFacturaPdf,
  downloadFacturaXml,
  enviarFactura,
} from '@/services/api/billing';
import type { FacturaDetail, FacturaEstado } from '@/types/billing';
import { toast } from '@/hooks/useToast';

// ── Status helpers ──

const ESTADO_STYLE: Record<FacturaEstado, { key: string; color: string; bg: string }> = {
  PENDIENTE: { key: 'pending', color: 'text-amber-700', bg: 'bg-amber-100' },
  TIMBRADA:  { key: 'stamped',  color: 'text-green-700', bg: 'bg-green-100' },
  CANCELADA: { key: 'cancelled', color: 'text-red-700',   bg: 'bg-red-100' },
  ERROR:     { key: 'error',     color: 'text-red-700',   bg: 'bg-red-100' },
};

function StatusBadge({ estado }: { estado: FacturaEstado }) {
  const t = useTranslations('billing.invoiceDetail');
  const cfg = ESTADO_STYLE[estado] ?? { key: estado.toLowerCase(), color: 'text-foreground/80', bg: 'bg-surface-3' };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {t(`status.${cfg.key}` as 'status.pending')}
    </span>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value ?? '-'}</span>
    </div>
  );
}

// ── Page ──

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('billing.invoiceDetail');
  const tc = useTranslations('common');
  const facturaId = Number(params.id);

  const [factura, setFactura] = useState<FacturaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState<'01' | '02' | '03' | '04'>('02');
  const [cancelFolioSustitucion, setCancelFolioSustitucion] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);

  const loadFactura = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFactura(facturaId);
      setFactura(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [facturaId]);

  useEffect(() => {
    if (facturaId) loadFactura();
  }, [facturaId, loadFactura]);

  const handleTimbrar = async () => {
    if (!factura) return;
    try {
      setActionLoading('timbrar');
      await timbrarFactura(factura.id);
      toast.success(t('stampSuccess'));
      await loadFactura();
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || t('stampError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!factura) return;
    try {
      setActionLoading('pdf');
      await downloadFacturaPdf(factura.id, `${factura.serie || 'A'}${factura.folio}`, factura.emisorRfc);
    } catch {
      toast.error(t('downloadPdfError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadXml = async () => {
    if (!factura) return;
    try {
      setActionLoading('xml');
      await downloadFacturaXml(factura.id, `${factura.serie || 'A'}${factura.folio}`, factura.emisorRfc);
    } catch {
      toast.error(t('downloadXmlError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async () => {
    if (!factura || !emailTo.trim()) return;
    try {
      setActionLoading('email');
      await enviarFactura(factura.id, { email: emailTo.trim(), incluirPdf: true, incluirXml: true });
      toast.success(t('emailModal.success'));
      setShowEmailModal(false);
      setEmailTo('');
    } catch {
      toast.error(t('emailModal.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelar = async () => {
    if (!factura || !cancelConfirmed) return;
    if (cancelMotivo === '01' && !cancelFolioSustitucion.trim()) {
      toast.error(t('cancelModal.reason01RequiresUuid'));
      return;
    }
    try {
      setActionLoading('cancelar');
      const result = await cancelarFactura(factura.id, {
        motivoCancelacion: cancelMotivo,
        folioSustitucion: cancelMotivo === '01' ? cancelFolioSustitucion.trim() : undefined,
      });
      if (result.estado === 'EN_PROCESO') {
        toast.info(result.mensaje || t('cancelModal.inProcessMessage'));
      } else {
        toast.success(result.mensaje || t('cancelModal.cancelledMessage'));
      }
      setShowCancelModal(false);
      setCancelConfirmed(false);
      await loadFactura();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      toast.error(msg?.error || msg?.details || t('cancelModal.cancelError'));
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading / Error ──

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-foreground/70">{t('loadingInvoice')}</span>
        </div>
      </div>
    );
  }

  if (notFound || !factura) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('notFound')}</h2>
          <p className="text-foreground/70 mb-4">{t('notFoundMessage')}</p>
          <button onClick={() => router.push('/billing/invoices')} className="px-4 py-2 bg-success text-success-foreground rounded hover:bg-success/90">
            {t('backToInvoices')}
          </button>
        </div>
      </div>
    );
  }

  const folioDisplay = `${factura.serie || 'A'}-${String(factura.folio).padStart(3, '0')}`;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-surface-2 px-4 sm:px-8 py-4 border-b border-border-subtle">
        <Breadcrumb items={[
          { label: t('breadcrumbHome'), href: '/dashboard' },
          { label: t('breadcrumbBilling'), href: '/billing' },
          { label: t('invoiceTitle', { folio: folioDisplay }) },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/billing/invoices')}
              className="p-1.5 rounded-md hover:bg-surface-3 text-muted-foreground hover:text-foreground/80 transition-colors"
              aria-label={t('backToInvoices')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-foreground">
              {t('invoiceTitle', { folio: folioDisplay })}
            </h1>
            <StatusBadge estado={factura.estado} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {factura.estado === 'PENDIENTE' && (
              <button
                onClick={handleTimbrar}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'timbrar' && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('stamp')}
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={!!actionLoading}
              className="flex items-center gap-2 border border-border-default text-foreground/80 hover:bg-surface-1 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'pdf' && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('downloadPdf')}
            </button>
            <button
              onClick={handleDownloadXml}
              disabled={!!actionLoading}
              className="flex items-center gap-2 border border-border-default text-foreground/80 hover:bg-surface-1 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'xml' && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('downloadXml')}
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!!actionLoading}
              className="flex items-center gap-2 border border-border-default text-foreground/80 hover:bg-surface-1 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {t('sendByEmail')}
            </button>
            {factura.estado === 'TIMBRADA' && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {t('cancelInvoice')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emisor */}
          <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('issuer')}</h2>
            <div className="space-y-2">
              <InfoRow label={t('rfcLabel')} value={factura.emisorRfc} />
              <InfoRow label={t('businessName')} value={factura.emisorNombre} />
              <InfoRow label={t('taxRegime')} value={factura.emisorRegimenFiscal} />
            </div>
          </div>

          {/* Receptor */}
          <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('receptor')}</h2>
            <div className="space-y-2">
              <InfoRow label={t('rfcLabel')} value={factura.receptorRfc} />
              <InfoRow label={t('businessName')} value={factura.receptorNombre} />
              <InfoRow label={t('cfdiUse')} value={factura.receptorUsoCfdi} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('concepts')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-muted-foreground">
                  <th className="pb-3 font-medium">{t('satKey')}</th>
                  <th className="pb-3 font-medium">{t('description')}</th>
                  <th className="pb-3 font-medium">{t('unit')}</th>
                  <th className="pb-3 font-medium text-right">{t('quantityLabel')}</th>
                  <th className="pb-3 font-medium text-right">{t('unitPriceLabel')}</th>
                  <th className="pb-3 font-medium text-right">{t('discountLabel')}</th>
                  <th className="pb-3 font-medium text-right">{t('amountLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {factura.detalles?.map((item) => (
                  <tr key={item.id} className="border-b border-border-subtle">
                    <td className="py-3 text-muted-foreground font-mono text-xs">{item.claveProdServ}</td>
                    <td className="py-3 text-foreground">{item.descripcion}</td>
                    <td className="py-3 text-muted-foreground">{item.claveUnidad || item.unidad || '-'}</td>
                    <td className="py-3 text-right text-foreground">{item.cantidad}</td>
                    <td className="py-3 text-right text-foreground">{formatCurrency(item.valorUnitario)}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.descuento > 0 ? formatCurrency(item.descuento) : '-'}</td>
                    <td className="py-3 text-right font-medium text-foreground">{formatCurrency(item.importe)}</td>
                  </tr>
                ))}
                {(!factura.detalles || factura.detalles.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">{t('noConcepts')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Totals */}
          <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('totals')}</h2>
            <div className="space-y-2">
              <InfoRow label={t('subtotal')} value={formatCurrency(factura.subtotal)} />
              {factura.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('discount')}</span>
                  <span className="text-red-600">-{formatCurrency(factura.descuento)}</span>
                </div>
              )}
              <InfoRow label={t('taxTransferred')} value={formatCurrency(factura.totalImpuestosTrasladados)} />
              {factura.totalImpuestosRetenidos > 0 && (
                <InfoRow label={t('taxWithheld')} value={formatCurrency(factura.totalImpuestosRetenidos)} />
              )}
              <div className="border-t border-border-subtle pt-2 flex justify-between">
                <span className="text-base font-semibold text-foreground">{tc('total')}</span>
                <span className="text-base font-bold text-foreground">{formatCurrency(factura.total)}</span>
              </div>
              <InfoRow label={t('currency')} value={factura.moneda} />
            </div>
          </div>

          {/* CFDI info */}
          <div className="bg-surface-2 rounded-xl p-6 border border-border-subtle">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('cfdiData')}</h2>
            <div className="space-y-2">
              {factura.uuid && <InfoRow label={t('uuid')} value={factura.uuid} />}
              <InfoRow label={t('series')} value={factura.serie} />
              <InfoRow label={t('folio')} value={factura.folio} />
              <InfoRow label={t('voucherType')} value={factura.tipoComprobante} />
              <InfoRow label={t('paymentMethod')} value={factura.metodoPago} />
              <InfoRow label={t('paymentForm')} value={factura.formaPago} />
              <InfoRow label={t('cfdiUse')} value={factura.usoCfdi} />
              <InfoRow label={t('issuanceDate')} value={formatDate(factura.fechaEmision)} />
              <InfoRow label={t('stampDate')} value={formatDate(factura.fechaTimbrado)} />
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-2 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('emailModal.title')}</h3>
            <label className="block text-sm font-medium text-foreground/80 mb-1">{t('emailModal.emailLabel')}</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder={t('emailModal.emailPlaceholder')}
              className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowEmailModal(false); setEmailTo(''); }}
                className="px-4 py-2 text-sm text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailTo.trim() || !!actionLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:opacity-50"
              >
                {actionLoading === 'email' && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('emailModal.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-2 dark:bg-card rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('cancelModal.title')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.rich('cancelModal.irreversibleWarning', {
                bold: (chunks) => <span className="font-semibold text-red-600">{chunks}</span>,
              })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('cancelModal.cancelReasonLabel')}</label>
                <select
                  value={cancelMotivo}
                  onChange={(e) => { setCancelMotivo(e.target.value as typeof cancelMotivo); setCancelConfirmed(false); }}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="01">{t('cancelModal.reason01')}</option>
                  <option value="02">{t('cancelModal.reason02')}</option>
                  <option value="03">{t('cancelModal.reason03')}</option>
                  <option value="04">{t('cancelModal.reason04')}</option>
                </select>
              </div>

              {cancelMotivo === '01' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('cancelModal.substituteUuidLabel')}</label>
                  <input
                    type="text"
                    value={cancelFolioSustitucion}
                    onChange={(e) => setCancelFolioSustitucion(e.target.value.toUpperCase())}
                    placeholder={t('cancelModal.substituteUuidPlaceholder')}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('cancelModal.substituteUuidHint')}</p>
                </div>
              )}

              {!cancelConfirmed ? (
                <button
                  onClick={() => setCancelConfirmed(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {t('cancelModal.wantToCancel')}
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 mb-3 font-medium">
                    {t('cancelModal.confirmMessage')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCancelConfirmed(false)}
                      className="flex-1 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      {t('cancelModal.goBack')}
                    </button>
                    <button
                      onClick={handleCancelar}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'cancelar' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('cancelModal.confirmCancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowCancelModal(false); setCancelConfirmed(false); }}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('cancelModal.closeLabel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
