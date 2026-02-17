'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cloud,
  Settings,
} from 'lucide-react';

interface TenantStatus {
  id: number;
  name: string;
  hasCloudinaryFolder: boolean;
  cloudinaryFolder?: string;
  hasCompanySettings: boolean;
}

interface TenantsSummary {
  total: number;
  withCloudinary: number;
  withoutCloudinary: number;
  withSettings: number;
  withoutSettings: number;
}

interface TenantsStatusResponse {
  tenants: TenantStatus[];
  summary: TenantsSummary;
}

interface MigrationResponse {
  message: string;
}

export function TenantMigration() {
  const [tenants, setTenants] = useState<TenantStatus[]>([]);
  const [summary, setSummary] = useState<TenantsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const loadTenantsStatus = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<TenantsStatusResponse>('/api/migration/tenants-status');
      setTenants(response.data.tenants);
      setSummary(response.data.summary);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el estado de los tenants',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeExistingTenants = async () => {
    setIsMigrating(true);
    try {
      const response = await api.post<MigrationResponse>(
        '/api/migration/initialize-existing-tenants'
      );

      toast({
        title: 'Migración completada',
        description: response.data.message,
      });

      // Recargar el estado
      await loadTenantsStatus();
    } catch (error) {
      toast({
        title: 'Error en la migración',
        description: 'No se pudo completar la inicialización',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Migración de Tenants Existentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Inicializa las carpetas de Cloudinary y configuraciones para tenants existentes que
            fueron creados antes de implementar esta funcionalidad.
          </p>

          <div className="flex gap-3">
            <Button onClick={loadTenantsStatus} disabled={isLoading} variant="outline">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verificar Estado
            </Button>

            <Button
              onClick={initializeExistingTenants}
              disabled={isMigrating || !summary || summary.withoutCloudinary === 0}
            >
              {isMigrating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              Inicializar Tenants
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Tenants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.withCloudinary}</div>
                <div className="text-sm text-muted-foreground">Con Cloudinary</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.withoutCloudinary}</div>
                <div className="text-sm text-muted-foreground">Sin Cloudinary</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.withSettings}</div>
                <div className="text-sm text-muted-foreground">Con Settings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estado por Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{tenant.name}</h4>
                    <p className="text-sm text-muted-foreground">ID: {tenant.id}</p>
                    {tenant.cloudinaryFolder && (
                      <p className="text-xs text-muted-foreground">
                        Carpeta: {tenant.cloudinaryFolder}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Badge
                      variant={tenant.hasCloudinaryFolder ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {tenant.hasCloudinaryFolder ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Cloudinary
                    </Badge>

                    <Badge
                      variant={tenant.hasCompanySettings ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {tenant.hasCompanySettings ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      Settings
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
