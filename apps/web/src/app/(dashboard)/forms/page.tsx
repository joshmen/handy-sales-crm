'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  MoreHorizontal,
  FileText,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface Form {
  id: string;
  name: string;
  version: number;
  lastUpdated: Date;
  forceClientSelection: boolean;
  responseCount: number;
  autoSendToClient: boolean;
  isEnabled: boolean;
}

const mockForms: Form[] = [
  {
    id: '191095',
    name: 'Apertura de línea de crédito',
    version: 1,
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    forceClientSelection: true,
    responseCount: 0,
    autoSendToClient: false,
    isEnabled: true,
  },
  {
    id: '191096',
    name: 'Producto de competencia',
    version: 1,
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    forceClientSelection: true,
    responseCount: 0,
    autoSendToClient: false,
    isEnabled: true,
  },
  {
    id: '191097',
    name: 'Otros resultados de no compra',
    version: 1,
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    forceClientSelection: true,
    responseCount: 0,
    autoSendToClient: false,
    isEnabled: true,
  },
  {
    id: '191098',
    name: 'Encuesta de satisfacción',
    version: 2,
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    forceClientSelection: false,
    responseCount: 45,
    autoSendToClient: true,
    isEnabled: true,
  },
  {
    id: '191099',
    name: 'Registro de queja',
    version: 1,
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    forceClientSelection: true,
    responseCount: 12,
    autoSendToClient: true,
    isEnabled: false,
  },
];

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisabled, setShowDisabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setForms(mockForms);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredForms = forms.filter(f => showDisabled || f.isEnabled);

  const totalItems = filteredForms.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedForms = filteredForms.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'hoy';
    if (days === 1) return 'hace un día';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
    return date.toLocaleDateString('es-MX');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] mb-4">
          <span className="text-gray-500">Tablero</span>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-900 font-semibold">Formularios</span>
        </div>

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Formularios {totalItems}
            </h1>
            <button data-tour="forms-create-btn" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Crear</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {/* Controls Row */}
            <div className="flex items-center justify-between mb-4">
              {/* Toggle */}
              <button
                data-tour="forms-toggle-inactive"
                onClick={() => setShowDisabled(!showDisabled)}
                className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showDisabled ? (
                  <ToggleRight className="w-9 h-5 text-green-600" />
                ) : (
                  <ToggleLeft className="w-9 h-5 text-gray-400" />
                )}
                <span>Mostrar inactivos</span>
              </button>

              {/* Page Size */}
              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                <span>Muestra 10</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>

            {/* Table */}
            <div data-tour="forms-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : paginatedForms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay formularios</h3>
                  <p className="text-sm text-gray-500 text-center">
                    Crea tu primer formulario para comenzar
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                    <div className="w-[60px] text-xs font-semibold text-gray-600">ID</div>
                    <div className="w-[200px] text-xs font-semibold text-gray-600">Nombre</div>
                    <div className="w-[70px] text-xs font-semibold text-gray-600">Versión</div>
                    <div className="w-[140px] text-xs font-semibold text-gray-600">Última actualización</div>
                    <div className="flex-1 text-xs font-semibold text-gray-600">Forzar selección de cliente</div>
                    <div className="w-[100px] text-xs font-semibold text-gray-600">Veces respondido</div>
                    <div className="w-[160px] text-xs font-semibold text-gray-600">Envío automático a cliente</div>
                    <div className="w-[80px] text-xs font-semibold text-gray-600">Activo</div>
                    <div className="w-[60px] text-xs font-semibold text-gray-600">Acciones</div>
                  </div>

                  {/* Table Rows */}
                  {paginatedForms.map((form) => (
                    <div
                      key={form.id}
                      className={`flex items-center px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !form.isEnabled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-[60px] text-[13px] text-gray-700">{form.id}</div>
                      <div className="w-[200px] text-[13px] text-gray-900 font-medium truncate">
                        {form.name}
                      </div>
                      <div className="w-[70px] text-[13px] text-gray-700">{form.version}</div>
                      <div className="w-[140px] text-[13px] text-gray-500">
                        {formatRelativeTime(form.lastUpdated)}
                      </div>
                      <div className="flex-1">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                          form.forceClientSelection
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {form.forceClientSelection ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div className="w-[100px] text-[13px] text-gray-700">{form.responseCount}</div>
                      <div className="w-[160px] text-[13px] text-gray-700">
                        {form.autoSendToClient ? 'Sí' : 'No'}
                      </div>
                      <div className="w-[80px]">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                          form.isEnabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {form.isEnabled ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div className="w-[60px] flex justify-center">
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
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
                  Mostrando {startItem}-{endItem} de {totalItems} formularios
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Anterior
                  </button>

                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 px-2 text-sm rounded-md transition-colors ${
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
                    className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
