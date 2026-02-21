'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Search, ChevronDown, Check, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  description?: string;
  imageUrl?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados',
  disabled = false,
  error = false,
  className,
  onSelectAll,
  onClearAll,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const term = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        o.description?.toLowerCase().includes(term)
    );
  }, [options, search]);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex items-center justify-between w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
            error ? 'border-red-500' : 'border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <span className={cn('flex items-center gap-2', selected ? 'text-gray-900' : 'text-gray-400')}>
            {selected?.imageUrl && (
              <img src={selected.imageUrl} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
            )}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <div className="flex items-center gap-1">
            {selected && !disabled && (
              <span
                role="button"
                className="p-0.5 hover:bg-gray-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[70] w-[var(--radix-popover-trigger-width)] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          sideOffset={4}
          align="start"
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Bulk actions */}
          {(onSelectAll || onClearAll) && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              {onSelectAll && options.length > 0 && (
                <button
                  type="button"
                  onClick={() => { onSelectAll(); setOpen(false); }}
                  className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
                >
                  Seleccionar todos ({options.length})
                </button>
              )}
              {onClearAll && (
                <button
                  type="button"
                  onClick={() => { onClearAll(); setOpen(false); }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium hover:underline ml-auto"
                >
                  Quitar todos
                </button>
              )}
            </div>
          )}

          {/* Options list */}
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors',
                      isSelected
                        ? 'bg-green-50 text-green-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    )}
                  >
                    <div className="w-4 flex-shrink-0">
                      {isSelected && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                    {option.imageUrl !== undefined && (
                      option.imageUrl ? (
                        <img src={option.imageUrl} alt="" className="w-11 h-11 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-400 truncate">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
