'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Building } from 'lucide-react';

interface BillingTabProps {
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  isSuperAdmin,
  isAdmin
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Información de Facturación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">
                  Configuración de Facturación
                </h4>
                <p className="text-sm text-blue-800">
                  Esta sección permitirá configurar los datos de facturación de tu empresa,
                  incluyendo información fiscal, direcciones de facturación y métodos de pago.
                </p>
                {(isSuperAdmin || isAdmin) && (
                  <p className="text-xs text-blue-700">
                    Como {isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}, tendrás acceso completo
                    a la gestión de datos de facturación.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Próximas funcionalidades:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                Configuración de datos fiscales (RFC, Razón Social)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                Direcciones de facturación
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                Métodos de pago preferidos
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                Configuración de impuestos
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                Integración con servicios de facturación
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled>
            Disponible próximamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};