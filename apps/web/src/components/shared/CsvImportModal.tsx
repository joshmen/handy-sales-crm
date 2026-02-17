'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { importFromCsv, downloadTemplate, ImportResult, ImportEntity } from '@/services/api/importExport';
import { toast } from '@/hooks/useToast';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ImportEntity;
  entityLabel: string;
  onSuccess?: () => void;
}

export function CsvImportModal({ isOpen, onClose, entity, entityLabel, onSuccess }: CsvImportModalProps) {
  const drawerRef = useRef<DrawerHandle>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Solo se aceptan archivos CSV');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    // Parse preview
    Papa.parse(selectedFile, {
      preview: 6,
      complete: (results) => {
        if (results.data.length > 0) {
          setHeaders(results.data[0] as string[]);
          setPreview(results.data.slice(1, 6) as string[][]);
        }
      },
      error: () => {
        toast.error('Error al leer el archivo CSV');
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleImport = async () => {
    if (!file) return;

    try {
      setImporting(true);
      const importResult = await importFromCsv(entity, file);
      setResult(importResult);

      if (importResult.importados > 0) {
        toast.success(`${importResult.importados} ${entityLabel} importados correctamente`);
        onSuccess?.();
      }
      if (importResult.errores > 0) {
        toast.error(`${importResult.errores} filas con errores`);
      }
    } catch (err) {
      console.error('Error al importar:', err);
      toast.error('Error al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate(entity);
      toast.success('Template descargado');
    } catch (err) {
      console.error('Error al descargar template:', err);
      toast.error('Error al descargar template');
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const footerContent = (() => {
    if (result) {
      // Result stage
      return (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Importar otro archivo
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Cerrar
          </button>
        </div>
      );
    }
    if (file) {
      // Preview stage
      return (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => drawerRef.current?.requestClose()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar
              </>
            )}
          </button>
        </div>
      );
    }
    // Upload stage
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => drawerRef.current?.requestClose()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    );
  })();

  return (
    <Drawer
      ref={drawerRef}
      isOpen={isOpen}
      onClose={handleClose}
      title={`Importar ${entityLabel}`}
      icon={<Upload className="w-5 h-5 text-green-600" />}
      width="lg"
      isDirty={!!file}
      footer={footerContent}
    >
      <div className="px-6 py-4 space-y-4">
        {/* Template download */}
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">
            Descarga el template CSV para ver el formato requerido
          </span>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>
        </div>

        {/* Drop zone */}
        {!file && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              dragOver ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Arrastra un archivo CSV aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500 mt-1">Solo archivos .csv</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* File selected - Preview stage */}
        {file && !result && (
          <>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={handleReset} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview table */}
            {headers.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Vista previa ({preview.length} de las primeras filas)
                </p>
                <table className="w-full text-xs border border-gray-200 rounded">
                  <thead>
                    <tr className="bg-gray-50">
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 text-gray-700 max-w-[150px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Import result */}
        {result && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {result.totalFilas}
                </p>
                <p className="text-xs text-gray-500">Total filas</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {result.importados}
                </p>
                <p className="text-xs text-green-600">Importados</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${result.errores > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-2xl font-bold ${result.errores > 0 ? 'text-red-700' : 'text-gray-400'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {result.errores}
                </p>
                <p className={`text-xs ${result.errores > 0 ? 'text-red-600' : 'text-gray-500'}`}>Con errores</p>
              </div>
            </div>

            {/* Success message */}
            {result.importados > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  {result.importados} {entityLabel} importados correctamente
                </p>
              </div>
            )}

            {/* Error details */}
            {result.detalleErrores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-700">Detalle de errores:</p>
                <div className="max-h-40 overflow-auto space-y-1">
                  {result.detalleErrores.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-red-800">Fila {err.fila} ({err.nombre}):</span>
                        <span className="text-red-700 ml-1">{err.errores.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
