'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Trash2, Download, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

interface SystemTabProps {
  profile: {
    name: string;
    email: string;
    phone: string;
    territory: string;
    role: string;
    avatar: string;
    bio: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    desktop: boolean;
  };
  isDarkMode: boolean;
  companySettings: {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
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
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setHealthLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';
        const res = await fetch(`${apiUrl}/health`);
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
          setHealthError(false);
        } else {
          setHealthError(true);
        }
      } catch {
        setHealthError(true);
      } finally {
        setHealthLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Versión de la aplicación</Label>
            {healthLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {health?.version ? `v${health.version}` : 'No disponible'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Última verificación</Label>
            <p className="text-sm text-muted-foreground">
              {health?.timestamp ? formatTimestamp(health.timestamp) : 'No disponible'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Base de datos</Label>
            <div className="flex items-center gap-2">
              {healthLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : healthError ? (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              )}
              <p className="text-sm text-muted-foreground">
                {healthLoading ? 'Verificando...' : healthError ? 'Error de conexión' : 'Conectado'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Servidor</Label>
            <div className="flex items-center gap-2">
              {healthLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : healthError ? (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              )}
              <p className="text-sm text-muted-foreground">
                {healthLoading ? 'Verificando...' : healthError ? 'Sin respuesta' : health?.status === 'healthy' ? 'Online' : 'Degradado'}
              </p>
            </div>
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
                    a.download = `handysuites-config-${Date.now()}.json`;
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
