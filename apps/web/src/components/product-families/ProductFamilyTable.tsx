'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Eye, 
  Edit, 
  Trash2,
  Power,
  PowerOff
} from 'lucide-react';
import { ProductFamily } from '@/types/product-families';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProductFamilyTableProps {
  productFamilies: ProductFamily[];
  onView: (productFamily: ProductFamily) => void;
  onEdit: (productFamily: ProductFamily) => void;
  onToggleStatus: (productFamily: ProductFamily) => void;
  onDelete: (productFamily: ProductFamily) => void;
}

export const ProductFamilyTable: React.FC<ProductFamilyTableProps> = ({
  productFamilies,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-[150px]">Creado por</TableHead>
            <TableHead className="w-[180px]">Fecha de creación</TableHead>
            <TableHead className="w-[150px]">Actualizado por</TableHead>
            <TableHead className="w-[180px]">Última actualización</TableHead>
            <TableHead className="w-[100px] text-center">Activo</TableHead>
            <TableHead className="w-[120px] text-center">Productos activos</TableHead>
            <TableHead className="w-[120px] text-center">Productos inactivos</TableHead>
            <TableHead className="w-[150px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productFamilies.map((productFamily) => (
            <TableRow key={productFamily.id} className="hover:bg-muted/50">
              {/* Descripción */}
              <TableCell>
                <div className="max-w-md">
                  <div className="font-medium truncate">{productFamily.description}</div>
                </div>
              </TableCell>

              {/* Creado por */}
              <TableCell>
                <div className="text-sm">{productFamily.createdBy}</div>
              </TableCell>

              {/* Fecha de creación */}
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatDate(productFamily.createdAt)}
                </div>
              </TableCell>

              {/* Actualizado por */}
              <TableCell>
                <div className="text-sm">{productFamily.modifiedBy}</div>
              </TableCell>

              {/* Última actualización */}
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatDate(productFamily.lastModified)}
                </div>
              </TableCell>

              {/* Activo */}
              <TableCell className="text-center">
                <Badge 
                  variant={productFamily.isEnabled ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {productFamily.isEnabled ? 'Sí' : 'No'}
                </Badge>
              </TableCell>

              {/* Productos habilitados */}
              <TableCell className="text-center">
                <div className="font-medium">{productFamily.enabledProducts}</div>
              </TableCell>

              {/* Productos deshabilitados */}
              <TableCell className="text-center">
                <div className="font-medium">{productFamily.disabledProducts}</div>
              </TableCell>

              {/* Acciones */}
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onView(productFamily)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEdit(productFamily)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onToggleStatus(productFamily)}
                    className={`h-8 w-8 p-0 ${
                      productFamily.isEnabled ? 'text-yellow-600' : 'text-green-600'
                    }`}
                  >
                    {productFamily.isEnabled ? <PowerOff size={16} /> : <Power size={16} />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDelete(productFamily)}
                    className="h-8 w-8 p-0 text-red-600"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};