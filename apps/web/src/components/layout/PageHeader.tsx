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
      <div className="bg-card px-4 py-4 sm:px-8 sm:py-6 border-b border-border relative z-10">
        <div className="page-animate">
          <Breadcrumb items={breadcrumbs} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between page-animate page-animate-delay-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
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
        <div className="px-4 py-4 sm:px-8 sm:py-6 page-animate page-animate-delay-2">
          {children}
        </div>
      </div>
    </div>
  );
}
