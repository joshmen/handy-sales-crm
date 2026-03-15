'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import {
  createFactura,
  timbrarFactura,
  getConfigFiscal,
  getCatalogos,
} from '@/services/api/billing';
import type {
  CreateFacturaRequest,
  CreateDetalleFacturaRequest,
  ConfiguracionFiscal,
  CatalogosResponse,
} from '@/types/billing';

interface LineItem {
  key: number;
  claveProdServ: string;
  noIdentificacion: string;
  descripcion: string;
  unidad: string;
  claveUnidad: string;
  cantidad: number;
  valorUnitario: number;
  descuento: number;
}

const emptyLine = (key: number): LineItem => ({
  key,
  claveProdServ: '01010101',
  noIdentificacion: '',
  descripcion: '',
  unidad: 'Pieza',
  claveUnidad: 'H87',
  cantidad: 1,
  valorUnitario: 0,
  descuento: 0,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  const [config, setConfig] = useState<ConfiguracionFiscal | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timbrarAfter, setTimbrarAfter] = useState(false);

  // Form state
  const [tipoComprobante, setTipoComprobante] = useState('I');
  const [metodoPago, setMetodoPago] = useState('PUE');
  const [formaPago, setFormaPago] = useState('01');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [receptorRfc, setReceptorRfc] = useState('');
  const [receptorNombre, setReceptorNombre] = useState('');
  const [receptorUsoCfdi, setReceptorUsoCfdi] = useState('G03');
  const [receptorDomicilioFiscal, setReceptorDomicilioFiscal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine(1)]);
  const [nextKey, setNextKey] = useState(2);

  useEffect(() => {
    async function load() {
      try {
        const [cfg, cats] = await Promise.all([getConfigFiscal(), getCatalogos()]);
        setConfig(cfg);
        setCatalogos(cats);
      } catch {
        toast({ title: 'Error al cargar configuración fiscal', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addLine = () => {
    setLines(prev => [...prev, emptyLine(nextKey)]);
    setNextKey(k => k + 1);
  };

  const removeLine = (key: number) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter(l => l.key !== key));
  };

  const updateLine = (key: number, field: keyof LineItem, value: string | number) => {
    setLines(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  };

  // Computed totals
  const subtotal = lines.reduce((sum, l) => sum + (l.cantidad * l.valorUnitario - l.descuento), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const handleSubmit = async (timbrar: boolean) => {
    if (!config) {
      toast({ title: 'Configure los datos fiscales primero', variant: 'destructive' });
      return;
    }
    if (!receptorRfc.trim() || !receptorNombre.trim()) {
      toast({ title: 'Complete los datos del receptor', variant: 'destructive' });
      return;
    }
    if (lines.some(l => !l.descripcion.trim() || l.valorUnitario <= 0)) {
      toast({ title: 'Complete todos los conceptos con descripción y precio', variant: 'destructive' });
      return;
    }

    setSaving(true);
    setTimbrarAfter(timbrar);
    try {
      const detalles: CreateDetalleFacturaRequest[] = lines.map((l, i) => ({
        numeroLinea: i + 1,
        claveProdServ: l.claveProdServ || '01010101',
        noIdentificacion: l.noIdentificacion || undefined,
        descripcion: l.descripcion,
        unidad: l.unidad || undefined,
        claveUnidad: l.claveUnidad || 'H87',
        cantidad: l.cantidad,
        valorUnitario: l.valorUnitario,
        importe: l.cantidad * l.valorUnitario,
        descuento: l.descuento,
      }));

      const request: CreateFacturaRequest = {
        tipoComprobante,
        metodoPago,
        formaPago,
        usoCfdi,
        emisorRfc: config.rfc || '',
        emisorNombre: config.razonSocial || '',
        emisorRegimenFiscal: config.regimenFiscal || undefined,
        receptorRfc: receptorRfc.trim().toUpperCase(),
        receptorNombre: receptorNombre.trim(),
        receptorUsoCfdi,
        receptorDomicilioFiscal: receptorDomicilioFiscal || undefined,
        subtotal: Math.round(subtotal * 100) / 100,
        totalImpuestosTrasladados: Math.round(iva * 100) / 100,
        total: Math.round(total * 100) / 100,
        observaciones: observaciones || undefined,
        detalles,
      };

      const created = await createFactura(request);

      if (timbrar && created.id) {
        try {
          await timbrarFactura(created.id);
          toast({ title: 'Factura creada y timbrada exitosamente' });
        } catch {
          toast({ title: 'Factura creada, pero falló el timbrado. Puede timbrar desde la lista.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Factura guardada como borrador' });
      }

      router.push('/billing/invoices');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear factura';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  );

  if (!config?.rfc) {
    return (
      <PageHeader
        breadcrumbs={[
          { label: 'Facturación', href: '/billing' },
          { label: 'Facturas', href: '/billing/invoices' },
          { label: 'Nueva' },
        ]}
        title="Nueva Factura"
      >
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
          <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">
            Configure sus datos fiscales primero
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
            Necesita configurar su RFC, régimen fiscal y certificados CSD antes de poder emitir facturas.
          </p>
          <Button onClick={() => router.push('/billing/settings')} className="bg-amber-600 hover:bg-amber-700 text-white">
            Ir a configuración fiscal
          </Button>
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Facturación', href: '/billing' },
        { label: 'Facturas', href: '/billing/invoices' },
        { label: 'Nueva' },
      ]}
      title="Nueva Factura"
      subtitle={`Emisor: ${config.razonSocial} (${config.rfc})`}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Datos del comprobante */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Datos del comprobante</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
              <select
                value={tipoComprobante}
                onChange={e => setTipoComprobante(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                {catalogos?.tiposComprobante?.map(t => (
                  <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.descripcion}</option>
                )) ?? <option value="I">I — Ingreso</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Método de pago</label>
              <select
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                {catalogos?.metodosPago?.map(m => (
                  <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.descripcion}</option>
                )) ?? <>
                  <option value="PUE">PUE — Pago en una sola exhibición</option>
                  <option value="PPD">PPD — Pago en parcialidades</option>
                </>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Forma de pago</label>
              <select
                value={formaPago}
                onChange={e => setFormaPago(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                {catalogos?.formasPago?.map(f => (
                  <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descripcion}</option>
                )) ?? <option value="01">01 — Efectivo</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Uso CFDI</label>
              <select
                value={usoCfdi}
                onChange={e => setUsoCfdi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                {catalogos?.usosCfdi?.map(u => (
                  <option key={u.codigo} value={u.codigo}>{u.codigo} — {u.descripcion}</option>
                )) ?? <option value="G03">G03 — Gastos en general</option>}
              </select>
            </div>
          </div>
        </section>

        {/* Receptor */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Receptor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">RFC *</label>
              <input
                type="text"
                value={receptorRfc}
                onChange={e => setReceptorRfc(e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                maxLength={13}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre o razón social *</label>
              <input
                type="text"
                value={receptorNombre}
                onChange={e => setReceptorNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Uso CFDI</label>
              <select
                value={receptorUsoCfdi}
                onChange={e => setReceptorUsoCfdi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                {catalogos?.usosCfdi?.map(u => (
                  <option key={u.codigo} value={u.codigo}>{u.codigo} — {u.descripcion}</option>
                )) ?? <option value="G03">G03 — Gastos en general</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Código postal fiscal</label>
              <input
                type="text"
                value={receptorDomicilioFiscal}
                onChange={e => setReceptorDomicilioFiscal(e.target.value)}
                placeholder="12345"
                maxLength={5}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
          </div>
        </section>

        {/* Conceptos */}
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Conceptos</h2>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar línea
            </Button>
          </div>
          <div className="space-y-4">
            {lines.map((line, idx) => (
              <div key={line.key} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-xs text-muted-foreground mb-1">Descripción *</label>
                  <input
                    type="text"
                    value={line.descripcion}
                    onChange={e => updateLine(line.key, 'descripcion', e.target.value)}
                    placeholder="Producto o servicio"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={line.cantidad}
                    onChange={e => updateLine(line.key, 'cantidad', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Precio unitario</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={line.valorUnitario}
                    onChange={e => updateLine(line.key, 'valorUnitario', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Importe</label>
                  <div className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg tabular-nums">
                    {formatCurrency(line.cantidad * line.valorUnitario - line.descuento)}
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2 flex items-end justify-end">
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(line.key)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Totals */}
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA (16%)</span>
              <span className="font-medium tabular-nums">{formatCurrency(iva)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(total)}</span>
            </div>
          </div>
        </section>

        {/* Observaciones */}
        <section className="bg-card border border-border rounded-xl p-5">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
            placeholder="Notas internas o comentarios..."
          />
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => router.push('/billing/invoices')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving && !timbrarAfter ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar borrador
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving && timbrarAfter ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar y timbrar
          </Button>
        </div>
      </div>
    </PageHeader>
  );
}
