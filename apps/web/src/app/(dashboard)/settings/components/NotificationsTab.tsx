'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { Mail, Phone, Smartphone, Monitor, Save } from 'lucide-react';
import { notificationService } from '@/services/api/notificationService';
import { toast } from '@/hooks/useToast';

interface NotificationsTabProps {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    desktop: boolean;
  };
  setNotifications: React.Dispatch<React.SetStateAction<{
    email: boolean;
    push: boolean;
    sms: boolean;
    desktop: boolean;
  }>>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  setNotifications,
  isSuperAdmin,
  isAdmin
}) => {
  const [originalNotifications, setOriginalNotifications] = useState(notifications);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar preferencias del usuario al montar el componente
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const response = await notificationService.getPreferences();
        if (response.success && response.data) {
          const preferences = {
            email: response.data.emailNotifications,
            push: response.data.pushNotifications,
            sms: response.data.smsNotifications,
            desktop: response.data.desktopNotifications,
          };
          setNotifications(preferences);
          setOriginalNotifications(preferences);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las preferencias de notificación',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [setNotifications]);

  // Detectar cambios en las notificaciones
  useEffect(() => {
    const changed = JSON.stringify(notifications) !== JSON.stringify(originalNotifications);
    setHasChanges(changed);
  }, [notifications, originalNotifications]);

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const response = await notificationService.savePreferences({
        emailNotifications: notifications.email,
        pushNotifications: notifications.push,
        smsNotifications: notifications.sms,
        desktopNotifications: notifications.desktop,
      });

      if (response.success) {
        setOriginalNotifications(notifications);
        setHasChanges(false);
        toast({
          title: 'Preferencias guardadas',
          description: 'Las preferencias de notificación se han actualizado correctamente',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'No se pudieron guardar las preferencias',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al guardar las preferencias',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias de Notificaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Notificaciones por email</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibe actualizaciones importantes por correo electrónico
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={checked =>
                setNotifications({
                  ...notifications,
                  email: checked,
                })
              }
              disabled={isLoading || (!isSuperAdmin && !isAdmin)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Notificaciones push</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibe notificaciones en tu dispositivo móvil
              </p>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={checked =>
                setNotifications({
                  ...notifications,
                  push: checked,
                })
              }
              disabled={isLoading || (!isSuperAdmin && !isAdmin)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Notificaciones SMS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibe mensajes de texto para eventos críticos
              </p>
            </div>
            <Switch
              checked={notifications.sms}
              onCheckedChange={checked =>
                setNotifications({
                  ...notifications,
                  sms: checked,
                })
              }
              disabled={isLoading || (!isSuperAdmin && !isAdmin)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Notificaciones de escritorio</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Muestra notificaciones en tu navegador
              </p>
            </div>
            <Switch
              checked={notifications.desktop}
              onCheckedChange={checked =>
                setNotifications({
                  ...notifications,
                  desktop: checked,
                })
              }
              disabled={isLoading || (!isSuperAdmin && !isAdmin)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveNotifications}
            disabled={isLoading || isSaving || !hasChanges || (!isSuperAdmin && !isAdmin)}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar preferencias'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};