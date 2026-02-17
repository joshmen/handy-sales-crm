'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProductFamily } from '@/types/product-families';
import { productFamilyService } from '@/services/api/productFamilies';
import { toast } from '@/hooks/useToast';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  ToggleLeft,
  ToggleRight,
  Edit,
  Trash2,
} from 'lucide-react';

const mockFamilies: ProductFamily[] = [
  {
    id: '1',
    description: 'Bebidas',
    isEnabled: true,
    enabledProducts: 45,
    disabledProducts: 3,
    lastModified: new Date('2025-01-15'),
    modifiedBy: 'Admin',
    createdAt: new Date('2024-06-01'),
    createdBy: 'Admin',
  },
  {
    id: '2',
    description: 'Snacks',
    isEnabled: true,
    enabledProducts: 120,
    disabledProducts: 8,
    lastModified: new Date('2025-01-14'),
    modifiedBy: 'Juan Pérez',
    createdAt: new Date('2024-06-01'),
    createdBy: 'Admin',
  },
  {
    id: '3',
    description: 'Lácteos',
    isEnabled: true,
    enabledProducts: 32,
    disabledProducts: 2,
    lastModified: new Date('2025-01-13'),
    modifiedBy: 'Admin',
    createdAt: new Date('2024-06-15'),
    createdBy: 'Admin',
  },
  {
    id: '4',
    description: 'Abarrotes',
    isEnabled: false,
    enabledProducts: 0,
    disabledProducts: 15,
    lastModified: new Date('2024-12-20'),
    modifiedBy: 'María García',
    createdAt: new Date('2024-07-01'),
    createdBy: 'Admin',
  },
  {
    id: '5',
    description: 'Limpieza',
    isEnabled: true,
    enabledProducts: 78,
    disabledProducts: 5,
    lastModified: new Date('2025-01-10'),
    modifiedBy: 'Admin',
    createdAt: new Date('2024-08-01'),
    createdBy: 'Admin',
  },
  {
    id: '6',
    description: 'Higiene personal',
    isEnabled: true,
    enabledProducts: 56,
    disabledProducts: 4,
    lastModified: new Date('2025-01-08'),
    modifiedBy: 'Carlos López',
    createdAt: new Date('2024-08-15'),
    createdBy: 'Admin',
  },
];

export default function ProductFamiliesPage() {
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisabled, setShowDisabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchFamilies = useCallback(async () => {
    try {
      setLoading(true);
      // Try API first, fallback to mock
      try {
        const data = await productFamilyService.getAll();
        setFamilies(data);
      } catch {
        // Use mock data if API fails
        setFamilies(mockFamilies);
      }
    } catch (err) {
      console.error('Error al cargar familias:', err);
      toast.error('Error al cargar las familias de productos');
      setFamilies(mockFamilies);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const filteredFamilies = showDisabled
    ? families
    : families.filter(fam => fam.isEnabled !== false);

  const totalItems = filteredFamilies.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedFamilies = filteredFamilies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-200">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] mb-4">
            <span className="text-gray-500">Catálogos</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-900">Familias de productos</span>
          </div>

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Familias de productos
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                {totalItems}
              </span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Agregar familia</span>
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
              ) : paginatedFamilies.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <Layers className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay familias</h3>
                  <p className="text-sm text-gray-500 text-center">
                    Agrega tu primera familia de productos
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                    <div className="w-[250px] text-xs font-semibold text-gray-700">Descripción</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-700 text-center">Productos activos</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-700 text-center">Productos inactivos</div>
                    <div className="w-[120px] text-xs font-semibold text-gray-700">Última modif.</div>
                    <div className="flex-1 text-xs font-semibold text-gray-700">Modificado por</div>
                    <div className="w-[80px] text-xs font-semibold text-gray-700 text-center">Acciones</div>
                  </div>

                  {/* Table Rows */}
                  {paginatedFamilies.map((family) => (
                    <div
                      key={family.id}
                      className={`flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        family.isEnabled === false ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-[250px]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Layers className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-[13px] font-medium text-blue-600">{family.description}</span>
                        </div>
                      </div>
                      <div className="w-[120px] text-[13px] text-gray-700 text-center">
                        {family.enabledProducts}
                      </div>
                      <div className="w-[120px] text-[13px] text-gray-400 text-center">
                        {family.disabledProducts}
                      </div>
                      <div className="w-[120px] text-[13px] text-gray-600">
                        {formatDate(family.lastModified)}
                      </div>
                      <div className="flex-1 text-[13px] text-gray-600 truncate">
                        {family.modifiedBy}
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
                  Mostrando {startItem}-{endItem} de {totalItems} familias
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
