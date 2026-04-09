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
} from 'lucide-react';
import {
  CreditCard,
  Buildings,
  CheckCircle,
  Users,
  Package,
  UsersFour,
} from '@phosphor-icons/react';
import { toast } from '@/hooks/useToast';
import {
  subscriptionPlanAdminService,
  SubscriptionPlanAdminDto,
  SubscriptionPlanCreateDto,
  SubscriptionPlanUpdateDto,
} from '@/services/api/subscriptionPlansAdmin';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

const AVAILABLE_FEATURES = [
  'CRM y clientes',
  'Pedidos y ventas',
  'Soporte por email',
  'Facturación SAT básica',
  'Rutas y logística',
  'Inventarios en tiempo real',
  'Reportes avanzados',
  'Listas de precios múltiples',
  'Soporte prioritario',
  'API e integraciones',
  'Multi-sucursal',
  'Onboarding dedicado',
  'SLA garantizado',
  'Facturación avanzada',
] as const;

type DrawerMode = 'none' | 'create' | 'edit';

export default function SubscriptionPlansAdminPage() {
  const t = useTranslations('admin.subscriptionPlans');
  const ta = useTranslations('admin');
  const tc = useTranslations('common');
  const { formatCurrency } = useFormatters();
  const [plans, setPlans] = useState<SubscriptionPlanAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanAdminDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [precioMensual, setPrecioMensual] = useState(0);
  const [precioAnual, setPrecioAnual] = useState(0);
  const [maxUsuarios, setMaxUsuarios] = useState(5);
  const [maxProductos, setMaxProductos] = useState(100);
  const [maxClientesPorMes, setMaxClientesPorMes] = useState(50);
  const [incluyeReportes, setIncluyeReportes] = useState(false);
  const [incluyeSoportePrioritario, setIncluyeSoportePrioritario] = useState(false);
  const [caracteristicas, setCaracteristicas] = useState<string[]>([]);
  const [activo, setActivo] = useState(true);
  const [orden, setOrden] = useState(1);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionPlanAdminService.getAll();
      setPlans(data);
    } catch {
      toast({ title: tc('error'), description: t('loadError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const resetForm = () => {
    setNombre('');
    setCodigo('');
    setPrecioMensual(0);
    setPrecioAnual(0);
    setMaxUsuarios(5);
    setMaxProductos(100);
    setMaxClientesPorMes(50);
    setIncluyeReportes(false);
    setIncluyeSoportePrioritario(false);
    setCaracteristicas([]);
    setActivo(true);
    setOrden(plans.length + 1);
  };

  const openCreate = () => {
    setEditingPlan(null);
    resetForm();
    setDrawerMode('create');
  };

  const openEdit = (plan: SubscriptionPlanAdminDto) => {
    setEditingPlan(plan);
    setNombre(plan.nombre);
    setCodigo(plan.codigo);
    setPrecioMensual(plan.precioMensual);
    setPrecioAnual(plan.precioAnual);
    setMaxUsuarios(plan.maxUsuarios);
    setMaxProductos(plan.maxProductos);
    setMaxClientesPorMes(plan.maxClientesPorMes);
    setIncluyeReportes(plan.incluyeReportes);
    setIncluyeSoportePrioritario(plan.incluyeSoportePrioritario);
    setCaracteristicas(plan.caracteristicas || []);
    setActivo(plan.activo);
    setOrden(plan.orden);
    setDrawerMode('edit');
  };

  const closeDrawer = () => {
    setDrawerMode('none');
    setEditingPlan(null);
  };

  const handleSave = async () => {
    if (!nombre.trim() || (drawerMode === 'create' && !codigo.trim())) {
      toast({ title: tc('error'), description: t('nameAndCodeRequired'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (drawerMode === 'edit' && editingPlan) {
        const dto: SubscriptionPlanUpdateDto = {
          nombre, precioMensual, precioAnual,
          maxUsuarios, maxProductos, maxClientesPorMes,
          incluyeReportes, incluyeSoportePrioritario, caracteristicas, activo, orden,
        };
        await subscriptionPlanAdminService.update(editingPlan.id, dto);
        toast({ title: t('planUpdated'), description: t('planUpdatedDesc', { name: nombre }) });
      } else {
        const dto: SubscriptionPlanCreateDto = {
          nombre, codigo: codigo.toUpperCase(),
          precioMensual, precioAnual,
          maxUsuarios, maxProductos, maxClientesPorMes,
          incluyeReportes, incluyeSoportePrioritario, caracteristicas, orden,
        };
        await subscriptionPlanAdminService.create(dto);
        toast({ title: t('planCreated'), description: t('planCreatedDesc', { name: nombre }) });
      }
      closeDrawer();
      fetchPlans();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('saveError');
      toast({ title: tc('error'), description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: SubscriptionPlanAdminDto) => {
    // Warn before deactivating a plan with active tenants
    if (plan.activo && plan.tenantCount > 0) {
      toast({
        title: t('cannotDeactivate'),
        description: t('cannotDeactivateDesc', { count: plan.tenantCount, name: plan.nombre }),
        variant: 'destructive',
      });
      return;
    }

    try {
      await subscriptionPlanAdminService.toggle(plan.id);
      toast({ title: plan.activo ? t('planDeactivated') : t('planActivated') });
      fetchPlans();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('toggleError');
      toast({ title: tc('error'), description: message, variant: 'destructive' });
    }
  };

  const toggleFeature = (feature: string) => {
    setCaracteristicas(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const formatPrice = (price: number) =>
    formatCurrency(price);

  // KPI calculations
  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.activo).length;
  const totalTenants = plans.reduce((sum, p) => sum + p.tenantCount, 0);

  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';

  // --- Drawer ---
  const renderDrawer = () => (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={closeDrawer} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" weight="duotone" />
            {drawerMode === 'edit' ? t('drawerTitleEdit') : t('drawerTitleCreate')}
          </h2>
          <button onClick={closeDrawer} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('planNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClasses}
              placeholder={t('planNamePlaceholder')}
            />
          </div>

          {/* Código (solo crear) */}
          {drawerMode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('codeLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className={`${inputClasses} font-mono uppercase`}
                placeholder={t('codePlaceholder')}
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">{t('codeHint')}</p>
            </div>
          )}

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('monthlyPriceLabel')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioMensual}
                onChange={(e) => setPrecioMensual(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('annualPriceLabel')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioAnual}
                onChange={(e) => setPrecioAnual(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Límites */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('planLimits')}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('maxUsersLabel')}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" weight="regular" />
                <input
                  type="number"
                  min="1"
                  value={maxUsuarios}
                  onChange={(e) => setMaxUsuarios(Number(e.target.value))}
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('maxProductsLabel')}
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" weight="regular" />
                <input
                  type="number"
                  min="1"
                  value={maxProductos}
                  onChange={(e) => setMaxProductos(Number(e.target.value))}
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('maxClientsLabel')}
              </label>
              <div className="relative">
                <UsersFour className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" weight="regular" />
                <input
                  type="number"
                  min="1"
                  value={maxClientesPorMes}
                  onChange={(e) => setMaxClientesPorMes(Number(e.target.value))}
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>
          </div>

          {/* Orden */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('displayOrderLabel')}
            </label>
            <input
              type="number"
              min="1"
              value={orden}
              onChange={(e) => setOrden(Number(e.target.value))}
              className={inputClasses}
            />
          </div>

          {/* Características */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {t('includedFeatures')}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t('featuresSelected', { selected: caracteristicas.length, total: AVAILABLE_FEATURES.length })}
            </p>
          </div>
          <div className="space-y-1">
            {AVAILABLE_FEATURES.map((feature) => {
              const checked = caracteristicas.includes(feature);
              return (
                <div
                  key={feature}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleFeature(feature)}
                >
                  <span className={`text-sm ${checked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {feature}
                  </span>
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      checked ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuración */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('configSection')}
            </h3>
          </div>
          <div className="space-y-3">
            <div
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setIncluyeReportes(!incluyeReportes)}
            >
              <span className={`text-sm ${incluyeReportes ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                {t('includesReports')}
              </span>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${incluyeReportes ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${incluyeReportes ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <div
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setIncluyeSoportePrioritario(!incluyeSoportePrioritario)}
            >
              <span className={`text-sm ${incluyeSoportePrioritario ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                {t('prioritySupport')}
              </span>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${incluyeSoportePrioritario ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${incluyeSoportePrioritario ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
            {drawerMode === 'edit' && (
              <div
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setActivo(!activo)}
              >
                <span className={`text-sm ${activo ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}`}>
                  {activo ? t('planActive') : t('planInactive')}
                </span>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activo ? 'bg-green-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={closeDrawer}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
              drawerMode === 'edit' ? t('saveChanges') : t('createPlan')
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{ta('breadcrumb')}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{t('breadcrumb')}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" weight="duotone" />
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('newPlan')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <CreditCard className="h-5 w-5 text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalPlans')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalPlans}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('activePlans')}</p>
              <p className="text-2xl font-bold text-gray-900">{activePlans}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2">
              <Buildings className="h-5 w-5 text-violet-600" weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('companiesWithPlan')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalTenants}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-300" weight="duotone" />
          <p className="mt-4 text-gray-500">{t('noPlans')}</p>
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
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">{t('tablePlan')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t('tableCode')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">{t('tableMonthly')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">{t('tableAnnual')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">{t('tableUsers')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">{t('tableProducts')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">{t('tableFeatures')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">{t('tableCompanies')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">{t('tableStatus')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">{t('tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {plan.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-mono font-medium rounded-md border border-gray-200 text-gray-600">
                        {plan.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatPrice(plan.precioMensual)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatPrice(plan.precioAnual)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {plan.maxUsuarios}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {plan.maxProductos}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                        {(plan.caracteristicas || []).length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        plan.tenantCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {plan.tenantCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        plan.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {plan.activo ? tc('active') : tc('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(plan)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={tc('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(plan)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            plan.activo && plan.tenantCount > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : plan.activo
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={
                            plan.activo && plan.tenantCount > 0
                              ? t('cannotDeactivateDesc', { count: plan.tenantCount, name: plan.nombre })
                              : plan.activo ? tc('deactivate') : tc('activate')
                          }
                        >
                          {plan.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{plan.nombre}</h3>
                    <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-mono font-medium rounded-md border border-gray-200 text-gray-600">
                      {plan.codigo}
                    </span>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    plan.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">{t('tableMonthly')}:</span>{' '}
                    <span className="font-medium">{formatPrice(plan.precioMensual)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('tableAnnual')}:</span>{' '}
                    <span className="font-medium">{formatPrice(plan.precioAnual)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">{t('tableUsers')}:</span> {plan.maxUsuarios}
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">{t('tableProducts')}:</span> {plan.maxProductos}
                  </div>
                  <div className="flex items-center gap-1">
                    <UsersFour className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">{t('maxClientsLabel')}:</span> {plan.maxClientesPorMes}
                  </div>
                  <div className="flex items-center gap-1">
                    <Buildings className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">{t('tableCompanies')}:</span> {plan.tenantCount}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => openEdit(plan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                    {tc('edit')}
                  </button>
                  <button
                    onClick={() => handleToggle(plan)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                      plan.activo && plan.tenantCount > 0
                        ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                        : plan.activo
                          ? 'text-red-600 border-red-200 hover:bg-red-50'
                          : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {plan.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    {plan.activo && plan.tenantCount > 0 ? t('inUse') : plan.activo ? tc('deactivate') : tc('activate')}
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
  );
}
