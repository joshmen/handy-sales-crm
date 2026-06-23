'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Upload, Save, Loader2, CheckCircle, AlertCircle, FileCheck, X, Shield, Plus, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { toast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/lib/api';
import { getConfigFiscal, saveConfigFiscal, uploadCertificado, retryFinkokRegistration, deleteCertificado, getNumeraciones, createNumeracion, toggleNumeracion } from '@/services/api/billing';
import type { ConfiguracionFiscal, NumeracionDocumento } from '@/types/billing';
import { REGIMENES_FISCALES, formatRegimenLabel } from '@/lib/sat/regimenes-fiscales';

type SettingsTab = 'datos' | 'series';

export default function BillingSettingsPage() {
  const t = useTranslations('billing.settings');
  const tBilling = useTranslations('billing');
  const tCommon = useTranslations('common');
  const [activeTab, setActiveTab] = useState<SettingsTab>('datos');
  const [config, setConfig] = useState<Partial<ConfiguracionFiscal>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [retryingFinkok, setRetryingFinkok] = useState(false);
  const [showDeleteCsdModal, setShowDeleteCsdModal] = useState(false);
  const [deletingCsd, setDeletingCsd] = useState(false);

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
      toast({ title: t('seriesRequired'), variant: 'destructive' });
      return;
    }
    setSavingSerie(true);
    try {
      await createNumeracion({
        tipoDocumento: newSerie.tipoDocumento,
        serie: newSerie.serie.toUpperCase(),
        folioInicial: newSerie.folioInicial,
      });
      toast({ title: t('seriesCreated') });
      setShowAddSerie(false);
      setNewSerie({ serie: '', tipoDocumento: 'Ingreso', folioInicial: 1 });
      await loadSeries();
    } catch {
      toast({ title: t('errorCreatingSeries'), variant: 'destructive' });
    } finally {
      setSavingSerie(false);
    }
  };

  const handleToggleSerie = async (id: number, activo: boolean) => {
    try {
      await toggleNumeracion(id, activo);
      toast({ title: activo ? t('seriesActivated') : t('seriesDeactivated') });
      await loadSeries();
    } catch {
      toast({ title: t('errorTogglingSeriesStatus'), variant: 'destructive' });
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
    setSaving(true);
    try {
      const saved = await saveConfigFiscal(config);
      setConfig(saved);
      toast({ title: t('configSaved') });
    } catch {
      toast({ title: t('errorSavingConfig'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCert = async () => {
    if (!cerFile || !keyFile || !certPassword.trim() || !config.id) {
      toast({ title: t('selectBothFilesAndPassword'), variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('Certificado', cerFile);
      formData.append('LlavePrivada', keyFile);
      formData.append('Password', certPassword);
      const result = await uploadCertificado(config.id, formData);

      // BILL-1: el endpoint reporta el resultado del registro en Finkok
      if (result.finkokRegistrado === true) {
        toast({ title: 'Certificado cargado y RFC habilitado para facturar en Finkok.' });
      } else if (result.finkokRegistrado === false) {
        toast({
          title: 'Certificado guardado, pero Finkok rechazó el registro',
          description: result.finkokError || 'Revisa el CSD o contacta soporte. Recibirás un email con detalles.',
          variant: 'destructive',
        });
      } else {
        toast({ title: result.message || t('uploadCertsSuccess') });
      }

      const updated = await getConfigFiscal();
      setConfig(updated);
      setCerFile(null);
      setKeyFile(null);
      setCertPassword('');
      if (cerInputRef.current) cerInputRef.current.value = '';
      if (keyInputRef.current) keyInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err)
        || t('uploadCertsError');
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // BILL-1: retry de registro Finkok reusando CSD ya guardado
  const handleRetryFinkok = async () => {
    if (!config.id) return;
    setRetryingFinkok(true);
    try {
      const result = await retryFinkokRegistration(config.id);
      if (result.finkokRegistrado) {
        toast({ title: 'RFC habilitado para facturar en Finkok.' });
      } else {
        toast({
          title: 'Finkok rechazó el registro',
          description: result.finkokError || 'Revisa el CSD o contacta soporte.',
          variant: 'destructive',
        });
      }
      const updated = await getConfigFiscal();
      setConfig(updated);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err)
        || 'Error al reintentar registro en Finkok';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setRetryingFinkok(false);
    }
  };

  const handleDeleteCsd = async () => {
    if (!config.id) return;
    setDeletingCsd(true);
    try {
      const result = await deleteCertificado(config.id);
      toast({
        title: t('deleteCsdSuccess'),
        description: result.finkokError ? t('deleteCsdFinkokWarn') : undefined,
      });
      setShowDeleteCsdModal(false);
      const updated = await getConfigFiscal();
      setConfig(updated);
      setCerFile(null);
      setKeyFile(null);
      setCertPassword('');
      if (cerInputRef.current) cerInputRef.current.value = '';
      if (keyInputRef.current) keyInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err)
        || t('deleteCsdError');
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setDeletingCsd(false);
    }
  };

  const updateField = (field: keyof ConfiguracionFiscal, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{tCommon('loading')}</span>
    </div>
  );

  const hasCertificates = !!config.hasCertificado && !!config.hasLlavePrivada;

  const seriesColumns: DataGridColumn<NumeracionDocumento>[] = [
    {
      key: 'serie',
      label: t('seriesLabel'),
      cellRenderer: (s) => <span className="font-mono font-bold text-foreground">{s.serie || '—'}</span>,
    },
    {
      key: 'tipoDocumento',
      label: t('voucherType'),
    },
    {
      key: 'folioInicial',
      label: t('initialFolio'),
      align: 'right',
      cellRenderer: (s) => <span className="tabular-nums">{s.folioInicial}</span>,
    },
    {
      key: 'folioActual',
      label: t('currentFolio'),
      align: 'right',
      cellRenderer: (s) => <span className="tabular-nums font-semibold">{s.folioActual}</span>,
    },
    {
      key: 'activo',
      label: tCommon('active'),
      align: 'center',
      cellRenderer: (s) => (
        <ActiveToggle isActive={s.activo} onToggle={() => handleToggleSerie(s.id, !s.activo)} />
      ),
    },
  ];

  return (
    <PageHeader
      section="empresa"
      breadcrumbs={[
        { label: tCommon('home'), href: '/dashboard' },
        { label: tBilling('title'), href: '/billing' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        activeTab === 'datos' ? (
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {tCommon('save')}
          </Button>
        ) : (
          <button
            onClick={() => setShowAddSerie(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('newSeries')}
          </button>
        )
      }
    >
      {/* Audit M-1: cross-link a settings para que admin encuentre fácil
          configuración de empresa no fiscal (nombre, logo, colores, perfil). */}
      {/* Sprint pre-prod #31: pastel azul reemplazado por tokens semanticos.
          memoria feedback_no_em_dashes_no_pastels prohibe blue-200/950. */}
      <div className="mb-4 rounded-lg bg-info/10 dark:bg-info/20 border border-info/30 p-3 text-sm text-info-foreground">
        ¿Buscas configuración general (logo, nombre, colores)? Está en{' '}
        <a href="/settings" className="font-medium underline hover:no-underline">
          Configuración general
        </a>.
      </div>

      {/* ─── Tabs ─── */}
      <div role="tablist" aria-label={t('title')} className="flex items-center gap-1 mb-6 border-b border-border">
        <button
          role="tab"
          aria-selected={activeTab === 'datos'}
          onClick={() => setActiveTab('datos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'datos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('tabs.fiscalData')}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'series'}
          onClick={() => setActiveTab('series')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'series'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('tabs.series')}
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
          {/* Datos sincronizados desde /settings (read-only) */}
          <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{t('issuerData')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t('issuerDataSyncedFromSettings')}</p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                {t('editInSettings')}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('rfc')}</label>
                <div className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/40 text-foreground font-mono">
                  {config.rfc || <span className="text-muted-foreground italic">{t('notSet')}</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('businessName')}</label>
                <div className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/40 text-foreground">
                  {config.razonSocial || <span className="text-muted-foreground italic">{t('notSet')}</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('postalCode')}</label>
                <div className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/40 text-foreground">
                  {config.codigoPostal || <span className="text-muted-foreground italic">{t('notSet')}</span>}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('fiscalAddress')}</label>
                <div className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/40 text-foreground">
                  {config.direccionFiscal || <span className="text-muted-foreground italic">{t('notSet')}</span>}
                </div>
              </div>
            </div>
          </section>

          {/* Configuración fiscal específica (editable aquí) */}
          <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t('fiscalRegimeSection')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('taxRegime')}</label>
                <select
                  value={config.regimenFiscal || ''}
                  onChange={e => updateField('regimenFiscal', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{t('selectOption')}</option>
                  {/* Sprint pre-prod #45: catalogo centralizado en lib/sat/.
                      Antes 20 options hardcoded con em-dash (regla memoria
                      feedback_no_em_dashes_no_pastels). */}
                  {REGIMENES_FISCALES.map(reg => (
                    <option key={reg.code} value={reg.code}>{formatRegimenLabel(reg)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Certificados CSD */}
          <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t('csdCertificates')}</h2>
            <div className="flex items-center justify-between gap-2 mb-5">
              {hasCertificates ? (
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('certsLoaded')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('certsNeeded')}</span>
                </div>
              )}
              {hasCertificates && (
                <button
                  type="button"
                  onClick={() => setShowDeleteCsdModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  data-testid="delete-csd-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('deleteCsd')}
                </button>
              )}
            </div>

            {/* BILL-1: badge de status Finkok */}
            {hasCertificates && (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Finkok</span>
                    {config.finkokEmisorRegistrado ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                        <CheckCircle className="w-3 h-3" />
                        Habilitado para facturar ({config.finkokStatus || 'active'})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3" />
                        Pendiente de registrar en Finkok
                      </span>
                    )}
                  </div>
                  {config.finkokTypeUser && (
                    <span className="text-xs text-muted-foreground">
                      Modalidad: <strong className="text-foreground">{config.finkokTypeUser === 'O' ? 'Ilimitado' : 'Prepago'}</strong>
                      {config.finkokTypeUser === 'P' && config.finkokCreditosRestantes != null && (
                        <span className="ml-2">• Créditos restantes: <strong className="text-foreground">{config.finkokCreditosRestantes.toLocaleString('es-MX')}</strong></span>
                      )}
                    </span>
                  )}
                </div>
                {!config.finkokEmisorRegistrado && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Tu CSD está guardado pero Finkok aún no lo tiene registrado bajo nuestra cuenta partner. El timbrado fallará hasta que se complete el registro.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryFinkok}
                      disabled={retryingFinkok}
                      data-testid="retry-finkok-btn"
                    >
                      {retryingFinkok ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                      {retryingFinkok ? 'Reintentando...' : 'Reintentar registro en Finkok'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {config.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('cerFile')}</label>
                  <div className="flex items-center gap-2">
                    <input ref={cerInputRef} type="file" accept=".cer" onChange={e => setCerFile(e.target.files?.[0] || null)} className="hidden" />
                    <button type="button" onClick={() => cerInputRef.current?.click()} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-background hover:bg-muted/50 transition-colors text-left">
                      {cerFile ? (<><FileCheck className="w-4 h-4 text-primary shrink-0" /><span className="text-foreground truncate">{cerFile.name}</span></>) : (<><Upload className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">{t('selectCerFile')}</span></>)}
                    </button>
                    {cerFile && (<button type="button" onClick={() => { setCerFile(null); if (cerInputRef.current) cerInputRef.current.value = ''; }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('keyFile')}</label>
                  <div className="flex items-center gap-2">
                    <input ref={keyInputRef} type="file" accept=".key" onChange={e => setKeyFile(e.target.files?.[0] || null)} className="hidden" />
                    <button type="button" onClick={() => keyInputRef.current?.click()} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-background hover:bg-muted/50 transition-colors text-left">
                      {keyFile ? (<><FileCheck className="w-4 h-4 text-primary shrink-0" /><span className="text-foreground truncate">{keyFile.name}</span></>) : (<><Upload className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">{t('selectKeyFile')}</span></>)}
                    </button>
                    {keyFile && (<button type="button" onClick={() => { setKeyFile(null); if (keyInputRef.current) keyInputRef.current.value = ''; }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('keyPassword')}</label>
                  <input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder={t('keyPasswordPlaceholder')} className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="pt-1">
                  <Button onClick={handleUploadCert} disabled={uploading || !cerFile || !keyFile || !certPassword.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {t('uploadCerts')}
                  </Button>
                  <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-lg bg-muted/40 border border-border border-l-2 border-l-primary/50">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('certsSecurityNote')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('saveFiscalFirst')}</p>
            )}
          </section>

          {/* Modal: confirmar eliminar CSD */}
          <Modal
            isOpen={showDeleteCsdModal}
            onClose={() => setShowDeleteCsdModal(false)}
            title={t('deleteCsdConfirmTitle')}
            size="sm"
          >
            <div className="p-6">
              <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  {t('deleteCsdConfirmBody')}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDeleteCsdModal(false)}
                  disabled={deletingCsd}
                  className="px-4 py-2 text-sm font-medium text-foreground/80 bg-background border border-border hover:bg-muted rounded-lg disabled:opacity-50"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCsd}
                  disabled={deletingCsd}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  data-testid="confirm-delete-csd"
                >
                  {deletingCsd && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('deleteCsdConfirmBtn')}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: Series                                */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'series' && (
        <div>
          {/* Add serie form */}
          {showAddSerie && (
            <div className="mb-5 p-4 rounded-2xl border border-border bg-card shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('newSeries')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('seriesLabel')} *</label>
                  <input
                    type="text"
                    value={newSerie.serie}
                    onChange={e => setNewSerie(s => ({ ...s, serie: e.target.value.toUpperCase() }))}
                    placeholder="A"
                    maxLength={10}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('voucherType')}</label>
                  <select
                    value={newSerie.tipoDocumento}
                    onChange={e => setNewSerie(s => ({ ...s, tipoDocumento: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="Ingreso">Ingreso (Factura)</option>
                    <option value="Egreso">Egreso (Nota de crédito)</option>
                    <option value="Pago">Pago (Complemento)</option>
                    <option value="Traslado">Traslado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('initialFolio')}</label>
                  <input
                    type="number"
                    value={newSerie.folioInicial}
                    onChange={e => setNewSerie(s => ({ ...s, folioInicial: parseInt(e.target.value) || 1 }))}
                    min={1}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddSerie(false)}>{tCommon('cancel')}</Button>
                <Button onClick={handleAddSerie} disabled={savingSerie} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {savingSerie ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {t('createSeries')}
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
            emptyMessage={t('noSeriesConfigured')}
            mobileCardRenderer={(s) => (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-foreground">{s.serie || '—'}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{s.tipoDocumento}</span>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('currentFolioMobile')} <span className="font-semibold text-foreground tabular-nums">{s.folioActual}</span>
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
