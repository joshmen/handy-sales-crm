'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/useToast';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { tenantService } from '@/services/api/tenants';
import { getInitials } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import type { GlobalUser, Tenant } from '@/types/tenant';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'VIEWER', label: 'Viewer' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

const roleBadgeColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  SUPERVISOR: 'bg-purple-100 text-purple-700',
  VENDEDOR: 'bg-green-100 text-green-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

const userColorPool = [
  'bg-blue-100 text-blue-600',
  'bg-red-100 text-red-600',
  'bg-indigo-100 text-indigo-600',
  'bg-green-100 text-green-600',
  'bg-amber-100 text-amber-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600',
  'bg-cyan-100 text-cyan-600',
];

function getUserColor(id: number): string {
  return userColorPool[id % userColorPool.length];
}

export default function GlobalUsersPage() {
  const { formatDate } = useFormatters();
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState('all');
  const [filterRol, setFilterRol] = useState('all');
  const [filterActivo, setFilterActivo] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Load tenants for filter dropdown
  useEffect(() => {
    tenantService.getAll().then(setTenants).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tenantService.getGlobalUsers({
        page: currentPage,
        pageSize,
        search: searchTerm || undefined,
        tenantId: filterTenant !== 'all' ? Number(filterTenant) : undefined,
        rol: filterRol !== 'all' ? filterRol : undefined,
        activo: filterActivo !== 'all' ? filterActivo === 'true' : undefined,
      });
      setUsers(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Error al cargar usuarios');
      setUsers([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterTenant, filterRol, filterActivo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTenant, filterRol, filterActivo]);

  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const tenantOptions = [
    { value: 'all', label: 'Todas las empresas' },
    ...tenants.map((t) => ({ value: String(t.id), label: t.nombreEmpresa })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-[13px] mb-4">
          <span className="text-gray-500">Administracion</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Usuarios Global</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios Global</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount.toLocaleString()} usuarios en todas las empresas
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[280px] pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="min-w-[200px]">
            <SearchableSelect
              options={tenantOptions}
              value={filterTenant}
              onChange={(val) => setFilterTenant(val ? String(val) : 'all')}
              placeholder="Todas las empresas"
            />
          </div>

          <div className="min-w-[160px]">
            <SearchableSelect
              options={ROLE_OPTIONS}
              value={filterRol}
              onChange={(val) => setFilterRol(val ? String(val) : 'all')}
              placeholder="Todos los roles"
            />
          </div>

          <div className="min-w-[140px]">
            <SearchableSelect
              options={STATUS_OPTIONS}
              value={filterActivo}
              onChange={(val) => setFilterActivo(val ? String(val) : 'all')}
              placeholder="Todos"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="flex items-center gap-2">
                  <img src="/logo-icon.svg" alt="Handy Suites" className="w-8 h-8" />
                  <span className="text-lg font-semibold text-gray-700">Handy Suites<sup className="text-[8px] font-normal">®</sup></span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-gray-500">Cargando usuarios...</span>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Users className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay usuarios</h3>
                <p className="text-sm text-gray-500 text-center">
                  No se encontraron usuarios para los filtros seleccionados
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                    <div className="w-[200px] text-xs font-semibold text-gray-600">Usuario</div>
                    <div className="w-[220px] text-xs font-semibold text-gray-600">Email</div>
                    <div className="w-[180px] text-xs font-semibold text-gray-600">Empresa</div>
                    <div className="w-[110px] text-xs font-semibold text-gray-600">Rol</div>
                    <div className="w-[80px] text-xs font-semibold text-gray-600">Estado</div>
                    <div className="flex-1 text-xs font-semibold text-gray-600">Registrado</div>
                  </div>

                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-[200px] flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full ${getUserColor(user.id)} flex items-center justify-center text-[10px] font-medium shrink-0`}
                        >
                          {getInitials(user.nombre)}
                        </div>
                        <span className="text-[13px] text-gray-900 truncate">{user.nombre}</span>
                      </div>

                      <div className="w-[220px] text-[13px] text-gray-600 truncate">
                        {user.email}
                      </div>

                      <div className="w-[180px] text-[13px] text-gray-700 truncate">
                        {user.tenantNombre}
                      </div>

                      <div className="w-[110px]">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                            roleBadgeColors[user.rol] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.rol}
                        </span>
                      </div>

                      <div className="w-[80px]">
                        {user.activo ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-100 text-green-700">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-500">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <div className="flex-1 text-[13px] text-gray-500">
                        {formatDate(user.creadoEn)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2 p-3">
                  {users.map((user) => (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full ${getUserColor(user.id)} flex items-center justify-center text-[10px] font-medium`}
                          >
                            {getInitials(user.nombre)}
                          </div>
                          <div>
                            <span className="text-[13px] font-medium text-gray-900">{user.nombre}</span>
                            <p className="text-[12px] text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                            roleBadgeColors[user.rol] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.rol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[12px] text-gray-500">
                        <span>{user.tenantNombre}</span>
                        <span>{user.activo ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-500">
                Mostrando {startItem}-{endItem} de {totalCount.toLocaleString()} usuarios
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
