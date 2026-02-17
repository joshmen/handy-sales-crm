'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { PromotionForm } from '@/components/promotions';
import { CreatePromotionDto, PromotionType, RewardMethod } from '@/types/promotions';

// Schema de validación para promociones - sincronizado con backend
const promotionCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(PromotionType),
  applicationProducts: z.array(z.object({
    productId: z.string().min(1, 'Debe seleccionar un producto'),
    minimumQuantity: z.number().min(1, 'La cantidad mínima debe ser al menos 1'),
    description: z.string().optional(),
  })).min(1, 'Debe agregar al menos un producto de aplicación'),
  rewardProducts: z.array(z.object({
    productId: z.string().min(1, 'Debe seleccionar un producto'),
    maxQuantity: z.number().optional(),
    discountValue: z.number().min(0, 'El descuento no puede ser negativo'),
    discountMethod: z.nativeEnum(RewardMethod),
    description: z.string().optional(),
  })),
  clientRanges: z.array(z.object({
    minQuantity: z.number().min(1, 'La cantidad mínima debe ser al menos 1'),
    maxQuantity: z.number().optional(),
    rewardValue: z.number().min(0, 'El valor de recompensa no puede ser negativo'),
    rewardMethod: z.nativeEnum(RewardMethod),
    description: z.string().optional(),
  })),
  limits: z.object({
    maxUsagePerClient: z.number().min(1).optional(),
    maxTotalUsage: z.number().min(1).optional(),
    maxBudget: z.number().min(0).optional(),
    maxRewardPieces: z.number().min(0).optional(),
    allowedZones: z.array(z.string()).optional(),
    allowedCategories: z.array(z.string()).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }),
  isStackable: z.boolean(),
  requiresApproval: z.boolean(),
  isVisible: z.boolean(),
}).refine(data => {
  // Validar que los porcentajes de descuento no excedan 100%
  const hasInvalidPercentage = data.rewardProducts.some(p =>
    p.discountMethod === RewardMethod.PERCENTAGE_DISCOUNT && p.discountValue > 100
  );
  return !hasInvalidPercentage;
}, {
  message: 'El porcentaje de descuento no puede exceder 100%',
  path: ['rewardProducts'],
}).refine(data => {
  // Si hay fechas, la fecha de fin debe ser posterior a la de inicio
  if (data.limits.startDate && data.limits.endDate) {
    return data.limits.endDate > data.limits.startDate;
  }
  return true;
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['limits.endDate'],
});

export default function CreatePromotionPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreatePromotionDto) => {
    setErrors({});

    // Validar con Zod
    const result = promotionCreateSchema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Creating promotion:', data);
      // Aquí iría la lógica para crear la promoción
      // await api.post('/promociones', data);
      router.push('/promotions');
    } catch (error) {
      console.error('Error creating promotion:', error);
      setErrors({ general: 'Error al crear la promoción. Intente nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
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

        {/* Mostrar errores generales */}
        {errors.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {errors.general}
          </div>
        )}

        {/* Mostrar errores de validación */}
        {Object.keys(errors).length > 0 && !errors.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-medium text-red-700 mb-2">Por favor corrija los siguientes errores:</p>
            <ul className="list-disc list-inside text-red-600 text-sm">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        )}

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

        {/* Estado de carga */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Guardando promoción...</span>
            </div>
          </div>
        )}
      </div>
  );
}
