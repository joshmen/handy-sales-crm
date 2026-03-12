'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Building2,
  ArrowLeft,
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
  RefreshCw,
  Copy,
  Check,
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
import { useFormatters } from '@/hooks/useFormatters';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const { formatDate: _fmtDate } = useFormatters();
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
  const [copiedPassword, setCopiedPassword] = useState(false);

  // H4: Plan → maxUsuarios mapping
  const PLAN_LIMITS: Record<string, number> = {
    free: 5,
    basic: 25,
    pro: 100,
  };

  // H3: Generar contraseña aleatoria
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  // Forms
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TenantFormData>({
    defaultValues: { maxUsuarios: 10 },
  });

  const watchPlan = watch('planTipo');

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    setValue: setUserValue,
    watch: watchUser,
    formState: { errors: userErrors },
  } = useForm<AddUserFormData>({
    defaultValues: { rol: 'ADMIN' },
  });

  const watchPassword = watchUser('password');

  // Load tenant detail + users
  useEffect(() => {
    if (tenantId) {
      loadTenant();
      loadTenantUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el usuario',
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
    return _fmtDate(date, {
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
          <img src="/logo-icon.svg" alt="Handy Suites" className="w-8 h-8" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando información...</span>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-foreground">Empresa no encontrada</h2>
          <p className="text-sm text-muted-foreground mt-1">La empresa solicitada no existe o fue eliminada</p>
          <button
            onClick={() => router.push('/admin/tenants')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Empresas
          </button>
        </div>
      </div>
    );
  }

  // --- Drawer rendering ---

  const editDrawerFooter = (
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
        form="edit-tenant-form"
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

  const suspendDrawerFooter = (() => {
    const isSuspending = tenant.activo;
    return (
      <div className="flex gap-3">
        <button
          onClick={handleCloseDrawer}
          className="flex-1 px-4 py-2 text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
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
    );
  })();

  const addUserDrawerFooter = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleCloseDrawer}
        className="flex-1 px-4 py-2 text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        disabled={submitting}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="add-user-form"
        disabled={submitting || tenant.stats.usuarios >= tenant.maxUsuarios}
        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  );

  // --- Main Page ---

  const headerActions = (
    <>
      <button
        onClick={handleImpersonate}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
      >
        <Shield className="h-4 w-4" />
        <span className="hidden sm:inline">Impersonar</span>
      </button>
      <button
        onClick={handleOpenEdit}
        className="flex items-center gap-2 px-4 py-2 text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors text-sm"
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
    </>
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Administración' },
        { label: 'Gestión de Empresas', href: '/admin/tenants' },
        { label: tenant.nombreEmpresa },
      ]}
      title={tenant.nombreEmpresa}
      subtitle={`${getPlanLabel(tenant.planTipo)} · ${tenant.activo ? 'Activa' : 'Suspendida'} · ${tenant.maxUsuarios} usuarios máx.`}
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Company Info + Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info Card */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Información de la Empresa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {tenant.datosEmpresa?.identificadorFiscal && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">ID Fiscal</div>
                    <div className="text-foreground font-medium">{tenant.datosEmpresa.identificadorFiscal}</div>
                  </div>
                </div>
              )}
              {tenant.datosEmpresa?.razonSocial && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Razón Social</div>
                    <div className="text-foreground">{tenant.datosEmpresa.razonSocial}</div>
                  </div>
                </div>
              )}
              {tenant.datosEmpresa?.contacto && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Contacto</div>
                    <div className="text-foreground">{tenant.datosEmpresa.contacto}</div>
                  </div>
                </div>
              )}
              {tenant.datosEmpresa?.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-foreground">{tenant.datosEmpresa.email}</div>
                  </div>
                </div>
              )}
              {tenant.datosEmpresa?.telefono && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Teléfono</div>
                    <div className="text-foreground">{tenant.datosEmpresa.telefono}</div>
                  </div>
                </div>
              )}
              {tenant.datosEmpresa?.direccion && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Dirección</div>
                    <div className="text-foreground">
                      {tenant.datosEmpresa.direccion}
                      {tenant.datosEmpresa.ciudad && `, ${tenant.datosEmpresa.ciudad}`}
                      {tenant.datosEmpresa.estado && `, ${tenant.datosEmpresa.estado}`}
                      {tenant.datosEmpresa.codigoPostal && ` C.P. ${tenant.datosEmpresa.codigoPostal}`}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">Máx. Usuarios</div>
                  <div className="text-foreground">{tenant.maxUsuarios}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">Fecha de Creación</div>
                  <div className="text-foreground">{formatDate(tenant.creadoEn)}</div>
                </div>
              </div>
              {tenant.fechaExpiracion && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Expira</div>
                    <div className="text-foreground">{formatDate(tenant.fechaExpiracion)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Estadísticas
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{tenant.stats.usuarios}</div>
                  <div className="text-xs text-muted-foreground">Usuarios</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{tenant.stats.clientes}</div>
                  <div className="text-xs text-muted-foreground">Clientes</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{tenant.stats.productos}</div>
                  <div className="text-xs text-muted-foreground">Productos</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{tenant.stats.pedidos}</div>
                  <div className="text-xs text-muted-foreground">Pedidos</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Usuarios del Tenant
            </h3>
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Agregar Usuario
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tenantUsers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p>No hay usuarios registrados</p>
              <button
                onClick={handleOpenAddUser}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Agregar el primer usuario
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tenantUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{user.nombre}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-foreground">
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
      </div>

      {/* Edit Drawer */}
      <Drawer
        isOpen={drawerMode === 'edit'}
        onClose={handleCloseDrawer}
        title="Editar Empresa"
        icon={<Building2 className="h-5 w-5 text-green-600" />}
        width="md"
        footer={editDrawerFooter}
      >
        <form id="edit-tenant-form" onSubmit={handleSubmit(onSubmitTenant)} className="p-6 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Plan</label>
            <select
              {...register('planTipo')}
              onChange={(e) => {
                const plan = e.target.value;
                setValue('planTipo', plan);
                const limit = PLAN_LIMITS[plan];
                if (limit) setValue('maxUsuarios', limit);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="free">Gratis (hasta 5 usuarios)</option>
              <option value="basic">Básico (hasta 25 usuarios)</option>
              <option value="pro">Pro (hasta 100 usuarios)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Máximo de Usuarios
            </label>
            <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {PLAN_LIMITS[watchPlan || ''] || watch('maxUsuarios')} usuarios
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                Definido por el plan
              </span>
            </div>
            <input type="hidden" {...register('maxUsuarios')} />
          </div>
        </form>
      </Drawer>

      {/* Suspend Drawer */}
      <Drawer
        isOpen={drawerMode === 'suspend'}
        onClose={handleCloseDrawer}
        title={tenant.activo ? 'Suspender Empresa' : 'Reactivar Empresa'}
        icon={<ShieldAlert className={`h-5 w-5 ${tenant.activo ? 'text-red-600' : 'text-green-600'}`} />}
        width="md"
        footer={suspendDrawerFooter}
      >
        <div className="p-6 space-y-6">
          <div className={`rounded-lg p-4 ${tenant.activo ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${tenant.activo ? 'text-red-600' : 'text-green-600'}`} />
              <div>
                <h3 className={`font-medium ${tenant.activo ? 'text-red-800' : 'text-green-800'}`}>
                  {tenant.activo
                    ? '¿Estás seguro de suspender esta empresa?'
                    : '¿Estás seguro de reactivar esta empresa?'}
                </h3>
                <p className={`text-sm mt-1 ${tenant.activo ? 'text-red-700' : 'text-green-700'}`}>
                  {tenant.activo
                    ? 'Los usuarios de esta empresa no podrán acceder al sistema hasta que sea reactivada.'
                    : 'Los usuarios de esta empresa podrán acceder nuevamente al sistema.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-accent rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{tenant.nombreEmpresa}</p>
                <p className="text-sm text-muted-foreground">Plan: {getPlanLabel(tenant.planTipo)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {tenant.stats.usuarios} usuarios activos
            </div>
          </div>
        </div>
      </Drawer>

      {/* Add User Drawer */}
      <Drawer
        isOpen={drawerMode === 'addUser'}
        onClose={handleCloseDrawer}
        title="Agregar Usuario"
        icon={<UserPlus className="h-5 w-5 text-green-600" />}
        width="md"
        footer={addUserDrawerFooter}
      >
        <form id="add-user-form" onSubmit={handleSubmitUser(onSubmitAddUser)} className="p-6 space-y-4">
          {/* Tenant Badge */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">{tenant.nombreEmpresa}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              tenant.stats.usuarios >= tenant.maxUsuarios
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {tenant.stats.usuarios} / {tenant.maxUsuarios} usuarios
            </span>
          </div>

          {tenant.stats.usuarios >= tenant.maxUsuarios && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p>Se alcanzó el límite de usuarios. Actualiza el plan de esta empresa para agregar más.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                {...registerUser('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                })}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="usuario@empresa.com"
              />
            </div>
            {userErrors.email && (
              <p className="text-sm text-red-600 mt-1">{userErrors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...registerUser('nombre', {
                required: 'El nombre es requerido',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Nombre del usuario"
            />
            {userErrors.nombre && (
              <p className="text-sm text-red-600 mt-1">{userErrors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              {...registerUser('rol', { required: 'El rol es requerido' })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="ADMIN">Administrador</option>
              <option value="Vendedor">Vendedor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contraseña Temporal <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                {...registerUser('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                placeholder="Contraseña temporal"
              />
              <button
                type="button"
                onClick={() => {
                  const pass = generatePassword();
                  setUserValue('password', pass);
                  setCopiedPassword(false);
                }}
                className="px-3 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                title="Generar contraseña"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {watchPassword && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(watchPassword);
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 2000);
                  }}
                  className={`px-3 py-2 border rounded-lg transition-colors ${
                    copiedPassword
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-muted-foreground bg-accent border-border hover:bg-accent/80'
                  }`}
                  title={copiedPassword ? 'Copiado' : 'Copiar'}
                >
                  {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
            {userErrors.password && (
              <p className="text-sm text-red-600 mt-1">{userErrors.password.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p>
              El usuario recibirá estas credenciales y deberá cambiar su
              contraseña en el primer inicio de sesión.
            </p>
          </div>
        </form>
      </Drawer>

      {/* Impersonation Modal */}
      <ImpersonationModal
        isOpen={isImpersonationOpen}
        onClose={() => setIsImpersonationOpen(false)}
        tenant={{
          id: tenant.id,
          nombre: tenant.nombreEmpresa,
        }}
      />
    </PageHeader>
  );
}
