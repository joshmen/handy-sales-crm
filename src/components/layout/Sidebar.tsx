'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  Package2,
  Route,
  Calendar,
  FileText,
  ShoppingCart,
  Truck,
  UserCheck,
  Settings,
  Menu,
  ChevronDown,
  ChevronRight,
  X,
  CreditCard,
  Percent,
  DollarSign,
  Layers,
} from 'lucide-react';
import { useSidebar } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';

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
    icon: Home,
    href: '/dashboard',
    permission: 'view_dashboard',
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: Users,
    permission: 'view_clients',
    submenu: [
      {
        id: 'clients-list',
        label: 'Lista de clientes',
        icon: Users,
        href: '/clients',
        permission: 'view_clients',
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
        icon: Layers,
        href: '/product-families',
        permission: 'view_products',
      },
    ],
  },
  {
    id: 'price-lists',
    label: 'Listas de precios',
    icon: DollarSign,
    permission: 'view_products',
    submenu: [
      {
        id: 'price-lists-list',
        label: 'Gestión de precios',
        icon: DollarSign,
        href: '/price-lists',
        permission: 'view_products',
      },
    ],
  },
  {
    id: 'price-lists',
    label: 'Listas de precios',
    icon: DollarSign,
    permission: 'view_products',
    submenu: [
      {
        id: 'price-lists-list',
        label: 'Gestión de precios',
        icon: DollarSign,
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
    id: 'inventory',
    label: 'Inventarios',
    icon: Package2,
    permission: 'view_inventory',
    submenu: [
      {
        id: 'inventory-warehouse',
        label: 'Inventario de almacén',
        icon: Package2,
        href: '/inventory',
        permission: 'view_inventory',
      },
    ],
  },
  {
    id: 'routes',
    label: 'Rutas',
    icon: Route,
    permission: 'view_routes',
    submenu: [
      {
        id: 'routes-list',
        label: 'Gestión de rutas',
        icon: Route,
        href: '/routes',
        permission: 'view_routes',
      },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: Calendar,
    href: '/calendar',
    permission: 'view_dashboard',
  },
  {
    id: 'forms',
    label: 'Formularios',
    icon: FileText,
    permission: 'view_dashboard',
    submenu: [
      {
        id: 'form-builder',
        label: 'Constructor',
        icon: FileText,
        href: '/forms/builder',
        permission: 'view_dashboard',
      },
      {
        id: 'form-list',
        label: 'Mis formularios',
        icon: FileText,
        href: '/forms',
        permission: 'view_dashboard',
      },
    ],
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: ShoppingCart,
    href: '/orders',
    permission: 'view_orders',
    badge: '3',
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
    id: 'users',
    label: 'Usuarios',
    icon: UserCheck,
    href: '/users',
    permission: 'view_users',
  },
  {
    id: 'subscription',
    label: 'Suscripción',
    icon: CreditCard,
    href: '/subscription',
    permission: 'view_settings',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    href: '/settings',
    permission: 'view_settings',
  },
];

// Mock user data
const mockUser = {
  id: '1',
  name: 'Carlos Mendoza',
  email: 'carlos@handy.com',
  role: 'VENDEDOR',
  avatar: '',
};

export const Sidebar: React.FC = () => {
  const [mounted, setMounted] = useState(false);
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
    return true; // Simplified for now
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
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
              'flex items-center px-3 py-2 mx-2 text-sm transition-colors rounded-lg group relative',
              level > 0 && 'ml-4',
              isItemActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              !showLabels && 'justify-center'
            )}
          >
            <item.icon size={20} className="min-w-[20px] flex-shrink-0" />
            {showLabels && (
              <>
                <span className="ml-3 flex-1">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
            {!showLabels && item.badge && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
            )}

            {/* Tooltip for collapsed state */}
            {!showLabels && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                {item.label}
              </div>
            )}
          </Link>
        ) : (
          <button
            onClick={() => hasSubmenu && toggleExpanded(item.id)}
            className={cn(
              'w-full flex items-center px-3 py-2 mx-2 text-sm transition-colors rounded-lg group relative',
              level > 0 && 'ml-4',
              hasActiveChild
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              !showLabels && 'justify-center'
            )}
          >
            <item.icon size={20} className="min-w-[20px] flex-shrink-0" />
            {showLabels && (
              <>
                <span className="ml-3 flex-1">{item.label}</span>
                <div className="flex items-center gap-2">
                  {hasActiveChild && <div className="h-2 w-2 bg-primary rounded-full" />}
                  {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                  {hasSubmenu &&
                    (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </div>
              </>
            )}
            {!showLabels && item.badge && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
            )}

            {/* Tooltip for collapsed state */}
            {!showLabels && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                {item.label}
              </div>
            )}
          </button>
        )}

        {hasSubmenu && isExpanded && item.submenu && (
          // Si el sidebar está colapsado, oculta submenús SOLO en desktop (lg:hidden)
          <div className={'mt-1 space-y-1 ' + (sidebarCollapsed ? 'lg:hidden' : '')}>
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
      <div
        className={cn(
          'fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
        onClick={toggle}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-screen bg-card border-r border-border transition-all duration-300 lg:translate-x-0',
          'w-64', // en móvil SIEMPRE ancho completo
          sidebarCollapsed && 'lg:w-16', // en desktop aplica colapsado
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-border px-4">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
                  H
                </div>
                <span className="text-lg font-bold text-foreground">Handy CRM</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              {/* Desktop collapse toggle */}
              <button
                onClick={toggleCollapsed}
                className="hidden lg:flex p-1.5 hover:bg-accent rounded-md transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
              </button>

              {/* Mobile close button */}
              <button
                onClick={toggle}
                className="lg:hidden p-1.5 hover:bg-accent rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin">
            {sidebarItems.map(item => renderSidebarItem(item))}
          </nav>

          {/* User section */}
          {!sidebarCollapsed && mockUser && (
            <>
              <Separator />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(mockUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{mockUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{mockUser.role}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
