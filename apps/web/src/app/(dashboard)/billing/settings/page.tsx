'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, Loader2, CheckCircle, AlertCircle, FileCheck, X, Shield, Plus} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { toast } from '@/hooks/useToast';
import { getConfigFiscal, saveConfigFiscal, uploadCertificado, getNumeraciones, createNumeracion, toggleNumeracion } from '@/services/api/billing';
import type { ConfiguracionFiscal, NumeracionDocumento } from '@/types/billing';

type SettingsTab = 'datos' | 'series';

export default function BillingSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('datos');
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

  // Series / Numeración
  const [series, setSeries] = useState<NumeracionDocumento[]>([]);
  const [showAddSerie, setShowAddSerie] = useState(false);
  const [newSerie, setNewSerie] = useState({ serie: '', tipoDocumento: 'Ingreso', folioInicial: 1 });
  const [savingSerie, setSavingSerie] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const loadSeries = async (inclInactivos?: boolean) => {
    try {
      const data = await getNumeraciones(inclInactivos ?? showInactive);
      setSeries(data);
    } catch { /* ignore */ }
  };

  const handleAddSerie = async () => {
    if (!newSerie.serie.trim()) {
      toast({ title: 'La serie es obligatoria', variant: 'destructive' });
      return;
    }
    setSavingSerie(true);
    try {
      await createNumeracion({
        tipoDocumento: newSerie.tipoDocumento,
        serie: newSerie.serie.toUpperCase(),
        folioInicial: newSerie.folioInicial,
      });
      toast({ title: 'Serie creada' });
      setShowAddSerie(false);
      setNewSerie({ serie: '', tipoDocumento: 'Ingreso', folioInicial: 1 });
      await loadSeries();
    } catch {
      toast({ title: 'Error al crear serie', variant: 'destructive' });
    } finally {
      setSavingSerie(false);
    }
  };

  const handleToggleSerie = async (id: number, activo: boolean) => {
    try {
      await toggleNumeracion(id, activo);
      toast({ title: activo ? 'Serie activada' : 'Serie desactivada' });
      await loadSeries();
    } catch {
      toast({ title: 'Error al cambiar estado de la serie', variant: 'destructive' });
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await getConfigFiscal();
        setConfig(data);
        loadSeries();
      } catch {
        // No config yet — start with empty form
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Reload series when showInactive changes
  useEffect(() => {
    loadSeries(showInactive);
  }, [showInactive]);

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

  const seriesColumns: DataGridColumn<NumeracionDocumento>[] = [
    {
      key: 'serie',
      label: 'Serie',
      cellRenderer: (s) => <span className="font-mono font-bold text-foreground">{s.serie || '—'}</span>,
    },
    {
      key: 'tipoDocumento',
      label: 'Tipo',
    },
    {
      key: 'folioInicial',
      label: 'Folio inicial',
      align: 'right',
      cellRenderer: (s) => <span className="tabular-nums">{s.folioInicial}</span>,
    },
    {
      key: 'folioActual',
      label: 'Folio actual',
      align: 'right',
      cellRenderer: (s) => <span className="tabular-nums font-semibold">{s.folioActual}</span>,
    },
    {
      key: 'activo',
      label: 'Activo',
      align: 'center',
      cellRenderer: (s) => (
        <ActiveToggle isActive={s.activo} onToggle={() => handleToggleSerie(s.id, !s.activo)} />
      ),
    },
  ];

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Facturación', href: '/billing' },
        { label: 'Configuración Fiscal' },
      ]}
      title="Configuración Fiscal"
      subtitle="Datos del emisor, certificados CSD y series de folios"
      actions={
        activeTab === 'datos' ? (
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        ) : (
          <button
            onClick={() => setShowAddSerie(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva serie
          </button>
        )
      }
    >
      {/* ─── Tabs ─── */}
      <div role="tablist" aria-label="Configuración fiscal" className="flex items-center gap-1 mb-6 border-b border-border">
        <button
          role="tab"
          aria-selected={activeTab === 'datos'}
          onClick={() => setActiveTab('datos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'datos'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Datos Fiscales
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'series'}
          onClick={() => setActiveTab('series')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'series'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Series y Folios
          {series.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">({series.length})</span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: Datos Fiscales                        */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'datos' && (
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

          {/* Certificados CSD */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Certificados CSD</h2>
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
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Certificado (.cer)</label>
                  <div className="flex items-center gap-2">
                    <input ref={cerInputRef} type="file" accept=".cer" onChange={e => setCerFile(e.target.files?.[0] || null)} className="hidden" />
                    <button type="button" onClick={() => cerInputRef.current?.click()} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-background hover:bg-muted/50 transition-colors text-left">
                      {cerFile ? (<><FileCheck className="w-4 h-4 text-green-600 shrink-0" /><span className="text-foreground truncate">{cerFile.name}</span></>) : (<><Upload className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">Seleccionar archivo .cer</span></>)}
                    </button>
                    {cerFile && (<button type="button" onClick={() => { setCerFile(null); if (cerInputRef.current) cerInputRef.current.value = ''; }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Llave privada (.key)</label>
                  <div className="flex items-center gap-2">
                    <input ref={keyInputRef} type="file" accept=".key" onChange={e => setKeyFile(e.target.files?.[0] || null)} className="hidden" />
                    <button type="button" onClick={() => keyInputRef.current?.click()} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-background hover:bg-muted/50 transition-colors text-left">
                      {keyFile ? (<><FileCheck className="w-4 h-4 text-green-600 shrink-0" /><span className="text-foreground truncate">{keyFile.name}</span></>) : (<><Upload className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">Seleccionar archivo .key</span></>)}
                    </button>
                    {keyFile && (<button type="button" onClick={() => { setKeyFile(null); if (keyInputRef.current) keyInputRef.current.value = ''; }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña de la llave privada</label>
                  <input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="Contraseña del archivo .key" className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                </div>
                <div className="pt-1">
                  <Button onClick={handleUploadCert} disabled={uploading || !cerFile || !keyFile || !certPassword.trim()} className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Subir certificados
                  </Button>
                  <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-lg bg-muted/40 border border-border border-l-2 border-l-green-600/50">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sus certificados se protegen con encriptación de grado bancario (AES-256) respaldada por AWS. Cada empresa tiene su propia llave de cifrado aislada. Nunca almacenamos contraseñas en texto plano.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Guarde la configuración fiscal primero para poder subir certificados.</p>
            )}
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: Series                                */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'series' && (
        <div>
          {/* Add serie form */}
          {showAddSerie && (
            <div className="mb-5 p-4 rounded-xl border border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Nueva serie</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Serie *</label>
                  <input
                    type="text"
                    value={newSerie.serie}
                    onChange={e => setNewSerie(s => ({ ...s, serie: e.target.value.toUpperCase() }))}
                    placeholder="A"
                    maxLength={10}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo de comprobante</label>
                  <select
                    value={newSerie.tipoDocumento}
                    onChange={e => setNewSerie(s => ({ ...s, tipoDocumento: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  >
                    <option value="Ingreso">Ingreso (Factura)</option>
                    <option value="Egreso">Egreso (Nota de crédito)</option>
                    <option value="Pago">Pago (Complemento)</option>
                    <option value="Traslado">Traslado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Folio inicial</label>
                  <input
                    type="number"
                    value={newSerie.folioInicial}
                    onChange={e => setNewSerie(s => ({ ...s, folioInicial: parseInt(e.target.value) || 1 }))}
                    min={1}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddSerie(false)}>Cancelar</Button>
                <Button onClick={handleAddSerie} disabled={savingSerie} className="bg-green-600 hover:bg-green-700 text-white">
                  {savingSerie ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Crear serie
                </Button>
              </div>
            </div>
          )}

          {/* Mostrar inactivos toggle */}
          <div className="flex justify-end mb-3">
            <InactiveToggle value={showInactive} onChange={setShowInactive} />
          </div>

          {/* Series DataGrid */}
          <DataGrid<NumeracionDocumento>
            data={series}
            columns={seriesColumns}
            keyExtractor={(s) => s.id}
            loading={loading}
            emptyMessage="No hay series configuradas. Crea una serie para comenzar a facturar."
            mobileCardRenderer={(s) => (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-foreground">{s.serie || '—'}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{s.tipoDocumento}</span>
                  <div className="text-xs text-muted-foreground mt-1">
                    Folio actual: <span className="font-semibold text-foreground tabular-nums">{s.folioActual}</span>
                  </div>
                </div>
                <ActiveToggle isActive={s.activo} onToggle={() => handleToggleSerie(s.id, !s.activo)} />
              </div>
            )}
          />
        </div>
      )}
    </PageHeader>
  );
}
