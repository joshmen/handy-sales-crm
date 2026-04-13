'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { supervisorService } from '@/services/api';
import type { SupervisorVendedor, SupervisorDashboard } from '@/services/api/supervisor';
import { deviceSessionService } from '@/services/api';
import type { DeviceSessionDto } from '@/services/api/deviceSessions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { DataGrid, type DataGridColumn, type DataGridSort } from '@/components/ui/DataGrid';
import {
  Users,
  ShoppingBag,
  Building2,
  TrendingUp,
  UserPlus,
  UserMinus,
  Loader2,
  RefreshCw,
  Plus,
  MapPin,
  Ruler,
  Download,
  Edit,
  Check,
  X,
  Smartphone,
  Monitor,
  HelpCircle,
  Shield,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getInitials, formatTimeAgo } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { usePaginatedUsers, useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { roleService, Role } from '@/services/api/roleService';
import { usersService, type UsuarioUbicacion } from '@/services/api/users';
import { zoneService } from '@/services/api/zones';
import { UserRole, UserStatus, type User } from '@/types/users';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { GoogleMapWrapper, type MapMarker } from '@/components/maps/GoogleMapWrapper';
import Papa from 'papaparse';

// ============ KPI Helpers (Supervisor view) ============

const KPI_BG: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/30',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30',
  blue: 'bg-blue-50 dark:bg-blue-900/30',
  amber: 'bg-amber-50 dark:bg-amber-900/30',
  rose: 'bg-rose-50 dark:bg-rose-900/30',
};

function KPICard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${KPI_BG[color] ?? 'bg-muted'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface PresenceLabels { online: string; agoMinutes: (min: number) => string; disconnected: string }
function PresenceBadge({ isOnline, lastActivity, labels }: { isOnline?: boolean; lastActivity?: string; labels: PresenceLabels }) {
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        {labels.online}
      </span>
    );
  }

  if (lastActivity) {
    const minutesAgo = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60000);
    if (minutesAgo < 60) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          {labels.agoMinutes(minutesAgo)}
        </span>
      );
    }
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-surface-3 dark:bg-gray-600 inline-block" />
      {labels.disconnected}
    </span>
  );
}

// ============ Device Session Helpers ============

function getDeviceIcon(deviceType: number) {
  switch (deviceType) {
    case 2: // Android
    case 3: // iOS
      return Smartphone;
    case 1: // Web
    case 4: // Desktop
      return Monitor;
    default:
      return HelpCircle;
  }
}

function getSessionStatusConfig(status: number) {
  switch (status) {
    case 0: return { labelKey: 'activeStatus', className: 'text-green-700 bg-green-100' };
    case 1: return { labelKey: 'loggedOut', className: 'text-foreground/70 bg-surface-3' };
    case 2: return { labelKey: 'expired', className: 'text-foreground/70 bg-surface-3' };
    case 3: return { labelKey: 'revokedAdmin', className: 'text-red-700 bg-red-100' };
    case 4: return { labelKey: 'revokedUser', className: 'text-orange-700 bg-orange-100' };
    case 5: return { labelKey: 'unbinding', className: 'text-yellow-700 bg-yellow-100 animate-pulse' };
    case 6: return { labelKey: 'unbound', className: 'text-purple-700 bg-purple-100' };
    default: return { labelKey: 'unknown', className: 'text-foreground/70 bg-surface-3' };
  }
}

// ============ Supervisor View ============

