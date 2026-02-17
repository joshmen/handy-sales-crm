'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Unit } from '@/types/catalogs';
import { unitService } from '@/services/api/units';
import { toast } from '@/hooks/useToast';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Ruler,
  ToggleLeft,
  ToggleRight,
  Edit,
  Trash2,
} from 'lucide-react';

interface ExtendedUnit extends Unit {
  activo?: boolean;
  productosActivos?: number;
  productosInactivos?: number;
  ultimaModificacion?: string;
  modificadoPor?: string;
}

const mockUnits: ExtendedUnit[] = [
  {
    id: 1,
    nombre: 'Pieza',
    abreviatura: 'PZA',
    activo: true,
    productosActivos: 150,
    productosInactivos: 10,
    ultimaModificacion: '2025-01-15',
    modificadoPor: 'Admin',
  },
  {
    id: 2,
    nombre: 'Kilogramo',
    abreviatura: 'KG',
    activo: true,
    productosActivos: 45,
    productosInactivos: 3,
    ultimaModificacion: '2025-01-14',
    modificadoPor: 'Admin',
  },
  {
    id: 3,
    nombre: 'Litro',
    abreviatura: 'LT',
    activo: true,
    productosActivos: 38,
    productosInactivos: 2,
    ultimaModificacion: '2025-01-13',
    modificadoPor: 'Juan Pérez',
  },
  {
    id: 4,
    nombre: 'Caja',
    abreviatura: 'CJA',
    activo: true,
    productosActivos: 85,
    productosInactivos: 5,
    ultimaModificacion: '2025-01-12',
    modificadoPor: 'Admin',
  },
  {
    id: 5,
    nombre: 'Paquete',
    abreviatura: 'PAQ',
    activo: true,
    productosActivos: 62,
    productosInactivos: 4,
    ultimaModificacion: '2025-01-10',
    modificadoPor: 'María García',
  },
  {
    id: 6,
    nombre: 'Metro',
    abreviatura: 'MT',
    activo: false,
    productosActivos: 0,
    productosInactivos: 8,
    ultimaModificacion: '2024-12-20',
    modificadoPor: 'Admin',
  },
  {
    id: 7,
    nombre: 'Gramo',
    abreviatura: 'GR',
    activo: true,
    productosActivos: 25,
    productosInactivos: 1,
    ultimaModificacion: '2025-01-08',
    modificadoPor: 'Carlos López',
  },
  {
    id: 8,
    nombre: 'Mililitro',
    abreviatura: 'ML',
    activo: true,
    productosActivos: 18,
    productosInactivos: 2,
    ultimaModificacion: '2025-01-05',
    modificadoPor: 'Admin',
  },
];

export default function UnitsPage() {
  const [units, setUnits] = useState<ExtendedUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisabled, setShowDisabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      // Try API first, fallback to mock
      try {
        const data = await unitService.getAll();
        setUnits(data.map(unit => ({ ...unit, activo: true })));
      } catch {
        // Use mock data if API fails
        setUnits(mockUnits);
      }
    } catch (err) {
      console.error('Error al cargar unidades:', err);
      toast.error('Error al cargar las unidades de medida');
      setUnits(mockUnits);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredUnits = showDisabled
    ? units
    : units.filter(unit => unit.activo !== false);

  const totalItems = filteredUnits.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedUnits = filteredUnits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-200">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] mb-4">
            <span className="text-gray-500">Catálogos</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-900">Unidades de medida</span>
          </div>

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Unidades de medida
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                {totalItems}
              </span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Agregar unidad</span>
            </button>
          </div>
        </div>

        {/* Toggle Row */}
        <div className="bg-white px-8 py-4 border-b border-gray-200">
          <button
            onClick={() => setShowDisabled(!showDisabled)}
            className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showDisabled ? (
              <ToggleRight className="w-5 h-5 text-green-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            )}
            <span>Mostrar inactivas</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : paginatedUnits.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <Ruler className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay unidades</h3>
                  <p className="text-sm text-gray-500 text-center">
                    Agrega tu primera unidad de medida
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                    <div className="w-[200px] text-xs font-semibold text-gray-700">Nombre</div>
                    <div className="w-[100px] text-xs font-semibold text-gray-700">Abreviatura</div>
                    <div className="flex-1 text-xs font-semibold text-gray-700 text-center">Productos activos</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-700 text-center">Productos inactivos</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-700">Última modif.</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-700">Modificado por</div>
                    <div className="w-[80px] text-xs font-semibold text-gray-700 text-center">Acciones</div>
                  </div>

                  {/* Table Rows */}
                  {paginatedUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        unit.activo === false ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-[200px]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Ruler className="w-4 h-4 text-orange-600" />
                          </div>
                          <span className="text-[13px] font-medium text-blue-600">{unit.nombre}</span>
                        </div>
                      </div>
                      <div className="w-[100px] text-[13px] text-gray-700 font-mono">
                        {unit.abreviatura || '-'}
                      </div>
                      <div className="flex-1 text-[13px] text-gray-700 text-center">
                        {unit.productosActivos ?? 0}
                      </div>
                      <div className="w-[120px] text-[13px] text-gray-400 text-center">
                        {unit.productosInactivos ?? 0}
                      </div>
                      <div className="w-[120px] text-[13px] text-gray-600">
                        {unit.ultimaModificacion || '-'}
                      </div>
                      <div className="w-[120px] text-[13px] text-gray-600 truncate">
                        {unit.modificadoPor || '-'}
                      </div>
                      <div className="w-[80px] flex items-center justify-center gap-1">
                        <button
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                  Mostrando {startItem}-{endItem} de {totalItems} unidades
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
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
