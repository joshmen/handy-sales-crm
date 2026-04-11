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
import { useTranslations } from 'next-intl';
import { useFormatters } from '@/hooks/useFormatters';

// Roles del sistema
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VENDEDOR = 'VENDEDOR',
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
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
    message: t('discardChangesDesc'),
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
          <p className="text-foreground/70">{t('loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-6">
        <p className="text-red-600">{t('errorLoading')}</p>
      </div>
    );
  }

  const handleSaveProfile = async (): Promise<boolean> => {
    if (isVendedor) {
      toast({
        title: t('noPermission'),
        description: t('noPermissionDesc'),
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
        title: t('deviceRevoked'),
        description: t('deviceRevokedDesc'),
      });
    } catch {
      toast({
        title: 'Error',
        description: t('errorRevokingDevice'),
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
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div data-tour="profile-avatar" className="shrink-0">
              <ImageUpload
                variant="avatar"
                src={profile.avatarUrl}
                alt={profile.nombre}
                fallback={getInitials(profile.nombre)}
                fallbackClassName="bg-primary/15 text-primary"
                size="xl"
                maxSizeMB={2}
                hint={t('imageHint')}
                disabled={isUpdating}
                onUpload={uploadAvatar}
                onDelete={deleteAvatar}
              />
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
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
                    }[profile.role as UserRole] || 'bg-surface-3 text-foreground'
                  }
                >
                  {profile.esSuperAdmin && t('roles.superAdmin')}
                  {profile.esAdmin && !profile.esSuperAdmin && t('roles.admin')}
                  {!profile.esAdmin && !profile.esSuperAdmin && t('roles.vendor')}
                </Badge>
                <Badge variant="outline">
                  <Building className="h-3 w-3 mr-1" />
                  {t('company')}
                </Badge>
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {'Ciudad de México'}
                </Badge>
              </div>
            </div>

            <div className="text-center md:text-right shrink-0">
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
          <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
          <TabsTrigger value="security">{t('tabs.security')}</TabsTrigger>
          <TabsTrigger value="devices">{t('tabs.devices')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="activity">{t('tabs.activity')}</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card data-tour="profile-personal">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('personalInfo')}</CardTitle>
                  <CardDescription>
                    {t('personalInfoDesc')}
                  </CardDescription>
                </div>
                {!editStates.personal && (
                  <Button
                    onClick={() => setEditStates(prev => ({ ...prev, personal: true }))}
                    disabled={isVendedor || isUpdating}
                    title={
                      isVendedor ? t('noPermissionDesc') : ''
                    }
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {t('editInfo')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('fullName')}</Label>
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
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">{t('department')}</Label>
                  <Input
                    id="department"
                    value={profileForm.department}
                    onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">{t('location')}</Label>
                  <Input
                    id="location"
                    value={profileForm.location}
                    onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                    disabled={!editStates.personal}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Input
                    value={
                      profile.esSuperAdmin
                        ? t('roles.superAdmin')
                        : profile.esAdmin
                        ? t('roles.admin')
                        : t('roles.vendor')
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
                    {tc('cancel')}
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isUpdating || !hasPersonalChanges}
                    title={!hasPersonalChanges ? t('noChangesToSave') : ''}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? tc('saving') : tc('save')}
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
                  <CardTitle>{t('connectedDevices')}</CardTitle>
                  <CardDescription>
                    {t('connectedDevicesDesc')}
                  </CardDescription>
                </div>
                {!editStates.devices && (
                  <Button
                    onClick={() => setEditStates(prev => ({ ...prev, devices: true }))}
                    size="sm"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    {t('manageDevices')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('noActiveSessions')}</p>
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
                          {device.deviceTypeNombre}{device.ipAddress ? ` • ${device.ipAddress}` : ''} • {t('lastAccess')}: {formatTime(new Date(device.lastActivity))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.esSesionActual && (
                        <Badge className="bg-green-500 text-white">{t('currentSession')}</Badge>
                      )}
                      {!device.esSesionActual && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeDevice(device.id)}
                        >
                          {t('revoke')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {editStates.devices && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditStates(prev => ({ ...prev, devices: false }))}>
                    {t('finishManaging')}
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
              <CardTitle>{t('activityHistory')}</CardTitle>
              <CardDescription>{t('activityHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('noRecentActivity')}</p>
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
        title={t('discardChangesTitle')}
        description={t('discardChangesDesc')}
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
