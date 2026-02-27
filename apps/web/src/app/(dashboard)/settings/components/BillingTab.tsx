'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Building, ExternalLink, Receipt } from 'lucide-react';
import Link from 'next/link';

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
          Facturación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">
                  Facturación SAT (CFDI 4.0)
                </h4>
                <p className="text-sm text-blue-800">
                  Habilita la emisión de facturas electrónicas con validez fiscal ante el SAT
                  desde el Marketplace de Integraciones. Incluye timbrado, cancelación, envío
                  por correo y generación de PDF/XML.
                </p>
                {(isSuperAdmin || isAdmin) && (
                  <p className="text-xs text-blue-700">
                    Disponible como add-on en la sección de Integraciones.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Funcionalidades incluidas:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                Configuración de datos fiscales (RFC, Razón Social, Régimen)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                Emisión y timbrado de CFDI 4.0
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                Cancelación con acuse SAT
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                Generación de PDF y XML
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                Envío de facturas por correo electrónico
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                Reportes de facturación y auditoría
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/integrations">
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir a Integraciones
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
