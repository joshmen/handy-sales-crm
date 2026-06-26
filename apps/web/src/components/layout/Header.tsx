'use client';

import React, { useState, useEffect } from 'react';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useCompany } from '@/contexts/CompanyContext';
import { useGlobalSettings as useGlobalSettingsContext } from '@/contexts/GlobalSettingsContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Plus,
  Menu,
  Info,
  ArrowRight,
  Sun,
  Moon,
  LayoutGrid,
} from 'lucide-react';
import { useSidebar, useTheme } from '@/stores/useUIStore';
import { cn, getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useNotifications } from '@/hooks/useNotifications';
import { CommandPalette } from '@/components/layout/CommandPalette';
import type { DefaultSession } from 'next-auth';
import { useFormatters } from '@/hooks/useFormatters';

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

// Notification type icons/colors
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  System: 'Sistema',
  Order: 'Pedido',
  Route: 'Ruta',
  Visit: 'Visita',
  Alert: 'Alerta',
  General: 'General',
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
  const { formatDate } = useFormatters();
  const isClient = useClientOnly();
  const [mounted, setMounted] = useState(false);
  const { toggle } = useSidebar(); // fallback
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const {
    unreadCount,
    notifications,
    loading: notificationsLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [expandedNotifId, setExpandedNotifId] = useState<number | null>(null);

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
  const unreadDisplay = unread > 99 ? '99+' : String(unread);

  const formatTime = (date: Date) =>
    formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

          {/* Notifications */}
          <Button
            data-tour="header-notifications"
            variant="ghost"
            size="icon"
            className="relative rounded-full hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors duration-200"
            onClick={() => {
              fetchNotifications();
              setIsNotificationsOpen(true);
            }}
          >
            <Bell className="h-[18px] w-[18px] text-amber-500" strokeWidth={2} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                <span className="text-[9px] text-white font-bold leading-none">{unreadDisplay}</span>
              </span>
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

          {/* User menu — avatar con badge de notif no leídas (mismo dato que
              el Bell icon, doble entrada visual por decisión del owner) */}
          <Button
            data-tour="header-user-menu"
            variant="ghost"
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-full h-auto transition-colors duration-200"
            onClick={() => router.push('/profile')}
            aria-label={unread > 0 ? `Mi perfil, ${unread} sin leer` : 'Mi perfil'}
          >
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground leading-none">{currentUser.name}</p>
            </div>
            <span className="relative inline-flex overflow-visible">
              <Avatar className="h-8 w-8 ring-2 ring-gray-100 dark:ring-gray-800">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              {unread > 0 && (
                <span
                  data-testid="avatar-unread-badge"
                  className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900"
                  aria-label={`${unread} notificaciones sin leer`}
                >
                  {unreadDisplay}
                </span>
              )}
            </span>
          </Button>
        </div>
      </div>

      {/* Notifications Dialog */}
      <Dialog open={isNotificationsOpen} onOpenChange={(open) => { setIsNotificationsOpen(open); if (!open) setExpandedNotifId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{tc('notificationsTitle')}</DialogTitle>
              {notifications.length > 0 && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const res = await markAllAsRead();
                    if (res.success) {
                      toast({ title: tc('done'), description: tc('allMarkedRead') });
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 -mr-2"
                >
                  {tc('markAllAsRead')}
                </Button>
              )}
            </div>
          </DialogHeader>

          {notificationsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>{tc('noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notifications.map(n => {
                const isUnread = !n.leidoEn;
                const createdDate = new Date(n.creadoEn);
                const typeLabel = NOTIFICATION_TYPE_LABELS[n.tipo] || n.tipo;

                return (
                  <div
                    key={n.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors cursor-pointer',
                      isUnread
                        ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                        : 'hover:bg-accent'
                    )}
                    onClick={async () => {
                      if (isUnread) await markAsRead(n.id);
                      const url = n.data?.['url'];
                      if (url) {
                        router.push(url);
                        setIsNotificationsOpen(false);
                      } else {
                        setExpandedNotifId(prev => prev === n.id ? null : n.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {n.titulo}
                          </h4>
                          {n.tipo !== 'General' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 flex-shrink-0"
                            >
                              {typeLabel}
                            </Badge>
                          )}
                        </div>
                        <p className={cn(
                          'text-sm text-muted-foreground mt-1 transition-all',
                          expandedNotifId === n.id ? '' : 'line-clamp-2'
                        )}>
                          {n.mensaje}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground/70">{formatTime(createdDate)}</span>
                          {n.data?.['url'] && (
                            <span className="text-xs text-blue-500 font-medium flex items-center gap-0.5">
                              {tc('viewDetails')} <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                      {isUnread && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </header>
  );
};

export default Header; // <-- para poder importarlo como default
