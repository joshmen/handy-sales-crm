'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Building2,
  Plus,
  Pencil,
  Search,
  Users,
  ChevronRight,
  X,
  Mail,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Eye,
  Check,
  Minus,
  Power,
  PowerOff,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  Tenant,
  TenantDetail,
  TenantCreateRequest,
  TenantUpdateRequest,
} from '@/types/tenant';
import { tenantService } from '@/services/api/tenants';
import { toast } from '@/hooks/useToast';

interface TenantFormData {
  nombreEmpresa: string;
  planTipo?: string;
  maxUsuarios: number;
  // DatosEmpresa fields (only for create)
  rfc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  // Admin fields (only for create)
  adminNombre?: string;
  adminEmail?: string;
  adminPassword?: string;
}

type DrawerMode = 'none' | 'create' | 'edit';

export default function TenantsPage() {
  const router = useRouter();

  // State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [planFilter, setPlanFilter] = useState<'todos' | 'free' | 'basic' | 'pro'>('todos');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Forms
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantFormData>({
    defaultValues: { maxUsuarios: 10 },
  });

  // Load tenants
  useEffect(() => {
    loadTenants();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = tenants;
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.rfc && t.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (!showInactive) {
      filtered = filtered.filter((t) => t.activo);
    }
    if (planFilter !== 'todos') {
      filtered = filtered.filter((t) => t.planTipo === planFilter);
    }
    setFilteredTenants(filtered);
  }, [tenants, searchTerm, showInactive, planFilter]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, showInactive, planFilter]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getAll();
      setTenants(data);
      setFilteredTenants(data);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las empresas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Drawer handlers ---

  const handleOpenCreate = () => {
    setSelectedTenant(null);
    reset({
      nombreEmpresa: '',
      rfc: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      planTipo: 'free',
      maxUsuarios: 10,
      adminNombre: '',
      adminEmail: '',
      adminPassword: '',
    });
    setDrawerMode('create');
  };

  const handleOpenEdit = async (tenant: Tenant) => {
    try {
      const detail = await tenantService.getById(tenant.id);
      setSelectedTenant(detail);
      reset({
        nombreEmpresa: detail.nombreEmpresa,
        planTipo: detail.planTipo || 'free',
        maxUsuarios: detail.maxUsuarios,
      });
      setDrawerMode('edit');
    } catch (error) {
      console.error('Error loading tenant details:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la empresa',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDrawer = () => {
    setDrawerMode('none');
    setSelectedTenant(null);
    reset();
  };

  // --- Submit handlers ---

  const onSubmitTenant = async (data: TenantFormData) => {
    try {
      setSubmitting(true);
      if (drawerMode === 'edit' && selectedTenant) {
        const updateData: TenantUpdateRequest = {
          nombreEmpresa: data.nombreEmpresa,
          planTipo: data.planTipo || undefined,
          maxUsuarios: data.maxUsuarios,
        };
        await tenantService.update(selectedTenant.id, updateData);
        toast({
          title: 'Empresa actualizada',
          description: 'Los cambios se guardaron correctamente',
        });
      } else {
        const createData: TenantCreateRequest = {
          nombreEmpresa: data.nombreEmpresa,
          rfc: data.rfc || undefined,
          contacto: data.contacto || undefined,
          telefono: data.telefono || undefined,
          email: data.email || undefined,
          direccion: data.direccion || undefined,
          planTipo: data.planTipo || undefined,
          maxUsuarios: data.maxUsuarios,
        };
        const result = await tenantService.create(createData);

        // If admin fields provided, create admin user
        if (data.adminEmail && data.adminNombre && data.adminPassword) {
          try {
            await tenantService.createTenantUser(result.id, {
              nombre: data.adminNombre,
              email: data.adminEmail,
              password: data.adminPassword,
              rol: 'ADMIN',
            });
          } catch (adminError) {
            console.error('Error creating admin user:', adminError);
            toast({
              title: 'Empresa creada',
              description: 'La empresa se creó pero hubo un error al crear el administrador',
              variant: 'destructive',
            });
            handleCloseDrawer();
            loadTenants();
            return;
          }
        }

        toast({
          title: 'Empresa creada',
          description: data.adminEmail
            ? 'La empresa y su administrador se crearon correctamente'
            : 'La empresa se creó correctamente',
        });
      }
      handleCloseDrawer();
      loadTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast({
        title: 'Error',
        description:
          drawerMode === 'edit'
            ? 'No se pudo actualizar la empresa'
            : 'No se pudo crear la empresa',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivo = async (tenant: Tenant) => {
    try {
      setTogglingId(tenant.id);
      await tenantService.toggleActivo(tenant.id, !tenant.activo);
      toast({
        title: tenant.activo ? 'Empresa desactivada' : 'Empresa activada',
        description: `${tenant.nombreEmpresa} fue ${tenant.activo ? 'desactivada' : 'activada'} correctamente`,
      });
      if (!showInactive && tenant.activo) {
        setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, activo: false } : t));
      } else {
        setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, activo: !t.activo } : t));
      }
    } catch (error) {
      console.error('Error toggling tenant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la empresa',
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Multi-select handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visIds = filteredTenants.map(t => t.id);
    const allSelected = visIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenBatchAction = (action: 'activate' | 'deactivate') => {
    setBatchAction(action);
    setIsBatchConfirmOpen(true);
  };

  const handleBatchToggle = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBatchLoading(true);
      const ids = Array.from(selectedIds);
      const activo = batchAction === 'activate';
      await tenantService.batchToggle(ids, activo);
      toast({
        title: `${ids.length} empresa${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''}`,
        description: 'Los cambios se aplicaron correctamente',
      });
      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
      setTenants(prev => prev.map(t =>
        ids.includes(t.id) ? { ...t, activo } : t
      ));
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de las empresas',
        variant: 'destructive',
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Computed selection state
  const visibleIds = filteredTenants.map(t => t.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  // --- Utility functions ---

  const getPlanBadgeColor = (plan: string | null) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case 'free':
        return 'Gratis';
      case 'basic':
        return 'Básico';
      case 'pro':
        return 'Pro';
      default:
        return 'Sin plan';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const navigateToDetail = (tenantId: number) => {
    router.push(`/admin/tenants/${tenantId}`);
  };

  // --- Drawer rendering ---

  const renderFormDrawer = () => (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={handleCloseDrawer} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {drawerMode === 'edit' ? 'Editar Empresa' : 'Nueva Empresa'}
          </h2>
          <button
            onClick={handleCloseDrawer}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmitTenant)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Nombre Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('nombreEmpresa', {
                  required: 'El nombre es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Mi Empresa SA de CV"
              />
              {errors.nombreEmpresa && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.nombreEmpresa.message}
                </p>
              )}
            </div>

            {/* DatosEmpresa fields - Only on create */}
            {drawerMode === 'create' && (
              <>
                {/* RFC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFC
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      {...register('rfc', {
                        pattern: {
                          value: /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/,
                          message: 'RFC inválido',
                        },
                      })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                      placeholder="Ej: ABC123456XYZ"
                      maxLength={13}
                    />
                  </div>
                  {errors.rfc && (
                    <p className="text-sm text-red-600 mt-1">{errors.rfc.message}</p>
                  )}
                </div>

                {/* Contacto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contacto
                  </label>
                  <input
                    type="text"
                    {...register('contacto')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del contacto principal"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      {...register('email', {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido',
                        },
                      })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      {...register('telefono')}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 3331234567"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      {...register('direccion')}
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Plan Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                {...register('planTipo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="free">Gratis</option>
                <option value="basic">Básico</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            {/* Max Usuarios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo de Usuarios <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  {...register('maxUsuarios', {
                    required: 'El máximo de usuarios es requerido',
                    min: { value: 1, message: 'Mínimo 1 usuario' },
                    max: { value: 1000, message: 'Máximo 1000 usuarios' },
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10"
                  min={1}
                  max={1000}
                />
              </div>
              {errors.maxUsuarios && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.maxUsuarios.message}
                </p>
              )}
            </div>

            {/* Admin Section - Only on create */}
            {drawerMode === 'create' && (
              <>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    Administrador del Tenant
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Opcionalmente crea el usuario administrador de esta empresa
                  </p>
                </div>

                {/* Admin Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Administrador
                  </label>
                  <input
                    type="text"
                    {...register('adminNombre')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre completo"
                  />
                </div>

                {/* Admin Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email del Administrador
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      {...register('adminEmail', {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido',
                        },
                      })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  {errors.adminEmail && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>

                {/* Admin Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña Temporal
                  </label>
                  <input
                    type="text"
                    {...register('adminPassword', {
                      minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contraseña temporal"
                  />
                  {errors.adminPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.adminPassword.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Administración</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Gestión de Empresas</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            Gestión de Empresas
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Administra las empresas registradas en el sistema
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Empresa
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as any)}
          className="px-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="todos">Todos los planes</option>
          <option value="free">Gratis</option>
          <option value="basic">Básico</option>
          <option value="pro">Pro</option>
        </select>

        {/* Toggle para mostrar inactivos */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-600">Mostrar inactivos</span>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              showInactive ? 'bg-blue-500' : 'bg-gray-300'
            }`}
            title={showInactive ? 'Mostrando todas las empresas' : 'Solo empresas activas'}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
              showInactive ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-700">
              {selectedCount} seleccionada{selectedCount > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-blue-500">
              de {tenants.length} empresas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenBatchAction('deactivate')}
              disabled={batchLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <PowerOff className="w-3 h-3" />
              <span>Desactivar</span>
            </button>
            <button
              onClick={() => handleOpenBatchAction('activate')}
              disabled={batchLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-600 bg-white border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <Power className="w-3 h-3" />
              <span>Activar</span>
            </button>
            <button
              onClick={handleClearSelection}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        {/* Table Header */}
        <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200">
          <div className="w-[28px] flex items-center justify-center">
            <button
              onClick={handleSelectAllVisible}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                allVisibleSelected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : someVisibleSelected
                  ? 'bg-blue-100 border-blue-600'
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              {allVisibleSelected ? (
                <Check className="w-3 h-3" />
              ) : someVisibleSelected ? (
                <Minus className="w-3 h-3 text-blue-600" />
              ) : null}
            </button>
          </div>
          <div className="flex-1 min-w-[200px] text-[11px] font-medium text-gray-500 uppercase">Empresa</div>
          <div className="w-[90px] text-[11px] font-medium text-gray-500 uppercase">Plan</div>
          <div className="w-[80px] text-[11px] font-medium text-gray-500 uppercase">Usuarios</div>
          <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
          <div className="w-[100px] text-[11px] font-medium text-gray-500 uppercase hidden lg:block">Expiración</div>
          <div className="w-[80px]"></div>
        </div>

        {/* Table Body with loading overlay */}
        <div className="relative min-h-[200px]">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm text-gray-500">Cargando...</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredTenants.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-white text-gray-400">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay empresas</p>
                <p className="text-sm">
                  {searchTerm || planFilter !== 'todos'
                    ? 'No se encontraron empresas con los filtros aplicados'
                    : 'Comienza registrando tu primera empresa'}
                </p>
                {!searchTerm && planFilter === 'todos' && (
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Empresa
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              {filteredTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer ${
                    !tenant.activo ? 'bg-gray-50 opacity-60' : ''
                  }`}
                  onClick={() => navigateToDetail(tenant.id)}
                >
                  {/* Checkbox */}
                  <div className="w-[28px] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleSelect(tenant.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedIds.has(tenant.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {selectedIds.has(tenant.id) && <Check className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Empresa */}
                  <div className="flex-1 min-w-[200px] flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate">
                        {tenant.nombreEmpresa}
                      </div>
                      {tenant.rfc && (
                        <div className="text-[11px] text-gray-500">{tenant.rfc}</div>
                      )}
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="w-[90px]">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(
                        tenant.planTipo
                      )}`}
                    >
                      {getPlanLabel(tenant.planTipo)}
                    </span>
                  </div>

                  {/* Usuarios */}
                  <div className="w-[80px]">
                    <div className="flex items-center gap-1 text-[13px] text-gray-600">
                      <Users className="h-3.5 w-3.5" />
                      {tenant.usuarioCount}
                    </div>
                  </div>

                  {/* Toggle Activo */}
                  <div className="w-[50px] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleActivo(tenant)}
                      disabled={togglingId === tenant.id || loading}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        tenant.activo ? 'bg-green-500' : 'bg-gray-300'
                      } ${togglingId === tenant.id ? 'opacity-50' : ''}`}
                      title={tenant.activo ? 'Desactivar empresa' : 'Activar empresa'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                        tenant.activo ? 'translate-x-4' : 'translate-x-0'
                      }`}>
                        {tenant.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                      </span>
                    </button>
                  </div>

                  {/* Expiración */}
                  <div className="w-[100px] hidden lg:block">
                    <span className="text-[13px] text-gray-500">
                      {tenant.fechaExpiracion ? formatDate(tenant.fechaExpiracion) : '-'}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="w-[80px] flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigateToDetail(tenant.id)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(tenant)}
                      className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="hidden md:block text-sm text-gray-500">
        Mostrando {filteredTenants.length} de {tenants.length} empresas
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm text-gray-500 mt-2">Cargando...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTenants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-lg font-medium">No hay empresas</p>
              <p className="text-sm mt-1">
                {searchTerm || planFilter !== 'todos'
                  ? 'No se encontraron resultados'
                  : 'Comienza registrando tu primera empresa'}
              </p>
              {!searchTerm && planFilter === 'todos' && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Empresa
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tenant Cards */}
        {!loading && filteredTenants.map((tenant) => (
          <div
            key={tenant.id}
            className={`border border-gray-200 rounded-lg p-3 bg-white ${
              !tenant.activo ? 'opacity-60' : ''
            }`}
          >
            {/* Row 1: Checkbox + Avatar + Name + Toggle */}
            <div className="flex items-center gap-3 mb-2">
              {/* Checkbox */}
              <button
                onClick={() => handleToggleSelect(tenant.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedIds.has(tenant.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              >
                {selectedIds.has(tenant.id) && <Check className="w-3 h-3" />}
              </button>

              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0" onClick={() => navigateToDetail(tenant.id)}>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {tenant.nombreEmpresa}
                </div>
                {tenant.rfc && (
                  <div className="text-xs text-gray-500">{tenant.rfc}</div>
                )}
              </div>

              {/* Toggle Active */}
              <button
                onClick={() => handleToggleActivo(tenant)}
                disabled={togglingId === tenant.id || loading}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex-shrink-0 ${
                  tenant.activo ? 'bg-green-500' : 'bg-gray-300'
                } ${togglingId === tenant.id ? 'opacity-50' : ''}`}
                title={tenant.activo ? 'Desactivar empresa' : 'Activar empresa'}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                  tenant.activo ? 'translate-x-4' : 'translate-x-0'
                }`}>
                  {tenant.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                </span>
              </button>
            </div>

            {/* Row 2: Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getPlanBadgeColor(tenant.planTipo)}`}>
                {getPlanLabel(tenant.planTipo)}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                <Users className="h-3 w-3 mr-1" />
                {tenant.usuarioCount} usuarios
              </span>
            </div>

            {/* Row 3: Actions */}
            <div className="flex justify-end gap-1">
              <button
                onClick={() => navigateToDetail(tenant.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Detalle</span>
              </button>
              <button
                onClick={() => handleOpenEdit(tenant)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar</span>
              </button>
            </div>
          </div>
        ))}

        {/* Mobile results count */}
        {!loading && filteredTenants.length > 0 && (
          <div className="text-center text-sm text-gray-500">
            Mostrando {filteredTenants.length} de {tenants.length} empresas
          </div>
        )}
      </div>

      {/* Drawers */}
      {(drawerMode === 'create' || drawerMode === 'edit') && renderFormDrawer()}

      {/* Batch Confirm Modal */}
      {isBatchConfirmOpen && (
        <Modal
          isOpen={isBatchConfirmOpen}
          onClose={() => setIsBatchConfirmOpen(false)}
          title={`${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} empresa${selectedCount > 1 ? 's' : ''}?`}
        >
          <div className="py-4">
            <p className="text-gray-500">
              ¿Estás seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
              <strong>{selectedCount}</strong> empresa{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}?
              {batchAction === 'deactivate' && ' Los usuarios de las empresas desactivadas no podrán acceder al sistema.'}
              {batchAction === 'activate' && ' Los usuarios de las empresas activadas podrán acceder nuevamente.'}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsBatchConfirmOpen(false)}
              disabled={batchLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleBatchToggle}
              disabled={batchLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                batchAction === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {batchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
