'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Search } from 'lucide-react';

interface ProductFamilyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showDisabled: boolean;
  onShowDisabledChange: (value: boolean) => void;
}

export const ProductFamilyFilters: React.FC<ProductFamilyFiltersProps> = ({
  searchTerm,
  onSearchChange,
  showDisabled,
  onShowDisabledChange,
}) => {
  return (
    <div className="mb-6 space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar familias de productos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Checkbox para mostrar deshabilitadas */}
      <div className="flex items-center space-x-2">
        <input
          id="show-disabled"
          type="checkbox"
          checked={showDisabled}
          onChange={(e) => onShowDisabledChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <Label 
          htmlFor="show-disabled" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Mostrar familias deshabilitadas
        </Label>
      </div>
    </div>
  );
};