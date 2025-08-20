'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
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

  const handleSave = () => {
    console.log('Saving discount:', formData);
    // Aquí iría la lógica para guardar el descuento
    router.push('/discounts');
  };

  const selectedProduct = mockProducts.find(p => p.id === formData.productId);

  return (
    <Layout>
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
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save size={16} />
                Guardar descuento
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
    </Layout>
  );
}

export default function CreateDiscountPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    }>
      <CreateDiscountForm />
    </Suspense>
  );
}
