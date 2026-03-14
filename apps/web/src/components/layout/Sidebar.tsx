'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  SbDashboard,
  SbOrders,
  SbPayments,
  SbClients,
  SbProducts,
  SbPriceLists,
  SbDiscounts,
  SbPromotions,
  SbRoutes,
  SbInventory,
  SbZones,
  SbVisits,
  SbForms,
  SbReports,
  SbTeam,
  SbDevices,
  SbAutomations,
  SbGoals,
  SbAI,
  SbSettings,
  SbAdmin,
  SbUsers,
  SbSubscription,
  SbActivityLog,
  SbHelp,
  SbAnnouncements,
  SbBuildings,
  SbBug,
  SbSecurity,
  SbCategory,
  SbFolders,
  SbUnits,
  SbMovements,
  SbUsersGlobal,
  SbIntegrations,
  SbBilling,
} from '@/components/layout/DashboardIcons';
import { useSidebar } from '@/stores/useUIStore';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useCompany } from '@/contexts/CompanyContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useImpersonationStore } from '@/stores/useImpersonationStore';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  submenu?: SidebarItem[];
  permission?: string | string[];
  badge?: string | number;
  section?: string;
}

const sidebarItems: SidebarItem[] = [
  // — Sin header —
  {
    id: 'dashboard',
    label: 'Tablero',
    icon: SbDashboard,
    href: '/dashboard',
    permission: 'view_dashboard',
  },

  // — VENTAS —
  {
    id: 'orders',
    label: 'Pedidos',
    icon: SbOrders,
    href: '/orders',
    permission: 'view_orders',
    section: 'Ventas',
  },
  {
    id: 'cobranza',
    label: 'Cobranza',
    icon: SbPayments,
    href: '/cobranza',
    permission: 'view_orders',
  },

  // — CATÁLOGO —
  {
    id: 'clients',
    label: 'Clientes',
    icon: SbClients,
    permission: 'view_clients',
    section: 'Catálogo',
    submenu: [
      {
        id: 'clients-list',
        label: 'Lista de clientes',
        icon: SbClients,
        href: '/clients',
        permission: 'view_clients',
      },
      {
        id: 'client-categories',
        label: 'Categorías de clientes',
        icon: SbCategory,
        href: '/client-categories',
        permission: 'manage_catalogs',
      },
    ],
  },
  {
    id: 'products',
    label: 'Productos',
    icon: SbProducts,
    permission: 'view_products',
    submenu: [
      {
        id: 'products-list',
        label: 'Lista de productos',
        icon: SbProducts,
        href: '/products',
        permission: 'view_products',
      },
      {
        id: 'product-families',
        label: 'Familias de productos',
        icon: SbFolders,
        href: '/product-families',
        permission: 'view_products',
      },
      {
        id: 'product-categories',
        label: 'Categorías de productos',
        icon: SbCategory,
        href: '/product-categories',
        permission: 'manage_catalogs',
      },
      {
        id: 'units',
        label: 'Unidades de medida',
        icon: SbUnits,
        href: '/units',
        permission: 'manage_catalogs',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Precios',
    icon: SbPriceLists,
    permission: 'view_products',
    submenu: [
      {
        id: 'price-lists',
        label: 'Listas de precios',
        icon: SbPriceLists,
        href: '/price-lists',
        permission: 'view_products',
      },
      {
        id: 'discounts',
        label: 'Descuentos',
        icon: SbDiscounts,
        href: '/discounts',
        permission: 'view_discounts',
      },
      {
        id: 'promotions',
        label: 'Promociones',
        icon: SbPromotions,
        href: '/promotions',
        permission: 'view_promotions',
      },
    ],
  },

  // — OPERACIÓN —
  {
    id: 'routes',
    label: 'Rutas',
    icon: SbRoutes,
    permission: 'view_routes',
    section: 'Operación',
    submenu: [
      {
        id: 'routes-list',
        label: 'Listado de rutas',
        icon: SbRoutes,
        href: '/routes',
        permission: 'view_routes',
      },
      {
        id: 'routes-manage',
        label: 'Administrar rutas',
        icon: SbForms,
        href: '/routes/manage',
        permission: 'view_routes',
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventarios',
    icon: SbInventory,
    permission: 'view_inventory',
    submenu: [
      {
        id: 'inventory-warehouse',
        label: 'Inventario de almacén',
        icon: SbInventory,
        href: '/inventory',
        permission: 'view_inventory',
      },
      {
        id: 'inventory-movements',
        label: 'Movimientos de inventario',
        icon: SbMovements,
        href: '/inventory/movements',
        permission: 'view_inventory',
      },
    ],
  },
  {
    id: 'zones',
    label: 'Zonas',
    icon: SbZones,
    href: '/zones',
    permission: 'view_zones',
  },
  {
    id: 'visits',
    label: 'Visitas',
    icon: SbVisits,
    href: '/visits',
    permission: 'view_visits',
  },

  // — HERRAMIENTAS —
  {
    id: 'forms',
    label: 'Formularios',
    icon: SbForms,
    permission: 'view_dashboard',
    section: 'Herramientas',
    submenu: [
      {
        id: 'form-builder',
        label: 'Constructor',
        icon: SbForms,
        href: '/forms/builder',
        permission: 'view_dashboard',
      },
      {
        id: 'form-list',
        label: 'Mis formularios',
        icon: SbForms,
        href: '/forms',
        permission: 'view_dashboard',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: SbReports,
    href: '/reports',
    permission: 'view_dashboard',
  },
  {
    id: 'metas',
    label: 'Metas',
    icon: SbGoals,
    href: '/metas',
    permission: 'view_metas',
  },
  {
    id: 'automations',
    label: 'Automatizaciones',
    icon: SbAutomations,
    href: '/automations',
    permission: 'view_automations',
  },

  // — EQUIPO —
  {
    id: 'team',
    label: 'Mi Equipo',
    icon: SbTeam,
    href: '/team',
    permission: 'view_team',
    section: 'Equipo',
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: SbUsers,
    href: '/users',
    permission: 'view_users',
  },
  {
    id: 'devices',
    label: 'Dispositivos',
    icon: SbDevices,
    href: '/devices',
    permission: 'manage_devices',
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: SbAdmin,
    href: '/roles',
    permission: 'manage_roles',
  },
  {
    id: 'activity-logs',
    label: 'Registro de actividad',
    icon: SbActivityLog,
    href: '/activity-logs',
    permission: 'view_activity_logs',
  },

  // — EMPRESA —
  {
    id: 'billing',
    label: 'Facturación',
    icon: SbBilling,
    permission: 'manage_billing',
    section: 'Empresa',
    submenu: [
      {
        id: 'billing-dashboard',
        label: 'Resumen',
        icon: SbBilling,
        href: '/billing',
        permission: 'manage_billing',
      },
      {
        id: 'billing-invoices',
        label: 'Facturas',
        icon: SbOrders,
        href: '/billing/invoices',
        permission: 'manage_billing',
      },
      {
        id: 'billing-settings',
        label: 'Configuración Fiscal',
        icon: SbSettings,
        href: '/billing/settings',
        permission: 'manage_billing',
      },
    ],
  },
  {
    id: 'subscription',
    label: 'Suscripción',
    icon: SbSubscription,
    href: '/subscription',
    permission: 'view_settings',
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    icon: SbIntegrations,
    href: '/integrations',
    permission: 'view_settings',
  },
  {
    id: 'company-settings',
    label: 'Configuración',
    icon: SbSettings,
    href: '/settings',
    permission: 'view_company_settings',
  },
  {
    id: 'ai',
    label: 'Asistente IA',
    icon: SbAI,
    href: '/ai',
    permission: 'view_automations',
  },

  // — AYUDA (siempre visible al final) —
  {
    id: 'ayuda',
    label: 'Ayuda',
    icon: SbHelp,
    href: '/ayuda',
    permission: 'view_dashboard',
  },
];

// Sidebar simplificado para SuperAdmin (cuando NO está impersonando)
const superAdminItems: SidebarItem[] = [
  {
    id: 'sa-dashboard',
    label: 'Dashboard',
    icon: SbDashboard,
    href: '/admin/system-dashboard',
  },
  {
    id: 'sa-tenants',
    label: 'Empresas',
    icon: SbBuildings,
    href: '/admin/tenants',
  },
  {
    id: 'sa-global-users',
    label: 'Usuarios Global',
    icon: SbUsersGlobal,
    href: '/admin/global-users',
  },
  {
    id: 'sa-announcements',
    label: 'Anuncios',
    icon: SbAnnouncements,
    href: '/admin/announcements',
  },
  {
    id: 'sa-plans',
    label: 'Planes',
    icon: SbSubscription,
    href: '/admin/subscription-plans',
  },
  {
    id: 'sa-activity-logs',
    label: 'Registro de actividad',
    icon: SbActivityLog,
    href: '/activity-logs',
  },
  {
    id: 'sa-crash-reports',
    label: 'Crash Reports',
    icon: SbBug,
    href: '/admin/crash-reports',
  },
  {
    id: 'sa-security',
    label: 'Seguridad',
    icon: SbSecurity,
    href: '/admin/security',
  },
  {
    id: 'sa-settings',
    label: 'Configuración',
    icon: SbSettings,
    href: '/global-settings',
  },
];

// Permisos por rol — fuente única en lib/permissions.ts
import { ROLE_PERMISSIONS } from '@/lib/permissions';

// Group-based icon color palette — 6 families by section
// Defined at module level so they are not recreated on every render
interface SidebarProps {
  /** Cuando el banner de impersonación está activo, desplazar sidebar 40px */
  isImpersonating?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isImpersonating: isImpersonatingProp }) => {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  // SIEMPRE llamar useCompany para mantener orden de hooks
  const { settings: companySettings } = useCompany();
  const router = useRouter();
  const { profile } = useProfile();
  const { isImpersonating } = useImpersonationStore();
  const isSuperAdminDirect = session?.user?.role === 'SUPER_ADMIN' && !isImpersonating;
  const shouldShowCompanySettings =
    session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR' || session?.user?.role === 'VENDEDOR' || isImpersonating;
  const { open: sidebarOpen, collapsed: sidebarCollapsed, toggle, toggleCollapsed } = useSidebar();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const activeItems = isSuperAdminDirect ? superAdminItems : sidebarItems;

  useEffect(() => {
    // Auto-expandir secciones que contengan la ruta activa
    const itemsToExpand: string[] = [];

    activeItems.forEach(item => {
      if (item.submenu) {
        const hasActiveChild = item.submenu.some(
          subItem => subItem.href && pathname === subItem.href
        );
        if (hasActiveChild) {
          itemsToExpand.push(item.id);
        }
      }
    });

    if (itemsToExpand.length > 0) {
      setExpandedItems(prev => {
        // Solo actualizar si hay cambios
        const newItems = itemsToExpand.filter(id => !prev.includes(id));
        if (newItems.length > 0) {
          return [...prev, ...newItems];
        }
        return prev;
      });
    }
  }, [pathname, activeItems]);

  // Close sidebar on mobile when navigating to a new page
  useEffect(() => {
    if (!isDesktop && sidebarOpen) {
      toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    // Solo coincidencia exacta para evitar que /forms se active cuando estamos en /forms/builder
    return pathname === href;
  };

  const hasPermission = (permission?: string | string[]) => {
    if (!permission) return true;
    if (!session?.user?.role) return false;

    // Cuando impersonamos, usar permisos de ADMIN (no SUPER_ADMIN)
    // para que el sidebar muestre exactamente lo que vería el admin del tenant
    const effectiveRole = (session.user.role === 'SUPER_ADMIN' && isImpersonating)
      ? 'ADMIN'
      : session.user.role;
    const userPermissions = ROLE_PERMISSIONS[effectiveRole] || [];

    if (Array.isArray(permission)) {
      return permission.some(p => userPermissions.includes(p));
    }

    return userPermissions.includes(permission);
  };

  const showLabels = (sidebarOpen && !sidebarCollapsed) || !isDesktop;

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    if (!hasPermission(item.permission)) return null;

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.href);

    // Verificar si algún hijo está activo
    const hasActiveChild =
      hasSubmenu && item.submenu?.some(subItem => subItem.href && pathname === subItem.href);

    const activeState = item.href ? isItemActive : (hasActiveChild || isExpanded);

    const itemContent = (
      <>
        <div
          className={cn(
            'flex items-center justify-center rounded-lg transition-all',
            activeState ? 'opacity-100' : 'opacity-60 group-hover:opacity-100',
            showLabels ? 'w-7 h-7' : 'w-9 h-9'
          )}
        >
          <item.icon size={showLabels ? 22 : 26} />
        </div>

        {showLabels && (
          <>
            <span className={cn('flex-1 truncate', hasSubmenu && 'text-left')}>{item.label}</span>
            <div className="flex items-center gap-2">
              {item.badge && (
                <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                  {item.badge}
                </div>
              )}
              {hasSubmenu && (
                <div
                  className={cn(
                    'w-5 h-5 flex items-center justify-center rounded transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                >
                  <ChevronDown size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          </>
        )}

        {!showLabels && item.badge && (
          <div className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] text-white font-semibold">{item.badge}</span>
          </div>
        )}

        {!showLabels && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
            {item.label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </>
    );

    const wrapperClasses = cn(
      'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
      !item.href && 'w-full',
      level > 0 && 'ml-6 py-2',
      activeState
        ? item.href ? 'bg-primary/10 text-primary shadow-sm' : 'bg-primary/5 text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      !showLabels && 'justify-center px-2'
    );

    return (
      <div key={item.id}>
        {item.href ? (
          <Link href={item.href} className={wrapperClasses}>
            {itemContent}
          </Link>
        ) : (
          <button onClick={() => hasSubmenu && toggleExpanded(item.id)} className={wrapperClasses}>
            {itemContent}
          </button>
        )}

        {hasSubmenu && isExpanded && item.submenu && (
          <div
            className={cn(
              'mt-2 space-y-1 overflow-hidden transition-all duration-300',
              sidebarCollapsed ? 'lg:hidden' : ''
            )}
          >
            {item.submenu.map(subItem => renderSidebarItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // No renderizar hasta que esté montado
  if (!mounted) {
    return null;
  }

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {!isDesktop && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 transition-opacity duration-300"
          onClick={toggle}
        />
      )}

      {/* Modern Google-style Sidebar */}
      <aside
        className={cn(
          'fixed left-0 z-30 bg-card border-r border-border transition-all duration-300 ease-in-out',
          isImpersonatingProp
            ? 'top-[calc(4rem+2.5rem)] h-[calc(100vh-4rem-2.5rem)]'
            : 'top-16 h-[calc(100vh-4rem)]',
          // En móvil: 85% del viewport, en desktop: ancho fijo
          isDesktop
            ? (sidebarCollapsed ? 'w-20' : 'w-72')
            : 'w-[85vw]',
          // Posición: en móvil slide in/out, en desktop siempre visible
          isDesktop
            ? 'translate-x-0'
            : (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
        )}
      >
        <div className="flex h-full flex-col">
          {/* Navigation Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <h2 className="text-sm font-semibold text-foreground">
                  {isSuperAdminDirect ? 'Administración' : 'Navegación'}
                </h2>
              )}
              {/* Collapse toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </Button>

              {/* Mobile close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {activeItems.map(item => {
                if (!hasPermission(item.permission)) return null;
                return (
                  <React.Fragment key={item.id}>
                    {item.section && showLabels && (
                      <div className="pt-4 pb-1 px-3 first:pt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground/70">
                            {item.section}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      </div>
                    )}
                    {renderSidebarItem(item)}
                  </React.Fragment>
                );
              })}
            </nav>

          {/* Getting Started Progress (non-SuperAdmin, non-collapsed) */}
          {!sidebarCollapsed && session?.user && session.user.role !== 'SUPER_ADMIN' && !isImpersonating && (
            <Link
              href="/getting-started"
              className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors group"
            >
              <SbForms size={16} className="text-muted-foreground group-hover:text-green-600 flex-shrink-0" />
              <span className="truncate">Guía de configuración</span>
            </Link>
          )}

          {/* Bottom User Section */}
          {!sidebarCollapsed && session?.user && (
            <div className="border-t border-border p-4">
              {isSuperAdminDirect ? (
                // SuperAdmin (not impersonating) sees their profile
                <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-violet-600/15 text-violet-700 dark:text-violet-400 text-sm font-semibold">
                      SA
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile?.nombre || session.user.name || 'Super Admin'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-foreground/5 text-muted-foreground">
                        Super Admin
                      </span>
                    </div>
                  </div>
                </div>
              ) : shouldShowCompanySettings ? (
                // Non-super admin (or impersonating) sees company info with company logo
                <div
                  className={`flex items-center space-x-3 p-3 rounded-xl hover:bg-accent/50 transition-colors
                      ${(session.user.role === 'ADMIN' || isImpersonating) ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (session.user.role === 'ADMIN' || isImpersonating) {
                      router.push('/settings?tab=company');
                    }
                  }}
                >
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage
                      src={companySettings?.companyLogo || ''}
                      alt={companySettings?.companyName || 'Mi Empresa'}
                      className="object-contain rounded-lg bg-card"
                    />
                    <AvatarFallback className="rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                      {getInitials(companySettings?.companyName || 'Mi Empresa')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {companySettings?.companyName || 'Mi Empresa'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile?.nombre || session.user.name}
                    </p>
                    <div className="mt-1 flex flex-col items-start gap-0.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-foreground/5 text-muted-foreground"
                      >
                        {isImpersonating ? 'ADMIN (Soporte)' : session.user.role}
                      </span>
                      {companySettings?.subscriptionPlan && (
                        <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {({'TRIAL': 'Plan Prueba', 'FREE': 'Plan Gratis', 'GRATIS': 'Plan Gratis', 'BASICO': 'Plan Básico', 'BASIC': 'Plan Básico', 'PROFESIONAL': 'Plan Profesional', 'PRO': 'Plan Profesional', 'ENTERPRISE': 'Plan Empresarial'} as Record<string, string>)[companySettings.subscriptionPlan.toUpperCase()] || `Plan ${companySettings.subscriptionPlan}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
