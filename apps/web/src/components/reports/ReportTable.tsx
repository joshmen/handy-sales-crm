'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface ReportColumn<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface ReportTableProps<T> {
  data: T[];
  columns: ReportColumn<T>[];
  emptyMessage?: string;
  maxHeight?: string;
  showIndex?: boolean;
  footerRow?: Record<string, React.ReactNode>;
}

export function ReportTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'Sin datos para el período seleccionado',
  maxHeight = '500px',
  showIndex,
  footerRow,
}: ReportTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight }} data-tour="report-table">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {showIndex && (
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 border-b border-gray-200 w-10">#</th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-medium text-gray-500 border-b border-gray-200 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.sortable ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {showIndex && (
                <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
              )}
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-gray-700 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(item, i) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {footerRow && (
            <tr className="bg-gray-50 font-medium border-t border-gray-300">
              {showIndex && <td className="px-3 py-2"></td>}
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-gray-900 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {footerRow[col.key] ?? ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
