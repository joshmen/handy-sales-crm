'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

const ESTADO_CONFIG: Record<FacturaEstado, { label: string; color: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100' },
  TIMBRADA:  { label: 'Timbrada',  color: 'text-green-700', bg: 'bg-green-100' },
  CANCELADA: { label: 'Cancelada', color: 'text-red-700',   bg: 'bg-red-100' },
  ERROR:     { label: 'Error',     color: 'text-red-700',   bg: 'bg-red-100' },
};

function StatusBadge({ estado }: { estado: FacturaEstado }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, color: 'text-gray-700', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value ?? '-'}</span>
    </div>
  );
}

// ── Page ──

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
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
      toast.success('Factura timbrada exitosamente');
      await loadFactura();
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || 'Error al timbrar');
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
      toast.error('Error al descargar PDF');
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
      toast.error('Error al descargar XML');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async () => {
    if (!factura || !emailTo.trim()) return;
    try {
      setActionLoading('email');
      await enviarFactura(factura.id, { email: emailTo.trim(), incluirPdf: true, incluirXml: true });
      toast.success('Factura enviada por correo');
      setShowEmailModal(false);
      setEmailTo('');
    } catch {
      toast.error('Error al enviar por correo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelar = async () => {
    if (!factura || !cancelConfirmed) return;
    if (cancelMotivo === '01' && !cancelFolioSustitucion.trim()) {
      toast.error('El motivo 01 requiere el UUID de la factura que sustituye');
      return;
    }
    try {
      setActionLoading('cancelar');
      const result = await cancelarFactura(factura.id, {
        motivoCancelacion: cancelMotivo,
        folioSustitucion: cancelMotivo === '01' ? cancelFolioSustitucion.trim() : undefined,
      });
      if (result.estado === 'EN_PROCESO') {
        toast.info(result.mensaje || 'Solicitud en proceso. El receptor tiene 72 hrs para aceptar.');
      } else {
        toast.success(result.mensaje || 'Factura cancelada ante la autoridad fiscal.');
      }
      setShowCancelModal(false);
      setCancelConfirmed(false);
      await loadFactura();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      toast.error(msg?.error || msg?.details || 'Error al cancelar factura');
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
          <span className="text-gray-600">Cargando factura...</span>
        </div>
      </div>
    );
  }

  if (notFound || !factura) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Factura no encontrada</h2>
          <p className="text-gray-600 mb-4">La factura que buscas no existe o no tienes acceso.</p>
          <button onClick={() => router.push('/billing/invoices')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Volver a facturas
          </button>
        </div>
      </div>
    );
  }

  const folioDisplay = `${factura.serie || 'A'}-${String(factura.folio).padStart(3, '0')}`;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white px-4 sm:px-8 py-4 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Facturacion', href: '/billing' },
          { label: `Factura #${folioDisplay}` },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/billing/invoices')}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Volver a facturas"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-gray-900">
              Factura #{folioDisplay}
            </h1>
            <StatusBadge estado={factura.estado} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {factura.estado === 'PENDIENTE' && (
              <button
                onClick={handleTimbrar}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'timbrar' && <Loader2 className="w-4 h-4 animate-spin" />}
                Timbrar
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={!!actionLoading}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'pdf' && <Loader2 className="w-4 h-4 animate-spin" />}
              Descargar PDF
            </button>
            <button
              onClick={handleDownloadXml}
              disabled={!!actionLoading}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'xml' && <Loader2 className="w-4 h-4 animate-spin" />}
              Descargar XML
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!!actionLoading}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              Enviar por email
            </button>
            {factura.estado === 'TIMBRADA' && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-[13px] font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                Cancelar factura
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emisor */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emisor</h2>
            <div className="space-y-2">
              <InfoRow label="RFC" value={factura.emisorRfc} />
              <InfoRow label="Razon social" value={factura.emisorNombre} />
              <InfoRow label="Regimen fiscal" value={factura.emisorRegimenFiscal} />
            </div>
          </div>

          {/* Receptor */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Receptor</h2>
            <div className="space-y-2">
              <InfoRow label="RFC" value={factura.receptorRfc} />
              <InfoRow label="Razon social" value={factura.receptorNombre} />
              <InfoRow label="Uso CFDI" value={factura.receptorUsoCfdi} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conceptos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Clave SAT</th>
                  <th className="pb-3 font-medium">Descripcion</th>
                  <th className="pb-3 font-medium">Unidad</th>
                  <th className="pb-3 font-medium text-right">Cantidad</th>
                  <th className="pb-3 font-medium text-right">Precio unit.</th>
                  <th className="pb-3 font-medium text-right">Descuento</th>
                  <th className="pb-3 font-medium text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {factura.detalles?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 text-gray-500 font-mono text-xs">{item.claveProdServ}</td>
                    <td className="py-3 text-gray-900">{item.descripcion}</td>
                    <td className="py-3 text-gray-500">{item.claveUnidad || item.unidad || '-'}</td>
                    <td className="py-3 text-right text-gray-900">{item.cantidad}</td>
                    <td className="py-3 text-right text-gray-900">{formatCurrency(item.valorUnitario)}</td>
                    <td className="py-3 text-right text-gray-500">{item.descuento > 0 ? formatCurrency(item.descuento) : '-'}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.importe)}</td>
                  </tr>
                ))}
                {(!factura.detalles || factura.detalles.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">Sin conceptos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Totals */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Totales</h2>
            <div className="space-y-2">
              <InfoRow label="Subtotal" value={formatCurrency(factura.subtotal)} />
              {factura.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Descuento</span>
                  <span className="text-red-600">-{formatCurrency(factura.descuento)}</span>
                </div>
              )}
              <InfoRow label="IVA trasladado" value={formatCurrency(factura.totalImpuestosTrasladados)} />
              {factura.totalImpuestosRetenidos > 0 && (
                <InfoRow label="Impuestos retenidos" value={formatCurrency(factura.totalImpuestosRetenidos)} />
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(factura.total)}</span>
              </div>
              <InfoRow label="Moneda" value={factura.moneda} />
            </div>
          </div>

          {/* CFDI info */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos CFDI</h2>
            <div className="space-y-2">
              {factura.uuid && <InfoRow label="UUID" value={factura.uuid} />}
              <InfoRow label="Serie" value={factura.serie} />
              <InfoRow label="Folio" value={factura.folio} />
              <InfoRow label="Tipo comprobante" value={factura.tipoComprobante} />
              <InfoRow label="Metodo de pago" value={factura.metodoPago} />
              <InfoRow label="Forma de pago" value={factura.formaPago} />
              <InfoRow label="Uso CFDI" value={factura.usoCfdi} />
              <InfoRow label="Fecha emision" value={formatDate(factura.fechaEmision)} />
              <InfoRow label="Fecha timbrado" value={formatDate(factura.fechaTimbrado)} />
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enviar factura por email</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowEmailModal(false); setEmailTo(''); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailTo.trim() || !!actionLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === 'email' && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowCancelModal(false); setCancelConfirmed(false); }}>
          <div className="bg-white dark:bg-card rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-border" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">Cancelar factura</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Esta acción es <span className="font-semibold text-red-600">irreversible</span>. La factura se cancelará ante la autoridad fiscal.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Motivo de cancelación *</label>
                <select
                  value={cancelMotivo}
                  onChange={(e) => { setCancelMotivo(e.target.value as typeof cancelMotivo); setCancelConfirmed(false); }}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="01">01 — Emitido con errores (con factura sustituta)</option>
                  <option value="02">02 — Emitido con errores (sin relación)</option>
                  <option value="03">03 — No se llevó a cabo la operación</option>
                  <option value="04">04 — Operación nominativa en factura global</option>
                </select>
              </div>

              {cancelMotivo === '01' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">UUID de factura sustituta *</label>
                  <input
                    type="text"
                    value={cancelFolioSustitucion}
                    onChange={(e) => setCancelFolioSustitucion(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">UUID de la nueva factura que sustituye a esta.</p>
                </div>
              )}

              {!cancelConfirmed ? (
                <button
                  onClick={() => setCancelConfirmed(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Quiero cancelar esta factura
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 mb-3 font-medium">
                    ¿Estás seguro? Esta factura quedará cancelada ante la autoridad fiscal y no se puede revertir.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCancelConfirmed(false)}
                      className="flex-1 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      No, volver
                    </button>
                    <button
                      onClick={handleCancelar}
                      disabled={!!actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'cancelar' && <Loader2 className="w-4 h-4 animate-spin" />}
                      Sí, cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowCancelModal(false); setCancelConfirmed(false); }}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
