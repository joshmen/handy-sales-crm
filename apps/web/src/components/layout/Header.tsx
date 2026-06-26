'use client';

import React, { useState, useEffect } from 'react';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useCompany } from '@/contexts/CompanyContext';
import { useGlobalSettings as useGlobalSettingsContext } from '@/contexts/GlobalSettingsContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Plus,
  Menu,
  Info,
  Sun,
  Moon,
  LayoutGrid,
} from 'lucide-react';
import { useSidebar, useTheme } from '@/stores/useUIStore';
import { cn, getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { CommandPalette } from '@/components/layout/CommandPalette';
import type { DefaultSession } from 'next-auth';

// Extiende el user de NextAuth con los campos que usas en tu app
type AppSessionUser = DefaultSession['user'] & {
  id?: string;
  role?: string;
};

// Mapeo de breadcrumbs
const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clientes',
  '/client-categories': 'Categorías de Clientes',
  '/products': 'Productos',
  '/product-families': 'Familias de Productos',
  '/product-categories': 'Categorías de Productos',
  '/units': 'Unidades de Medida',
  '/price-lists': 'Listas de Precios',
  '/discounts': 'Descuentos',
  '/promotions': 'Promociones',
  '/routes': 'Rutas',
  '/routes/manage': 'Administrar Rutas',
  '/inventory': 'Inventario',
  '/inventory/movements': 'Movimientos de Inventario',
  '/zones': 'Zonas',
  '/visits': 'Visitas',
  '/forms': 'Formularios',
  '/forms/builder': 'Constructor de Formularios',
  '/orders': 'Pedidos',
  '/cobranza': 'Cobranza',
  '/metas': 'Metas',
  '/automations': 'Automatizaciones',
  '/reports': 'Reportes',
  '/team': 'Mi Equipo',
  '/users': 'Usuarios',
  '/devices': 'Dispositivos',
  '/roles': 'Roles',
  '/activity-logs': 'Registro de Actividad',
  '/billing': 'Facturación',
  '/billing/invoices': 'Facturas',
  '/billing/settings': 'Configuración Fiscal',
  '/subscription': 'Suscripción',
  '/integrations': 'Integraciones',
  '/ai': 'Asistente IA',
  '/profile': 'Mi Perfil',
  '/settings': 'Configuración',
  '/global-settings': 'Configuración Global',
  '/admin/tenants': 'Gestión de Empresas',
  '/admin/system-dashboard': 'Dashboard Sistema',
  '/ayuda': 'Ayuda',
  '/getting-started': 'Guía de Configuración',
};

