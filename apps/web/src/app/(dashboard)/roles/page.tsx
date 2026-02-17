'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { toast } from '@/hooks/useToast';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  useRoles,
  usePaginatedRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/hooks/useRoles';
import { Role, CreateRoleDto, UpdateRoleDto } from '@/services/api/roleService';
import { Pagination } from '@/components/ui/Pagination';
import { RolesTableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsyncPaginatedTable } from '@/hooks/useAsyncTableState';
import { ImportButton } from '@/components/ui/ImportButton';
import { ImportColumn, commonValidators, commonTransformers } from '@/lib/import';

const roleSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
  activo: z.boolean(),
});

type RoleFormData = z.infer<typeof roleSchema>;

// Tipos para el estado de los roles
enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

const statusColors = {
  [RoleStatus.ACTIVE]: 'bg-green-500',
  [RoleStatus.INACTIVE]: 'bg-gray-400',
};

const statusLabels = {
  [RoleStatus.ACTIVE]: 'Activo',
  [RoleStatus.INACTIVE]: 'Inactivo',
};

export default function RolesPage() {
  const {
    roles: apiRoles,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    isLoading: isLoadingRoles,
    error: apiError,
    loadRoles,
    goToPage,
    nextPage,
    previousPage,
  } = usePaginatedRoles();

  // Hook separado para obtener todos los roles para estadísticas
  const {
    data: allRolesData,

    execute: loadStats,
  } = useRoles(); // Sin parámetros de paginación para obtener todos

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RoleStatus | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Drawer refs
  const createDrawerRef = useRef<DrawerHandle>(null);
  const editDrawerRef = useRef<DrawerHandle>(null);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // React Hook Form - Create
  const { register: registerCreate, handleSubmit: rhfCreateSubmit, reset: resetCreateForm, watch: watchCreate, setValue: setValueCreate, formState: { errors: createErrors, isDirty: isCreateDirty } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { nombre: '', descripcion: '', activo: true },
  });

  // React Hook Form - Edit
  const { register: registerEdit, handleSubmit: rhfEditSubmit, reset: resetEditForm, watch: watchEdit, setValue: setValueEdit, formState: { errors: editErrors, isDirty: isEditDirty } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { nombre: '', descripcion: '', activo: true },
  });

  // Estado asíncrono de la tabla
  const asyncTableState = useAsyncPaginatedTable(
    apiRoles,
    isLoadingRoles,
    {
      currentPage,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
    {
      minLoadingTime: 500,
      keepPreviousData: true,
    }
  );

  // Convert API roles to display format
  const displayRoles = Array.isArray(asyncTableState.displayData)
    ? asyncTableState.displayData
    : [];

  // Cargar estadísticas al montar
  useEffect(() => {
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show error toast if API call fails
  useEffect(() => {
    if (apiError && apiError.message) {
      toast({
        title: 'Error',
        description: `No se pudieron cargar los roles: ${apiError.message}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [apiError]);

  // Filtrar roles
  const filteredRoles = displayRoles.filter(role => {
    const matchesSearch =
      role.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.descripcion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === RoleStatus.ACTIVE && role.activo) ||
      (filterStatus === RoleStatus.INACTIVE && !role.activo);

    return matchesSearch && matchesStatus;
  });

  // Obtener todos los roles para estadísticas
  const allRoles = Array.isArray(allRolesData) ? allRolesData : [];

  // Estadísticas basadas en todos los roles del backend
  const stats = {
    total: allRoles.length || totalCount,
    active: allRoles.filter(r => r.activo).length,
    inactive: allRoles.filter(r => !r.activo).length,
    system: allRoles.filter(r => ['ADMIN', 'SUPER_ADMIN', 'USER'].includes(r.nombre.toUpperCase()))
      .length,
  };

  const handleCreateRole = async (data: RoleFormData) => {
    const result = await createRoleMutation.mutateAsync(data);

    if (result) {
      toast({
        title: 'Rol creado',
        description: `El rol "${data.nombre}" fue creado exitosamente`,
      });
      setIsCreateOpen(false);
      loadRoles();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo crear el rol',
        variant: 'destructive',
      });
    }
  };

  const handleEditRole = async (data: RoleFormData) => {
    if (!selectedRole) return;

    const result = await updateRoleMutation.mutateAsync({
      id: selectedRole.id,
      ...data,
    });

    if (result) {
      toast({
        title: 'Rol actualizado',
        description: `El rol "${data.nombre}" fue actualizado exitosamente`,
      });
      setIsEditOpen(false);
      setSelectedRole(null);
      loadRoles();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await deleteRoleMutation.mutateAsync(selectedRole.id);
      toast({
        title: 'Rol eliminado',
        description: `El rol "${selectedRole.nombre}" ha sido eliminado del sistema`,
      });
      setIsDeleteOpen(false);
      setSelectedRole(null);
      loadRoles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el rol',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    resetEditForm({
      nombre: role.nombre,
      descripcion: role.descripcion || '',
      activo: role.activo,
    });
    setIsEditOpen(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Configure columns for import functionality
  const importColumns: ImportColumn[] = [
    {
      key: 'nombre',
      header: 'Nombre del rol',
      required: true,
      validator: commonValidators.required,
      transformer: (value: unknown) => {
        const trimmed = commonTransformers.trim(value);
        return typeof trimmed === 'string' ? trimmed : undefined;
      },
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      required: false,
      transformer: (value: unknown) => {
        const trimmed = commonTransformers.trim(value);
        return typeof trimmed === 'string' ? trimmed : undefined;
      },
    },
    {
      key: 'activo',
      header: 'Activo',
      required: false,
      validator: commonValidators.boolean,
      transformer: (value: unknown) => {
        if (value === undefined || value === null) {
          return 'true'; // Default value
        }
        const val = String(value).toLowerCase();
        return ['true', '1', 'yes', 'sí', 'si'].includes(val) ? 'true' : 'false';
      },
    },
  ];

  // Handle import functionality
  const handleImportRoles = async (roles: Partial<Role>[], errors: unknown[]) => {
    try {
      let successCount = 0;
      let errorCount = errors.length;

      // Process valid roles
      for (const roleData of roles) {
        try {
          if (roleData.nombre) {
            await createRoleMutation.mutateAsync({
              nombre: roleData.nombre,
              descripcion: roleData.descripcion || '',
              activo: roleData.activo !== undefined ? roleData.activo : true,
            });
            successCount++;
          }
        } catch (error) {
          errorCount++;
          console.error('Error importing role:', error);
        }
      }

      // Show results
      if (successCount > 0) {
        toast({
          title: 'Importación completada',
          description: `${successCount} rol(es) importado(s) exitosamente.`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: 'Algunos errores en importación',
          description: `${errorCount} rol(es) no pudieron ser importados.`,
          variant: 'destructive',
        });
      }

      // Refresh the roles list
      loadRoles();
      loadStats(); // Refresh statistics
    } catch (error) {
      toast({
        title: 'Error en la importación',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  // Show initial loading state (solo en la primera carga)
  if (isLoadingRoles && !asyncTableState.displayData?.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Roles</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-tour="roles-create-btn"
              onClick={() => {
                resetCreateForm({ nombre: '', descripcion: '', activo: true });
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo rol</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div data-tour="roles-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total roles</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Del Sistema</p>
                <p className="text-2xl font-bold">{stats.system}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={filterStatus}
              onValueChange={value => setFilterStatus(value as RoleStatus | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value={RoleStatus.ACTIVE}>Activo</SelectItem>
                <SelectItem value={RoleStatus.INACTIVE}>Inactivo</SelectItem>
              </SelectContent>
            </Select>

            <ImportButton<Partial<Role>> columns={importColumns} onImport={handleImportRoles} />
            
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </Card>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {asyncTableState.showSkeleton ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : !filteredRoles.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No hay roles</p>
            </div>
          ) : (
            filteredRoles.map((role) => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{role.nombre}</p>
                      {role.descripcion && (
                        <p className="text-xs text-gray-500 truncate">{role.descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        role.activo ? statusColors[RoleStatus.ACTIVE] : statusColors[RoleStatus.INACTIVE]
                      }`}
                    />
                    <span className="text-gray-600">
                      {role.activo ? statusLabels[RoleStatus.ACTIVE] : statusLabels[RoleStatus.INACTIVE]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(role.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => openEditDialog(role)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRole(role);
                      setIsDeleteOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Roles Table */}
        <Card data-tour="roles-table" className="hidden sm:block overflow-x-auto">
          {asyncTableState.showSkeleton ? (
            <RolesTableSkeleton rows={pageSize} />
          ) : (
            <Table {...asyncTableState.tableProps} className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{role.nombre}</p>
                          <p className="text-sm text-muted-foreground">ID: {role.id}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm">{role.descripcion || '-'}</p>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            role.activo
                              ? statusColors[RoleStatus.ACTIVE]
                              : statusColors[RoleStatus.INACTIVE]
                          }`}
                        />
                        <span className="text-sm">
                          {role.activo
                            ? statusLabels[RoleStatus.ACTIVE]
                            : statusLabels[RoleStatus.INACTIVE]}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-muted-foreground">
                          {formatDate(role.createdAt)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(role)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsDeleteOpen(true);
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPreviousPage={previousPage}
          />
        </Card>

        {/* Create Drawer */}
        <Drawer
          ref={createDrawerRef}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Crear Rol"
          icon={<Shield className="w-5 h-5" />}
          width="sm"
          isDirty={isCreateDirty}
          onSave={rhfCreateSubmit(handleCreateRole)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => createDrawerRef.current?.requestClose()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={rhfCreateSubmit(handleCreateRole)}
                disabled={createRoleMutation.loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {createRoleMutation.loading ? 'Creando...' : 'Crear Rol'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-nombre">Nombre del rol *</Label>
              <Input
                id="create-nombre"
                placeholder="Ej: Supervisor de Ventas"
                {...registerCreate('nombre')}
              />
              {createErrors.nombre && <p className="text-xs text-red-500">{createErrors.nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-descripcion">Descripción</Label>
              <Input
                id="create-descripcion"
                placeholder="Descripción del rol..."
                {...registerCreate('descripcion')}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="create-activo"
                {...registerCreate('activo')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="create-activo" className="text-sm font-normal">
                Rol activo
              </Label>
            </div>
          </div>
        </Drawer>

        {/* Edit Drawer */}
        <Drawer
          ref={editDrawerRef}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Editar Rol"
          icon={<Shield className="w-5 h-5" />}
          width="sm"
          isDirty={isEditDirty}
          onSave={rhfEditSubmit(handleEditRole)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => editDrawerRef.current?.requestClose()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={rhfEditSubmit(handleEditRole)}
                disabled={updateRoleMutation.loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {updateRoleMutation.loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre del rol *</Label>
              <Input
                id="edit-nombre"
                placeholder="Ej: Supervisor de Ventas"
                {...registerEdit('nombre')}
              />
              {editErrors.nombre && <p className="text-xs text-red-500">{editErrors.nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Input
                id="edit-descripcion"
                placeholder="Descripción del rol..."
                {...registerEdit('descripcion')}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-activo"
                {...registerEdit('activo')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-activo" className="text-sm font-normal">
                Rol activo
              </Label>
            </div>
          </div>
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar rol?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                ¿Estás seguro de que deseas eliminar el rol <strong>{selectedRole?.nombre}</strong>?
                Esta acción no se puede deshacer y puede afectar a usuarios que tengan este rol
                asignado.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteRole}>
                Eliminar Rol
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
