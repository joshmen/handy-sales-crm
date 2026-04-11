'use client';

import React from 'react';
import { Power, PowerOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BatchActionBarProps {
  selectedCount: number;
  totalItems?: number;
  entityLabel: string;
  onActivate: () => void;
  onDeactivate: () => void;
  onClear: () => void;
  loading?: boolean;
  className?: string;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  totalItems,
  entityLabel,
  onActivate,
  onDeactivate,
  onClear,
  loading = false,
  className,
}) => {
  const tc = useTranslations('common');
  if (selectedCount === 0) return null;

  return (
    <div className={`flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-blue-700">
          {tc('selectedCount', { count: selectedCount })}
        </span>
        {totalItems != null && selectedCount < totalItems && (
          <span className="text-xs text-blue-500">
            {tc('ofTotal', { total: totalItems, label: entityLabel })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDeactivate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <PowerOff className="w-3 h-3" />
          <span>{tc('deactivate')}</span>
        </button>
        <button
          onClick={onActivate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-600 bg-white border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          <Power className="w-3 h-3" />
          <span>{tc('activate')}</span>
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground/80 transition-colors"
        >
          <X className="w-3 h-3" />
          <span>{tc('cancel')}</span>
        </button>
      </div>
    </div>
  );
};
