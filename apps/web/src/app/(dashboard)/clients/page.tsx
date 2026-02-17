'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Client } from '@/types';
import { clientService } from '@/services/api/clients';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Modal } from '@/components/ui/Modal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ExportButton } from '@/components/shared/ExportButton';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import {
  Plus,
  Pencil,
  Map,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Check,
  Minus,
  X,
  Power,
  PowerOff,
  Loader2,
} from 'lucide-react';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Filtros
  const [selectedZona, setSelectedZona] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Catálogos para filtros
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientService.getClients({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        zoneId: selectedZona || undefined,
        categoryId: selectedCategoria || undefined,
      });
      setClients(response.clients);
      setTotalClients(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError('Error al cargar los clientes. Intenta de nuevo.');
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, showInactive, selectedZona, selectedCategoria]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Cargar catálogos para filtros
  useEffect(() => {
    Promise.all([
      api.get<{ id: number; nombre: string }[]>('/zonas').catch(() => ({ data: [] })),
      api.get<{ id: number; nombre: string }[]>('/categorias-clientes').catch(() => ({ data: [] })),
    ]).then(([zonasRes, categoriasRes]) => {
      setZonas(zonasRes.data);
      setCategorias(categoriasRes.data);
    });
  }, []);

  const handleCreateClient = () => {
    router.push('/clients/new');
  };

  const handleEditClient = (client: Client) => {
    router.push(`/clients/${client.id}/edit`);
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (client: Client) => {
    try {
      setTogglingId(client.id);
      const newActive = !client.isActive;
      await api.patch(`/clientes/${client.id}/activo`, { activo: newActive });
      toast.success(newActive ? 'Cliente activado' : 'Cliente desactivado');
      setClients(prev => prev.map(c =>
        c.id === client.id ? { ...c, isActive: newActive } : c
      ));
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error('Error al cambiar el estado del cliente');
    } finally {
      setTogglingId(null);
    }
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
    const visIds = clients.map(c => parseInt(c.id));
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

      await api.patch('/clientes/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} cliente${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
      setClients(prev => prev.map(c =>
        ids.includes(parseInt(c.id)) ? { ...c, isActive: activo } : c
      ));
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de los clientes');
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, searchTerm, selectedZona, selectedCategoria, showInactive]);

  // Computed selection state
  const visibleIds = clients.map(c => parseInt(c.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  // Calcular rango de items mostrados
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalClients);

  // Generar numeros de pagina para mostrar
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

  // Obtener iniciales del cliente
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
      <div className="space-y-6">
        {/* Top Bar with Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Clientes' },
          ]} />
          <div className="flex items-center gap-4">
            <Search className="w-[18px] h-[18px] text-blue-400 cursor-pointer hover:text-gray-700" />
            <Bell className="w-[18px] h-[18px] text-amber-400 cursor-pointer hover:text-gray-700" />
          </div>
        </div>

        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Clientes
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              <Map className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline">Mapa</span>
            </button>
            <ExportButton entity="clientes" label="Exportar" />
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              data-tour="clients-add-btn"
              onClick={handleCreateClient}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo cliente</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-64" data-tour="clients-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="w-[180px]" data-tour="clients-zone-filter">
            <SearchableSelect
              options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
              value={selectedZona}
              onChange={(val) => { setSelectedZona(val ? Number(val) : null); setCurrentPage(1); }}
              placeholder="Todas las zonas"
              searchPlaceholder="Buscar zona..."
            />
          </div>
          <div className="w-[200px]" data-tour="clients-category-filter">
            <SearchableSelect
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
              value={selectedCategoria}
              onChange={(val) => { setSelectedCategoria(val ? Number(val) : null); setCurrentPage(1); }}
              placeholder="Todas las categorías"
              searchPlaceholder="Buscar categoría..."
            />
          </div>
          <button
            onClick={fetchClients}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Toggle para mostrar inactivos */}
          <div className="flex items-center gap-2 ml-auto" data-tour="clients-toggle-inactive">
            <span className="text-xs text-gray-600">Mostrar inactivos</span>
            <button
              onClick={() => {
                setShowInactive(!showInactive);
                setCurrentPage(1);
              }}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                showInactive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={showInactive ? 'Mostrando todos los clientes' : 'Solo clientes activos'}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                showInactive ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={fetchClients} className="ml-4 underline hover:no-underline">
              Reintentar
            </button>
          </div>
        )}

        {/* Selection Action Bar */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-700">
                {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
              </span>
              {selectedCount < totalClients && (
                <span className="text-xs text-blue-500">
                  de {totalClients} clientes
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

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="text-sm text-gray-500 mt-2">Cargando...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">No hay clientes</p>
                <p className="text-sm mt-1">
                  {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primer cliente'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateClient}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Cliente
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Client Cards */}
          {!loading && clients.map((client) => (
            <div
              key={client.id}
              className={`border border-gray-200 rounded-lg p-3 bg-white ${
                !client.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Row 1: Checkbox + Avatar + Name/Code + Toggle */}
              <div className="flex items-center gap-3 mb-2">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleSelect(parseInt(client.id))}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedIds.has(parseInt(client.id))
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {selectedIds.has(parseInt(client.id)) && <Check className="w-3 h-3" />}
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {getInitials(client.name)}
                </div>

                {/* Name and Code */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {client.name}
                  </div>
                  <div className="text-xs text-gray-500">{client.code}</div>
                </div>

                {/* Toggle Active */}
                <button
                  onClick={() => handleToggleActive(client)}
                  disabled={togglingId === client.id || loading}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex-shrink-0 ${
                    client.isActive ? 'bg-green-500' : 'bg-gray-300'
                  } ${togglingId === client.id ? 'opacity-50' : ''}`}
                  title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                    client.isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}>
                    {client.isActive ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                  </span>
                </button>
              </div>

              {/* Row 2: Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Zone Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                  {client.zoneName || 'Sin zona'}
                </span>

                {/* Category Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                  {client.categoryName || 'Sin categoría'}
                </span>

                {/* Saldo Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                  Saldo: $0.00
                </span>
              </div>

              {/* Row 3: Actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleEditClient(client)}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Clients Table - Desktop */}
        <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden overflow-x-auto" data-tour="clients-table">
          {/* Table Header - Always visible */}
          <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[900px]">
            <div className="w-[28px] flex items-center justify-center">
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
            </div>
            <div className="flex-1 min-w-[250px] text-[11px] font-medium text-gray-500 uppercase">Cliente</div>
            <div className="w-[100px] text-[11px] font-medium text-gray-500 uppercase">Zona</div>
            <div className="w-[130px] text-[11px] font-medium text-gray-500 uppercase">Categoria</div>
            <div className="w-[90px] text-[11px] font-medium text-gray-500 uppercase hidden md:block">Saldo</div>
            <div className="w-[110px] text-[11px] font-medium text-gray-500 uppercase hidden lg:block">Lim. credito</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
            <div className="w-8"></div>
          </div>

          {/* Table Body - With loading overlay */}
          <div className="relative min-h-[200px]">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="text-sm text-gray-500">Cargando...</span>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && clients.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-white text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium">No hay clientes</p>
                  <p className="text-sm">
                    {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primer cliente'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreateClient}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Cliente
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Table Rows - With opacity transition */
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {clients.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[900px] ${
                    !client.isActive ? 'bg-gray-50' : ''
                  }`}
                >
                  {/* Checkbox column */}
                  <div className="w-[28px] flex items-center justify-center">
                    <button
                      onClick={() => handleToggleSelect(parseInt(client.id))}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedIds.has(parseInt(client.id))
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {selectedIds.has(parseInt(client.id)) && <Check className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Cliente column */}
                  <div className="flex-1 min-w-[250px] flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {getInitials(client.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {client.name} ({client.code})
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Creado por Admin
                      </div>
                    </div>
                  </div>

                  {/* Zona column */}
                  <div className="w-[100px]">
                    <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {client.zoneName || 'Sin zona'}
                    </span>
                  </div>

                  {/* Categoria column */}
                  <div className="w-[130px]">
                    <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {client.categoryName || 'Sin categoria'}
                    </span>
                  </div>

                  {/* Saldo column */}
                  <div className="w-[90px] hidden md:block">
                    <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      $0.00
                    </span>
                  </div>

                  {/* Limite credito column */}
                  <div className="w-[110px] hidden lg:block">
                    <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      $0.00
                    </span>
                  </div>

                  {/* Toggle active column */}
                  <div className="w-[50px] flex items-center justify-center">
                    <button
                      onClick={() => handleToggleActive(client)}
                      disabled={togglingId === client.id || loading}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                        client.isActive ? 'bg-green-500' : 'bg-gray-300'
                      } ${togglingId === client.id ? 'opacity-50' : ''}`}
                      title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                        client.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}>
                        {client.isActive ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                      </span>
                    </button>
                  </div>

                  {/* Edit column */}
                  <div className="w-8 flex justify-center">
                    <button
                      onClick={() => handleEditClient(client)}
                      disabled={loading}
                      className="p-1 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination - Always visible when there are clients */}
        {(clients.length > 0 || loading) && totalClients > 0 && (
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500 order-2 sm:order-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Mostrando {startItem}-{endItem} de {totalClients} clientes
            </span>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && !loading && setCurrentPage(page)}
                    disabled={page === '...' || loading}
                    className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white'
                        : page === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="clientes"
          entityLabel="clientes"
          onSuccess={() => fetchClients()}
        />

        {/* Batch Confirm Modal */}
        {isBatchConfirmOpen && (
          <Modal
            isOpen={isBatchConfirmOpen}
            onClose={() => setIsBatchConfirmOpen(false)}
            title={`${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} cliente${selectedCount > 1 ? 's' : ''}?`}
          >
            <div className="py-4">
              <p className="text-gray-500">
                Estas seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
                <strong>{selectedCount}</strong> cliente{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}?
                {batchAction === 'deactivate' && ' Los clientes desactivados no apareceran en las listas activas.'}
                {batchAction === 'activate' && ' Los clientes activados volveran a aparecer en las listas activas.'}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setIsBatchConfirmOpen(false)}
                disabled={batchLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchToggle}
                disabled={batchLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                  batchAction === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {batchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
              </button>
            </div>
          </Modal>
        )}

      </div>
  );
}
