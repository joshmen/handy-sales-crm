'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { getConfigFiscal, saveConfigFiscal, uploadCertificado } from '@/services/api/billing';
import type { ConfiguracionFiscal } from '@/types/billing';

export default function BillingSettingsPage() {
  const [config, setConfig] = useState<Partial<ConfiguracionFiscal>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getConfigFiscal();
        setConfig(data);
      } catch {
        // No config yet — start with empty form
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!config.rfc?.trim() || !config.razonSocial?.trim()) {
      toast({ title: 'RFC y razón social son obligatorios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveConfigFiscal(config);
      setConfig(saved);
      toast({ title: 'Configuración fiscal guardada' });
    } catch {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !config.id) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      await uploadCertificado(config.id, formData);
      toast({ title: 'Certificados subidos exitosamente' });
      // Reload config
      const updated = await getConfigFiscal();
      setConfig(updated);
    } catch {
      toast({ title: 'Error al subir certificados', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateField = (field: keyof ConfiguracionFiscal, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
      <span className="sr-only">Cargando...</span>
    </div>
  );

  const hasCertificates = !!config.certificadoSat && !!config.llavePrivada;

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Facturación', href: '/billing' },
        { label: 'Configuración Fiscal' },
      ]}
      title="Configuración Fiscal"
      subtitle="Datos del emisor, certificados CSD y serie/folio"
      actions={
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar
        </Button>
      }
    >
      <div className="space-y-6 max-w-3xl">
        {/* Datos del Emisor */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Datos del emisor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">RFC *</label>
              <input
                type="text"
                value={config.rfc || ''}
                onChange={e => updateField('rfc', e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                maxLength={13}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Razón social *</label>
              <input
                type="text"
                value={config.razonSocial || ''}
                onChange={e => updateField('razonSocial', e.target.value)}
                placeholder="Mi Empresa S.A. de C.V."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Régimen fiscal</label>
              <select
                value={config.regimenFiscal || ''}
                onChange={e => updateField('regimenFiscal', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                <option value="">Seleccionar...</option>
                <option value="601">601 — General de Ley Personas Morales</option>
                <option value="603">603 — Personas Morales con Fines no Lucrativos</option>
                <option value="605">605 — Sueldos y Salarios</option>
                <option value="606">606 — Arrendamiento</option>
                <option value="607">607 — Régimen de Enajenación o Adquisición de Bienes</option>
                <option value="608">608 — Demás ingresos</option>
                <option value="610">610 — Residentes en el Extranjero</option>
                <option value="611">611 — Ingresos por Dividendos</option>
                <option value="612">612 — Personas Físicas con Actividades Empresariales y Profesionales</option>
                <option value="614">614 — Ingresos por intereses</option>
                <option value="615">615 — Sin obligaciones fiscales</option>
                <option value="616">616 — Sin obligaciones fiscales</option>
                <option value="620">620 — Sociedades Cooperativas de Producción</option>
                <option value="621">621 — Incorporación Fiscal</option>
                <option value="622">622 — Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                <option value="623">623 — Opcional para Grupos de Sociedades</option>
                <option value="624">624 — Coordinados</option>
                <option value="625">625 — Régimen de las Actividades Empresariales (RESICO)</option>
                <option value="626">626 — Régimen Simplificado de Confianza</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Código postal</label>
              <input
                type="text"
                value={config.codigoPostal || ''}
                onChange={e => updateField('codigoPostal', e.target.value)}
                placeholder="12345"
                maxLength={5}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Dirección fiscal</label>
              <input
                type="text"
                value={config.direccionFiscal || ''}
                onChange={e => updateField('direccionFiscal', e.target.value)}
                placeholder="Calle, colonia, municipio, estado"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
          </div>
        </section>

        {/* Serie y Folio */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Serie y folio</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Serie</label>
              <input
                type="text"
                value={config.serieFactura || ''}
                onChange={e => updateField('serieFactura', e.target.value.toUpperCase())}
                placeholder="A"
                maxLength={10}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Folio actual</label>
              <input
                type="number"
                value={config.folioActual ?? 1}
                onChange={e => updateField('folioActual', parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
          </div>
        </section>

        {/* Certificados CSD */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Certificados CSD</h2>
          <div className="flex items-center gap-3 mb-4">
            {hasCertificates ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Certificados cargados</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Sin certificados — necesarios para timbrar</span>
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña del certificado</label>
            <input
              type="password"
              value={config.passwordCertificado || ''}
              onChange={e => updateField('passwordCertificado', e.target.value)}
              placeholder="••••••••"
              className="w-full max-w-xs px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          {config.id && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".cer,.key"
                multiple
                onChange={handleUploadCert}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Subir .cer y .key
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Seleccione ambos archivos (.cer y .key) de su CSD. Se almacenan encriptados.
              </p>
            </div>
          )}
          {!config.id && (
            <p className="text-xs text-muted-foreground">
              Guarde la configuración primero para poder subir certificados.
            </p>
          )}
        </section>

      </div>
    </PageHeader>
  );
}
