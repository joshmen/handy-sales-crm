'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  Plus,
  X,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { Ticket, CheckCircle } from '@phosphor-icons/react';
import { toast } from '@/hooks/useToast';
import {
  cuponAdminService,
  CuponAdminDto,
  CuponCreateDto,
  CuponUpdateDto,
  TipoCupon,
  TIPO_CUPON_OPTIONS,
} from '@/services/api/cuponesAdmin';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { PageHeader } from '@/components/layout/PageHeader';

type DrawerMode = 'none' | 'create' | 'edit';

function formatTipo(tipo: TipoCupon): string {
  return TIPO_CUPON_OPTIONS.find(o => o.value === tipo)?.label ?? tipo;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function CuponesAdminPage() {
  const t = useTranslations('admin.cupones');
  const ta = useTranslations('admin');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();
  const [cupones, setCupones] = useState<CuponAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [editingCupon, setEditingCupon] = useState<CuponAdminDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCupon>('MesesGratis');
  const [mesesGratis, setMesesGratis] = useState<number>(1);
  const [planObjetivo, setPlanObjetivo] = useState('PRO');
  const [mesesUpgrade, setMesesUpgrade] = useState<number>(1);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(10);
  const [maxUsos, setMaxUsos] = useState<number>(1);
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [activo, setActivo] = useState(true);

  const fetchCupones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cuponAdminService.getAll();
      setCupones(data);
    } catch {
      toast({ title: tc('error'), description: t('loadError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCupones(); }, [fetchCupones]);

  const resetForm = () => {
    setNombre('');
    setTipo('MesesGratis');
    setMesesGratis(1);
    setPlanObjetivo('PRO');
    setMesesUpgrade(1);
    setDescuentoPorcentaje(10);
    setMaxUsos(1);
    setFechaExpiracion('');
    setActivo(true);
  };

  const openCreate = () => {
    setEditingCupon(null);
    resetForm();
    setDrawerMode('create');
  };

  const openEdit = (cupon: CuponAdminDto) => {
    setEditingCupon(cupon);
    setNombre(cupon.nombre);
    setTipo(cupon.tipo);
    setMesesGratis(cupon.mesesGratis ?? 1);
    setPlanObjetivo(cupon.planObjetivo ?? 'PRO');
    setMesesUpgrade(cupon.mesesUpgrade ?? 1);
    setDescuentoPorcentaje(cupon.descuentoPorcentaje ?? 10);
    setMaxUsos(cupon.maxUsos);
    setFechaExpiracion(
      cupon.fechaExpiracion
        ? new Date(cupon.fechaExpiracion).toISOString().split('T')[0]
        : ''
    );
    setActivo(cupon.activo);
    setDrawerMode('edit');
  };

  const closeDrawer = () => {
    setDrawerMode('none');
    setEditingCupon(null);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast({ title: tc('error'), description: t('nameRequired'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (drawerMode === 'edit' && editingCupon) {
        const dto: CuponUpdateDto = {
          nombre,
          maxUsos,
          fechaExpiracion: fechaExpiracion || null,
          activo,
        };
        await cuponAdminService.update(editingCupon.id, dto);
        toast({ title: t('couponUpdated'), description: t('couponUpdatedDesc', { name: nombre }) });
      } else {
        const dto: CuponCreateDto = {
          nombre,
          tipo,
          mesesGratis: tipo === 'MesesGratis' ? mesesGratis : null,
          planObjetivo: tipo === 'UpgradePlan' ? planObjetivo : null,
          mesesUpgrade: tipo === 'UpgradePlan' ? mesesUpgrade : null,
          descuentoPorcentaje: tipo === 'DescuentoPorcentaje' ? descuentoPorcentaje : null,
          maxUsos,
          fechaExpiracion: fechaExpiracion || null,
        };
        await cuponAdminService.create(dto);
        toast({ title: t('couponCreated'), description: t('couponCreatedDesc', { name: nombre }) });
      }
      closeDrawer();
      fetchCupones();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      toast({ title: tc('error'), description: tApi(raw) || t('saveError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cupon: CuponAdminDto) => {
    try {
      await cuponAdminService.update(cupon.id, { activo: !cupon.activo });
      toast({ title: cupon.activo ? t('couponDeactivated') : t('couponActivated') });
      fetchCupones();
    } catch (err: unknown) {
      const raw = (err as { message?: string })?.message;
      toast({ title: tc('error'), description: tApi(raw) || t('toggleError'), variant: 'destructive' });
    }
  };

  const handleDelete = async (cupon: CuponAdminDto) => {
    try {
      await cuponAdminService.delete(cupon.id);
      toast({ title: t('couponDeleted'), description: t('couponDeletedDesc', { name: cupon.nombre }) });
      setDeleteConfirmId(null);
      fetchCupones();
    } catch (err: unknown) {
      const raw = (err as { message?: string })?.message;
      toast({ title: tc('error'), description: tApi(raw) || t('deleteError'), variant: 'destructive' });
    }
  };

  const handleCopy = async (codigo: string, id: number) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedId(id);
      toast({ title: t('codeCopied') });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: tc('error'), description: t('copyError'), variant: 'destructive' });
    }
  };

  // KPI calculations
  const totalCupones = cupones.length;
  const activeCupones = cupones.filter(c => c.activo).length;
  const totalRedenciones = cupones.reduce((sum, c) => sum + c.usosActuales, 0);

  const inputClasses = 'w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';

  // --- Drawer ---
  const renderDrawer = () => (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={closeDrawer} />
      <div className="relative w-full max-w-lg bg-surface-2 shadow-xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5 text-violet-600" weight="duotone" />
            {drawerMode === 'edit' ? t('drawerTitleEdit') : t('drawerTitleCreate')}
          </h2>
          <button onClick={closeDrawer} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('couponNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClasses}
              placeholder={t('couponNamePlaceholder')}
            />
          </div>

          {/* Tipo (solo crear) */}
          {drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t('couponTypeLabel')} <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoCupon)}
                className={inputClasses}
              >
                {TIPO_CUPON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Campos condicionales por tipo */}
          {(drawerMode === 'create' ? tipo : editingCupon?.tipo) === 'MesesGratis' && drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t('freeMonthsLabel')}
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={mesesGratis}
                onChange={(e) => setMesesGratis(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
          )}

          {(drawerMode === 'create' ? tipo : editingCupon?.tipo) === 'UpgradePlan' && drawerMode === 'create' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  {t('targetPlanLabel')}
                </label>
                <select
                  value={planObjetivo}
                  onChange={(e) => setPlanObjetivo(e.target.value)}
                  className={inputClasses}
                >
                  <option value="BASICO">{t('planBasic')}</option>
                  <option value="PRO">{t('planPro')}</option>
                  <option value="ENTERPRISE">{t('planEnterprise')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  {t('upgradeMonthsLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={mesesUpgrade}
                  onChange={(e) => setMesesUpgrade(Number(e.target.value))}
                  className={inputClasses}
                />
              </div>
            </>
          )}

          {(drawerMode === 'create' ? tipo : editingCupon?.tipo) === 'DescuentoPorcentaje' && drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t('discountPercentLabel')}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={descuentoPorcentaje}
                onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
                className={inputClasses}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('percentRange')}</p>
            </div>
          )}

          {/* Max Usos */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('maxUsesLabel')}
            </label>
            <input
              type="number"
              min="1"
              value={maxUsos}
              onChange={(e) => setMaxUsos(Number(e.target.value))}
              className={inputClasses}
            />
          </div>

          {/* Fecha Expiración */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('expirationDateLabel')}
            </label>
            <input
              type="date"
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className={inputClasses}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('noExpirationHint')}</p>
          </div>

          {/* Activo (solo editar) */}
          {drawerMode === 'edit' && (
            <div className="border-t border-border-subtle pt-4 mt-4">
              <div
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-surface-1 cursor-pointer"
                onClick={() => setActivo(!activo)}
              >
                <span className={`text-sm ${activo ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}`}>
                  {activo ? t('couponActive') : t('couponInactive')}
                </span>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activo ? 'bg-green-600' : 'bg-surface-3'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface-2 transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </div>
          )}

          {/* Código generado (solo editar, read-only) */}
          {drawerMode === 'edit' && editingCupon && (
            <div className="border-t border-border-subtle pt-4 mt-4">
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t('autoGeneratedCode')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingCupon.codigo}
                  readOnly
                  className={`${inputClasses} font-mono bg-surface-1 text-foreground/70`}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(editingCupon.codigo, editingCupon.id)}
                  className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('copyCode')}
                >
                  {copiedId === editingCupon.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Info resumen (solo editar) */}
          {drawerMode === 'edit' && editingCupon && (
            <div className="border-t border-border-subtle pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('summaryType')}:</span>
                <span className="font-medium">{formatTipo(editingCupon.tipo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('summaryRedemptions')}:</span>
                <span className="font-medium">{editingCupon.usosActuales} / {editingCupon.maxUsos}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('summaryCreated')}:</span>
                <span className="font-medium">{formatDate(editingCupon.creadoEn)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={closeDrawer}
            className="px-4 py-2 text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 transition-colors"
            disabled={saving}
          >
            {tc('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tc('saving')}
              </>
            ) : (
              drawerMode === 'edit' ? t('saveChanges') : t('createCoupon')
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: ta('breadcrumb') },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <>
          <button
            onClick={fetchCupones}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 text-sm text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('newCoupon')}
          </button>
        </>
      }
    >
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2">
              <Ticket className="h-5 w-5 text-violet-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('totalCoupons')}</p>
              <p className="text-2xl font-bold text-foreground">{totalCupones}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('activeCoupons')}</p>
              <p className="text-2xl font-bold text-foreground">{activeCupones}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Ticket className="h-5 w-5 text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('totalRedemptions')}</p>
              <p className="text-2xl font-bold text-foreground">{totalRedenciones}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : cupones.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-12 text-center">
          <Ticket className="mx-auto h-12 w-12 text-muted-foreground/60" weight="duotone" />
          <p className="mt-4 text-muted-foreground">{t('noCoupons')}</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t('createFirst')}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg border border-border-subtle bg-surface-2 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-surface-1 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('tableNameHeader')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('tableCodeHeader')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('tableTypeHeader')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">{t('tableUsesHeader')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('tableExpirationHeader')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">{t('tableStatusHeader')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t('tableActionsHeader')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {cupones.map((cupon) => (
                  <tr key={cupon.id} className="hover:bg-surface-1">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {cupon.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md border border-border-subtle text-foreground/70">
                          {cupon.codigo}
                        </span>
                        <button
                          onClick={() => handleCopy(cupon.codigo, cupon.id)}
                          className="p-1 text-muted-foreground hover:text-blue-600 rounded transition-colors"
                          title={t('copyCode')}
                        >
                          {copiedId === cupon.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                        {formatTipo(cupon.tipo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        cupon.usosActuales >= cupon.maxUsos ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {cupon.usosActuales}/{cupon.maxUsos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">
                      <span className={isExpired(cupon.fechaExpiracion) ? 'text-red-600' : ''}>
                        {formatDate(cupon.fechaExpiracion)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        cupon.activo ? 'bg-green-100 text-green-700' : 'bg-surface-3 text-muted-foreground'
                      }`}>
                        {cupon.activo ? tc('active') : tc('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cupon)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={tc('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(cupon)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cupon.activo
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={cupon.activo ? tc('deactivate') : tc('activate')}
                        >
                          {cupon.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                        {deleteConfirmId === cupon.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(cupon)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('confirmDelete')}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1.5 text-foreground/70 hover:bg-surface-1 rounded-lg transition-colors"
                              title={tc('cancel')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cupon.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={tc('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {cupones.map((cupon) => (
              <div
                key={cupon.id}
                className="rounded-lg border border-border-subtle bg-surface-2 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{cupon.nombre}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md border border-border-subtle text-foreground/70">
                        {cupon.codigo}
                      </span>
                      <button
                        onClick={() => handleCopy(cupon.codigo, cupon.id)}
                        className="p-0.5 text-muted-foreground hover:text-blue-600 rounded transition-colors"
                      >
                        {copiedId === cupon.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    cupon.activo ? 'bg-green-100 text-green-700' : 'bg-surface-3 text-muted-foreground'
                  }`}>
                    {cupon.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('summaryType')}:</span>{' '}
                    <span className="font-medium">{formatTipo(cupon.tipo)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('tableUsesHeader')}:</span>{' '}
                    <span className="font-medium">{cupon.usosActuales}/{cupon.maxUsos}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('tableExpirationHeader')}:</span>{' '}
                    <span className={`font-medium ${isExpired(cupon.fechaExpiracion) ? 'text-red-600' : ''}`}>
                      {formatDate(cupon.fechaExpiracion)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('summaryCreated')}:</span>{' '}
                    <span className="font-medium">{formatDate(cupon.creadoEn)}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-border-subtle pt-3">
                  <button
                    onClick={() => openEdit(cupon)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                    {tc('edit')}
                  </button>
                  <button
                    onClick={() => handleToggle(cupon)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                      cupon.activo
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {cupon.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    {cupon.activo ? tc('deactivate') : tc('activate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Drawer */}
      {drawerMode !== 'none' && renderDrawer()}
    </div>
    </PageHeader>
  );
}
