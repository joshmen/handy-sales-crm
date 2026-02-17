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
import { PriceList } from '@/types/price-lists';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PriceListTableProps {
  priceLists: PriceList[];
  onView: (priceList: PriceList) => void;
  onEdit: (priceList: PriceList) => void;
  onToggleStatus: (priceList: PriceList) => void;
  onDelete: (priceList: PriceList) => void;
}

export const PriceListTable: React.FC<PriceListTableProps> = ({
  priceLists,
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
            <TableHead className="w-[120px]">Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-[150px] text-center">Cantidad de productos</TableHead>
            <TableHead className="w-[180px]">Últimas modificaciones</TableHead>
            <TableHead className="w-[150px]">Modificado por</TableHead>
            <TableHead className="w-[100px] text-center">Activo</TableHead>
            <TableHead className="w-[150px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {priceLists.map((priceList) => (
            <TableRow key={priceList.id} className="hover:bg-muted/50">
              {/* Código */}
              <TableCell className="font-medium">
                <div className="font-mono text-sm">{priceList.code}</div>
              </TableCell>

              {/* Descripción */}
              <TableCell>
                <div className="max-w-md">
                  <div className="font-medium truncate">{priceList.description}</div>
                </div>
              </TableCell>

              {/* Cantidad de productos */}
              <TableCell className="text-center">
                <div className="font-medium">{priceList.productCount.toLocaleString()}</div>
              </TableCell>

              {/* Últimas modificaciones */}
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatDate(priceList.lastModified)}
                </div>
              </TableCell>

              {/* Modificado por */}
              <TableCell>
                <div className="text-sm">{priceList.modifiedBy}</div>
              </TableCell>

              {/* Activo */}
              <TableCell className="text-center">
                <Badge 
                  variant={priceList.isEnabled ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {priceList.isEnabled ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>

              {/* Acciones */}
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onView(priceList)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEdit(priceList)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onToggleStatus(priceList)}
                    className={`h-8 w-8 p-0 ${
                      priceList.isEnabled ? 'text-yellow-600' : 'text-green-600'
                    }`}
                  >
                    {priceList.isEnabled ? <PowerOff size={16} /> : <Power size={16} />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDelete(priceList)}
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
