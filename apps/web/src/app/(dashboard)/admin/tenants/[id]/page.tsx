'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Building2,
  ChevronRight,
  ArrowLeft,
  X,
  Mail,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Pencil,
  Shield,
  ShieldAlert,
  UserPlus,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import {
  TenantDetail,
  TenantUser,
  TenantUpdateRequest,
  TenantCreateUserRequest,
} from '@/types/tenant';
import { tenantService } from '@/services/api/tenants';
import { toast } from '@/hooks/useToast';
import { ImpersonationModal } from '@/components/impersonation';

interface TenantFormData {
  nombreEmpresa: string;
  planTipo?: string;
  maxUsuarios: number;
}

interface AddUserFormData {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

type DrawerMode = 'none' | 'edit' | 'suspend' | 'addUser';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = Number(params.id);

  // State
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [submitting, setSubmitting] = useState(false);

  // Impersonation modal
  const [isImpersonationOpen, setIsImpersonationOpen] = useState(false);

  // Forms
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantFormData>({
    defaultValues: { maxUsuarios: 10 },
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    formState: { errors: userErrors },
  } = useForm<AddUserFormData>({
    defaultValues: { rol: 'ADMIN' },
  });

  // Load tenant detail + users
  useEffect(() => {
    if (tenantId) {
      loadTenant();
      loadTenantUsers();
    }
  }, [tenantId]);

  const loadTenant = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getById(tenantId);
      setTenant(data);
    } catch (error) {
      console.error('Error loading tenant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la empresa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTenantUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await tenantService.getTenantUsers(tenantId);
      setTenantUsers(users);
    } catch (error) {
      console.error('Error loading tenant users:', error);
      setTenantUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // --- Handlers ---

  const handleOpenEdit = () => {
    if (!tenant) return;
    reset({
      nombreEmpresa: tenant.nombreEmpresa,
      planTipo: tenant.planTipo || 'free',
      maxUsuarios: tenant.maxUsuarios,
    });
    setDrawerMode('edit');
  };

  const handleOpenAddUser = () => {
    resetUser({ nombre: '', email: '', password: '', rol: 'ADMIN' });
    setDrawerMode('addUser');
  };

  const handleCloseDrawer = () => {
    setDrawerMode('none');
  };

  const handleImpersonate = () => {
    if (!tenant) return;
    setIsImpersonationOpen(true);
  };

  // --- Submit handlers ---

  const onSubmitTenant = async (data: TenantFormData) => {
    if (!tenant) return;
    try {
      setSubmitting(true);
      const updateData: TenantUpdateRequest = {
        nombreEmpresa: data.nombreEmpresa,
        planTipo: data.planTipo || undefined,
        maxUsuarios: data.maxUsuarios,
      };
      await tenantService.update(tenant.id, updateData);
      toast({
        title: 'Empresa actualizada',
        description: 'Los cambios se guardaron correctamente',
      });
      handleCloseDrawer();
      loadTenant();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la empresa',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!tenant) return;
    try {
      setSubmitting(true);
      await tenantService.toggleActivo(tenant.id, !tenant.activo);
      toast({
        title: tenant.activo ? 'Empresa suspendida' : 'Empresa reactivada',
        description: `${tenant.nombreEmpresa} fue ${tenant.activo ? 'suspendida' : 'reactivada'} correctamente`,
      });
      handleCloseDrawer();
      loadTenant();
    } catch (error) {
      console.error('Error suspending tenant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la empresa',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitAddUser = async (data: AddUserFormData) => {
    if (!tenant) return;
    try {
      setSubmitting(true);
      const createData: TenantCreateUserRequest = {
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        rol: data.rol,
      };
      await tenantService.createTenantUser(tenant.id, createData);
      toast({
        title: 'Usuario creado',
        description: `El usuario fue creado en ${tenant.nombreEmpresa}`,
      });
      handleCloseDrawer();
      loadTenantUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo crear el usuario',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Utility ---

  const getPlanBadgeColor = (plan: string | null) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case 'free': return 'Gratis';
      case 'basic': return 'Básico';
      case 'pro': return 'Pro';
      default: return 'Sin plan';
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

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-gray-500">Cargando información...</span>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-gray-900">Empresa no encontrada</h2>
          <p className="text-sm text-gray-500 mt-1">La empresa solicitada no existe o fue eliminada</p>
          <button
            onClick={() => router.push('/admin/tenants')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Empresas
          </button>
        </div>
      </div>
    );
  }

  // --- Drawer rendering ---

  const renderEditDrawer = () => (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={handleCloseDrawer} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Editar Empresa
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
                <p className="text-sm text-red-600 mt-1">{errors.nombreEmpresa.message}</p>
              )}
            </div>

            {/* Plan Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
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
                <p className="text-sm text-red-600 mt-1">{errors.maxUsuarios.message}</p>
              )}
            </div>
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

  const renderSuspendDrawer = () => {
    const isSuspending = tenant.activo;
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-black/50" onClick={handleCloseDrawer} />
        <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${isSuspending ? 'text-red-600' : 'text-green-600'}`} />
              {isSuspending ? 'Suspender Empresa' : 'Reactivar Empresa'}
            </h2>
            <button
              onClick={handleCloseDrawer}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className={`rounded-lg p-4 ${isSuspending ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSuspending ? 'text-red-600' : 'text-green-600'}`} />
                <div>
                  <h3 className={`font-medium ${isSuspending ? 'text-red-800' : 'text-green-800'}`}>
                    {isSuspending
                      ? '¿Estás seguro de suspender esta empresa?'
                      : '¿Estás seguro de reactivar esta empresa?'}
                  </h3>
                  <p className={`text-sm mt-1 ${isSuspending ? 'text-red-700' : 'text-green-700'}`}>
                    {isSuspending
                      ? 'Los usuarios de esta empresa no podrán acceder al sistema hasta que sea reactivada.'
                      : 'Los usuarios de esta empresa podrán acceder nuevamente al sistema.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{tenant.nombreEmpresa}</p>
                  <p className="text-sm text-gray-500">Plan: {getPlanLabel(tenant.planTipo)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                {tenant.stats.usuarios} usuarios activos
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex gap-3">
            <button
              onClick={handleCloseDrawer}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSuspend}
              disabled={submitting}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isSuspending
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : isSuspending ? (
                'Suspender Empresa'
              ) : (
                'Reactivar Empresa'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAddUserDrawer = () => (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={handleCloseDrawer} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Agregar Usuario
          </h2>
          <button
            onClick={handleCloseDrawer}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmitUser(onSubmitAddUser)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Tenant Badge */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">{tenant.nombreEmpresa}</span>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  {...registerUser('email', {
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="usuario@empresa.com"
                />
              </div>
              {userErrors.email && (
                <p className="text-sm text-red-600 mt-1">{userErrors.email.message}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerUser('nombre', {
                  required: 'El nombre es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del usuario"
              />
              {userErrors.nombre && (
                <p className="text-sm text-red-600 mt-1">{userErrors.nombre.message}</p>
              )}
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                {...registerUser('rol', { required: 'El rol es requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ADMIN">Administrador</option>
                <option value="Vendedor">Vendedor</option>
              </select>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Temporal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerUser('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contraseña temporal"
              />
              {userErrors.password && (
                <p className="text-sm text-red-600 mt-1">{userErrors.password.message}</p>
              )}
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>
                El usuario recibirá estas credenciales y deberá cambiar su
                contraseña en el primer inicio de sesión.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex gap-3">
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // --- Main Page ---

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Administración</span>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => router.push('/admin/tenants')}
          className="hover:text-blue-600 transition-colors"
        >
          Gestión de Empresas
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{tenant.nombreEmpresa}</span>
      </div>

      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/tenants')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{tenant.nombreEmpresa}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    tenant.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tenant.activo ? 'Activa' : 'Inactiva'}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(tenant.planTipo)}`}>
                  {getPlanLabel(tenant.planTipo)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Impersonar</span>
          </button>
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </button>
          <button
            onClick={() => setDrawerMode('suspend')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              tenant.activo
                ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                : 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">{tenant.activo ? 'Suspender' : 'Reactivar'}</span>
          </button>
        </div>
      </div>

      {/* Company Info + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info Card */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Información de la Empresa
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {tenant.datosEmpresa?.rfc && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">RFC</div>
                  <div className="text-gray-900 font-medium">{tenant.datosEmpresa.rfc}</div>
                </div>
              </div>
            )}
            {tenant.datosEmpresa?.razonSocial && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Razón Social</div>
                  <div className="text-gray-900">{tenant.datosEmpresa.razonSocial}</div>
                </div>
              </div>
            )}
            {tenant.datosEmpresa?.contacto && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Contacto</div>
                  <div className="text-gray-900">{tenant.datosEmpresa.contacto}</div>
                </div>
              </div>
            )}
            {tenant.datosEmpresa?.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-gray-900">{tenant.datosEmpresa.email}</div>
                </div>
              </div>
            )}
            {tenant.datosEmpresa?.telefono && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Teléfono</div>
                  <div className="text-gray-900">{tenant.datosEmpresa.telefono}</div>
                </div>
              </div>
            )}
            {tenant.datosEmpresa?.direccion && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Dirección</div>
                  <div className="text-gray-900">
                    {tenant.datosEmpresa.direccion}
                    {tenant.datosEmpresa.ciudad && `, ${tenant.datosEmpresa.ciudad}`}
                    {tenant.datosEmpresa.estado && `, ${tenant.datosEmpresa.estado}`}
                    {tenant.datosEmpresa.codigoPostal && ` C.P. ${tenant.datosEmpresa.codigoPostal}`}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Máx. Usuarios</div>
                <div className="text-gray-900">{tenant.maxUsuarios}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Fecha de Creación</div>
                <div className="text-gray-900">{formatDate(tenant.creadoEn)}</div>
              </div>
            </div>
            {tenant.fechaExpiracion && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Expira</div>
                  <div className="text-gray-900">{formatDate(tenant.fechaExpiracion)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Estadísticas
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{tenant.stats.usuarios}</div>
                <div className="text-xs text-gray-500">Usuarios</div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{tenant.stats.clientes}</div>
                <div className="text-xs text-gray-500">Clientes</div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{tenant.stats.productos}</div>
                <div className="text-xs text-gray-500">Productos</div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{tenant.stats.pedidos}</div>
                <div className="text-xs text-gray-500">Pedidos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Usuarios del Tenant
          </h3>
          <button
            onClick={handleOpenAddUser}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Agregar Usuario
          </button>
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : tenantUsers.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p>No hay usuarios registrados</p>
            <button
              onClick={handleOpenAddUser}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Agregar el primer usuario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenantUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{user.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers */}
      {drawerMode === 'edit' && renderEditDrawer()}
      {drawerMode === 'suspend' && renderSuspendDrawer()}
      {drawerMode === 'addUser' && renderAddUserDrawer()}

      {/* Impersonation Modal */}
      <ImpersonationModal
        isOpen={isImpersonationOpen}
        onClose={() => setIsImpersonationOpen(false)}
        tenant={{
          id: tenant.id,
          nombre: tenant.nombreEmpresa,
        }}
      />
    </div>
  );
}
