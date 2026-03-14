'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/hooks/useToast';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/contexts/ProfileContext';
import { deviceSessionService, type DeviceSessionDto } from '@/services/api/deviceSessions';
import { dashboardService, type ActivityLogEntry } from '@/services/dashboardService';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { SecurityTab } from '@/app/(dashboard)/settings/components/SecurityTab';
import { NotificationsTab } from '@/app/(dashboard)/settings/components/NotificationsTab';
import {
  User,
  Shield,
  Smartphone,
  Monitor,
  Save,
  MapPin,
  Building,
  Clock,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';

// Roles del sistema
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VENDEDOR = 'VENDEDOR',
}

export default function ProfilePage() {
  const { formatDate } = useFormatters();
  useSession();
  const {
    profile,
    isLoading,
    isUpdating,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  } = useProfile();

  const [devices, setDevices] = useState<DeviceSessionDto[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [editStates, setEditStates] = useState({
    personal: false,
    devices: false,
  });

  // Notifications state for NotificationsTab
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    desktop: false,
  });

  // Original profile state for change detection
  const [originalProfile, setOriginalProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    location: '',
    bio: '',
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    location: '',
    bio: '',
  });

  // Load devices + activity
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const sessions = await deviceSessionService.getMisSesiones();
        setDevices(sessions);
      } catch {
        // Silent fail — devices section will show empty
      }
    };
    const loadActivity = async () => {
      try {
        const res = await dashboardService.getRecentActivity(10);
        setActivityLog(res.activities);
      } catch {
        // Silent fail — activity section will show empty
      }
    };
    loadDevices();
    loadActivity();
  }, []);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      const initialProfile = {
        name: profile.nombre || '',
        email: profile.email || '',
        phone: '',
        department: '',
        location: '',
        bio: '',
      };
      setProfileForm(initialProfile);
      setOriginalProfile(initialProfile);
    }
  }, [profile]);

  // Change detection for personal tab
  const hasPersonalChanges =
    editStates.personal &&
    (profileForm.name !== originalProfile.name ||
      profileForm.email !== originalProfile.email ||
      profileForm.phone !== originalProfile.phone ||
      profileForm.department !== originalProfile.department ||
      profileForm.location !== originalProfile.location ||
      profileForm.bio !== originalProfile.bio);

  const hasUnsavedChanges = hasPersonalChanges;

  const {
    showDialog,
    setShowDialog,
    handleContinueNavigation,
    handleCancelNavigation,
  } = useUnsavedChanges({
    hasUnsavedChanges,
    onSave: async () => {
      if (hasPersonalChanges) {
        return await handleSaveProfile();
      }
      return true;
    },
    message: 'Tienes cambios sin guardar que se perderán si abandonas esta página.',
  });

  // Role-based permissions
  const isSuperAdmin = profile?.esSuperAdmin || false;
  const isAdmin = profile?.esAdmin || false;
  const isVendedor = !isAdmin && !isSuperAdmin;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-6">
        <p className="text-red-600">Error al cargar el perfil</p>
      </div>
    );
  }

  const handleSaveProfile = async (): Promise<boolean> => {
    if (isVendedor) {
      toast({
        title: 'Sin permisos',
        description: 'Solo el administrador puede modificar tu información personal',
        variant: 'destructive',
      });
      return false;
    }

    const success = await updateProfile({
      email: profileForm.email,
      nombre: profileForm.name,
    });

    if (success) {
      setEditStates(prev => ({ ...prev, personal: false }));
      setOriginalProfile({ ...profileForm });
    }

    return success;
  };

  const handleCancelPersonalEdit = () => {
    if (hasPersonalChanges) {
      setShowDialog(true);
    } else {
      setEditStates(prev => ({ ...prev, personal: false }));
      setProfileForm({ ...originalProfile });
    }
  };

  const handleRevokeDevice = async (sessionId: number) => {
    try {
      await deviceSessionService.cerrarSesion(sessionId, 'Cerrado desde perfil');
      setDevices(prev => prev.filter(d => d.id !== sessionId));
      toast({
        title: 'Dispositivo revocado',
        description: 'La sesión ha sido cerrada correctamente',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (date: Date) => {
    return formatDate(date, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu información personal y seguridad
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div data-tour="profile-avatar">
              <ImageUpload
                variant="avatar"
                src={profile.avatarUrl}
                alt={profile.nombre}
                fallback={getInitials(profile.nombre)}
                fallbackClassName="bg-primary/15 text-primary"
                size="lg"
                maxSizeMB={2}
                hint="PNG, JPG o WebP. Máx. 2 MB."
                disabled={isUpdating}
                onUpload={uploadAvatar}
                onDelete={deleteAvatar}
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{profile.nombre}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <Badge
                  className={
                    {
                      [UserRole.SUPER_ADMIN]: 'bg-red-100 text-red-800',
                      [UserRole.ADMIN]: 'bg-blue-100 text-blue-800',
                      [UserRole.SUPERVISOR]: 'bg-green-100 text-green-800',
                      [UserRole.VENDEDOR]: 'bg-yellow-100 text-yellow-800',
                    }[profile.role as UserRole] || 'bg-gray-100 text-gray-800'
                  }
                >
                  {profile.esSuperAdmin && 'Super Administrador'}
                  {profile.esAdmin && !profile.esSuperAdmin && 'Administrador'}
                  {!profile.esAdmin && !profile.esSuperAdmin && 'Vendedor'}
                </Badge>
                <Badge variant="outline">
                  <Building className="h-3 w-3 mr-1" />
                  Empresa
                </Badge>
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {'Ciudad de México'}
                </Badge>
              </div>
            </div>

            <div className="text-center md:text-right">
              {isSuperAdmin && (
                <div>
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Super Admin
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList data-tour="profile-tabs">
          <TabsTrigger value="personal">Información Personal</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card data-tour="profile-personal">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>
                    Actualiza tu información personal y de contacto
                  </CardDescription>
                </div>
                {!editStates.personal && (
                  <Button
                    onClick={() => setEditStates(prev => ({ ...prev, personal: true }))}
                    disabled={isVendedor || isUpdating}
                    title={
                      isVendedor ? 'Solo el administrador puede modificar tu información' : ''
                    }
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Editar Información
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={profileForm.department}
                    onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={profileForm.location}
                    onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Input
                    value={
                      profile.esSuperAdmin
                        ? 'Super Administrador'
                        : profile.esAdmin
                        ? 'Administrador'
                        : 'Vendedor'
                    }
                    disabled
                  />
                </div>
              </div>

              {editStates.personal && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelPersonalEdit}
                    disabled={isUpdating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isUpdating || !hasPersonalChanges}
                    title={!hasPersonalChanges ? 'No hay cambios para guardar' : ''}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab — uses full SecurityTab component from settings */}
        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dispositivos Conectados</CardTitle>
                  <CardDescription>
                    Gestiona los dispositivos que tienen acceso a tu cuenta
                  </CardDescription>
                </div>
                {!editStates.devices && (
                  <Button
                    onClick={() => setEditStates(prev => ({ ...prev, devices: true }))}
                    size="sm"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Administrar Dispositivos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay sesiones activas</p>
                ) : devices.map(device => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {device.deviceType === 2 || device.deviceType === 3 ? (
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{device.deviceName || device.deviceTypeNombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {device.deviceTypeNombre}{device.ipAddress ? ` • ${device.ipAddress}` : ''} • Último acceso: {formatTime(new Date(device.lastActivity))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.esSesionActual && (
                        <Badge className="bg-green-500 text-white">Sesión actual</Badge>
                      )}
                      {!device.esSesionActual && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeDevice(device.id)}
                        >
                          Revocar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {editStates.devices && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditStates(prev => ({ ...prev, devices: false }))}>
                    Terminar Administración
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab — uses NotificationsTab component from settings */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab
            notifications={notifications}
            setNotifications={setNotifications}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividad</CardTitle>
              <CardDescription>Registro de las últimas acciones en tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay actividad reciente</p>
                ) : activityLog.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <div className="p-2 bg-muted rounded-full">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.timeAgo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.browser && `${activity.browser}`}{activity.operatingSystem ? ` • ${activity.operatingSystem}` : ''}{activity.ipAddress ? ` • IP: ${activity.ipAddress}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for unsaved changes */}
      <UnsavedChangesDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar en tu información personal que se perderán si continúas. ¿Qué deseas hacer?"
        onContinue={() => {
          setShowDialog(false);
          if (hasPersonalChanges) {
            setEditStates(prev => ({ ...prev, personal: false }));
            setProfileForm({ ...originalProfile });
          }
          handleContinueNavigation();
        }}
        onCancel={handleCancelNavigation}
        showSaveOption={false}
        isLoading={isUpdating}
      />
    </div>
  );
}
