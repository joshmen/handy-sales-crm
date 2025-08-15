'use client';

import React, { useState, useEffect } from 'react';
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

type Breadcrumb = { label: string; href: string; isLast: boolean };

interface HeaderProps {
  onMenuClick?: () => void;
}

// Breadcrumb mapping
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
};

// Mock user for testing
const mockUser = {
  id: '1',
  name: 'Carlos Mendoza',
  email: 'carlos@handy.com',
  role: 'VENDEDOR',
  avatar: '',
};

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    title: 'Nueva visita programada',
    message: 'Se ha programado una visita para el cliente Abarrotes Don Juan',
    read: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Stock bajo',
    message: 'El producto "Refresco Cola 2L" tiene stock bajo',
    read: false,
    createdAt: new Date(),
  },
];

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [mounted, setMounted] = useState(false);
  const { toggle } = useSidebar();
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Usar datos reales del usuario si está disponible
  const currentUser = session?.user
    ? {
        id: session.user.id || '1',
        name: session.user.name || 'Usuario',
        email: session.user.email || 'usuario@handysales.com',
        role: session.user.role || 'VENDEDOR',
        avatar: session.user.image || '',
      }
    : mockUser;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumbs
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: Breadcrumb[] = [];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);

      crumbs.push({
        label,
        href: currentPath,
        isLast: index === segments.length - 1,
      });
    });

    return crumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const unreadNotifications = mockNotifications.filter(n => !n.read).length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: 'Búsqueda',
        description: `Buscando: ${searchQuery}`,
      });
      setIsSearchOpen(false);
      setSearchQuery('');
      // TODO: Implementar lógica de búsqueda real
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        redirect: false,
        callbackUrl: '/login',
      });

      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión exitosamente',
      });

      if (typeof window !== 'undefined') {
        localStorage.clear();
      }

      router.push('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
      setIsUserMenuOpen(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleMenuButton = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      toggle();
    }
  };

  // No renderizar botones interactivos hasta que esté montado
  if (!mounted) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Handy CRM</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={handleMenuButton}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center space-x-1 flex-1">
          <div className="flex items-center">
            <Home className="h-4 w-4 mr-1" />
            <span className="text-sm text-muted-foreground">Inicio</span>
          </div>
          {breadcrumbs.map(crumb => (
            <React.Fragment key={crumb.href}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center">
                <span
                  className={cn(
                    'text-sm',
                    crumb.isLast
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground cursor-pointer'
                  )}
                >
                  {crumb.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </nav>

        {/* Mobile title */}
        <div className="flex-1 md:hidden">
          <h1 className="text-lg font-semibold">{routeLabels[pathname] || 'Handy CRM'}</h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Search */}
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Search className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Búsqueda global</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSearch} className="space-y-4">
                <Input
                  placeholder="Buscar clientes, productos, pedidos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsSearchOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!searchQuery.trim()}>
                    Buscar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notificaciones</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {mockNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      !notification.read && 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="h-6" />

          {/* User menu */}
          <Dialog open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Menú de usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* User info */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium">{currentUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {currentUser.role}
                    </Badge>
                  </div>
                </div>

                {/* Menu items */}
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push('/profile');
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Mi perfil
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push('/settings');
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración
                  </Button>
                  <Separator />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-destructive border-r-transparent" />
                        Cerrando sesión...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar sesión
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};
