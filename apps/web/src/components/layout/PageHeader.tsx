import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Truck, BarChart3, Users, Receipt } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { getSectionAccent, accentTileBg, SECTION_LABEL, type SectionKey } from '@/lib/sectionAccent';

/** Icon component accepting `size` — compatible with lucide-react and Phosphor icons. */
type HeaderIcon = React.ComponentType<{ size?: number; className?: string }>;

/** Fallback icon per section so a page can opt into the SLDS header with just `section`. */
const SECTION_DEFAULT_ICON: Record<SectionKey, HeaderIcon> = {
  navegacion: LayoutDashboard,
  ventas: ShoppingCart,
  catalogo: Package,
  operacion: Truck,
  herramientas: BarChart3,
  equipo: Users,
  empresa: Receipt,
};

interface PageHeaderProps {
  /** Legacy breadcrumb header (used when `icon` is not provided). */
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** When this key changes, actions + subtitle animate in */
  actionsKey?: string;
  /** SLDS header: icon tile tinted with the section accent. */
  icon?: HeaderIcon;
  /** Section key driving the accent color (tile). */
  section?: SectionKey;
  /** Eyebrow label above the title; defaults to the section label. */
  eyebrow?: string;
  children: React.ReactNode;
}

/**
 * Reusable page layout: sticky header bar + scrollable body. Used by all dashboard
 * pages. Two header modes:
 *  - SLDS (rediseño visual): pass `icon` + `section` → tinted icon tile + eyebrow + title.
 *  - Legacy: pass `breadcrumbs` → breadcrumb + title (kept for pages not yet migrated).
 */
export function PageHeader({ breadcrumbs, title, subtitle, actions, actionsKey, icon: Icon, section, eyebrow, children }: PageHeaderProps) {
  const ResolvedIcon = Icon ?? (section ? SECTION_DEFAULT_ICON[section] : undefined);
  const slds = !!ResolvedIcon;
  const accent = getSectionAccent(section);
  const eyebrowText = eyebrow ?? (section ? SECTION_LABEL[section] : undefined);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card px-4 py-4 sm:px-8 sm:py-5 border-b border-border relative z-10">
        {slds ? (
          <div className="flex items-center gap-3.5 page-animate page-animate-delay-1">
            <div
              className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center flex-shrink-0"
              style={{ background: accentTileBg(accent), color: accent }}
            >
              {ResolvedIcon && <ResolvedIcon size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              {eyebrowText && (
                <div className="text-[11.5px] font-semibold tracking-wide text-muted-foreground">{eyebrowText}</div>
              )}
              <h1 className="text-xl sm:text-[22px] font-bold tracking-tight text-foreground leading-tight">{title}</h1>
              {subtitle && (
                <p key={actionsKey} className={`text-[12.5px] text-muted-foreground mt-0.5${actionsKey ? ' animate-fade-in' : ''}`}>{subtitle}</p>
              )}
            </div>
            {actions && (
              <div key={actionsKey} className={`flex items-center gap-2 flex-wrap flex-shrink-0${actionsKey ? ' animate-fade-in' : ''}`}>
                {actions}
              </div>
            )}
          </div>
        ) : (
          <>
            {breadcrumbs && (
              <div className="page-animate">
                <Breadcrumb items={breadcrumbs} />
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between page-animate page-animate-delay-1">
              <div>
                <h1 className="text-xl sm:text-[22px] font-bold tracking-tight text-foreground leading-tight">{title}</h1>
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
          </>
        )}
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
