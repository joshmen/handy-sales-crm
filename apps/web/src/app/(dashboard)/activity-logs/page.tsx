'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/useToast';
import {
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  Database,
  FileText,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout';
type EntityType = 'cliente' | 'producto' | 'pedido' | 'ruta' | 'usuario' | 'sesion' | 'inventario';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  action: ActionType;
  entity: EntityType;
  details: string;
  timestamp: Date;
  ipAddress: string;
}

const mockLogs: ActivityLog[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Juan García',
    userInitials: 'JG',
    userColor: 'bg-blue-100 text-blue-600',
    action: 'create',
    entity: 'cliente',
    details: 'Creó nuevo cliente: Distribuidora López S.A. de C.V.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    ipAddress: '192.168.1.45',
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'María Rodríguez',
    userInitials: 'MR',
    userColor: 'bg-red-100 text-red-600',
    action: 'update',
    entity: 'producto',
    details: 'Actualizó precio de: Coca-Cola 600ml de $18.00 a $19.50',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    ipAddress: '10.0.0.102',
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Carlos Pérez',
    userInitials: 'CP',
    userColor: 'bg-indigo-100 text-indigo-600',
    action: 'delete',
    entity: 'pedido',
    details: 'Canceló pedido #1234 - Motivo: Cliente solicitó cancelación',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    ipAddress: '192.168.1.23',
  },
  {
    id: '4',
    userId: 'u1',
    userName: 'Juan García',
    userInitials: 'JG',
    userColor: 'bg-blue-100 text-blue-600',
    action: 'login',
    entity: 'sesion',
    details: 'Inicio de sesión desde dispositivo móvil (Android)',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    ipAddress: '187.45.32.91',
  },
  {
    id: '5',
    userId: 'u2',
    userName: 'María Rodríguez',
    userInitials: 'MR',
    userColor: 'bg-red-100 text-red-600',
    action: 'create',
    entity: 'ruta',
    details: 'Creó ruta para Zona Norte - 15 clientes asignados',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    ipAddress: '10.0.0.102',
  },
  {
    id: '6',
    userId: 'u4',
    userName: 'Ana Martínez',
    userInitials: 'AM',
    userColor: 'bg-green-100 text-green-600',
    action: 'update',
    entity: 'inventario',
    details: 'Ajustó inventario: Aceite 5W-30 +50 unidades (entrada de almacén)',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    ipAddress: '192.168.1.78',
  },
  {
    id: '7',
    userId: 'u3',
    userName: 'Carlos Pérez',
    userInitials: 'CP',
    userColor: 'bg-indigo-100 text-indigo-600',
    action: 'create',
    entity: 'usuario',
    details: 'Creó nuevo usuario: vendedor@empresa.com con rol Vendedor',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
    ipAddress: '192.168.1.23',
  },
  {
    id: '8',
    userId: 'u1',
    userName: 'Juan García',
    userInitials: 'JG',
    userColor: 'bg-blue-100 text-blue-600',
    action: 'logout',
    entity: 'sesion',
    details: 'Cierre de sesión manual',
    timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000),
    ipAddress: '187.45.32.91',
  },
];

const actionLabels: Record<ActionType, string> = {
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  login: 'Login',
  logout: 'Logout',
};

const actionColors: Record<ActionType, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-gray-100 text-gray-700',
};