function SupervisorView() {
  const t = useTranslations('team.members.supervisor');
  const td = useTranslations('team.devices');
  const tc = useTranslations('common');
  const presenceLabels: PresenceLabels = { online: t('onlineStatus'), agoMinutes: (min: number) => t('minutesAgo', { min }), disconnected: t('disconnected') };
  const { formatCurrency } = useFormatters();
  const { data: session } = useSession();
  const [vendedores, setVendedores] = useState<SupervisorVendedor[]>([]);
  const [dashboard, setDashboard] = useState<SupervisorDashboard | null>(null);
  const [disponibles, setDisponibles] = useState<SupervisorVendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsignar, setShowAsignar] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);
  const [confirmDesasignar, setConfirmDesasignar] = useState<{ id: number; nombre: string } | null>(null);

  const role = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Filter out the current user -- admin should not see themselves in "Mi Equipo"
  const filteredVendedores = vendedores.filter(v => String(v.id) !== userId);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isSupervisor = role === 'SUPERVISOR';
      if (isSupervisor) {
        const [v, d] = await Promise.all([
          supervisorService.getMisVendedores(),
          supervisorService.getDashboard(),
        ]);
        setVendedores(v);
        setDashboard(d);
      } else if (isAdmin) {
        const v = await supervisorService.getVendedoresDisponibles();
        setVendedores(v);
      }
    } catch {
      toast({ title: t('errorLoading'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [role, isAdmin, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAsignar = async () => {
    try {
      const d = await supervisorService.getVendedoresDisponibles();
      setDisponibles(d);
      setShowAsignar(true);
      setSelectedIds(new Set());
    } catch {
      toast({ title: t('errorLoadingAvailable'), variant: 'destructive' });
    }
  };

  const handleAsignar = async () => {
    if (selectedIds.size === 0 || !userId) return;
    setAssignLoading(true);
    try {
      await supervisorService.asignarVendedores(Number(userId), Array.from(selectedIds));
      toast({ title: t('sellersAssigned', { count: selectedIds.size }) });
      setShowAsignar(false);
      loadData();
    } catch {
      toast({ title: t('errorAssigning'), variant: 'destructive' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDesasignar = async () => {
    if (!userId || !confirmDesasignar) return;
    try {
      await supervisorService.desasignarVendedor(Number(userId), confirmDesasignar.id);
      toast({ title: t('sellerUnassigned', { name: confirmDesasignar.nombre }) });
      setConfirmDesasignar(null);
      loadData();
    } catch {
      toast({ title: t('errorUnassigning'), variant: 'destructive' });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
        <span className="sr-only">{tc('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions row */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={loadData}
          className="gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </Button>
        {isAdmin && (
          <Button
            onClick={handleOpenAsignar}
            className="gap-1.5 bg-success hover:bg-success/90 text-white"
          >
            <UserPlus className="h-4 w-4" />
            {t("assignSellers")}
          </Button>
        )}
      </div>

      {/* KPI Cards (Supervisor only) */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            label={t('sellers')}
            value={dashboard.totalVendedores}
            color="indigo"
          />
          <KPICard
            icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
            label={t('ordersToday')}
            value={dashboard.pedidosHoy}
            color="emerald"
          />
          <KPICard
            icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
            label={t('ordersMonth')}
            value={dashboard.pedidosMes}
            color="blue"
          />
          <KPICard
            icon={<Building2 className="h-5 w-5 text-amber-600" />}
            label={t('clients')}
            value={dashboard.totalClientes}
            color="amber"
          />
          <KPICard
            icon={<TrendingUp className="h-5 w-5 text-rose-600" />}
            label={t('salesMonth')}
            value={formatCurrency(dashboard.ventasMes)}
            color="rose"
          />
        </div>
      )}

      {/* Vendedores List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isAdmin ? t('teamTitle', { count: filteredVendedores.length }) : t('sellersTeamTitle', { count: filteredVendedores.length })}
          </h2>
        </div>

        {filteredVendedores.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t("noAssignedSellers")}</p>
            {isAdmin && (
              <button
                onClick={handleOpenAsignar}
                className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {t('assignSellersLink')}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredVendedores.map(v => (
              <div key={v.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nombre} />}
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                      {getInitials(v.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                    <p className="text-xs text-muted-foreground">{v.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    v.activo
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {v.activo ? t('active') : t('inactive')}
                  </span>
                  <PresenceBadge isOnline={v.isOnline} lastActivity={v.lastActivity} labels={presenceLabels} />
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {v.rol}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDesasignar({ id: v.id, nombre: v.nombre })}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      aria-label={t('unassignSeller')}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Desasignar Modal */}
      {confirmDesasignar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmDesasignar(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-desasignar-title"
            className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <UserMinus className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 id="confirm-desasignar-title" className="text-lg font-semibold text-foreground mb-2">
              {t('unassignTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('unassignDesc', { name: confirmDesasignar.nombre })}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDesasignar(null)}>
                {t('cancel')}
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDesasignar}>
                {t('unassign')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Asignar Modal */}
      {showAsignar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAsignar(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="asignar-title"
            className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border">
              <h3 id="asignar-title" className="text-lg font-semibold text-foreground">{t("assignTitle")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('assignDesc')}
              </p>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {disponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('noAvailableSellers')}
                </p>
              ) : (
                <div className="space-y-2">
                  {disponibles.map(v => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        selectedIds.has(v.id) ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="h-4 w-4 text-green-600 rounded border-border"
                      />
                      <Avatar className="h-8 w-8">
                        {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nombre} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {getInitials(v.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.nombre}</p>
                        <p className="text-xs text-muted-foreground">{v.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAsignar(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleAsignar}
                disabled={selectedIds.size === 0 || assignLoading}
                className="bg-success hover:bg-success/90 text-white gap-1.5"
              >
                {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('assign', { count: selectedIds.size })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Admin/CRUD View ============

function AdminUsersView() {
  const t = useTranslations('team.members');
  const td = useTranslations('team.devices');
  const tc = useTranslations('common');
  const presenceLabels: PresenceLabels = { online: t('online'), agoMinutes: (min: number) => t('supervisor.minutesAgo', { min }), disconnected: t('supervisor.disconnected') };
  const { formatDate } = useFormatters();
  const {
    users: apiUsers,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    loadUsers,
    goToPage,
  } = usePaginatedUsers();

  const { data: session } = useSession();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const [roles, setRoles] = useState<Role[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [filterZona, setFilterZona] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // B4: Location modal
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<UsuarioUbicacion[]>([]);
  const [ubicacionesLoading, setUbicacionesLoading] = useState(false);

  // B5: Distance modal
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

  // Sort state for DataGrid
  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Device sessions drawer
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [drawerSessions, setDrawerSessions] = useState<DeviceSessionDto[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    password: '',
    telefono: '',
    role: 'VENDEDOR',
  });

  // Load roles and zones
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await roleService.getActiveRoles();
        setRoles(rolesData);
      } catch (error) {
        console.error('Error loading roles:', error);
      }
    };
    const loadZones = async () => {
      try {
        const { zones: zonesData } = await zoneService.getZones({ limit: 100 });
        setZones(zonesData.map(z => ({ id: z.id, name: z.name })));
      } catch (error) {
        console.error('Error loading zones:', error);
      }
    };
    loadRoles();
    loadZones();
  }, []);

  // Convert API users to display format
  const displayUsers: User[] = Array.isArray(apiUsers)
    ? apiUsers.map(apiUser => ({
        id: apiUser.id.toString(),
        companyId: apiUser.tenantId?.toString() || '1',
        email: apiUser.email,
        name: apiUser.nombre || apiUser.email.split('@')[0],
        role: apiUser.esSuperAdmin ? UserRole.SUPER_ADMIN : apiUser.esAdmin ? UserRole.ADMIN : UserRole.VENDEDOR,
        status: apiUser.activo ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        phone: apiUser.telefono,
        isVerified: apiUser.verificado || false,
        createdAt: new Date(apiUser.creadoEn || Date.now()),
        updatedAt: new Date(apiUser.actualizadoEn || Date.now()),
        lastLogin: apiUser.lastActivity ? new Date(apiUser.lastActivity) : apiUser.ultimoAcceso ? new Date(apiUser.ultimoAcceso) : undefined,
      }))
    : [];

  // Local sorting
  const sortedUsers = useMemo(() => {
    let filtered = filterStatus === 'all'
      ? displayUsers
      : displayUsers.filter(u => u.status === filterStatus);
    if (filterSession !== 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiMap = new Map(apiUsers.map((u: any) => [String(u.id), u]));
      filtered = filtered.filter(u => {
        const api = apiMap.get(u.id);
        if (!api) return false;
        if (filterSession === 'online') return api.isOnline;
        if (filterSession === 'with_session') return (api.activeSessionCount || 0) > 0;
        if (filterSession === 'no_session') return (api.activeSessionCount || 0) === 0;
        return true;
      });
    }
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nombre':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'role':
          cmp = a.role.localeCompare(b.role);
          break;
        case 'lastLogin': {
          const aTime = a.lastLogin?.getTime() ?? 0;
          const bTime = b.lastLogin?.getTime() ?? 0;
          cmp = aTime - bTime;
          break;
        }
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [displayUsers, apiUsers, sortKey, sortDir, filterStatus, filterSession]);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-purple-100 text-purple-600';
      case UserRole.ADMIN:
        return 'bg-blue-100 text-blue-600';
      case UserRole.SUPERVISOR:
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-surface-3 text-foreground/70';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return t('roleSuperAdmin');
      case UserRole.ADMIN:
        return t('roleAdmin');
      case UserRole.SUPERVISOR:
        return t('roleSupervisor');
      case UserRole.VENDEDOR:
        return t('roleVendedor');
      default:
        return t('roleViewer');
    }
  };

  // Get session count for a user from apiUsers
  const getSessionCount = (userId: string): number => {
    if (!Array.isArray(apiUsers)) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiUser = apiUsers.find((u: any) => String(u.id) === userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (apiUser as any)?.activeSessionCount ?? 0;
  };

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync({
        email: formData.email,
        nombre: formData.nombre,
        password: formData.password,
        telefono: formData.telefono,
        rol: formData.role,
      });
      toast.success(t('userCreated'));
      setIsCreateModalOpen(false);
      setFormData({ email: '', nombre: '', password: '', telefono: '', role: 'VENDEDOR' });
      loadUsers();
    } catch (_error) {
      toast.error(t('errorCreating'));
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: parseInt(selectedUser.id),
        nombre: selectedUser.name,
        esAdmin: selectedUser.role === UserRole.ADMIN,
        activo: selectedUser.status === UserStatus.ACTIVE,
        telefono: selectedUser.phone,
      });
      toast.success(t('userUpdated'));
      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (_error) {
      toast.error(t('errorUpdating'));
    }
  };

  const handleRefresh = () => {
    loadUsers();
    toast.success(t('listUpdated'));
  };

  const visibleIds = displayUsers.map(u => parseInt(u.id));

  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, filterZona, filterRole],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      const result = await usersService.batchToggleActive(ids, activo);

      if (result.success) {
        toast.success(t('batchSuccess', { count: ids.length, action: activo ? tc('activate') : tc('deactivate') }));
        loadUsers();
        batch.completeBatch();
      } else {
        toast.error(result.error || t('batchError'));
        batch.setBatchLoading(false);
      }
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error(t('batchError'));
      batch.setBatchLoading(false);
    }
  };

  // Close modals on ESC key
  useEffect(() => {
    const anyOpen = isCreateModalOpen || isEditModalOpen || batch.isBatchConfirmOpen || isLocationModalOpen || isDistanceModalOpen;
    if (!anyOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        batch.closeBatchConfirm();
        setIsLocationModalOpen(false);
        setIsDistanceModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, isEditModalOpen, batch.isBatchConfirmOpen, isLocationModalOpen, isDistanceModalOpen, batch.closeBatchConfirm]);

  // B4: Load user locations and open map modal
  const handleOpenUbicaciones = async () => {
    setIsLocationModalOpen(true);
    setUbicacionesLoading(true);
    try {
      const result = await usersService.getUbicaciones();
      if (result.success && result.data) {
        setUbicaciones(result.data);
      } else {
        toast.error(t('errorLoadingLocations'));
      }
    } catch {
      toast.error(t('errorLoadingLocations'));
    } finally {
      setUbicacionesLoading(false);
    }
  };

  const locationMarkers: MapMarker[] = ubicaciones.map(u => ({
    id: u.usuarioId,
    lat: u.latitud,
    lng: u.longitud,
    title: u.nombre,
    color: 'blue',
    info: (
      <div>
        <p className="font-semibold">{u.nombre}</p>
        {u.clienteNombre && <p className="text-foreground/70">{u.clienteNombre}</p>}
        {u.fechaUbicacion && (
          <p className="text-muted-foreground text-xs mt-1">
            {formatDate(u.fechaUbicacion)}
          </p>
        )}
      </div>
    ),
  }));

  // B5: Haversine distance calculation
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleOpenDistancia = async () => {
    setIsDistanceModalOpen(true);
    if (ubicaciones.length === 0) {
      setUbicacionesLoading(true);
      try {
        const result = await usersService.getUbicaciones();
        if (result.success && result.data) setUbicaciones(result.data);
      } catch { /* handled */ }
      finally { setUbicacionesLoading(false); }
    }
  };

  // Base point: average of all user locations (or fallback to Guadalajara)
  const basePoint = ubicaciones.length > 0
    ? {
        lat: ubicaciones.reduce((s, u) => s + u.latitud, 0) / ubicaciones.length,
        lng: ubicaciones.reduce((s, u) => s + u.longitud, 0) / ubicaciones.length,
      }
    : { lat: 20.6597, lng: -103.3496 };

  const distanceRows = ubicaciones
    .map(u => ({
      ...u,
      distanciaKm: haversineKm(basePoint.lat, basePoint.lng, u.latitud, u.longitud),
      tiempoAtras: u.fechaUbicacion
        ? Math.round((Date.now() - new Date(u.fechaUbicacion).getTime()) / 60000)
        : null,
    }))
    .sort((a, b) => b.distanciaKm - a.distanciaKm);

  // B6: CSV export
  const handleDescargar = () => {
    const csvData = displayUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      Rol: getRoleLabel(u.role),
      Status: u.status === UserStatus.ACTIVE ? 'Active' : 'Inactive',
      Phone: u.phone || '',
      'Last activity': u.lastLogin ? formatDate(u.lastLogin) : 'N/A',
      'Created': u.createdAt ? formatDate(u.createdAt) : '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t('csvDownloaded'));
  };

  // Device sessions drawer
  const handleOpenSessionsDrawer = async (user: User) => {
    setDrawerUser(user);
    setDrawerLoading(true);
    try {
      const sessions = await deviceSessionService.getSessionsByUser(parseInt(user.id));
      setDrawerSessions(sessions);
    } catch {
      toast.error(t('errorLoadingSessions'));
      setDrawerSessions([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRevokeSession = async (sessionItem: DeviceSessionDto) => {
    if (sessionItem.esSesionActual) {
      toast.warning(t('cannotRevokeOwn'));
      return;
    }
    try {
      setRevokingId(sessionItem.id);
      await deviceSessionService.revokeSession(sessionItem.id, t('revokeReasonAdmin'));
      toast.success(t('sessionRevoked', { name: sessionItem.usuarioNombre }));
      // Refresh drawer sessions
      if (drawerUser) {
        const sessions = await deviceSessionService.getSessionsByUser(parseInt(drawerUser.id));
        setDrawerSessions(sessions);
      }
      loadUsers();
    } catch {
      toast.error(t('errorRevoking'));
    } finally {
      setRevokingId(null);
    }
  };

  const handleCleanExpired = async () => {
    try {
      setCleaningExpired(true);
      const count = await deviceSessionService.cleanExpiredSessions(30);
      toast.success(t('expiredCleaned', { count }));
      // Refresh drawer if open
      if (drawerUser) {
        const sessions = await deviceSessionService.getSessionsByUser(parseInt(drawerUser.id));
        setDrawerSessions(sessions);
      }
    } catch {
      toast.error(t('errorCleaningExpired'));
    } finally {
      setCleaningExpired(false);
    }
  };

  // Sort handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const gridSort: DataGridSort = {
    key: sortKey,
    direction: sortDir,
    onSort: handleSort,
  };

  // DataGrid column renderers
  const renderRolBadge = (user: User) => (
    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-lg ${getRoleBadgeColor(user.role)}`}>
      {getRoleLabel(user.role)}
    </span>
  );

  const renderStatusBadge = (user: User) => (
    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-lg ${
      user.status === UserStatus.ACTIVE
        ? 'bg-green-100 text-green-600'
        : 'bg-surface-3 text-muted-foreground'
    }`}>
      {user.status === UserStatus.ACTIVE ? t('statusActive') : t('statusInactive')}
    </span>
  );

  const renderLastActivity = (user: User) => (
    <span className="text-xs text-muted-foreground">
      {user.lastLogin ? formatDate(user.lastLogin) : t('noActivity')}
    </span>
  );

  const renderSesionCount = (user: User) => {
    const count = getSessionCount(user.id);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenSessionsDrawer(user);
        }}
        className={`px-2 py-0.5 text-[11px] font-medium rounded-lg transition-colors ${
          count > 0
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
            : 'bg-surface-3 text-muted-foreground'
        }`}
      >
        {count > 0 ? t('activeSessionsCount', { active: count, total: count }) : '0'}
      </button>
    );
  };

  const renderActions = (user: User) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSelectedUser(user);
        setIsEditModalOpen(true);
      }}
      className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <Edit className="w-4 h-4 text-muted-foreground" />
    </button>
  );

  const columns: DataGridColumn<User>[] = [
    {
      key: 'nombre',
      label: t('columnName'),
      width: 'flex',
      sortable: true,
      cellRenderer: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-sm font-semibold text-foreground/70">
            {user.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">{user.name}</p>
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', label: t('columnRole'), width: 120, sortable: true, cellRenderer: renderRolBadge },
    { key: 'status', label: t('columnStatus'), width: 100, cellRenderer: renderStatusBadge },
    { key: 'lastLogin', label: t('columnLastActivity'), width: 150, sortable: true, hiddenOnMobile: true, cellRenderer: renderLastActivity },
    { key: 'sesiones', label: t('columnSessions'), width: 90, align: 'center', hiddenOnMobile: true, cellRenderer: renderSesionCount },
    { key: 'actions', label: '', width: 80, align: 'right', cellRenderer: renderActions },
  ];

  // Mobile card renderer
  const mobileCardRenderer = (user: User) => {
    const sessionCount = getSessionCount(user.id);
    return (
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            batch.handleToggleSelect(parseInt(user.id));
          }}
          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            batch.selectedIds.has(parseInt(user.id))
              ? 'bg-green-600 border-green-600 text-white'
              : 'border-border-default hover:border-green-500'
          }`}
        >
          {batch.selectedIds.has(parseInt(user.id)) && <Check className="w-3 h-3" />}
        </button>

        <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-foreground/70 font-medium text-sm flex-shrink-0">
          {getInitials(user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{user.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-lg ${getRoleBadgeColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-lg ${
              user.status === UserStatus.ACTIVE
                ? 'bg-green-100 text-green-600'
                : 'bg-surface-3 text-muted-foreground'
            }`}>
              {user.status === UserStatus.ACTIVE ? t('statusActive') : t('statusInactive')}
            </span>
            {sessionCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenSessionsDrawer(user);
                }}
                className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                {t('activeSessionsCount', { active: sessionCount, total: sessionCount })}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(user);
            setIsEditModalOpen(true);
          }}
          className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:bg-muted/50 transition-colors flex-shrink-0"
        >
          <Edit className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">{t('totalUsers')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">{t('activeUsers')}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{displayUsers.filter(u => u.status === UserStatus.ACTIVE).length}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">{t('onlineUsers')}</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <p className="text-2xl font-bold text-blue-600 mt-1">{apiUsers.filter((u: any) => u.isOnline).length}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">{t('activeSessions')}</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <p className="text-2xl font-bold text-amber-600 mt-1">{apiUsers.reduce((sum: number, u: any) => sum + (u.activeSessionCount || 0), 0)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-tour="users-create-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newUser')}</span>
          </button>
          <button
            onClick={handleOpenUbicaciones}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>{t('location')}</span>
          </button>
          <button
            onClick={handleOpenDistancia}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Ruler className="w-4 h-4" />
            <span>{t('distance')}</span>
          </button>
          <button
            onClick={handleDescargar}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('download')}</span>
          </button>
          <button
            onClick={handleCleanExpired}
            disabled={cleaningExpired}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1 transition-colors disabled:opacity-50"
          >
            {cleaningExpired ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{t('cleanExpired')}</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3">
          {/* Zona Filter */}
          <div className="min-w-[150px]">
            <SearchableSelect
              options={[
                { value: 'all', label: t('allZones') },
                ...zones.map(z => ({ value: z.id, label: z.name })),
              ]}
              value={filterZona}
              onChange={(val) => setFilterZona(val ? String(val) : 'all')}
              placeholder={t('allZones')}
            />
          </div>

          {/* Roles Filter */}
          <div className="flex-1 min-w-[200px]" data-tour="users-role-filter">
            <SearchableSelect
              options={[
                { value: 'all', label: t('allRoles') },
                ...roles.map(r => ({ value: r.nombre, label: r.nombre })),
              ]}
              value={filterRole}
              onChange={(val) => setFilterRole(val ? String(val) : 'all')}
              placeholder={t('allRoles')}
            />
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[160px]">
            <SearchableSelect
              options={[
                { value: 'all', label: t('allStatuses') },
                { value: UserStatus.ACTIVE, label: t('statusActive') },
                { value: UserStatus.INACTIVE, label: t('statusInactive') },
              ]}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val ? String(val) : 'all')}
              placeholder={t('allStatuses')}
            />
          </div>

          {/* Session Filter */}
          <div className="flex-1 min-w-[170px]">
            <SearchableSelect
              options={[
                { value: 'all', label: t('allSessions') },
                { value: 'online', label: t('online') },
                { value: 'with_session', label: t('withSession') },
                { value: 'no_session', label: t('noSession') },
              ]}
              value={filterSession}
              onChange={(val) => setFilterSession(val ? String(val) : 'all')}
              placeholder={t('allSessions')}
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 h-10 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('refresh')}</span>
          </button>
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalCount}
          entityLabel="users"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
          className="mb-4"
        />

        {/* DataGrid */}
        <DataGrid<User>
          columns={columns}
          data={sortedUsers}
          keyExtractor={(u) => u.id}
          sort={gridSort}
          selection={{
            selectedIds: new Set(Array.from(batch.selectedIds).map(String)),
            onToggle: (id) => batch.handleToggleSelect(Number(id)),
            onSelectAll: () => {
              displayUsers.forEach(u => {
                if (!batch.selectedIds.has(parseInt(u.id))) {
                  batch.handleToggleSelect(parseInt(u.id));
                }
              });
            },
            onClearAll: batch.handleClearSelection,
          }}
          onRowClick={(user) => handleOpenSessionsDrawer(user)}
          loading={isLoading}
          loadingMessage={t('loadingUsers')}
          emptyIcon={<Users className="w-12 h-12" />}
          emptyTitle={t('noUsers')}
          emptyMessage={t('noUsersDesc')}
          mobileCardRenderer={mobileCardRenderer}
          pagination={totalCount > pageSize ? {
            currentPage,
            totalPages,
            totalItems: totalCount,
            pageSize,
            onPageChange: goToPage,
          } : undefined}
        />
      </div>

      {/* Device Sessions Drawer */}
      <Drawer
        isOpen={drawerUser !== null}
        onClose={() => { setDrawerUser(null); setDrawerSessions([]); }}
        title={drawerUser ? t('sessionsOf', { name: drawerUser.name }) : t('sessions')}
        icon={<Smartphone className="w-5 h-5 text-blue-600" />}
        width="lg"
      >
        <div className="p-6 space-y-4">
          {drawerLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-muted-foreground">{t("loadingSessions")}</span>
            </div>
          ) : drawerSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Smartphone className="w-12 h-12 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium">{t("noSessions")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("noSessionsDesc")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground/70">
                {t('activeSessionsCount', { active: drawerSessions.filter(s => s.status === 0).length, total: drawerSessions.length })}
              </p>
              {drawerSessions.map((s) => {
                const DeviceIcon = getDeviceIcon(s.deviceType);
                const statusCfg = getSessionStatusConfig(s.status);
                return (
                  <div
                    key={s.id}
                    className={`border rounded-lg p-4 ${
                      s.esSesionActual ? 'border-green-300 ring-1 ring-green-200 bg-green-50/30' : 'border-border-subtle bg-surface-2'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0">
                        <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {s.deviceName || s.deviceTypeNombre}
                          </span>
                          {s.esSesionActual && (
                            <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              {t('yourSession')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[s.osVersion, s.appVersion ? `v${s.appVersion}` : null, s.deviceModel].filter(Boolean).join(' / ')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${statusCfg.className}`}>
                        {td(statusCfg.labelKey)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {s.ipAddress && <span>IP: {s.ipAddress}</span>}
                      <span>{t('connected')} {formatDate(s.loggedInAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{t('activity')} {formatTimeAgo(s.lastActivity)}</span>
                    </div>

                    {s.status === 0 && !s.esSesionActual && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleRevokeSession(s)}
                          disabled={revokingId === s.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {revokingId === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                          <span>{t('revoke')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* Create Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-2 dark:bg-card rounded-xl shadow-xl w-full max-w-md mx-4 border border-border">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-foreground">{t("createUserTitle")}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("fullName")} *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('placeholderName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("email")} *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('placeholderEmail')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("password")} *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("phone")}</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="555-0100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("role")}</label>
                <SearchableSelect
                  options={roles
                    .filter(role => isSuperAdmin || role.nombre.toUpperCase() !== 'ADMIN')
                    .map(role => ({ value: role.nombre, label: role.nombre }))}
                  value={formData.role || null}
                  onChange={(val) => setFormData({ ...formData, role: val ? String(val) : '' })}
                  placeholder={t("selectRole")}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
              >
                {t('createUser')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="usuario"
        loading={batch.batchLoading}
        consequenceDeactivate={t('deactivateConsequence')}
        consequenceActivate={t('activateConsequence')}
      />

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-2 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-foreground">{t("editUserTitle")}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("fullName")}</label>
                <input
                  type="text"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t("email")}</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t('phone')}</label>
                <input
                  type="tel"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t('status')}</label>
                <SearchableSelect
                  options={[
                    { value: UserStatus.ACTIVE, label: t('statusActive') },
                    { value: UserStatus.INACTIVE, label: t('statusInactive') },
                    { value: UserStatus.SUSPENDED, label: t('statusSuspended') },
                  ]}
                  value={selectedUser.status || null}
                  onChange={(val) => setSelectedUser({ ...selectedUser, status: val as UserStatus })}
                  placeholder={t('selectStatus')}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
              >
                {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B4: Location Modal — rendered via portal to avoid parent overflow/transform issues */}
      {isLocationModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setIsLocationModalOpen(false)}>
          <div className="bg-surface-2 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("vendorLocation")}</h2>
                <p className="text-sm text-muted-foreground">{t("lastKnownPosition")}</p>
              </div>
              <button onClick={() => setIsLocationModalOpen(false)} className="p-2 hover:bg-surface-3 rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6">
              {ubicacionesLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-muted-foreground">{t("loadingLocations")}</span>
                </div>
              ) : ubicaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <MapPin className="w-12 h-12 text-muted-foreground/60 mb-3" />
                  <p className="font-medium">{t("noLocationData")}</p>
                  <p className="text-sm">{t("vendorsNoGps")}</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-sm text-foreground/70">
                    {t('vendorsWithLocation', { count: ubicaciones.length })}
                  </div>
                  <GoogleMapWrapper markers={locationMarkers} height="450px" />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('locationNote')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* B5: Distance Modal — rendered via portal */}
      {isDistanceModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setIsDistanceModalOpen(false)}>
          <div className="bg-surface-2 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("vendorDistance")}</h2>
                <p className="text-sm text-muted-foreground">{t("distanceFromBase")}</p>
              </div>
              <button onClick={() => setIsDistanceModalOpen(false)} className="p-2 hover:bg-surface-3 rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {ubicacionesLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <span className="ml-2 text-muted-foreground">{t("calculatingDistances")}</span>
                </div>
              ) : distanceRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Ruler className="w-12 h-12 text-muted-foreground/60 mb-3" />
                  <p className="font-medium">{t("noLocationData")}</p>
                </div>
              ) : (<>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-muted-foreground">
                      <th className="pb-3 font-medium">{t("vendor")}</th>
                      <th className="pb-3 font-medium">{t("lastClient")}</th>
                      <th className="pb-3 font-medium text-right">{t("distanceCol")}</th>
                      <th className="pb-3 font-medium text-right">{t("agoCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distanceRows.map(row => (
                      <tr key={row.usuarioId} className="border-b border-border-subtle hover:bg-surface-1">
                        <td className="py-3 font-medium text-foreground">{row.nombre}</td>
                        <td className="py-3 text-foreground/70">{row.clienteNombre || '\u2014'}</td>
                        <td className="py-3 text-right font-mono">
                          <span className={row.distanciaKm > 50 ? 'text-red-600' : row.distanciaKm > 20 ? 'text-amber-600' : 'text-green-600'}>
                            {row.distanciaKm.toFixed(1)} km
                          </span>
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          {row.tiempoAtras != null
                            ? row.tiempoAtras < 60
                              ? `${row.tiempoAtras} min`
                              : row.tiempoAtras < 1440
                                ? `${Math.round(row.tiempoAtras / 60)} h`
                                : `${Math.round(row.tiempoAtras / 1440)} d`
                            : '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('distanceNote')}
                </p>
              </>)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ============ Main Export ============

export function MiembrosTab() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isSupervisor = role === 'SUPERVISOR';

  if (isSupervisor) {
    return <SupervisorView />;
  }

  return <AdminUsersView />;
}
