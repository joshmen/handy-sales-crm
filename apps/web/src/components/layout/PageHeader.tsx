import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Reusable page layout with a sticky header bar (breadcrumb + title + actions)
 * and a scrollable body. Used by all list/CRUD pages in the dashboard.
 */
export function PageHeader({ breadcrumbs, title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        <Breadcrumb items={breadcrumbs} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-4 sm:px-8 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