const entityLabels: Record<EntityType, string> = {
  cliente: 'Cliente',
  producto: 'Producto',
  pedido: 'Pedido',
  ruta: 'Ruta',
  usuario: 'Usuario',
  sesion: 'Sesión',
  inventario: 'Inventario',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterDate, setFilterDate] = useState('7days');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExport = () => {
    toast.success('Exportando logs de actividad...');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesEntity = filterEntity === 'all' || log.entity === filterEntity;

    // Date filter
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - log.timestamp.getTime()) / (1000 * 60 * 60 * 24));
    let matchesDate = true;
    if (filterDate === 'today') matchesDate = daysDiff === 0;
    else if (filterDate === '7days') matchesDate = daysDiff <= 7;
    else if (filterDate === '30days') matchesDate = daysDiff <= 30;

    return matchesSearch && matchesAction && matchesEntity && matchesDate;
  });

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] mb-4">
          <span className="text-gray-500">Administración</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Logs de Actividad</span>
        </div>

          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Logs de Actividad
            </h1>
            <button
              data-tour="logs-export-btn"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                data-tour="logs-search"
                type="text"
                placeholder="Buscar por usuario o acción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px] pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
            </div>

            {/* Action Filter */}
            <div data-tour="logs-filter-action" className="min-w-[180px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todas las acciones' },
                  { value: 'create', label: 'Crear' },
                  { value: 'update', label: 'Actualizar' },
                  { value: 'delete', label: 'Eliminar' },
                  { value: 'login', label: 'Login' },
                  { value: 'logout', label: 'Logout' },
                ]}
                value={filterAction}
                onChange={(val) => setFilterAction(val ? String(val) : 'all')}
                placeholder="Todas las acciones"
              />
            </div>

            {/* Date Filter */}
            <div className="min-w-[180px]">
              <SearchableSelect
                options={[
                  { value: 'today', label: 'Hoy' },
                  { value: '7days', label: 'Últimos 7 días' },
                  { value: '30days', label: 'Últimos 30 días' },
                  { value: 'all', label: 'Todo el tiempo' },
                ]}
                value={filterDate}
                onChange={(val) => setFilterDate(val ? String(val) : 'today')}
                placeholder="Hoy"
              />
            </div>

            {/* Entity Filter */}
            <div data-tour="logs-filter-entity" className="min-w-[180px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todas las entidades' },
                  { value: 'cliente', label: 'Cliente' },
                  { value: 'producto', label: 'Producto' },
                  { value: 'pedido', label: 'Pedido' },
                  { value: 'ruta', label: 'Ruta' },
                  { value: 'usuario', label: 'Usuario' },
                  { value: 'inventario', label: 'Inventario' },
                ]}
                value={filterEntity}
                onChange={(val) => setFilterEntity(val ? String(val) : 'all')}
                placeholder="Todas las entidades"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {/* Table */}
            <div data-tour="logs-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay registros</h3>
                  <p className="text-sm text-gray-500 text-center">
                    No se encontraron logs de actividad para los filtros seleccionados
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                    <div className="w-[160px] text-xs font-semibold text-gray-600">Usuario</div>
                    <div className="w-[100px] text-xs font-semibold text-gray-600">Acción</div>
                    <div className="w-[100px] text-xs font-semibold text-gray-600">Entidad</div>
                    <div className="flex-1 text-xs font-semibold text-gray-600">Detalles</div>
                    <div className="w-[140px] text-xs font-semibold text-gray-600">Fecha/Hora</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-600">IP</div>
                  </div>

                  {/* Table Rows */}
                  {paginatedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* User */}
                      <div className="w-[160px] flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full ${log.userColor} flex items-center justify-center text-[10px] font-medium`}>
                          {log.userInitials}
                        </div>
                        <span className="text-[13px] text-gray-900 truncate">{log.userName}</span>
                      </div>

                      {/* Action */}
                      <div className="w-[100px]">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${actionColors[log.action]}`}>
                          {actionLabels[log.action]}
                        </span>
                      </div>

                      {/* Entity */}
                      <div className="w-[100px] text-[13px] text-gray-700">
                        {entityLabels[log.entity]}
                      </div>

                      {/* Details */}
                      <div className="flex-1 text-[13px] text-gray-700 truncate pr-4">
                        {log.details}
                      </div>

                      {/* Date/Time */}
                      <div className="w-[140px] text-[13px] text-gray-500">
                        {formatDateTime(log.timestamp)}
                      </div>

                      {/* IP */}
                      <div className="w-[120px] text-[13px] text-gray-500">
                        {log.ipAddress}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Mostrando {startItem}-{endItem} de {totalItems.toLocaleString()} registros
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((page) => (
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
                  ))}

                  {totalPages > 4 && (
                    <>
                      <span className="text-gray-400">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                          totalPages === currentPage
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
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
