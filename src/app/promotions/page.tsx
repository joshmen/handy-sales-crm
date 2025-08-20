'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Download, Upload } from 'lucide-react';
import { 
  PromotionMetrics,
  PromotionTable,
  PromotionFilters,
  PromotionModal
} from '@/components/promotions';
import { 
  Promotion, 
  PromotionType, 
  PromotionStatus,
  RewardMethod
} from '@/types/promotions';

// Mock data para demostración
const mockPromotions: Promotion[] = [
  {
    id: '1',
    name: 'test',
    description: 'En la compra de 10 Yungui Acme (ACME-01-001) recibe 1 con descuento del 100% Yungui Acme (ACME-01-001)',
    type: PromotionType.PERCENTAGE,
    status: PromotionStatus.ACTIVE,
    applicationProducts: [
      {
        id: '1',
        productId: 'ACME-01-001',
        minimumQuantity: 10,
        description: 'Yungui Acme'
      }
    ],
    rewardProducts: [
      {
        id: '1',
        productId: 'ACME-01-001', 
        maxQuantity: 1,
        discountValue: 100,
        discountMethod: RewardMethod.PERCENTAGE_DISCOUNT,
        description: 'Yungui Acme con 100% descuento'
      }
    ],
    clientRanges: [
      {
        id: '1',
        minQuantity: 10,
        rewardValue: 100,
        rewardMethod: RewardMethod.PERCENTAGE_DISCOUNT,
        description: '10+ unidades'
      }
    ],
    limits: {
      maxUsagePerClient: undefined,
      maxTotalUsage: undefined,
      maxBudget: 5000,
      maxRewardPieces: undefined,
      allowedZones: [],
      allowedCategories: [],
    },
    isStackable: false,
    requiresApproval: false,
    isVisible: true,
    createdBy: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    totalUsed: 0,
    totalSavings: 0,
    currentBudgetUsed: 0,
  },
];

export default function PromotionsPage() {
  const router = useRouter();
  const [promotions] = useState<Promotion[]>(mockPromotions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [modalType, setModalType] = useState<'view' | 'delete' | 'import' | 'export' | null>(null);

  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || promotion.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || promotion.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleView = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setModalType('view');
  };

  const handleEdit = (promotion: Promotion) => {
    // Navegar a la página de edición
    router.push(`/promotions/edit/${promotion.id}`);
  };

  const handleToggleStatus = (promotion: Promotion) => {
    console.log('Toggle status for:', promotion.id);
    // Aquí iría la lógica para cambiar el estado
  };

  const handleDelete = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setModalType('delete');
  };

  const handleDuplicate = (promotion: Promotion) => {
    console.log('Duplicate promotion:', promotion.id);
    // Aquí iría la lógica para duplicar
  };

  const handleCreate = () => {
    router.push('/promotions/create');
  };

  const handleImport = () => {
    setModalType('import');
  };

  const handleExport = () => {
    setModalType('export');
  };

  const handleConfirmDelete = () => {
    console.log('Deleting promotion:', selectedPromotion?.id);
    // Aquí iría la lógica para eliminar
    setModalType(null);
    setSelectedPromotion(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedPromotion(null);
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Métricas */}
        <PromotionMetrics promotions={promotions} />

        {/* Contenido principal */}
        <Card>
          <CardHeader className="mb-2 grid grid-cols-[1fr_auto] items-start gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Promociones ({filteredPromotions.length})</CardTitle>
              <div className="flex gap-2 mt-3">
                <Button 
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('all')}
                >
                  Todas las promociones
                </Button>
                <Button 
                  variant={selectedStatus === PromotionStatus.ACTIVE ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(PromotionStatus.ACTIVE)}
                >
                  🎁 Promociones activas
                </Button>
                <Button 
                  variant={selectedStatus === PromotionStatus.PAUSED ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(PromotionStatus.PAUSED)}
                >
                  ⏸️ Promociones pausadas
                </Button>
                <Button 
                  variant={selectedStatus === PromotionStatus.FINISHED ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(PromotionStatus.FINISHED)}
                >
                  ✅ Promociones finalizadas
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-self-end">
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva promoción
              </Button>
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleImport}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button 
                variant="outline" 
                className="h-10 px-4"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filtros */}
            <PromotionFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />

            {/* Tabla */}
            {filteredPromotions.length > 0 ? (
              <PromotionTable
                promotions={filteredPromotions}
                onView={handleView}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎁</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' 
                    ? 'No se encontraron promociones' 
                    : 'Sin promociones configuradas'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                    ? 'Intenta cambiar los filtros de búsqueda'
                    : 'Crea tu primera promoción especial para comenzar'}
                </p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear promoción
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <PromotionModal
          isOpen={modalType !== null}
          onClose={closeModal}
          type={modalType || 'view'}
          promotion={selectedPromotion || undefined}
          onConfirm={modalType === 'delete' ? handleConfirmDelete : undefined}
        />
      </div>
    </Layout>
  );
}