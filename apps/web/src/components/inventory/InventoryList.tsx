import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Package } from 'lucide-react';
import { InventoryItem } from '@/types/inventory';

interface InventoryListProps {
  items: InventoryItem[];
  loading?: boolean;
  onItemClick?: (item: InventoryItem) => void;
}

export function InventoryList({
  items,
  loading = false,
  onItemClick,
}: InventoryListProps) {
  const getStockBadgeVariant = (item: InventoryItem) => {
    if (item.totalQuantity === 0) return 'destructive';
    if (item.totalQuantity <= item.minStock) return 'warning';
    return 'success';
  };

  const getStockBadgeText = (item: InventoryItem) => {
    if (item.totalQuantity === 0) return 'Sin stock';
    if (item.totalQuantity <= item.minStock) return 'Stock bajo';
    return 'Disponible';
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
            <TableHead>Producto</TableHead>
            <TableHead>Unidad de medida</TableHead>
            <TableHead>Existencia totales</TableHead>
            <TableHead>Existencia en almacén</TableHead>
            <TableHead>Existencia en ruta</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={onItemClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onItemClick?.(item)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  {item.product?.images && item.product.images.length > 0 ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-8 h-8 rounded-sm object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded-sm flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.product?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.product?.code}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{item.product?.unit}</TableCell>
              <TableCell>
                <span className="font-medium">{item.totalQuantity}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium">{item.warehouseQuantity}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium">{item.routeQuantity}</span>
              </TableCell>
              <TableCell>
                <Badge variant={getStockBadgeVariant(item)}>
                  {getStockBadgeText(item)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {items.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No se encontraron productos</p>
        </div>
      )}
    </Card>
  );
}
