'use client';

import React, { useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ListPagination } from './ListPagination';
import { TableLoadingOverlay } from './TableLoadingOverlay';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface DataGridColumn<T> {
  key: string;
  label: string;
  width?: number | string;
  sortable?: boolean;
  hiddenOnMobile?: boolean;
  align?: 'left' | 'center' | 'right';
  cellRenderer?: (item: T, index: number) => React.ReactNode;
  headerRenderer?: () => React.ReactNode;
}

export interface DataGridPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export interface DataGridSort {
  key: string;
  direction: 'asc' | 'desc';
  onSort: (key: string) => void;
}

export interface DataGridSelection {
  selectedIds: Set<string | number>;
  onToggle: (id: string | number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;

  pagination?: DataGridPagination;
  sort?: DataGridSort;
  selection?: DataGridSelection;

  onRowClick?: (item: T) => void;

  loading?: boolean;
  loadingMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;

  mobileCardRenderer?: (item: T) => React.ReactNode;

  className?: string;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function DataGrid<T>({
  columns,
  data,
  keyExtractor,
  pagination,
  sort,
  selection,
  onRowClick,
  loading = false,
  loadingMessage,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  mobileCardRenderer,
  className,
}: DataGridProps<T>) {
  const tg = useTranslations('dataGrid');
  const resolvedEmptyTitle = emptyTitle || tg('emptyTitle');
  const allSelected = selection && data.length > 0 && data.every(item => selection.selectedIds.has(keyExtractor(item)));
  const someSelected = selection && data.some(item => selection.selectedIds.has(keyExtractor(item)));

  const handleHeaderCheckbox = useCallback(() => {
    if (!selection) return;
    if (allSelected) {
      selection.onClearAll();
    } else {
      selection.onSelectAll();
    }
  }, [selection, allSelected]);

  const handleSort = useCallback((key: string) => {
    if (!sort) return;
    sort.onSort(key);
  }, [sort]);

  const getSortIcon = (key: string) => {
    if (!sort || sort.key !== key) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sort.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 text-gray-700" />
      : <ArrowDown className="w-3 h-3 text-gray-700" />;
  };

  const getColumnStyle = (col: DataGridColumn<T>): React.CSSProperties => {
    if (col.width === 'flex' || !col.width) return { flex: 1, minWidth: 0 };
    return { width: typeof col.width === 'number' ? `${col.width}px` : col.width, flexShrink: 0 };
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden relative ${className || ''}`}>
      {/* ─── Loading Overlay (only when refreshing existing data) ─── */}
      {loading && data.length > 0 && <TableLoadingOverlay loading={true} message={loadingMessage} />}

      {/* ─── Desktop Table ─── */}
      <div className="hidden sm:block">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/80 border-b border-gray-200">
          {selection && (
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected || false}
                ref={(el) => { if (el) el.indeterminate = !allSelected && (someSelected || false); }}
                onChange={handleHeaderCheckbox}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
              />
            </div>
          )}
          {columns.map(col => (
            <div
              key={col.key}
              style={getColumnStyle(col)}
              className={`
                text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none
                ${col.hiddenOnMobile ? 'hidden md:block' : ''}
                ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                ${col.sortable ? 'cursor-pointer hover:text-gray-700 transition-colors' : ''}
              `}
              onClick={col.sortable ? () => handleSort(col.key) : undefined}
            >
              {col.headerRenderer ? col.headerRenderer() : (
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && getSortIcon(col.key)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className={loading && data.length > 0 ? 'opacity-50 pointer-events-none' : ''}>
          {loading && data.length === 0 ? (
            <div>
              {Array.from({ length: pagination?.pageSize || 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                  {columns.map(col => (
                    <div key={col.key} style={getColumnStyle(col)} className={col.hiddenOnMobile ? 'hidden md:block' : ''}>
                      <div className={`h-4 bg-gray-200 rounded ${col.key === 'status' ? 'w-16' : 'w-3/4'}`} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : data.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              {emptyIcon && <div className="mb-3 text-gray-300">{emptyIcon}</div>}
              <p className="text-sm font-medium text-gray-500">{resolvedEmptyTitle}</p>
              {emptyMessage && <p className="text-xs text-gray-400 mt-1">{emptyMessage}</p>}
            </div>
          ) : (
            data.map((item, idx) => {
              const id = keyExtractor(item);
              const isSelected = selection?.selectedIds.has(id);
              return (
                <div
                  key={String(id)}
                  className={`
                    flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                    ${isSelected ? 'bg-green-50/50' : ''}
                  `}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {selection && (
                    <div className="w-8 flex-shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={() => selection.onToggle(id)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                    </div>
                  )}
                  {columns.map(col => (
                    <div
                      key={col.key}
                      style={getColumnStyle(col)}
                      className={`
                        text-[13px] text-gray-900 truncate
                        ${col.hiddenOnMobile ? 'hidden md:block' : ''}
                        ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                      `}
                    >
                      {col.cellRenderer
                        ? col.cellRenderer(item, idx)
                        : String((item as Record<string, unknown>)[col.key] ?? '')
                      }
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Mobile Cards ─── */}
      <div className="sm:hidden">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            {emptyIcon && <div className="mb-3 text-gray-300">{emptyIcon}</div>}
            <p className="text-sm font-medium text-gray-500">{resolvedEmptyTitle}</p>
            {emptyMessage && <p className="text-xs text-gray-400 mt-1">{emptyMessage}</p>}
          </div>
        ) : (
          <div className={`divide-y divide-gray-100 ${loading ? 'opacity-50' : ''}`}>
            {data.map(item => (
              <div
                key={String(keyExtractor(item))}
                className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {mobileCardRenderer
                  ? mobileCardRenderer(item)
                  : (
                    <div className="space-y-1">
                      {columns.filter(c => !c.hiddenOnMobile).map(col => (
                        <div key={col.key} className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 uppercase">{col.label}</span>
                          <span className="text-[13px] text-gray-900">
                            {col.cellRenderer
                              ? col.cellRenderer(item, 0)
                              : String((item as Record<string, unknown>)[col.key] ?? '')
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Pagination ─── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50/50">
          <span className="text-[12px] text-gray-500">
            {tg('showingRange', { start: ((pagination.currentPage - 1) * pagination.pageSize) + 1, end: Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems), total: pagination.totalItems })}
          </span>
          <ListPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}

      {/* ─── Single page footer ─── */}
      {pagination && pagination.totalPages <= 1 && pagination.totalItems > 0 && (
        <div className="px-5 py-2.5 border-t border-gray-200 bg-gray-50/50">
          <span className="text-[12px] text-gray-500">
            {tg('showingTotal', { total: pagination.totalItems, plural: pagination.totalItems !== 1 ? 's' : '' })}
          </span>
        </div>
      )}
    </div>
  );
}
