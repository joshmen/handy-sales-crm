'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Users,
  Mail,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Eye,
  Check,
  Minus,
} from 'lucide-react';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Tenant,
  TenantDetail,
  TenantCreateRequest,
  TenantUpdateRequest,
} from '@/types/tenant';
import { tenantService } from '@/services/api/tenants';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';

interface TenantFormData {
  nombreEmpresa: string;
  planTipo?: string;
  maxUsuarios: number;
  // DatosEmpresa fields (only for create)
  identificadorFiscal?: string;
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
  const { formatDate: _fmtDate } = useFormatters();
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

  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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
          (t.identificadorFiscal && t.identificadorFiscal.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (!showInactive) {
      filtered = filtered.filter((t) => t.activo);
    }
    if (planFilter !== 'todos') {
      filtered = filtered.filter((t) => t.planTipo === planFilter);
    }
    setFilteredTenants(filtered);
    setCurrentPage(1);
  }, [tenants, searchTerm, showInactive, planFilter]);

  // Pagination computed values
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const startItem = filteredTenants.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, filteredTenants.length);
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      identificadorFiscal: '',
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
          identificadorFiscal: data.identificadorFiscal || undefined,
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

  const visibleIds = filteredTenants.map(t => t.id);

  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [searchTerm, showInactive, planFilter],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;
    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';
      await tenantService.batchToggle(ids, activo);
      toast({
        title: `${ids.length} empresa${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''}`,
        description: 'Los cambios se aplicaron correctamente',
      });
      setTenants(prev => prev.map(t =>
        ids.includes(t.id) ? { ...t, activo } : t
      ));
      batch.completeBatch();
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de las empresas',
        variant: 'destructive',
      });
      batch.setBatchLoading(false);
    }
  };

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
    return _fmtDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const navigateToDetail = (tenantId: number) => {
    router.push(`/admin/tenants/${tenantId}`);
  };

  // --- Drawer rendering ---

  const drawerFooter = (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={handleCloseDrawer}
        className="px-4 py-2 text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        disabled={submitting}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="tenant-form"
        disabled={submitting}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Administración' },
        { label: 'Gestión de Empresas' },
      ]}
      title="Gestión de Empresas"
      subtitle="Administra las empresas registradas en el sistema"
      actions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Empresa
        </button>
      }
    >
      <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SearchBar
          value={searchTerm}
          onChange={(v) => { setSearchTerm(v); }}
          placeholder="Buscar empresa..."
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as 'todos' | 'free' | 'basic' | 'pro')}
          className="px-3 py-2 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="todos">Todos los planes</option>
          <option value="free">Gratis</option>
          <option value="basic">Básico</option>
          <option value="pro">Pro</option>
        </select>

        <InactiveToggle
          value={showInactive}
          onChange={(v) => { setShowInactive(v); }}
          className="ml-auto"
        />
      </div>

      {/* Selection Action Bar */}
      <BatchActionBar
        selectedCount={batch.selectedCount}
        totalItems={tenants.length}
        entityLabel="empresas"
        onActivate={() => batch.openBatchAction('activate')}
        onDeactivate={() => batch.openBatchAction('deactivate')}
        onClear={batch.handleClearSelection}
        loading={batch.batchLoading}
      />

      {/* Desktop Table */}
      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        {/* Table Header */}
        <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200">
          <div className="w-[28px] flex items-center justify-center">
            <button
              onClick={batch.handleSelectAllVisible}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                batch.allVisibleSelected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : batch.someVisibleSelected
                  ? 'bg-blue-100 border-blue-600'
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              {batch.allVisibleSelected ? (
                <Check className="w-3 h-3" />
              ) : batch.someVisibleSelected ? (
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
          <TableLoadingOverlay loading={loading} message="Cargando tenants..." />

          {/* Empty State */}
          {!loading && filteredTenants.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-card text-muted-foreground">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay empresas</p>
                <p className="text-sm">
                  {searchTerm || planFilter !== 'todos'
                    ? 'No se encontraron empresas con los filtros aplicados'
                    : 'Comienza registrando tu primera empresa'}
                </p>
                {!searchTerm && planFilter === 'todos' && (
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Empresa
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              {paginatedTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer ${
                    !tenant.activo ? 'opacity-60' : ''
                  }`}
                  onClick={() => navigateToDetail(tenant.id)}
                >
                  {/* Checkbox */}
                  <div className="w-[28px] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => batch.handleToggleSelect(tenant.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        batch.selectedIds.has(tenant.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {batch.selectedIds.has(tenant.id) && <Check className="w-3 h-3" />}
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
                      {tenant.identificadorFiscal && (
                        <div className="text-[11px] text-gray-500">{tenant.identificadorFiscal}</div>
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
                    <ActiveToggle
                      isActive={tenant.activo}
                      onToggle={() => handleToggleActivo(tenant)}
                      disabled={loading}
                      isLoading={togglingId === tenant.id}
                    />
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
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(tenant)}
                      className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
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

      {/* Pagination */}
      {!loading && filteredTenants.length > 0 && (
        <div className="hidden md:flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {startItem}-{endItem} de {filteredTenants.length} empresas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                    page === currentPage
                      ? 'bg-green-600 text-white'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="text-sm text-muted-foreground mt-2">Cargando...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTenants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-lg font-medium">No hay empresas</p>
              <p className="text-sm mt-1">
                {searchTerm || planFilter !== 'todos'
                  ? 'No se encontraron resultados'
                  : 'Comienza registrando tu primera empresa'}
              </p>
              {!searchTerm && planFilter === 'todos' && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Empresa
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tenant Cards */}
        {!loading && paginatedTenants.map((tenant) => (
          <div
            key={tenant.id}
            className={`border border-border rounded-lg p-3 bg-card ${
              !tenant.activo ? 'opacity-60' : ''
            }`}
          >
            {/* Row 1: Checkbox + Avatar + Name + Toggle */}
            <div className="flex items-center gap-3 mb-2">
              {/* Checkbox */}
              <button
                onClick={() => batch.handleToggleSelect(tenant.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  batch.selectedIds.has(tenant.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              >
                {batch.selectedIds.has(tenant.id) && <Check className="w-3 h-3" />}
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
                {tenant.identificadorFiscal && (
                  <div className="text-xs text-gray-500">{tenant.identificadorFiscal}</div>
                )}
              </div>

              {/* Toggle Active */}
              <ActiveToggle
                isActive={tenant.activo}
                onToggle={() => handleToggleActivo(tenant)}
                disabled={loading}
                isLoading={togglingId === tenant.id}
              />
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
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Detalle</span>
              </button>
              <button
                onClick={() => handleOpenEdit(tenant)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-md transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar</span>
              </button>
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        {!loading && filteredTenants.length > 0 && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <span className="text-sm text-muted-foreground">
              Mostrando {startItem}-{endItem} de {filteredTenants.length} empresas
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                        page === currentPage
                          ? 'bg-green-600 text-white'
                          : 'text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={drawerMode !== 'none'}
        onClose={handleCloseDrawer}
        title={drawerMode === 'edit' ? 'Editar Empresa' : 'Nueva Empresa'}
        icon={<Building2 className="h-5 w-5 text-green-600" />}
        width="md"
        footer={drawerFooter}
      >
        <form id="tenant-form" onSubmit={handleSubmit(onSubmitTenant)} className="p-6 space-y-4">
          {/* Nombre Empresa */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nombre de la Empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('nombreEmpresa', {
                required: 'El nombre es requerido',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Ej: Mi Empresa SA de CV"
            />
            {errors.nombreEmpresa && (
              <p className="text-sm text-red-600 mt-1">{errors.nombreEmpresa.message}</p>
            )}
          </div>

          {/* DatosEmpresa fields - Only on create */}
          {drawerMode === 'create' && (
            <>
              {/* Identificador Fiscal */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ID Fiscal
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    {...register('identificadorFiscal', {
                      maxLength: { value: 20, message: 'Máximo 20 caracteres' },
                      setValueAs: (v: string) => typeof v === 'string' ? v.toUpperCase() : v,
                    })}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                    placeholder="Ej: XAXX010101000"
                    maxLength={20}
                  />
                </div>
                {errors.identificadorFiscal && (
                  <p className="text-sm text-red-600 mt-1">{errors.identificadorFiscal.message}</p>
                )}
              </div>

              {/* Contacto */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Contacto
                </label>
                <input
                  type="text"
                  {...register('contacto')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nombre del contacto principal"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido',
                      },
                    })}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="contacto@empresa.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    {...register('telefono')}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ej: 3331234567"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Dirección
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    {...register('direccion')}
                    rows={3}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Dirección completa"
                  />
                </div>
              </div>
            </>
          )}

          {/* Plan Tipo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Plan
            </label>
            <select
              {...register('planTipo')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="free">Gratis</option>
              <option value="basic">Básico</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          {/* Max Usuarios */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Máximo de Usuarios <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                {...register('maxUsuarios', {
                  required: 'El máximo de usuarios es requerido',
                  min: { value: 1, message: 'Mínimo 1 usuario' },
                  max: { value: 1000, message: 'Máximo 1000 usuarios' },
                })}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="10"
                min={1}
                max={1000}
              />
            </div>
            {errors.maxUsuarios && (
              <p className="text-sm text-red-600 mt-1">{errors.maxUsuarios.message}</p>
            )}
          </div>

          {/* Admin Section - Only on create */}
          {drawerMode === 'create' && (
            <>
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                  Administrador del Tenant
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Opcionalmente crea el usuario administrador de esta empresa
                </p>
              </div>

              {/* Admin Nombre */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre del Administrador
                </label>
                <input
                  type="text"
                  {...register('adminNombre')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nombre completo"
                />
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email del Administrador
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    {...register('adminEmail', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido',
                      },
                    })}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="admin@empresa.com"
                  />
                </div>
                {errors.adminEmail && (
                  <p className="text-sm text-red-600 mt-1">{errors.adminEmail.message}</p>
                )}
              </div>

              {/* Admin Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Contraseña Temporal
                </label>
                <input
                  type="text"
                  {...register('adminPassword', {
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contraseña temporal"
                />
                {errors.adminPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.adminPassword.message}</p>
                )}
              </div>
            </>
          )}
        </form>
      </Drawer>

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="empresa"
        loading={batch.batchLoading}
        consequenceDeactivate="Los usuarios de las empresas desactivadas no podrán acceder al sistema."
        consequenceActivate="Los usuarios de las empresas activadas podrán acceder nuevamente."
      />
    </div>
    </PageHeader>
  );
}