export interface HeaderProps {
  /** Para abrir/cerrar menú móvil desde el layout */
  onMenuClick?: () => void;
  /** Para abrir/cerrar panel de ayuda */
  onHelpClick?: () => void;
  /** Si el SuperAdmin está impersonando, desplazar header 40px hacia abajo */
  isImpersonating?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onHelpClick, isImpersonating }) => {
  const tc = useTranslations('common');
  const isClient = useClientOnly();
  const [mounted, setMounted] = useState(false);
  const { toggle } = useSidebar(); // fallback
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const { unreadCount } = useNotifications();

  const sUser = session?.user as AppSessionUser | undefined;
  const { settings: companySettings } = useCompany();
  const { globalSettings } = useGlobalSettingsContext();
  const { profile } = useProfile();

  // Configuración dinámica basada en jerarquía de roles
  const companyConfig = {
    // SUPER_ADMIN ve configuración global, otros ven configuración de empresa
    name:
      // sUser?.role === 'SUPER_ADMIN'
      //   ? globalSettings?.platformName || 'Handy Suites'
      //   : companySettings?.companyName || globalSettings?.platformName || 'Handy Suites',
      globalSettings?.platformName || 'Handy Suites',
    // TODOS ven el logo de la configuración global (solo SUPER_ADMIN puede cambiarlo)
    logo: globalSettings?.platformLogo || '',
    primaryColor:
      sUser?.role === 'SUPER_ADMIN'
        ? globalSettings?.platformPrimaryColor || '#3B82F6'
        : companySettings?.companyPrimaryColor || globalSettings?.platformPrimaryColor || '#3B82F6',
    // Solo SUPER_ADMIN puede modificar la configuración global
    hasGlobalCustomization: sUser?.role === 'SUPER_ADMIN',
    // ADMIN puede ver/modificar configuración local de empresa (sidebar)
    hasCompanyCustomization: sUser?.role === 'ADMIN',
  };

  const currentUser = sUser
    ? {
        id: sUser.id ?? '1',
        name: profile?.nombre || (sUser.name ?? 'Usuario'),
        email: profile?.email || (sUser.email ?? 'usuario@handysuites.com'),
        role: profile?.rol || (sUser.role ?? 'VENDEDOR'),
        // El avatar del header SIEMPRE es la foto personal del perfil
        avatar: profile?.avatarUrl || '',
      }
    : {
        id: '1',
        name: 'Usuario',
        email: 'usuario@handysuites.com',
        role: 'VENDEDOR',
        avatar: '',
      };

  useEffect(() => setMounted(true), []);

  // Aplicar clase CSS al DOM cuando cambie el tema (después del mount inicial)
  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme, mounted]);

  const unread = unreadCount;

  if (!mounted || !isClient) {
    return (
      <header className={cn(
        "fixed left-0 right-0 z-50 w-full bg-surface-2/95 backdrop-blur supports-[backdrop-filter]:bg-surface-2/80 border-b border-border-subtle shadow-elevation-1",
        isImpersonating ? "top-10" : "top-0"
      )}>
        <div className="flex h-16 items-center px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Handy Suites</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn(
      "fixed left-0 right-0 z-50 w-full bg-surface-2/95 backdrop-blur supports-[backdrop-filter]:bg-surface-2/80 border-b border-border-subtle shadow-elevation-1",
      isImpersonating ? "top-10" : "top-0"
    )}>
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Left: Logo + Menu toggle */}
        <div className="flex items-center space-x-4">
          {/* Menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:bg-accent"
            onClick={onMenuClick ?? toggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center space-x-3">
            {companyConfig.logo ? (
              // Logo personalizado (solo SUPER_ADMIN puede configurarlo)
              <img
                src={companyConfig.logo}
                alt={companyConfig.name}
                className="w-8 h-8 rounded-lg object-contain"
              />
            ) : (
              // Logo por defecto Handy Suites - cluster de 4 íconos
              <img
                src="/logo-icon.svg"
                alt="Handy Suites"
                className="w-10 h-10 sm:w-9 sm:h-9"
              />
            )}
            <span className="hidden sm:block text-xl font-semibold text-foreground">
              {companyConfig.name}<sup className="text-[10px] font-normal ml-0.5">®</sup>
            </span>
            {/* Indicador de configuración para SUPER_ADMIN */}
            {companyConfig.hasGlobalCustomization && (
              <span className="hidden md:inline-block ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full font-medium">
                Global
              </span>
            )}
          </div>
        </div>

        {/* Center-left: Command palette (inline) — buscador global con navegación real */}
        <div
          className="flex-1 flex items-center min-w-0 md:px-4 lg:px-8"
          data-tour="header-search"
          data-tour-id="header-search-desktop"
        >
          <div className="w-full max-w-[420px]">
            <CommandPalette
              role={currentUser.role}
              onNewOrder={() => router.push('/orders?new=1')}
            />
          </div>
        </div>

        {/* Acción principal por rol */}
        {currentUser.role === 'SUPER_ADMIN' ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 mr-1 rounded-full text-xs font-semibold text-success bg-success/10 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-success" />
            Sistemas operativos
          </span>
        ) : (
          <Button
            data-tour="new-order"
            variant="wbPrimary"
            size="sm"
            className="hidden sm:inline-flex gap-1.5 mr-1 whitespace-nowrap"
            onClick={() => router.push('/orders?new=1')}
          >
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </Button>
        )}

        {/* Right: User controls */}
        <div className="flex items-center gap-0.5">
          {/* Trial badge */}
          {companySettings?.subscriptionStatus === 'Trial' && companySettings?.daysRemaining != null && (
            <button
              onClick={() => router.push('/subscription')}
              className={cn(
                'hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer mr-1',
                (companySettings.daysRemaining ?? 0) > 7
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                  : (companySettings.daysRemaining ?? 0) > 3
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
              )}
            >
              Trial: {companySettings.daysRemaining}d
            </button>
          )}

          {/* Notifications — navega a la pagina de notificaciones (como el
              prototipo Topbar). Punto rojo cuando hay no-leidas. */}
          <Button
            data-tour="header-notifications"
            variant="ghost"
            size="icon"
            className="relative rounded-full hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors duration-200"
            onClick={() => router.push('/notifications')}
            aria-label={tc('notificationsTitle')}
          >
            <Bell className="h-[18px] w-[18px] text-amber-500" strokeWidth={2} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-card" />
            )}
          </Button>

          {/* Help */}
          <Button
            data-tour="header-help"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors duration-200"
            onClick={onHelpClick}
            aria-label={tc('help')}
          >
            <Info className="h-[18px] w-[18px] text-blue-500" strokeWidth={2} />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors duration-200"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px] text-amber-400" strokeWidth={2} />
            ) : (
              <Moon className="h-[18px] w-[18px] text-slate-400" strokeWidth={2} />
            )}
          </Button>

          {/* Apps grid */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-surface-3 dark:hover:bg-foreground transition-colors duration-200"
          >
            <LayoutGrid className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2} />
          </Button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-border mx-1" />

          {/* Avatar — acceso al perfil (navega a /profile). Solo el circulo, como
              el prototipo Topbar: sin nombre y sin caja de fondo. Boton plano (no
              <Button ghost>) para que NO aparezca el bg-accent en hover; el hover
              es un anillo primario + leve escala sobre el propio avatar. */}
          <button
            type="button"
            data-tour="header-user-menu"
            onClick={() => router.push('/profile')}
            aria-label="Mi perfil"
            className="group ml-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
          >
            <Avatar className="h-9 w-9 ring-2 ring-border transition-all duration-200 group-hover:ring-primary group-hover:scale-105">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

    </header>
  );
};

export default Header; // <-- para poder importarlo como default
