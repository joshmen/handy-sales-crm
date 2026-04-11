import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** When this key changes, actions + subtitle animate in */
  actionsKey?: string;
  children: React.ReactNode;
}

/**
 * Reusable page layout with a sticky header bar (breadcrumb + title + actions)
 * and a scrollable body. Used by all list/CRUD pages in the dashboard.
 */
export function PageHeader({ breadcrumbs, title, subtitle, actions, actionsKey, children }: PageHeaderProps) {
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
              <p key={actionsKey} className={`text-sm text-muted-foreground mt-1${actionsKey ? ' animate-fade-in' : ''}`}>{subtitle}</p>
            )}
          </div>
          {actions && (
            <div key={actionsKey} className={`flex items-center gap-2${actionsKey ? ' animate-fade-in' : ''}`}>
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
