'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { supervisorService } from '@/services/api';
import type { SupervisorVendedor, SupervisorDashboard } from '@/services/api/supervisor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
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
  ChevronLeft,
  ChevronRight,
  Edit,
  Check,
  Minus,
  X,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
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

function PresenceBadge({ isOnline, lastActivity }: { isOnline?: boolean; lastActivity?: string }) {
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        En linea
      </span>
    );
  }

  if (lastActivity) {
    const minutesAgo = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60000);
    if (minutesAgo < 60) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Hace {minutesAgo} min
        </span>
      );
    }
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />
      Desconectado
    </span>
  );
}

// ============ Supervisor View ============

function SupervisorView() {
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
      toast({ title: 'Error al cargar datos del equipo', variant: 'destructive' });
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
      toast({ title: 'Error al cargar vendedores disponibles', variant: 'destructive' });
    }
  };

  const handleAsignar = async () => {
    if (selectedIds.size === 0 || !userId) return;
    setAssignLoading(true);
    try {
      await supervisorService.asignarVendedores(Number(userId), Array.from(selectedIds));
      toast({ title: `${selectedIds.size} vendedor(es) asignados` });
      setShowAsignar(false);
      loadData();
    } catch {
      toast({ title: 'Error al asignar vendedores', variant: 'destructive' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDesasignar = async () => {
    if (!userId || !confirmDesasignar) return;
    try {
      await supervisorService.desasignarVendedor(Number(userId), confirmDesasignar.id);
      toast({ title: `${confirmDesasignar.nombre} desasignado` });
      setConfirmDesasignar(null);
      loadData();
    } catch {
      toast({ title: 'Error al desasignar vendedor', variant: 'destructive' });
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
        <span className="sr-only">Cargando...</span>
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
          Actualizar
        </Button>
        {isAdmin && (
          <Button
            onClick={handleOpenAsignar}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            <UserPlus className="h-4 w-4" />
            Asignar Vendedores
          </Button>
        )}
      </div>

      {/* KPI Cards (Supervisor only) */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            label="Vendedores"
            value={dashboard.totalVendedores}
            color="indigo"
          />
          <KPICard
            icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
            label="Pedidos Hoy"
            value={dashboard.pedidosHoy}
            color="emerald"
          />
          <KPICard
            icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
            label="Pedidos Mes"
            value={dashboard.pedidosMes}
            color="blue"
          />
          <KPICard
            icon={<Building2 className="h-5 w-5 text-amber-600" />}
            label="Clientes"
            value={dashboard.totalClientes}
            color="amber"
          />
          <KPICard
            icon={<TrendingUp className="h-5 w-5 text-rose-600" />}
            label="Ventas Mes"
            value={formatCurrency(dashboard.ventasMes)}
            color="rose"
          />
        </div>
      )}

      {/* Vendedores List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isAdmin ? `Equipo (${filteredVendedores.length})` : `Vendedores del Equipo (${filteredVendedores.length})`}
          </h2>
        </div>

        {filteredVendedores.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No hay vendedores asignados</p>
            {isAdmin && (
              <button
                onClick={handleOpenAsignar}
                className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Asignar vendedores
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
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <PresenceBadge isOnline={v.isOnline} lastActivity={v.lastActivity} />
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {v.rol}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDesasignar({ id: v.id, nombre: v.nombre })}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      aria-label={`Desasignar a ${v.nombre}`}
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
              ¿Desasignar vendedor?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {confirmDesasignar.nombre} sera removido de tu equipo.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDesasignar(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDesasignar}>
                Desasignar
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
              <h3 id="asignar-title" className="text-lg font-semibold text-foreground">Asignar Vendedores</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecciona los vendedores a asignar al equipo
              </p>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {disponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay vendedores disponibles
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
                Cancelar
              </Button>
              <Button
                onClick={handleAsignar}
                disabled={selectedIds.size === 0 || assignLoading}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              >
                {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Asignar ({selectedIds.size})
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
  const { formatDate, formatNumber } = useFormatters();
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // B4: Location modal
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<UsuarioUbicacion[]>([]);
  const [ubicacionesLoading, setUbicacionesLoading] = useState(false);

  // B5: Distance modal
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

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
        lastLogin: apiUser.ultimoAcceso ? new Date(apiUser.ultimoAcceso) : undefined,
      }))
    : [];

  // Pagination
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-purple-100 text-purple-600';
      case UserRole.ADMIN:
        return 'bg-blue-100 text-blue-600';
      case UserRole.SUPERVISOR:
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'Super Admin';
      case UserRole.ADMIN:
        return 'Administrador de compania';
      case UserRole.SUPERVISOR:
        return 'Supervisor';
      case UserRole.VENDEDOR:
        return 'Usuario movil';
      default:
        return 'Visor';
    }
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
      toast.success('Usuario creado exitosamente');
      setIsCreateModalOpen(false);
      setFormData({ email: '', nombre: '', password: '', telefono: '', role: 'VENDEDOR' });
      loadUsers();
    } catch (_error) {
      toast.error('Error al crear usuario');
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
      toast.success('Usuario actualizado');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (_error) {
      toast.error('Error al actualizar usuario');
    }
  };

  const handleRefresh = () => {
    loadUsers();
    toast.success('Lista actualizada');
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
        toast.success(
          `${ids.length} usuario${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
        );
        loadUsers();
        batch.completeBatch();
      } else {
        toast.error(result.error || 'Error al cambiar el estado de los usuarios');
        batch.setBatchLoading(false);
      }
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de los usuarios');
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
        toast.error('Error al cargar ubicaciones');
      }
    } catch {
      toast.error('Error al cargar ubicaciones');
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
        {u.clienteNombre && <p className="text-gray-600">Visitando: {u.clienteNombre}</p>}
        {u.fechaUbicacion && (
          <p className="text-gray-500 text-xs mt-1">
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
      Nombre: u.name,
      Email: u.email,
      Rol: getRoleLabel(u.role),
      Estado: u.status === UserStatus.ACTIVE ? 'Activo' : 'Inactivo',
      Telefono: u.phone || '',
      'Ultima actividad': u.lastLogin ? formatDate(u.lastLogin) : 'N/A',
      'Fecha creacion': u.createdAt ? formatDate(u.createdAt) : '',
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
    toast.success('Archivo CSV descargado');
  };

  return (
    <>
      <div className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-tour="users-create-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo usuario</span>
          </button>
          <button
            onClick={handleOpenUbicaciones}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-blue-700 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>Ubicacion</span>
          </button>
          <button
            onClick={handleOpenDistancia}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-violet-700 border border-violet-300 rounded hover:bg-violet-50 transition-colors"
          >
            <Ruler className="w-4 h-4" />
            <span>Distancia</span>
          </button>
          <button
            onClick={handleDescargar}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-emerald-700 border border-emerald-300 rounded hover:bg-emerald-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3">
          {/* Zona Filter */}
          <div className="min-w-[150px]">
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todas las zonas' },
                ...zones.map(z => ({ value: z.id, label: z.name })),
              ]}
              value={filterZona}
              onChange={(val) => setFilterZona(val ? String(val) : 'all')}
              placeholder="Todas las zonas"
            />
          </div>

          {/* Roles Filter */}
          <div className="flex-1 min-w-[200px]" data-tour="users-role-filter">
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos los roles' },
                ...roles.map(r => ({ value: r.nombre, label: r.nombre })),
              ]}
              value={filterRole}
              onChange={(val) => setFilterRole(val ? String(val) : 'all')}
              placeholder="Todos los roles"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 h-10 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalCount}
          entityLabel="usuarios"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
          className="mb-4"
        />

        {/* Container with loading overlay */}
        <div className="relative min-h-[200px]">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="text-sm text-gray-500">Cargando usuarios...</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && displayUsers.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay usuarios</p>
                <p className="text-sm">Crea un nuevo usuario para comenzar</p>
              </div>
            </div>
          ) : (
            /* User Cards with opacity transition */
            <div data-tour="users-cards" className={`space-y-4 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
              {/* User Cards */}
              {displayUsers.map((user) => (
              <div
                key={user.id}
                className={`bg-white border rounded-lg overflow-hidden ${
                  batch.selectedIds.has(parseInt(user.id))
                    ? 'border-green-400 ring-1 ring-green-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-center gap-6 p-5">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      batch.handleToggleSelect(parseInt(user.id));
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(parseInt(user.id))
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {batch.selectedIds.has(parseInt(user.id)) && <Check className="w-3 h-3" />}
                  </button>

                  {/* Avatar Section */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                          user.status === UserStatus.ACTIVE
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {user.status === UserStatus.ACTIVE ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {user.lastLogin ? `Ultima sesion: ${formatDate(user.lastLogin)}` : 'Sesion no iniciada'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-end px-5 py-3 bg-muted border-t border-border">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setIsEditModalOpen(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center border border-border rounded hover:bg-muted/50 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination - Always visible when there are users */}
        {(displayUsers.length > 0 || isLoading) && totalCount > 0 && (
          <div className={`flex items-center justify-between pt-4 transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500">
              Mostrando {startItem}-{endItem} de {totalCount} usuarios
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && !isLoading && goToPage(page)}
                    disabled={page === '...' || isLoading}
                    className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white'
                        : page === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Crear nuevo usuario</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Juan Perez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="555-0100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <SearchableSelect
                  options={roles
                    .filter(role => isSuperAdmin || role.nombre.toUpperCase() !== 'ADMIN')
                    .map(role => ({ value: role.nombre, label: role.nombre }))}
                  value={formData.role || null}
                  onChange={(val) => setFormData({ ...formData, role: val ? String(val) : '' })}
                  placeholder="Seleccionar rol"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Crear usuario
              </button>
            </div>
          </div>
        </div>
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
        consequenceDeactivate="Los usuarios desactivados no podran iniciar sesion."
        consequenceActivate="Los usuarios activados podran iniciar sesion nuevamente."
      />

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Editar usuario</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <SearchableSelect
                  options={[
                    { value: UserStatus.ACTIVE, label: 'Activo' },
                    { value: UserStatus.INACTIVE, label: 'Inactivo' },
                    { value: UserStatus.SUSPENDED, label: 'Suspendido' },
                  ]}
                  value={selectedUser.status || null}
                  onChange={(val) => setSelectedUser({ ...selectedUser, status: val as UserStatus })}
                  placeholder="Seleccionar estado"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B4: Location Modal — rendered via portal to avoid parent overflow/transform issues */}
      {isLocationModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setIsLocationModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ubicacion de vendedores</h2>
                <p className="text-sm text-gray-500">Ultima posicion conocida de cada vendedor</p>
              </div>
              <button onClick={() => setIsLocationModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              {ubicacionesLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-500">Cargando ubicaciones...</span>
                </div>
              ) : ubicaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                  <MapPin className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-medium">Sin datos de ubicacion</p>
                  <p className="text-sm">Los vendedores aun no han registrado visitas con GPS</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-sm text-gray-600">
                    {ubicaciones.length} vendedor{ubicaciones.length !== 1 ? 'es' : ''} con ubicacion registrada
                  </div>
                  <GoogleMapWrapper markers={locationMarkers} height="450px" />
                  <p className="mt-3 text-xs text-gray-400">
                    Solo se muestran vendedores que han registrado al menos una visita con GPS activo desde la app móvil. Si un vendedor no aparece, es porque aún no ha realizado check-in con ubicación.
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Distancia de vendedores</h2>
                <p className="text-sm text-gray-500">Distancia desde el punto base (promedio de ubicaciones)</p>
              </div>
              <button onClick={() => setIsDistanceModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {ubicacionesLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <span className="ml-2 text-gray-500">Calculando distancias...</span>
                </div>
              ) : distanceRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <Ruler className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-medium">Sin datos de ubicacion</p>
                </div>
              ) : (<>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 font-medium">Vendedor</th>
                      <th className="pb-3 font-medium">Ultimo cliente</th>
                      <th className="pb-3 font-medium text-right">Distancia</th>
                      <th className="pb-3 font-medium text-right">Hace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distanceRows.map(row => (
                      <tr key={row.usuarioId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">{row.nombre}</td>
                        <td className="py-3 text-gray-600">{row.clienteNombre || '\u2014'}</td>
                        <td className="py-3 text-right font-mono">
                          <span className={row.distanciaKm > 50 ? 'text-red-600' : row.distanciaKm > 20 ? 'text-amber-600' : 'text-green-600'}>
                            {row.distanciaKm.toFixed(1)} km
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-500">
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
                <p className="mt-3 text-xs text-gray-400">
                  Solo se muestran vendedores con al menos una visita GPS registrada desde la app móvil.
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
