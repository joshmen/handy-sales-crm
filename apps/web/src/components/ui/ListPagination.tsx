'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  loading?: boolean;
  className?: string;
}

export const ListPagination: React.FC<ListPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel,
  loading = false,
  className,
}) => {
  const tc = useTranslations('common');
  const resolvedLabel = itemLabel || tc('records');
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = (): (number | string)[] => {
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

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'} ${className ?? ''}`}>
      <span className="text-sm text-muted-foreground">
        {tc('showing')} {startItem}-{endItem} {tc('of')} {totalItems} {resolvedLabel}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || loading}
          className="px-3 py-2 border border-border-subtle rounded-md text-foreground/70 hover:bg-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => (
            <button
              key={idx}
              onClick={() => typeof page === 'number' && !loading && onPageChange(page)}
              disabled={page === '...' || loading}
              className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                page === currentPage
                  ? 'bg-success text-success-foreground'
                  : page === '...'
                  ? 'text-muted-foreground cursor-default'
                  : 'text-foreground/70 hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || loading}
          className="px-3 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
