'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { PromotionForm } from '@/components/promotions';
import { CreatePromotionDto } from '@/types/promotions';

export default function CreatePromotionPage() {
  const router = useRouter();

  const handleSubmit = (data: CreatePromotionDto) => {
    console.log('Creating promotion:', data);
    // Aquí iría la lógica para crear la promoción
    // Después redirigir a la lista de promociones
    router.push('/promotions');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crear nueva promoción</h1>
            <p className="text-gray-600">
              Crea promociones especiales para los clientes configurando productos de aplicación, recompensas y limitantes
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 text-lg">💡</div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Consejos para crear promociones efectivas:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Define claramente qué productos debe comprar el cliente para obtener la recompensa</li>
                    <li>• Establece límites de presupuesto y uso para controlar el impacto financiero</li>
                    <li>• Considera las fechas de vigencia para promociones temporales</li>
                    <li>• Revisa que los productos de recompensa estén disponibles en inventario</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario */}
        <PromotionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
}