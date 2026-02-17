'use client';

import React from 'react';
import { Calendar, Search } from 'lucide-react';

interface ReportFiltersProps {
  desde: string;
  hasta: string;
  onDesdeChange: (val: string) => void;
  onHastaChange: (val: string) => void;
  onApply: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ReportFilters({ desde, hasta, onDesdeChange, onHastaChange, onApply, loading, children }: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200" data-tour="report-filters">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Desde</label>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="date"
            value={desde}
            onChange={(e) => onDesdeChange(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Hasta</label>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="date"
            value={hasta}
            onChange={(e) => onHastaChange(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      {children}
      <button
        onClick={onApply}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        <Search className="w-3.5 h-3.5" />
        {loading ? 'Cargando...' : 'Consultar'}
      </button>
    </div>
  );
}
