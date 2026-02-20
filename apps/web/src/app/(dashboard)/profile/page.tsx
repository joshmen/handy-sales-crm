'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Separator } from '@/components/ui/Separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from '@/hooks/useToast';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/contexts/ProfileContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { TwoFactorSetup as TwoFactorSetupDialog } from '@/components/settings/TwoFactorSetup';
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Calendar,
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  MapPin,
  Building,
  Languages,
  Clock,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Palette,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  MoreHorizontal,
} from 'lucide-react';

// Roles del sistema
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VENDEDOR = 'VENDEDOR',
}

const mockDevices = [
  {
    id: '1',
    name: 'iPhone 14 Pro',
    type: 'mobile',
    platform: 'iOS',
    lastActive: new Date('2025-01-14T10:30:00'),
    current: true,
  },
  {
    id: '2',
    name: 'Chrome - Windows',
    type: 'desktop',
    platform: 'Windows',
    lastActive: new Date('2025-01-14T09:15:00'),
    current: false,
  },
  {
    id: '3',
    name: 'Safari - MacBook',
    type: 'desktop',
    platform: 'macOS',
    lastActive: new Date('2025-01-10T14:20:00'),
    current: false,
  },
];

const mockActivity = [
  {
    id: '1',
    action: 'Inicio de sesión',
    timestamp: new Date('2025-01-14T08:00:00'),
    device: 'iPhone 14 Pro',
    ip: '192.168.1.100',
  },
  {
    id: '2',
    action: 'Cambio de contraseña',
    timestamp: new Date('2025-01-10T15:30:00'),
    device: 'Chrome - Windows',
    ip: '192.168.1.101',
  },
  {
    id: '3',
    action: 'Actualización de perfil',
    timestamp: new Date('2025-01-08T11:20:00'),
    device: 'Safari - MacBook',
    ip: '192.168.1.102',
  },
];

