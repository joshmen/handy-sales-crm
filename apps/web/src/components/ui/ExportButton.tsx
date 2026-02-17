'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { toast } from '@/hooks/useToast';
import { Download, FileText, FileJson, Settings } from 'lucide-react';
import { exportToCSV, exportToJSON, ExportColumn, ExportOptions } from '@/lib/export';

interface ExportButtonProps<T = unknown> {
  data: T[];
  columns?: ExportColumn<T>[];
  filename?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showConfigDialog?: boolean;
}

export function ExportButton<T = unknown>({
  data,
  columns,
  filename = 'export',
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className = '',
  showConfigDialog = true,
}: ExportButtonProps<T>) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    filename,
    includeTimestamp: true,
    selectedColumns: columns || [],
  });

  // Generar columnas automáticamente si no se proporcionan
  const availableColumns =
    columns ||
    (data.length > 0
      ? Object.keys(data[0] as Record<string, unknown>).map(key => ({
          key: key as keyof T,
          header: key.charAt(0).toUpperCase() + key.slice(1),
        }))
      : []);

  const handleQuickExport = (format: 'csv' | 'json') => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: 'Sin datos',
          description: 'No hay datos para exportar',
          variant: 'destructive',
        });
        return;
      }

      const options: ExportOptions<T> = {
        filename: exportConfig.filename,
        columns: availableColumns,
        includeTimestamp: exportConfig.includeTimestamp,
      };

      if (format === 'csv') {
        exportToCSV(data, options);
        toast({
          title: 'Exportación exitosa',
          description: `Datos exportados a CSV: ${exportConfig.filename}`,
        });
      } else {
        exportToJSON(data, options);
        toast({
          title: 'Exportación exitosa',
          description: `Datos exportados a JSON: ${exportConfig.filename}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error de exportación',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  const handleConfiguredExport = (format: 'csv' | 'json') => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: 'Sin datos',
          description: 'No hay datos para exportar',
          variant: 'destructive',
        });
        return;
      }

      const options: ExportOptions<T> = {
        filename: exportConfig.filename,
        columns:
          exportConfig.selectedColumns.length > 0 ? exportConfig.selectedColumns : availableColumns,
        includeTimestamp: exportConfig.includeTimestamp,
      };

      if (format === 'csv') {
        exportToCSV(data, options);
      } else {
        exportToJSON(data, options);
      }

      setIsConfigOpen(false);
      toast({
        title: 'Exportación exitosa',
        description: `${data.length} registro(s) exportado(s) exitosamente`,
      });
    } catch (error) {
      toast({
        title: 'Error de exportación',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  const toggleColumn = (column: ExportColumn<T>) => {
    setExportConfig(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.some(c => c.key === column.key)
        ? prev.selectedColumns.filter(c => c.key !== column.key)
        : [...prev.selectedColumns, column],
    }));
  };

  if (!data || data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={disabled} className={className}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('json')}>
            <FileJson className="h-4 w-4 mr-2" />
            Exportar JSON
          </DropdownMenuItem>
          {showConfigDialog && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsConfigOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar exportación
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showConfigDialog && (
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Exportación</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="export-filename">Nombre del archivo</Label>
                <Input
                  id="export-filename"
                  value={exportConfig.filename}
                  onChange={e => setExportConfig(prev => ({ ...prev, filename: e.target.value }))}
                  placeholder="nombre-archivo"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-timestamp"
                  checked={exportConfig.includeTimestamp}
                  onCheckedChange={checked =>
                    setExportConfig(prev => ({ ...prev, includeTimestamp: !!checked }))
                  }
                />
                <Label htmlFor="include-timestamp" className="text-sm font-normal">
                  Incluir timestamp en el nombre
                </Label>
              </div>

              {availableColumns.length > 0 && (
                <div className="space-y-2">
                  <Label>Columnas a exportar</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all"
                        checked={exportConfig.selectedColumns.length === availableColumns.length}
                        onCheckedChange={checked => {
                          setExportConfig(prev => ({
                            ...prev,
                            selectedColumns: checked ? availableColumns : [],
                          }));
                        }}
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium">
                        Seleccionar todas
                      </Label>
                    </div>
                    {availableColumns.map((column, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`column-${index}`}
                          checked={exportConfig.selectedColumns.some(c => c.key === column.key)}
                          onCheckedChange={() => toggleColumn(column)}
                        />
                        <Label htmlFor={`column-${index}`} className="text-sm font-normal">
                          {column.header}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleConfiguredExport('csv')}>
                    <FileText className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfiguredExport('json')}
                  >
                    <FileJson className="h-4 w-4 mr-1" />
                    JSON
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsConfigOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
