'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { toast } from '@/hooks/useToast';
import { Upload, FileText, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import {
  importFromCSV,
  importFromJSON,
  ImportColumn,
  ImportOptions,
  ImportResult,
  ImportError,
} from '@/lib/import';

interface ImportButtonProps<T = unknown> {
  columns: ImportColumn<T>[];
  onImport?: (data: T[], errors: ImportError[]) => void | Promise<void>;
  onPreview?: (data: T[]) => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  maxRows?: number;
  allowedFormats?: ('csv' | 'json')[];
  showPreview?: boolean;
  title?: string;
}

export function ImportButton<T = unknown>({
  columns,
  onImport,
  onPreview,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className = '',
  maxRows = 1000,
  allowedFormats = ['csv', 'json'],
  showPreview = true,
  title = 'Importar Datos',
}: ImportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importOptions, setImportOptions] = useState({
    skipEmptyRows: true,
    maxRows: maxRows,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const options: ImportOptions<T> = {
        columns,
        skipEmptyRows: importOptions.skipEmptyRows,
        maxRows: importOptions.maxRows,
      };

      let result: ImportResult<T>;

      if (file.name.endsWith('.csv')) {
        result = await importFromCSV<T>(file, options);
      } else if (file.name.endsWith('.json')) {
        result = await importFromJSON<T>(file, options);
      } else {
        throw new Error('Formato de archivo no soportado. Use CSV o JSON.');
      }

      setImportResult(result);

      if (result.errors.length === 0) {
        if (showPreview && result.data.length > 0) {
          setCurrentStep('preview');
          onPreview?.(result.data);
        } else {
          await handleConfirmImport(result.data);
        }
      } else {
        setCurrentStep('result');
      }
    } catch (error) {
      toast({
        title: 'Error de importación',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async (data: T[]) => {
    setIsProcessing(true);
    try {
      await onImport?.(data, importResult?.errors || []);
      setCurrentStep('result');
      toast({
        title: 'Importación exitosa',
        description: `${data.length} registro(s) importado(s) correctamente`,
      });
    } catch (error) {
      toast({
        title: 'Error al guardar datos',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep('upload');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportTemplate = (format: 'csv' | 'json') => {
    const templateData: Record<string, string> = {};
    columns.forEach(col => {
      templateData[col.header] = col.required ? 'Requerido' : 'Opcional';
    });

    const content =
      format === 'csv'
        ? Object.keys(templateData).join(',') + '\n' + Object.values(templateData).join(',')
        : JSON.stringify([templateData], null, 2);

    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {currentStep === 'upload' && (
            <div className="space-y-4 py-4">
              {/* Opciones de importación */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-empty-rows"
                    checked={importOptions.skipEmptyRows}
                    onCheckedChange={checked =>
                      setImportOptions(prev => ({ ...prev, skipEmptyRows: !!checked }))
                    }
                  />
                  <Label htmlFor="skip-empty-rows" className="text-sm">
                    Saltar filas vacías
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Máximo de filas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={importOptions.maxRows}
                    onChange={e =>
                      setImportOptions(prev => ({ ...prev, maxRows: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                </div>
              </div>

              {/* Plantillas */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Descargar plantilla:</Label>
                <div className="flex space-x-2">
                  {allowedFormats.includes('csv') && (
                    <Button variant="outline" size="sm" onClick={() => exportTemplate('csv')}>
                      <FileText className="h-4 w-4 mr-1" />
                      Template CSV
                    </Button>
                  )}
                  {allowedFormats.includes('json') && (
                    <Button variant="outline" size="sm" onClick={() => exportTemplate('json')}>
                      <FileJson className="h-4 w-4 mr-1" />
                      Template JSON
                    </Button>
                  )}
                </div>
              </div>

              {/* Campos requeridos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Campos requeridos:</Label>
                <div className="flex flex-wrap gap-2">
                  {columns
                    .filter(col => col.required)
                    .map((col, index) => (
                      <Badge key={index} variant="secondary">
                        {col.header}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Input de archivo */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={allowedFormats.map(f => `.${f}`).join(',')}
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                  className="hidden"
                />
                {isProcessing ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600">Procesando archivo...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                      >
                        Seleccionar archivo
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Formatos soportados: {allowedFormats.map(f => f.toUpperCase()).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'preview' && importResult && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    Vista previa - {importResult.validRows} registros válidos
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                    Atrás
                  </Button>
                  <Button onClick={() => handleConfirmImport(importResult.data)}>
                    Confirmar importación
                  </Button>
                </div>
              </div>

              {/* Tabla de vista previa */}
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.slice(0, 6).map((col, index) => (
                        <TableHead key={index}>{col.header}</TableHead>
                      ))}
                      {columns.length > 6 && <TableHead>...</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.data.slice(0, 10).map((row: unknown, index) => (
                      <TableRow key={index}>
                        {columns.slice(0, 6).map((col, colIndex) => (
                          <TableCell key={colIndex} className="text-sm">
                            {String((row as Record<string, unknown>)[String(col.key)] || '')}
                          </TableCell>
                        ))}
                        {columns.length > 6 && <TableCell>...</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {importResult.data.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  Mostrando 10 de {importResult.data.length} registros
                </p>
              )}
            </div>
          )}

          {currentStep === 'result' && importResult && (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                {importResult.errors.length === 0 ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <h3 className="font-medium">¡Importación exitosa!</h3>
                    <p className="text-sm text-gray-600">
                      {importResult.validRows} de {importResult.totalRows} registros importados
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                    <h3 className="font-medium">Importación con errores</h3>
                    <p className="text-sm text-gray-600">
                      {importResult.validRows} éxitos, {importResult.errors.length} errores
                    </p>
                  </>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-600">Errores encontrados:</Label>
                  <div className="border rounded-lg max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Campo</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.slice(0, 50).map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.field || '-'}</TableCell>
                            <TableCell className="text-red-600 text-sm">{error.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importResult.errors.length > 50 && (
                    <p className="text-xs text-gray-500">
                      Mostrando primeros 50 errores de {importResult.errors.length}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
                {importResult.validRows > 0 && importResult.errors.length > 0 && (
                  <Button onClick={() => handleConfirmImport(importResult.data)}>
                    Importar registros válidos
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