export default function ProfilePage() {
  // TODOS los hooks deben estar al inicio para cumplir las reglas de hooks
  const { data: session } = useSession();
  const {
    profile,
    isLoading,
    isUpdating,
    isChangingPassword,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
  } = useProfile();

  // Mock function para updatePreferences y toggle2FA (no implementadas en contexto aún)
  const updatePreferences = async (data: {
    language: string;
    timezone: string;
    theme: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    soundEnabled: boolean;
    compactView: boolean;
    showOnlineStatus: boolean;
  }) => {
    console.log('updatePreferences not implemented yet:', data);
    return true;
  };

  const [setupOpen, setSetupOpen] = useState(false);
  const [tfaStatus, setTfaStatus] = useState<{ enabled: boolean; enabledAt: string | null; remainingRecoveryCodes: number } | null>(null);

  // Load 2FA status
  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        const { profileService } = await import('@/services/api/profileService');
        const response = await profileService.get2FAStatus();
        if (response.success && response.data) {
          setTfaStatus(response.data);
        }
      } catch {
        // Silent fail
      }
    };
    load2FAStatus();
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de edición individuales por tab
  const [editStates, setEditStates] = useState({
    personal: false,
    security: false,
    preferences: false,
    devices: false,
  });
  // Estados originales para cada sección
  const [originalStates, setOriginalStates] = useState({
    profile: {
      name: '',
      email: '',
      phone: '',
      department: '',
      location: '',
      bio: '',
    },
    preferences: {
      language: 'es',
      timezone: 'America/Mexico_City',
      theme: 'light',
      emailNotifications: true,
      pushNotifications: false,
      marketingEmails: false,
      soundEnabled: true,
      compactView: false,
      showOnlineStatus: true,
    },
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Inicializar formularios con valores por defecto que se actualizarán cuando profile esté disponible
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    location: '',
    bio: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'light',
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    soundEnabled: true,
    compactView: false,
    showOnlineStatus: true,
  });

  // Efecto para actualizar los formularios cuando el perfil cargue
  useEffect(() => {
    if (profile) {
      const initialProfile = {
        name: profile.nombre || '',
        email: profile.email || '',
        phone: '', // Not supported by backend yet
        department: '', // Not supported by backend yet
        location: '', // Not supported by backend yet
        bio: '', // Not supported by backend yet
      };

      const initialPreferences = {
        language: 'es',
        timezone: 'America/Mexico_City',
        theme: 'light',
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
        soundEnabled: true,
        compactView: false,
        showOnlineStatus: true,
      };

      setProfileForm(initialProfile);
      setPreferences(initialPreferences);

      // Guardar estados originales para detección de cambios
      setOriginalStates({
        profile: initialProfile,
        preferences: initialPreferences,
      });
    }
  }, [profile]);

  // Funciones para detectar cambios por sección
  const hasPersonalChanges =
    editStates.personal &&
    (profileForm.name !== originalStates.profile.name ||
      profileForm.email !== originalStates.profile.email ||
      profileForm.phone !== originalStates.profile.phone ||
      profileForm.department !== originalStates.profile.department ||
      profileForm.location !== originalStates.profile.location ||
      profileForm.bio !== originalStates.profile.bio);

  const hasPreferencesChanges =
    editStates.preferences &&
    (preferences.language !== originalStates.preferences.language ||
      preferences.timezone !== originalStates.preferences.timezone ||
      preferences.theme !== originalStates.preferences.theme ||
      preferences.emailNotifications !== originalStates.preferences.emailNotifications ||
      preferences.pushNotifications !== originalStates.preferences.pushNotifications ||
      preferences.marketingEmails !== originalStates.preferences.marketingEmails ||
      preferences.soundEnabled !== originalStates.preferences.soundEnabled ||
      preferences.compactView !== originalStates.preferences.compactView ||
      preferences.showOnlineStatus !== originalStates.preferences.showOnlineStatus);

  // Check if there are unsaved changes in any section
  const hasUnsavedChanges = hasPersonalChanges || hasPreferencesChanges;

  // Hook para manejar cambios no guardados
  const {
    showDialog,
    setShowDialog,
    handleContinueNavigation,
    handleSaveAndContinue,
    handleCancelNavigation,
  } = useUnsavedChanges({
    hasUnsavedChanges,
    onSave: async () => {
      // Guardar todas las secciones con cambios
      let success = true;
      if (hasPersonalChanges) {
        success = success && (await handleSaveProfile());
      }
      if (hasPreferencesChanges) {
        success = success && (await handleSavePreferences());
      }
      return success;
    },
    message: 'Tienes cambios sin guardar que se perderán si abandonas esta página.',
  });

  // Determinar permisos según el rol (backend usa boolean flags)
  const isSuperAdmin = profile?.esSuperAdmin || false;
  const isAdmin = profile?.esAdmin || false;
  const isVendedor = !profile?.esAdmin && !profile?.esSuperAdmin;

  // Renders condicionales DESPUÉS de todos los hooks
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

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Función para determinar qué campos puede editar el usuario
  const canEditField = (field: string): boolean => {
    if (isSuperAdmin) return true; // Super admin puede editar todo menos el rol
    if (isAdmin) return !['role'].includes(field); // Admin puede editar todo menos rol
    if (isVendedor) return false; // Vendedor no puede editar campos del perfil
    return false;
  };

  const canEditNotifications = (): boolean => {
    return isSuperAdmin || isAdmin; // Solo admin y super admin
  };

  // Funciones de guardado por sección
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
      password: passwordForm.newPassword,
    });

    if (success) {
      setEditStates(prev => ({ ...prev, personal: false }));
      // Update original state to reflect saved changes
      setOriginalStates(prev => ({
        ...prev,
        profile: { ...profileForm },
      }));
    }

    return success;
  };

  const handleSavePreferences = async (): Promise<boolean> => {
    const success = await updatePreferences(preferences);

    if (success) {
      setEditStates(prev => ({ ...prev, preferences: false }));
      // Update original state to reflect saved changes
      setOriginalStates(prev => ({
        ...prev,
        preferences: { ...preferences },
      }));
    }

    return success;
  };

  // Funciones de cancelación por sección
  const handleCancelPersonalEdit = () => {
    if (hasPersonalChanges) {
      setShowDialog(true);
    } else {
      setEditStates(prev => ({ ...prev, personal: false }));
      // Reset form to original values
      setProfileForm({ ...originalStates.profile });
    }
  };

  const handleCancelPreferencesEdit = () => {
    if (hasPreferencesChanges) {
      setShowDialog(true);
    } else {
      setEditStates(prev => ({ ...prev, preferences: false }));
      // Reset form to original values
      setPreferences({ ...originalStates.preferences });
    }
  };

  const handleCancelSecurityEdit = () => {
    setEditStates(prev => ({ ...prev, security: false }));
    // Reset password form
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleCancelDevicesEdit = () => {
    setEditStates(prev => ({ ...prev, devices: false }));
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    const success = await changePassword({
      password: passwordForm.newPassword,
    });

    if (success) {
      setEditStates(prev => ({ ...prev, security: false }));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo y tamaño
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Solo se permiten archivos de imagen',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        // 2MB
        toast({
          title: 'Error',
          description: 'El archivo debe ser menor a 2MB',
          variant: 'destructive',
        });
        return;
      }

      await uploadAvatar(file);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile?.avatarUrl) return;

    const confirmed = confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?');
    if (confirmed) {
      await deleteAvatar();
    }
  };

  const handleRevokeDevice = (deviceId: string) => {
    toast({
      title: 'Dispositivo revocado',
      description: 'El dispositivo ha sido desconectado de tu cuenta',
    });
  };

  const handleToggle2FA = () => {
    if (tfaStatus?.enabled) {
      // Redirect to settings security tab for full management
      window.location.href = '/settings?tab=security';
    } else {
      setSetupOpen(true);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('es-MX', {
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
            Gestiona tu información personal y preferencias
          </p>
        </div>

        {/* Profile Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div data-tour="profile-avatar" className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatarUrl} alt={profile.nombre} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {getInitials(profile.nombre)}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {/* Botón para cambiar/subir foto */}
                <button
                  onClick={handleAvatarUpload}
                  disabled={isUpdating}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                  title={profile.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                >
                  {profile.avatarUrl ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </button>

                {/* Botón para eliminar foto (solo si hay foto) */}
                {profile.avatarUrl && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={isUpdating}
                    className="absolute -bottom-1 -left-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                    title="Eliminar foto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
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
                    {'Ciudad de México'} {/* Backend doesn't support location yet */}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Miembro desde {'15 enero 2024'} {/* Backend doesn't support joined date yet */}
                </p>
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
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
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

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                    <CardDescription>Última actualización: {'1 noviembre 2024'}</CardDescription>
                  </div>
                  {!editStates.security && (
                    <Button
                      onClick={() => setEditStates(prev => ({ ...prev, security: true }))}
                      size="sm"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Cambiar Contraseña
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={e =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      disabled={!editStates.security}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={e =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      disabled={!editStates.security}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    disabled={!editStates.security}
                  />
                </div>

                {editStates.security && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelSecurityEdit}
                      disabled={isChangingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={
                        isChangingPassword ||
                        !passwordForm.currentPassword ||
                        !passwordForm.newPassword ||
                        !passwordForm.confirmPassword
                      }
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {isChangingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Autenticación de Dos Factores</CardTitle>
                <CardDescription>Añade una capa extra de seguridad a tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-5 w-5 ${tfaStatus?.enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">2FA</p>
                      <p className="text-sm text-muted-foreground">
                        {tfaStatus?.enabled ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={tfaStatus?.enabled ? 'outline' : 'default'}
                    onClick={handleToggle2FA}
                  >
                    {tfaStatus?.enabled ? 'Administrar' : 'Configurar 2FA'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2FA Setup Dialog */}
            {setupOpen && (
              <TwoFactorSetupDialog
                open={setupOpen}
                onOpenChange={setSetupOpen}
                onComplete={async () => {
                  try {
                    const { profileService } = await import('@/services/api/profileService');
                    const response = await profileService.get2FAStatus();
                    if (response.success && response.data) {
                      setTfaStatus(response.data);
                    }
                  } catch {
                    // Silent
                  }
                }}
              />
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Preferencias Generales</CardTitle>
                    <CardDescription>Configura tus preferencias de aplicación</CardDescription>
                  </div>
                  {!editStates.preferences && (
                    <Button
                      onClick={() => setEditStates(prev => ({ ...prev, preferences: true }))}
                      size="sm"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Editar Preferencias
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={value => setPreferences({ ...preferences, language: value })}
                      disabled={!editStates.preferences}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona horaria</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={value => setPreferences({ ...preferences, timezone: value })}
                      disabled={!editStates.preferences}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                        <SelectItem value="America/Bogota">Bogotá</SelectItem>
                        <SelectItem value="America/New_York">Nueva York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Apariencia</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {preferences.theme === 'light' ? (
                        <Sun className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Moon className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Tema</p>
                        <p className="text-sm text-muted-foreground">
                          {preferences.theme === 'light' ? 'Claro' : 'Oscuro'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          theme: preferences.theme === 'light' ? 'dark' : 'light',
                        })
                      }
                      disabled={!editStates.preferences}
                    >
                      Cambiar
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Palette className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Modo compacto</p>
                        <p className="text-sm text-muted-foreground">
                          Reduce el espaciado en la interfaz
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.compactView}
                      onChange={e =>
                        setPreferences({ ...preferences, compactView: e.target.checked })
                      }
                      disabled={!editStates.preferences}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notificaciones</h4>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">
                          Recibir notificaciones por correo
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={e =>
                        setPreferences({ ...preferences, emailNotifications: e.target.checked })
                      }
                      disabled={!editStates.preferences}
                      className="rounded border-gray-300"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Push</p>
                        <p className="text-sm text-muted-foreground">
                          Notificaciones en el navegador
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.pushNotifications}
                      onChange={e =>
                        setPreferences({ ...preferences, pushNotifications: e.target.checked })
                      }
                      disabled={!editStates.preferences}
                      className="rounded border-gray-300"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Marketing</p>
                        <p className="text-sm text-muted-foreground">
                          Recibir emails promocionales
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketingEmails}
                      onChange={e =>
                        setPreferences({ ...preferences, marketingEmails: e.target.checked })
                      }
                      disabled={!editStates.preferences}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>

                {editStates.preferences && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelPreferencesEdit}
                      disabled={isUpdating}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSavePreferences}
                      disabled={isUpdating || !hasPreferencesChanges}
                      title={!hasPreferencesChanges ? 'No hay cambios para guardar' : ''}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  {mockDevices.map(device => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {device.type === 'mobile' ? (
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.platform} • Último acceso: {formatTime(device.lastActive)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.current && (
                          <Badge className="bg-green-500 text-white">Sesión actual</Badge>
                        )}
                        {!device.current && (
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
                    <Button variant="outline" onClick={handleCancelDevicesEdit}>
                      Terminar Administración
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  {mockActivity.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="p-2 bg-muted rounded-full">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.device} • IP: {activity.ip}
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
          description={`Tienes cambios sin guardar en ${
            hasPersonalChanges && hasPreferencesChanges
              ? 'tu información personal y preferencias'
              : hasPersonalChanges
              ? 'tu información personal'
              : 'tus preferencias'
          } que se perderán si continúas. ¿Qué deseas hacer?`}
          onContinue={() => {
            // Cerrar el diálogo primero
            setShowDialog(false);
            // Resetear todos los estados de edición y formas afectadas
            if (hasPersonalChanges) {
              setEditStates(prev => ({ ...prev, personal: false }));
              setProfileForm({ ...originalStates.profile });
            }
            if (hasPreferencesChanges) {
              setEditStates(prev => ({ ...prev, preferences: false }));
              setPreferences({ ...originalStates.preferences });
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
