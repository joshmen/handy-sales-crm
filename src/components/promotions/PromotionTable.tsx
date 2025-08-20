// src/components/promotions/PromotionTable.tsx
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Eye, Edit, Play, Pause, Trash2, Copy } from 'lucide-react';
import { Promotion, PromotionStatus, PromotionType, RewardMethod } from '@/types/promotions';

interface PromotionTableProps {
  promotions: Promotion[];
  onView: (promotion: Promotion) => void;
  onEdit: (promotion: Promotion) => void;
  onToggleStatus: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
  onDuplicate: (promotion: Promotion) => void;
}

export const PromotionTable: React.FC<PromotionTableProps> = ({
  promotions,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  onDuplicate,
}) => {
  const getStatusBadge = (status: PromotionStatus) => {
    const statusConfig = {
      [PromotionStatus.ACTIVE]: { label: 'Activa', variant: 'success' as const },
      [PromotionStatus.PAUSED]: { label: 'Pausada', variant: 'warning' as const },
      [PromotionStatus.FINISHED]: { label: 'Finalizada', variant: 'secondary' as const },
      [PromotionStatus.DRAFT]: { label: 'Borrador', variant: 'outline' as const },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: PromotionType) => {
    const typeLabels = {
      [PromotionType.PERCENTAGE]: 'Por porcentaje',
      [PromotionType.SPECIAL_CLUB]: 'Club especial',
      [PromotionType.BUY_X_GET_Y]: 'Compra X obtén Y',
    };
    return typeLabels[type];
  };

  const getRewardSummary = (promotion: Promotion) => {
    if (promotion.rewardProducts.length === 0) return 'Sin recompensas';
    
    const firstReward = promotion.rewardProducts[0];
    const moreCount = promotion.rewardProducts.length - 1;
    
    let rewardText = '';
    switch (firstReward.discountMethod) {
      case RewardMethod.FREE:
        rewardText = 'Gratis';
        break;
      case RewardMethod.PERCENTAGE_DISCOUNT:
        rewardText = `${firstReward.discountValue}% desc.`;
        break;
      case RewardMethod.FIXED_DISCOUNT:
        rewardText = `$${firstReward.discountValue} desc.`;
        break;
    }
    
    return moreCount > 0 ? `${rewardText} +${moreCount} más` : rewardText;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  const getBudgetProgress = (promotion: Promotion) => {
    if (!promotion.limits.maxBudget) return null;
    
    const used = promotion.currentBudgetUsed || 0;
    const total = promotion.limits.maxBudget;
    const percentage = (used / total) * 100;
    
    return {
      used,
      total,
      percentage: Math.min(percentage, 100),
      remaining: total - used,
    };
  };

  return (
    <div className="space-y-4">
      {/* Vista de cards para móvil */}
      <div className="block lg:hidden space-y-4">
        {promotions.map((promotion) => {
          const budgetProgress = getBudgetProgress(promotion);
          
          return (
            <Card key={promotion.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{promotion.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{getTypeLabel(promotion.type)}</p>
                    {getStatusBadge(promotion.status)}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onView(promotion)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(promotion)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Productos aplicación:</span>
                    <span>{promotion.applicationProducts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recompensas:</span>
                    <span>{getRewardSummary(promotion)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Usos:</span>
                    <span>{promotion.totalUsed || 0}</span>
                  </div>
                  {budgetProgress && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Presupuesto utilizado</span>
                        <span>{budgetProgress.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${budgetProgress.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1 text-gray-600">
                        <span>{formatCurrency(budgetProgress.used)}</span>
                        <span>{formatCurrency(budgetProgress.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vista de tabla para desktop */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Promoción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Productos aplicación</TableHead>
              <TableHead>Recompensas</TableHead>
              <TableHead>Límites</TableHead>
              <TableHead>Estadísticas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promotion) => {
              const budgetProgress = getBudgetProgress(promotion);
              
              return (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{promotion.name}</div>
                      {promotion.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {promotion.description.slice(0, 60)}
                          {promotion.description.length > 60 && '...'}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">{getTypeLabel(promotion.type)}</span>
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(promotion.status)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <div>{promotion.applicationProducts.length} productos</div>
                      {promotion.applicationProducts[0] && (
                        <div className="text-gray-500">
                          Min. {promotion.applicationProducts[0].minimumQuantity} unid.
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <div>{promotion.rewardProducts.length} productos</div>
                      <div className="text-gray-500">{getRewardSummary(promotion)}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm space-y-1">
                      {promotion.limits.maxTotalUsage && (
                        <div>Uso máx: {promotion.limits.maxTotalUsage}</div>
                      )}
                      {budgetProgress && (
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full" 
                                style={{ width: `${budgetProgress.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {budgetProgress.percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatCurrency(budgetProgress.remaining)} restante
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div>Usos: {promotion.totalUsed || 0}</div>
                      <div className="text-gray-500">
                        Ahorros: {formatCurrency(promotion.totalSavings || 0)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(promotion)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(promotion)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(promotion)}
                      >
                        {promotion.status === PromotionStatus.ACTIVE ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDuplicate(promotion)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(promotion)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};