import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { 
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  Plus,
  Percent
} from 'lucide-react';
import { 
  Discount, 
  DiscountType, 
  DiscountMethod, 
  DiscountStatus 
} from '@/types/discounts';

interface DiscountTableProps {
  discounts: Discount[];
  onView?: (discount: Discount) => void;
  onEdit?: (discount: Discount) => void;
  onToggleStatus?: (discount: Discount) => void;
  onDelete?: (discount: Discount) => void;
  onCreate?: () => void;
  loading?: boolean;
}

const statusColors = {
  [DiscountStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [DiscountStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [DiscountStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
  [DiscountStatus.ACTIVE]: 'Activo',
  [DiscountStatus.INACTIVE]: 'Inactivo',
  [DiscountStatus.PAUSED]: 'Pausado',
};

const typeLabels = {
  [DiscountType.GLOBAL]: 'Global',
  [DiscountType.PRODUCT_SPECIFIC]: 'Por Producto',
};

const methodLabels = {
  [DiscountMethod.PERCENTAGE]: '%',
  [DiscountMethod.FIXED_AMOUNT]: '$',
};

export function DiscountTable({
  discounts,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  onCreate,
  loading = false,
}: DiscountTableProps) {
  const formatDiscountRanges = (ranges: Discount['quantityRanges']) => {
    if (ranges.length === 0) return 'Sin rangos';
    
    return ranges
      .slice(0, 2) // Mostrar solo los primeros 2 rangos
      .map(range => 
        `${range.minQuantity}${range.maxQuantity ? `-${range.maxQuantity}` : '+'}: ${range.discountValue}%`
      )
      .join(', ') + (ranges.length > 2 ? '...' : '');
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descuento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Rangos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Estadísticas</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.map((discount) => (
            <TableRow
              key={discount.id}
              className="hover:bg-muted/50"
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                    <Percent className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {discount.name}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {discount.description}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {typeLabels[discount.type]}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {methodLabels[discount.method]}
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm text-gray-600 max-w-xs">
                  {formatDiscountRanges(discount.quantityRanges)}
                </div>
              </TableCell>

              <TableCell>
                <Badge className={statusColors[discount.status]}>
                  {statusLabels[discount.status]}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="text-sm">
                  <div className="font-medium text-green-600">
                    ${discount.totalSavings?.toLocaleString() || '0'}
                  </div>
                  <div className="text-gray-500">
                    {discount.totalUsed || 0} usos
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm">
                  {discount.isPermanent ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Permanente
                    </Badge>
                  ) : (
                    <div className="text-gray-600">
                      <div>Desde: {discount.validFrom?.toLocaleDateString()}</div>
                      <div>Hasta: {discount.validTo?.toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  {onView && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onView(discount)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye size={16} />
                    </Button>
                  )}
                  {onEdit && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(discount)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit size={16} />
                    </Button>
                  )}
                  {onToggleStatus && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onToggleStatus(discount)}
                      className={`h-8 w-8 p-0 ${
                        discount.status === DiscountStatus.ACTIVE ? 'text-yellow-600' : 'text-green-600'
                      }`}
                    >
                      {discount.status === DiscountStatus.ACTIVE ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(discount)}
                      className="h-8 w-8 p-0 text-red-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {discounts.length === 0 && (
        <div className="text-center py-12">
          <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin descuentos configurados
          </h3>
          <p className="text-gray-500 mb-4">
            Crea tu primer descuento por cantidad para comenzar
          </p>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Crear descuento
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
