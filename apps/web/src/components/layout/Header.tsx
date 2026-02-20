'use client';

import React, { useState, useEffect } from 'react';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useCompany } from '@/contexts/CompanyContext';
import { useGlobalSettings as useGlobalSettingsContext } from '@/contexts/GlobalSettingsContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import {
  Bell,
  Search,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  Home,
  ChevronRight,
  Calendar,
  Users,
  Info,
  Building2,
} from 'lucide-react';
import { useSidebar, useTheme } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';
import { getRoleDisplayName, getRoleColor } from '@/lib/roles';
import { ImpersonationModal } from '@/components/impersonation';
import { useNotifications } from '@/hooks/useNotifications';
import type { DefaultSession } from 'next-auth';

// Extiende el user de NextAuth con los campos que usas en tu app
type AppSessionUser = DefaultSession['user'] & {
  id?: string;
  role?: string;
};

type Breadcrumb = { label: string; href: string; isLast: boolean };

// Mapeo de breadcrumbs
const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clientes',
  '/products': 'Productos',
  '/routes': 'Rutas',
  '/calendar': 'Calendario',
  '/forms': 'Formularios',
  '/forms/builder': 'Constructor de Formularios',
  '/orders': 'Pedidos',
  '/deliveries': 'Entregas',
  '/users': 'Usuarios',
  '/subscription': 'Suscripción',
  '/profile': 'Mi Perfil',
  '/settings': 'Configuración',
  '/global-settings': 'Configuración Global',
  '/admin': 'Administración',
  '/admin/tenants': 'Gestión de Empresas',
  '/admin/system-dashboard': 'Dashboard Sistema',
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

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isImpersonationOpen, setIsImpersonationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
      //   ? globalSettings?.platformName || 'HandyCRM'
      //   : companySettings?.companyName || globalSettings?.platformName || 'HandyCRM',
      globalSettings?.platformName || 'HandyCRM',
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
        email: profile?.email || (sUser.email ?? 'usuario@handysales.com'),
        role: profile?.role || (sUser.role ?? 'VENDEDOR'),
        // El avatar del header SIEMPRE es la foto personal del perfil
        avatar: profile?.avatarUrl || '',
      }
    : {
        id: '1',
        name: 'Usuario',
        email: 'usuario@handysales.com',
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

  const generateBreadcrumbs = (): Breadcrumb[] => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: Breadcrumb[] = [];
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      crumbs.push({ label, href: currentPath, isLast: index === segments.length - 1 });
    });
    return crumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const unread = unreadCount;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    toast({ title: 'Búsqueda', description: `Buscando: ${searchQuery}` });
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ redirect: false, callbackUrl: '/login' });
      if (typeof window !== 'undefined') localStorage.clear();
      router.push('/login');
    } catch {
      toast({ title: 'Error', description: 'No se pudo cerrar la sesión', variant: 'destructive' });
    } finally {
      setIsLoggingOut(false);
      setIsUserMenuOpen(false);
    }
  };

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date);

  if (!mounted || !isClient) {
    return (
      <header className={cn(
        "fixed left-0 right-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-200 shadow-sm",
        isImpersonating ? "top-10" : "top-0"
      )}>
        <div className="flex h-16 items-center px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">HandyCRM</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn(
      "fixed left-0 right-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-200 shadow-sm",
      isImpersonating ? "top-10" : "top-0"
    )}>
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Left: Logo + Menu toggle */}
        <div className="flex items-center space-x-4">
          {/* Menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-600 hover:bg-gray-100"
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
              // Logo por defecto HandyCRM
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{
                  background: `linear-gradient(to bottom right, ${companyConfig.primaryColor}, ${companyConfig.primaryColor}dd)`,
                }}
              >
                <span className="text-white font-bold text-sm">H</span>
              </div>
            )}
            <span className="hidden sm:block text-xl font-semibold text-gray-900">
              {companyConfig.name}
            </span>
            {/* Indicador de configuración para SUPER_ADMIN */}
            {companyConfig.hasGlobalCustomization && (
              <span className="hidden md:inline-block ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                Global
              </span>
            )}
          </div>
        </div>

        {/* Center: Search Bar (Google style) */}
        <div className="flex-1 flex justify-center px-6 lg:px-12">
          <div className="relative w-full max-w-md" data-tour="header-search">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Buscar clientes, productos, pedidos..."
              className="w-full h-10 pl-11 pr-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:shadow-md transition-all duration-200 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === 'Enter' && handleSearch(e)
              }
            />
          </div>
        </div>

        {/* Right: User controls */}
        <div className="flex items-center space-x-1">
          {/* Notifications */}
          <Button
            data-tour="header-notifications"
            variant="ghost"
            size="icon"
            className="relative text-gray-600 hover:bg-gray-100 rounded-full"
            onClick={() => {
              fetchNotifications();
              setIsNotificationsOpen(true);
            }}
          >
            <Bell className="h-5 w-5 text-amber-500" />
            {unread > 0 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">{unread}</span>
              </div>
            )}
          </Button>

          {/* Help */}
          <Button
            data-tour="header-help"
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:bg-gray-100 rounded-full"
            onClick={onHelpClick}
            aria-label="Ayuda"
          >
            <Info className="h-5 w-5 text-blue-400" />
          </Button>

          {/* Apps menu */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-current rounded-full" />
              ))}
            </div>
          </Button>

          {/* User menu */}
          <Button
            data-tour="header-user-menu"
            variant="ghost"
            className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded-full h-auto"
            onClick={() => setIsUserMenuOpen(true)}
          >
            <div className="hidden md:block text-right mr-1">
              <p className="text-sm font-medium text-gray-900 leading-none">{currentUser.name}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </div>

      {/* Notifications Dialog */}
      <Dialog open={isNotificationsOpen} onOpenChange={(open) => { setIsNotificationsOpen(open); if (!open) setExpandedNotifId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Notificaciones</DialogTitle>
              {notifications.length > 0 && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const res = await markAllAsRead();
                    if (res.success) {
                      toast({ title: 'Listo', description: 'Todas marcadas como leídas' });
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 -mr-2"
                >
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          </DialogHeader>

          {notificationsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No tienes notificaciones</p>
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
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={async () => {
                      if (isUnread) await markAsRead(n.id);
                      setExpandedNotifId(prev => prev === n.id ? null : n.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
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
                          'text-sm text-gray-600 mt-1 transition-all',
                          expandedNotifId === n.id ? '' : 'line-clamp-2'
                        )}>
                          {n.mensaje}
                        </p>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {formatTime(createdDate)}
                        </span>
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

      {/* Impersonation Modal (solo SUPER_ADMIN) */}
      {currentUser.role === 'SUPER_ADMIN' && (
        <ImpersonationModal
          isOpen={isImpersonationOpen}
          onClose={() => setIsImpersonationOpen(false)}
          tenant={null}
        />
      )}

      {/* User Menu Dialog */}
      <Dialog open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cuenta de usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border">
              <Avatar className="h-12 w-12">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{currentUser.name}</h3>
                <p className="text-sm text-gray-600">{currentUser.email}</p>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                      currentUser.role
                    )}`}
                  >
                    {getRoleDisplayName(currentUser.role)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  router.push('/profile');
                  setIsUserMenuOpen(false);
                }}
              >
                <User className="h-4 w-4 mr-3 text-blue-500" />
                Mi perfil
              </Button>
              {/* Solo SUPER_ADMIN y ADMIN pueden ver Configuración */}
              {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') && (
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    router.push('/settings');
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4 mr-3 text-gray-500" />
                  Configuración
                </Button>
              )}
              {/* Solo SUPER_ADMIN puede impersonar empresas */}
              {currentUser.role === 'SUPER_ADMIN' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsImpersonationOpen(true);
                  }}
                >
                  <Building2 className="h-4 w-4 mr-3 text-purple-500" />
                  Impersonar Empresa
                </Button>
              )}
              <div className="border-t pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="h-4 w-4 mr-3 animate-spin rounded-full border-2 border-red-500 border-r-transparent" />
                      Cerrando sesión...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-3" />
                      Cerrar sesión
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header; // <-- para poder importarlo como default
