'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';
import {
  DiscountForm,
  DiscountTemplates,
  DiscountPreview,
  discountTemplates
} from '@/components/discounts';
import {
  DiscountType,
  DiscountMethod,
  CreateDiscountDto
} from '@/types/discounts';

// Schema de validación para descuentos - sincronizado con backend
const discountCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().max(255).optional(),
  type: z.nativeEnum(DiscountType),
  method: z.nativeEnum(DiscountMethod),
  isPermanent: z.boolean(),
  validFrom: z.date().optional(),
  validTo: z.date().optional(),
  quantityRanges: z.array(z.object({
    minQuantity: z.number().min(1, 'La cantidad mínima debe ser al menos 1'),
    maxQuantity: z.number().optional(),
    discountValue: z.number().min(0, 'El descuento no puede ser negativo'),
    description: z.string().optional(),
  })).min(1, 'Debe agregar al menos un rango de descuento'),
  productId: z.string().optional(),
  isStackable: z.boolean(),
  minimumAmount: z.number().min(0).optional(),
  maximumDiscount: z.number().min(0).optional(),
}).refine(data => {
  // Si es descuento por producto, debe tener productId
  if (data.type === DiscountType.PRODUCT_SPECIFIC && !data.productId) {
    return false;
  }
  return true;
}, {
  message: 'Debe seleccionar un producto para descuentos por producto',
  path: ['productId'],
}).refine(data => {
  // Validar que los rangos de porcentaje no excedan 100%
  if (data.method === DiscountMethod.PERCENTAGE) {
    return data.quantityRanges.every(r => r.discountValue <= 100);
  }
  return true;
}, {
  message: 'El porcentaje de descuento no puede exceder 100%',
  path: ['quantityRanges'],
});

// Mock products para el selector
const mockProducts = [
  { id: 'AC-04-01-005', name: 'Píldoras para Termostato Acme', code: 'AC-04-01-005' },
  { id: 'CC-600ML', name: 'Coca Cola 600ml', code: 'CC-600ML' },
  { id: 'SAB-ORIG', name: 'Sabritas Original', code: 'SAB-ORIG' },
  { id: 'LALA-1L', name: 'Leche Lala 1L', code: 'LALA-1L' },
];

function CreateDiscountForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const discountType = searchParams.get('type') as DiscountType || DiscountType.GLOBAL;

  const [formData, setFormData] = useState<CreateDiscountDto>({
    name: '',
    description: '',
    type: discountType,
    method: DiscountMethod.PERCENTAGE,
    isPermanent: true,
    validFrom: undefined,
    validTo: undefined,
    quantityRanges: [
      { minQuantity: 1, maxQuantity: 10, discountValue: 0, description: '' }
    ],
    productId: undefined,
    isStackable: false,
    minimumAmount: undefined,
    maximumDiscount: undefined,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (discountType !== DiscountType.GLOBAL && discountType !== DiscountType.PRODUCT_SPECIFIC) {
      router.replace('/discounts/create?type=global');
    }
  }, [discountType, router]);

  const handleTypeChange = (newType: DiscountType) => {
    router.replace(`/discounts/create?type=${newType}`);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = discountTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        quantityRanges: template.ranges.map((range, index) => ({
          ...range,
          id: `temp-${index}`
        }))
      }));
      setSelectedTemplate(templateId);
    }
  };

  const handleSave = async () => {
    setErrors({});

    // Validar con Zod
    const result = discountCreateSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Saving discount:', formData);
      // Aquí iría la lógica para guardar el descuento
      // await api.post('/descuentos', formData);
      router.push('/discounts');
    } catch (error) {
      console.error('Error saving discount:', error);
      setErrors({ general: 'Error al guardar el descuento. Intente nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = mockProducts.find(p => p.id === formData.productId);

  return (
      <div className="p-6 max-w-6xl mx-auto">
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
            <h1 className="text-2xl font-bold">
              Crear descuento por {discountType === DiscountType.GLOBAL ? 'cantidad' : 'producto'}
            </h1>
            <p className="text-gray-600">
              {discountType === DiscountType.GLOBAL
                ? 'Configura descuentos aplicables a cualquier producto según la cantidad total'
                : 'Configura descuentos específicos para un producto individual'
              }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario principal */}
          <div className="lg:col-span-2">
            <DiscountForm
              formData={formData}
              onFormChange={setFormData}
              products={mockProducts}
              onTypeChange={handleTypeChange}
            />

            {/* Botones de acción */}
            <div className="flex gap-4 justify-end mt-6">
              <Button variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={16} />
                )}
                {isSubmitting ? 'Guardando...' : 'Guardar descuento'}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plantillas predefinidas */}
            <DiscountTemplates
              selectedTemplate={selectedTemplate}
              onTemplateSelect={handleTemplateSelect}
            />

            {/* Vista previa */}
            <DiscountPreview
              formData={formData}
              productName={selectedProduct?.name}
              showHelp={true}
            />
          </div>
        </div>
      </div>
  );
}

export default function CreateDiscountPage() {
  return (
    <Suspense fallback={
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
    }>
      <CreateDiscountForm />
    </Suspense>
  );
}
