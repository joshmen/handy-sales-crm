'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CreditCard, Mail, Phone, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useState } from 'react';

export default function SuspendedPage() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReactivate = async () => {
    setIsProcessing(true);
    toast({
      title: 'Procesando pago...',
      description: 'Redirigiendo al sistema de pago',
    });

    // TODO: Integrar con sistema de pago real
    setTimeout(() => {
      toast({
        title: 'Pago procesado',
        description: 'Tu membresía ha sido reactivada',
      });
      window.location.href = '/dashboard';
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Membresía Suspendida</h1>

          <p className="text-lg text-gray-600">
            Tu cuenta ha sido suspendida debido a un pago pendiente
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">¿Por qué fue suspendida mi cuenta?</h3>
          <ul className="space-y-2 text-sm text-red-800">
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-1">•</span>
              <span>El pago de tu membresía no pudo ser procesado</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-1">•</span>
              <span>Tu período de gracia de 7 días ha expirado</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-1">•</span>
              <span>Necesitas actualizar tu método de pago para continuar</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Detalles de tu suscripción</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan actual:</span>
              <span className="font-medium">Pro - $899 MXN/mes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Último pago:</span>
              <span className="font-medium">15 de diciembre, 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto pendiente:</span>
              <span className="font-bold text-red-600">$899 MXN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de suspensión:</span>
              <span className="font-medium">8 de enero, 2025</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleReactivate}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pagar y Reactivar Membresía
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => (window.location.href = '/billing/payment-methods')}
          >
            Actualizar Método de Pago
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t">
          <h4 className="font-medium text-gray-900 mb-3">¿Necesitas ayuda?</h4>
          <div className="space-y-2 text-sm">
            <a
              href="mailto:soporte@handysuites.com"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Mail className="h-4 w-4" />
              soporte@handysuites.com
            </a>
            <a
              href="tel:+526611234567"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Phone className="h-4 w-4" />
              +52 661 123 4567
            </a>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Horario de atención: Lunes a Viernes de 9:00 AM a 6:00 PM (Hora del Pacífico)
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> Tu información está segura. Si no reactivás tu membresía en
            los próximos 30 días, tus datos serán archivados pero no eliminados. Podrás recuperar tu
            cuenta en cualquier momento.
          </p>
        </div>
      </Card>
    </div>
  );
}
