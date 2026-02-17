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
  SquaresFour,
  Buildings,
  Package,
  Archive,
  MapPin,
  CalendarDots,
  ClipboardText,
  Bag,
  Truck,
  UserGear,
  GearSix,
  CreditCard,
  Percent,
  TrendUp,
  FolderOpen,
  Lightning,
  NavigationArrow,
  ShieldCheck,
  Users,
  Tag,
  Ruler,
  ArrowsLeftRight,
  ChartBar,
  IconContext,
} from '@phosphor-icons/react';
import { useSidebar } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { useCompany } from '@/contexts/CompanyContext';
import { useProfile } from '@/contexts/ProfileContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  submenu?: SidebarItem[];
  permission?: string | string[];
  badge?: string | number;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: SquaresFour,
    href: '/dashboard',
    permission: 'view_dashboard',
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: Buildings,
    permission: 'view_clients',
    submenu: [
      {
        id: 'clients-list',
        label: 'Lista de clientes',
        icon: Buildings,
        href: '/clients',
        permission: 'view_clients',
      },
      {
        id: 'client-categories',
        label: 'Categorías de clientes',
        icon: Tag,
        href: '/client-categories',
        permission: 'manage_catalogs',
      },
    ],
  },
  {
    id: 'products',
    label: 'Productos',
    icon: Package,
    permission: 'view_products',
    submenu: [
      {
        id: 'products-list',
        label: 'Lista de productos',
        icon: Package,
        href: '/products',
        permission: 'view_products',
      },
      {
        id: 'product-families',
        label: 'Familias de productos',
        icon: FolderOpen,
        href: '/product-families',
        permission: 'view_products',
      },
      {
        id: 'product-categories',
        label: 'Categorías de productos',
        icon: Tag,
        href: '/product-categories',
        permission: 'manage_catalogs',
      },
      {
        id: 'units',
        label: 'Unidades de medida',
        icon: Ruler,
        href: '/units',
        permission: 'manage_catalogs',
      },
    ],
  },
  {
    id: 'price-lists',
    label: 'Listas de precios',
    icon: TrendUp,
    permission: 'view_products',
    submenu: [
      {
        id: 'price-lists-list',
        label: 'Gestión de precios',
        icon: TrendUp,
        href: '/price-lists',
        permission: 'view_products',
      },
    ],
  },
  {
    id: 'discounts',
    label: 'Descuentos',
    icon: Percent,
    permission: 'view_discounts',
    submenu: [
      {
        id: 'discounts-list',
        label: 'Descuentos por cantidad',
        icon: Percent,
        href: '/discounts',
        permission: 'view_discounts',
      },
    ],
  },
  {
    id: 'promotions',
    label: 'Promociones',
    icon: Lightning,
    permission: 'view_promotions',
    submenu: [
      {
        id: 'promotions-list',
        label: 'Promociones especiales',
        icon: Lightning,
        href: '/promotions',
        permission: 'view_promotions',
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventarios',
    icon: Archive,
    permission: 'view_inventory',
    submenu: [
      {
        id: 'inventory-warehouse',
        label: 'Inventario de almacén',
        icon: Archive,
        href: '/inventory',
        permission: 'view_inventory',
      },
      {
        id: 'inventory-movements',
        label: 'Movimientos de inventario',
        icon: ArrowsLeftRight,
        href: '/inventory/movements',
        permission: 'view_inventory',
      },
    ],
  },
  {
    id: 'routes',
    label: 'Rutas',
    icon: NavigationArrow,
    permission: 'view_routes',
    submenu: [
      {
        id: 'routes-list',
        label: 'Listado de rutas',
        icon: NavigationArrow,
        href: '/routes',
        permission: 'view_routes',
      },
      {
        id: 'routes-manage',
        label: 'Administrar rutas',
        icon: ClipboardText,
        href: '/routes/manage',
        permission: 'view_routes',
      },
    ],
  },
  {
    id: 'zones',
    label: 'Zonas',
    icon: MapPin,
    href: '/zones',
    permission: 'view_zones',
  },
  {
    id: 'visits',
    label: 'Visitas',
    icon: CalendarDots,
    href: '/visits',
    permission: 'view_visits',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: CalendarDots,
    href: '/calendar',
    permission: 'view_dashboard',
  },
  {
    id: 'forms',
    label: 'Formularios',
    icon: ClipboardText,
    permission: 'view_dashboard',
    submenu: [
      {
        id: 'form-builder',
        label: 'Constructor',
        icon: ClipboardText,
        href: '/forms/builder',
        permission: 'view_dashboard',
      },
      {
        id: 'form-list',
        label: 'Mis formularios',
        icon: ClipboardText,
        href: '/forms',
        permission: 'view_dashboard',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: ChartBar,
    href: '/reports',
    permission: 'view_dashboard',
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: Bag,
    href: '/orders',
    permission: 'view_orders',
    badge: '3',
  },
  {
    id: 'cobranza',
    label: 'Cobranza',
    icon: CreditCard,
    href: '/cobranza',
    permission: 'view_orders',
  },
  {
    id: 'deliveries',
    label: 'Entregas',
    icon: Truck,
    href: '/deliveries',
    permission: 'view_deliveries',
    badge: '2',
  },
  {
    id: 'administration',
    label: 'Administración',
    icon: ShieldCheck,
    permission: ['view_users', 'manage_roles', 'manage_global_settings'],
    submenu: [
      {
        id: 'users',
        label: 'Usuarios',
        icon: Users,
        href: '/users',
        permission: 'view_users',
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: ShieldCheck,
        href: '/roles',
        permission: 'manage_roles',
      },
      {
        id: 'global-settings',
        label: 'Configuración Global',
        icon: GearSix,
        href: '/global-settings',
        permission: 'manage_global_settings',
      },
      {
        id: 'company-settings',
        label: 'Configuración',
        icon: Buildings,
        href: '/settings',
        permission: 'view_company_settings',
      },
    ],
  },
  {
    id: 'subscription',
    label: 'Suscripción',
    icon: CreditCard,
    href: '/subscription',
    permission: 'view_settings',
  },
];

// Mapeo de permisos por rol
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'view_dashboard',
    'view_clients',
    'view_products',
    'view_discounts',
    'view_promotions',
    'view_inventory',
    'view_routes',
    'view_zones',
    'view_visits',
    'view_orders',
    'view_deliveries',
    'view_users',
    'manage_roles',
    'manage_global_settings', // Solo SUPER_ADMIN tiene acceso a configuración global
    'manage_tenants',
    'manage_all_users',
    'view_all_data',
    'manage_catalogs', // Gestión de categorías y unidades
  ],
  ADMIN: [
    'view_dashboard',
    'view_clients',
    'view_products',
    'view_discounts',
    'view_promotions',
    'view_inventory',
    'view_routes',
    'view_zones',
    'view_visits',
    'view_orders',
    'view_deliveries',
    'view_users',
    'manage_roles',
    'view_settings',
    'view_company_settings', // Solo ADMIN tiene acceso a configuración de empresa
    'manage_catalogs', // Gestión de categorías y unidades
  ],
  VENDEDOR: [
    'view_dashboard',
    'view_clients',
    'view_products',
    'view_orders',
    'view_deliveries',
    'view_routes',
    'view_visits',
  ],
};

export const Sidebar: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  // SIEMPRE llamar useCompany para mantener orden de hooks
  const { settings: companySettings } = useCompany();
  const router = useRouter();
  const shouldShowCompanySettings =
    session?.user?.role === 'ADMIN' || session?.user?.role === 'VENDEDOR';
  const { profile } = useProfile();
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

  useEffect(() => {
    // Auto-expandir secciones que contengan la ruta activa
    const itemsToExpand: string[] = [];

    sidebarItems.forEach(item => {
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
  }, [pathname]);

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

    const userRole = session.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    if (Array.isArray(permission)) {
      return permission.some(p => userPermissions.includes(p));
    }

    return userPermissions.includes(permission);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getIconColor = (itemId: string, isActive: boolean) => {
    const colorMap: Record<string, { active: string; inactive: string }> = {
      dashboard: {
        active: 'text-blue-600',
        inactive: 'text-blue-500 group-hover:text-blue-600',
      },
      clients: {
        active: 'text-emerald-600',
        inactive: 'text-emerald-500 group-hover:text-emerald-600',
      },
      products: {
        active: 'text-purple-600',
        inactive: 'text-purple-500 group-hover:text-purple-600',
      },
      'price-lists': {
        active: 'text-green-600',
        inactive: 'text-green-500 group-hover:text-green-600',
      },
      discounts: {
        active: 'text-orange-600',
        inactive: 'text-orange-500 group-hover:text-orange-600',
      },
      promotions: {
        active: 'text-yellow-600',
        inactive: 'text-yellow-500 group-hover:text-yellow-600',
      },
      inventory: {
        active: 'text-indigo-600',
        inactive: 'text-indigo-500 group-hover:text-indigo-600',
      },
      routes: {
        active: 'text-cyan-600',
        inactive: 'text-cyan-500 group-hover:text-cyan-600',
      },
      zones: {
        active: 'text-teal-600',
        inactive: 'text-teal-500 group-hover:text-teal-600',
      },
      visits: {
        active: 'text-pink-600',
        inactive: 'text-pink-500 group-hover:text-pink-600',
      },
      calendar: {
        active: 'text-red-600',
        inactive: 'text-red-500 group-hover:text-red-600',
      },
      forms: {
        active: 'text-pink-600',
        inactive: 'text-pink-500 group-hover:text-pink-600',
      },
      orders: {
        active: 'text-violet-600',
        inactive: 'text-violet-500 group-hover:text-violet-600',
      },
      cobranza: {
        active: 'text-emerald-600',
        inactive: 'text-emerald-500 group-hover:text-emerald-600',
      },
      deliveries: {
        active: 'text-amber-600',
        inactive: 'text-amber-500 group-hover:text-amber-600',
      },
      administration: {
        active: 'text-slate-600',
        inactive: 'text-slate-500 group-hover:text-slate-600',
      },
      users: {
        active: 'text-rose-600',
        inactive: 'text-rose-500 group-hover:text-rose-600',
      },
      roles: {
        active: 'text-indigo-600',
        inactive: 'text-indigo-500 group-hover:text-indigo-600',
      },
      reports: {
        active: 'text-green-600',
        inactive: 'text-green-500 group-hover:text-green-600',
      },
      subscription: {
        active: 'text-lime-600',
        inactive: 'text-lime-500 group-hover:text-lime-600',
      },
      'client-categories': {
        active: 'text-emerald-600',
        inactive: 'text-emerald-500 group-hover:text-emerald-600',
      },
      'product-categories': {
        active: 'text-purple-600',
        inactive: 'text-purple-500 group-hover:text-purple-600',
      },
      units: {
        active: 'text-blue-600',
        inactive: 'text-blue-500 group-hover:text-blue-600',
      },
      settings: {
        active: 'text-slate-600',
        inactive: 'text-slate-500 group-hover:text-slate-600',
      },
    };

    const colors = colorMap[itemId] || {
      active: 'text-blue-600',
      inactive: 'text-gray-500 group-hover:text-gray-700',
    };

    return isActive ? colors.active : colors.inactive;
  };

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    if (!hasPermission(item.permission)) return null;

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.href);
    const showLabels = (sidebarOpen && !sidebarCollapsed) || !isDesktop;

    // Verificar si algún hijo está activo
    const hasActiveChild =
      hasSubmenu && item.submenu?.some(subItem => subItem.href && pathname === subItem.href);

    return (
      <div key={item.id}>
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
              level > 0 && 'ml-6 py-2',
              isItemActive
                ? 'bg-blue-100 text-blue-900 shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
              !showLabels && 'justify-center px-2'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-lg transition-colors',
                getIconColor(item.id, isItemActive),
                showLabels ? 'w-6 h-6' : 'w-8 h-8'
              )}
            >
              <item.icon size={showLabels ? 18 : 20} />
            </div>

            {showLabels && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                    {item.badge}
                  </div>
                )}
              </>
            )}

            {!showLabels && item.badge && (
              <div className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-semibold">{item.badge}</span>
              </div>
            )}

            {/* Tooltip for collapsed state */}
            {!showLabels && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </Link>
        ) : (
          <button
            onClick={() => hasSubmenu && toggleExpanded(item.id)}
            className={cn(
              'group w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
              level > 0 && 'ml-6 py-2',
              hasActiveChild || isExpanded
                ? 'bg-blue-50 text-blue-900'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
              !showLabels && 'justify-center px-2'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-lg transition-colors',
                getIconColor(item.id, hasActiveChild || isExpanded),
                showLabels ? 'w-6 h-6' : 'w-8 h-8'
              )}
            >
              <item.icon size={showLabels ? 18 : 20} />
            </div>

            {showLabels && (
              <>
                <span className="flex-1 truncate text-left">{item.label}</span>
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
                      <ChevronDown size={14} className="text-gray-400" />
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

            {/* Tooltip for collapsed state */}
            {!showLabels && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
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
          'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
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
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Navegación
                </h2>
              )}
              {/* Collapse toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="hidden lg:flex h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </Button>

              {/* Mobile close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="lg:hidden h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Navigation Items */}
          <IconContext.Provider value={{ weight: 'duotone' }}>
            <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {sidebarItems.map(item => renderSidebarItem(item))}
            </nav>
          </IconContext.Provider>

          {/* Bottom User Section */}
          {!sidebarCollapsed && session?.user && (
            <div className="border-t border-gray-100 p-4">
              {shouldShowCompanySettings ? (
                // Non-super admin sees company info with company logo
                <div
                  className={`flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 transition-all duration-200 
                      ${session.user.role === 'ADMIN' ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (session.user.role === 'ADMIN') {
                      router.push('/settings?tab=company');
                    }
                  }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={companySettings?.companyLogo || ''}
                      alt={companySettings?.companyName || 'Mi Empresa'}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-sm">
                      {getInitials(companySettings?.companyName || 'Mi Empresa')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {companySettings?.companyName || 'Mi Empresa'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {profile?.nombre || session.user.name}
                    </p>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          session.user.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {session.user.role}
                      </span>
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
