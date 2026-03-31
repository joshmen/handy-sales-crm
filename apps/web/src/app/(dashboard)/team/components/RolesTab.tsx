'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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
  Search,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
} from 'lucide-react';
import {
  useRoles,
  usePaginatedRoles,
} from '@/hooks/useRoles';
import { Pagination } from '@/components/ui/Pagination';
import { RolesTableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsyncPaginatedTable } from '@/hooks/useAsyncTableState';
import { useFormatters } from '@/hooks/useFormatters';

// Roles are system-defined (SuperAdmin, Admin, Supervisor, Vendedor, Viewer).
// Tenant admins can view but not create/edit/delete them.

export function RolesTab() {
  const { formatDate: _fmtDate } = useFormatters();
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
    goToPage,
    nextPage,
    previousPage,
  } = usePaginatedRoles();

  const {
    data: allRolesData,
    execute: loadStats,
  } = useRoles();

  const [searchQuery, setSearchQuery] = useState('');

  const asyncTableState = useAsyncPaginatedTable(
    apiRoles,
    isLoadingRoles,
    { currentPage, totalPages, hasNextPage, hasPreviousPage },
    { minLoadingTime: 500, keepPreviousData: true }
  );

  const displayRoles = Array.isArray(asyncTableState.displayData) ? asyncTableState.displayData : [];

  useEffect(() => { loadStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (apiError?.message) {
      toast({ title: 'Error', description: `No se pudieron cargar los roles: ${apiError.message}`, variant: 'destructive' });
    }
  }, [apiError]);

  const filteredRoles = displayRoles.filter(role =>
    role.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allRoles = Array.isArray(allRolesData) ? allRolesData : [];
  const stats = {
    total: allRoles.length || totalCount,
    active: allRoles.filter(r => r.activo).length,
    inactive: allRoles.filter(r => !r.activo).length,
    system: allRoles.filter(r => ['ADMIN', 'SUPER_ADMIN', 'USER'].includes(r.nombre.toUpperCase())).length,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return _fmtDate(dateString, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoadingRoles && !asyncTableState.displayData?.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header — read-only notice */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Roles del sistema</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs text-amber-700">Los roles son definidos por el sistema y no se pueden modificar</span>
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

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o descripcion..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {asyncTableState.showSkeleton ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : !filteredRoles.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No hay roles</p>
            </div>
          ) : (
            filteredRoles.map((role) => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{role.nombre}</p>
                    {role.descripcion && <p className="text-xs text-gray-500 truncate">{role.descripcion}</p>}
                  </div>
                  <div className={`h-2 w-2 rounded-full ${role.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Roles Table — READ ONLY */}
        <Card data-tour="roles-table" className="hidden sm:block overflow-x-auto">
          {asyncTableState.showSkeleton ? (
            <RolesTableSkeleton rows={pageSize} />
          ) : (
            <Table {...asyncTableState.tableProps} className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-medium">
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
                        <div className={`h-2 w-2 rounded-full ${role.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-sm">{role.activo ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-muted-foreground">{formatDate(role.createdAt)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
    </div>
  );
}
