'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, Loader2, CheckCircle, AlertCircle, FileCheck, X } from 'lucide-react';
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

  // CSD upload state
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadCert = async () => {
    if (!cerFile || !keyFile || !certPassword.trim() || !config.id) {
      toast({ title: 'Seleccione ambos archivos (.cer y .key) e ingrese la contraseña', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('Certificado', cerFile);
      formData.append('LlavePrivada', keyFile);
      formData.append('Password', certPassword);
      await uploadCertificado(config.id, formData);
      toast({ title: 'Certificados CSD subidos exitosamente' });
      // Reload config & clear form
      const updated = await getConfigFiscal();
      setConfig(updated);
      setCerFile(null);
      setKeyFile(null);
      setCertPassword('');
      if (cerInputRef.current) cerInputRef.current.value = '';
      if (keyInputRef.current) keyInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Error al subir certificados';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
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

  const hasCertificates = !!config.hasCertificado && !!config.hasLlavePrivada;

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

          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-5">
            {hasCertificates ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Certificados cargados correctamente</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Sin certificados — necesarios para timbrar</span>
              </div>
            )}
          </div>

          {config.id ? (
            <div className="space-y-4">
              {/* .cer file */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Certificado (.cer)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={cerInputRef}
                    type="file"
                    accept=".cer"
                    onChange={e => setCerFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cerInputRef.current?.click()}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-background hover:bg-muted/50 transition-colors text-left"
                  >
                    {cerFile ? (
                      <>
                        <FileCheck className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-foreground truncate">{cerFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Seleccionar archivo .cer</span>
                      </>
                    )}
                  </button>
                  {cerFile && (
                    <button
                      type="button"
                      onClick={() => { setCerFile(null); if (cerInputRef.current) cerInputRef.current.value = ''; }}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* .key file */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Llave privada (.key)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={keyInputRef}
                    type="file"
                    accept=".key"
                    onChange={e => setKeyFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => keyInputRef.current?.click()}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-background hover:bg-muted/50 transition-colors text-left"
                  >
                    {keyFile ? (
                      <>
                        <FileCheck className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-foreground truncate">{keyFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Seleccionar archivo .key</span>
                      </>
                    )}
                  </button>
                  {keyFile && (
                    <button
                      type="button"
                      onClick={() => { setKeyFile(null); if (keyInputRef.current) keyInputRef.current.value = ''; }}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Contraseña de la llave privada
                </label>
                <input
                  type="password"
                  value={certPassword}
                  onChange={e => setCertPassword(e.target.value)}
                  placeholder="Contraseña del archivo .key"
                  className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>

              {/* Upload button */}
              <div className="pt-1">
                <Button
                  onClick={handleUploadCert}
                  disabled={uploading || !cerFile || !keyFile || !certPassword.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Subir certificados
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Los certificados se almacenan con encriptación AES-256 por tenant.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Guarde la configuración fiscal primero para poder subir certificados.
            </p>
          )}
        </section>

      </div>
    </PageHeader>
  );
}
