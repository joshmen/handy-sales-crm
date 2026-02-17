'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  Plus,
  MapPin,
  Ruler,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit,
  Clock,
  Play,
  Timer,
  Users,
  Check,
  Minus,
  X,
  Power,
  PowerOff,
  Loader2,
} from 'lucide-react';
import { usePaginatedUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import { roleService, Role } from '@/services/api/roleService';
import { usersService } from '@/services/api/users';
import { UserRole, UserStatus, type User } from '@/types/users';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function UsersPage() {
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

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  const [roles, setRoles] = useState<Role[]>([]);
  const [filterZona, setFilterZona] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    password: '',
    telefono: '',
    role: 'VENDEDOR',
  });

  // Close modals on ESC key
  useEffect(() => {
    const anyOpen = isCreateModalOpen || isEditModalOpen || isBatchConfirmOpen;
    if (!anyOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setIsBatchConfirmOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, isEditModalOpen, isBatchConfirmOpen]);

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await roleService.getActiveRoles();
        setRoles(rolesData);
      } catch (error) {
        console.error('Error loading roles:', error);
      }
    };
    loadRoles();
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        return 'Administrador de compañía';
      case UserRole.SUPERVISOR:
        return 'Supervisor';
      case UserRole.VENDEDOR:
        return 'Usuario móvil';
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
        esAdmin: formData.role === 'ADMIN',
        tenantId: 1,
      });
      toast.success('Usuario creado exitosamente');
      setIsCreateModalOpen(false);
      setFormData({ email: '', nombre: '', password: '', telefono: '', role: 'VENDEDOR' });
      loadUsers();
    } catch (error) {
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
    } catch (error) {
      toast.error('Error al actualizar usuario');
    }
  };

  const handleRefresh = () => {
    loadUsers();
    toast.success('Lista actualizada');
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
    const visIds = displayUsers.map(u => parseInt(u.id));
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

      const result = await usersService.batchToggleActive(ids, activo);

      if (result.success) {
        toast.success(
          `${ids.length} usuario${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
        );
        setIsBatchConfirmOpen(false);
        setSelectedIds(new Set());
        loadUsers();
      } else {
        toast.error(result.error || 'Error al cambiar el estado de los usuarios');
      }
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de los usuarios');
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, filterZona, filterRole]);

  // Computed selection state
  const visibleIds = displayUsers.map(u => parseInt(u.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-8 py-6">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Usuarios' },
          ]} />

          {/* Title Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Usuarios
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                data-tour="users-create-btn"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo usuario</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                <MapPin className="w-4 h-4" />
                <span>Ubicación</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                <Ruler className="w-4 h-4" />
                <span>Distancia</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Descargar</span>
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3">
            {/* Date Filter */}
            <button className="flex items-center justify-between gap-2 px-3 py-2 h-10 min-w-[260px] text-[11px] text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              <span>03/05/2025 00:00:00 - 03/05/2025 23:59:59</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Zona Filter */}
            <div className="min-w-[150px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todas las zonas' },
                  { value: 'zona2', label: 'Zona 2' },
                  { value: 'zona3', label: 'Zona 3' },
                ]}
                value={filterZona}
                onChange={(val) => setFilterZona(val ? String(val) : 'all')}
                placeholder="Zona 1"
              />
            </div>

            {/* Roles Filter */}
            <div className="flex-1 min-w-[200px]" data-tour="users-role-filter">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todos los roles' },
                  { value: 'admin', label: 'Administrador de compañía' },
                  { value: 'supervisor', label: 'Supervisor' },
                  { value: 'mobile', label: 'Usuario móvil' },
                ]}
                value={filterRole}
                onChange={(val) => setFilterRole(val ? String(val) : 'all')}
                placeholder="Todos los roles"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 h-10 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-8 py-6 overflow-auto bg-gray-50">
          {/* Selection Action Bar */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAllVisible}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    allVisibleSelected
                      ? 'bg-green-600 border-green-600 text-white'
                      : someVisibleSelected
                      ? 'bg-green-100 border-green-600'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {allVisibleSelected ? (
                    <Check className="w-3 h-3" />
                  ) : someVisibleSelected ? (
                    <Minus className="w-3 h-3 text-green-600" />
                  ) : null}
                </button>
                <span className="text-sm font-medium text-blue-700">
                  {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
                </span>
                {selectedCount < totalCount && (
                  <span className="text-xs text-blue-500">
                    de {totalCount} usuarios
                  </span>
                )}
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
                    selectedIds.has(parseInt(user.id))
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
                        handleToggleSelect(parseInt(user.id));
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedIds.has(parseInt(user.id))
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {selectedIds.has(parseInt(user.id)) && <Check className="w-3 h-3" />}
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
                            {user.lastLogin ? `Última sesión: ${user.lastLogin.toLocaleDateString('es-MX')}` : 'Sesión no iniciada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex-1 flex items-center justify-between gap-8">
                      <div>
                        <div className="text-xs text-gray-500">Monto pedidos</div>
                        <div className="text-sm font-semibold text-gray-900">$ 0</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Monto devoluciones</div>
                        <div className="text-sm font-semibold text-gray-900">$ 0</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Efectividad de visitas</div>
                        <div className="text-sm font-semibold text-gray-900">0/0  0%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Efectividad venta en visitas</div>
                        <div className="text-sm font-semibold text-gray-900">0/0  0%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Cumplimiento de agenda</div>
                        <div className="text-sm font-semibold text-gray-900">0/0  0%</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Play className="w-3.5 h-3.5" />
                        <span>Primer inicio de visita: N/A</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Último fin de visita: N/A</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Tiempo total de visitas: N/A</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditModalOpen(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
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
              <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
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
                  placeholder="Juan Pérez"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
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
                  options={roles.map(role => ({ value: role.nombre, label: role.nombre }))}
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
      {isBatchConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {batchAction === 'activate' ? 'Activar' : 'Desactivar'} {selectedCount} usuario{selectedCount > 1 ? 's' : ''}?
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500">
                ¿Estás seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
                <strong>{selectedCount}</strong> usuario{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}?
                {batchAction === 'deactivate' && ' Los usuarios desactivados no podrán iniciar sesión.'}
                {batchAction === 'activate' && ' Los usuarios activados podrán iniciar sesión nuevamente.'}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsBatchConfirmOpen(false)}
                disabled={batchLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchToggle}
                disabled={batchLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 flex items-center gap-2 ${
                  batchAction === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {batchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
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
    </>
  );
}
