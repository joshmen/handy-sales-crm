'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Trash2, Download, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/useToast';

interface SystemTabProps {
  profile: any;
  notifications: any;
  isDarkMode: boolean;
  companySettings: any;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export const SystemTab: React.FC<SystemTabProps> = ({
  profile,
  notifications,
  isDarkMode,
  companySettings,
  isAdmin,
  isSuperAdmin
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Versión de la aplicación</Label>
            <p className="text-sm text-muted-foreground">v1.0.0-beta</p>
          </div>

          <div className="space-y-2">
            <Label>Última actualización</Label>
            <p className="text-sm text-muted-foreground">15 de enero, 2024</p>
          </div>

          <div className="space-y-2">
            <Label>Base de datos</Label>
            <p className="text-sm text-muted-foreground">Conectado</p>
          </div>

          <div className="space-y-2">
            <Label>Servidor</Label>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Acciones del sistema</h3>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Limpiar Caché</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Elimina datos temporales almacenados localmente. Útil si experimentas
                    problemas de rendimiento o datos desactualizados.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    toast({
                      title: 'Caché limpiado',
                      description: 'Los datos temporales han sido eliminados',
                    });
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Exportar Configuración</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Descarga un archivo JSON con todas tus preferencias y configuraciones.
                    Útil para respaldo o migración a otro dispositivo.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const config = {
                      profile,
                      notifications,
                      theme: isDarkMode ? 'dark' : 'light',
                      companySettings: isAdmin ? companySettings : undefined,
                      exportDate: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(config, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `handycrm-config-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({
                      title: 'Configuración exportada',
                      description: 'El archivo se ha descargado correctamente',
                    });
                  }}
                >
                  Exportar
                </Button>
              </div>
            </div>

            {(isAdmin || isSuperAdmin) && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-yellow-900">
                      Información para Administradores
                    </h4>
                    <p className="text-sm text-yellow-800">
                      Como administrador, tienes acceso completo a todas las
                      configuraciones. Los cambios que realices afectarán a todos los
                      usuarios de tu organización.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};