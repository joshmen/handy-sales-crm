'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Download, Loader2, Check, Minus, Info, Search } from 'lucide-react';
import { SbAlert, SbDownload } from '@/components/layout/DashboardIcons';
import Papa from 'papaparse';
import { importFilteredCsv, downloadTemplate, ImportResult, ImportEntity } from '@/services/api/importExport';
import { toast } from '@/hooks/useToast';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { useTranslations } from 'next-intl';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ROWS_PER_PAGE = 50;

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ImportEntity;
  entityLabel: string;
  onSuccess?: () => void;
  /** Optional info note shown above the upload area */
  infoNote?: string;
}

type Step = 'upload' | 'preview' | 'result';

export function CsvImportModal({ isOpen, onClose, entity, entityLabel, onSuccess, infoNote }: CsvImportModalProps) {
  const t = useTranslations('common.csvImport');
  const tc = useTranslations('common');
  const drawerRef = useRef<DrawerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Validate a row has at least one non-empty cell
  const isRowEmpty = useCallback((row: string[]) => {
    return row.every(cell => !cell || cell.trim() === '');
  }, []);

  // Searchable columns and placeholder vary by entity
  const searchConfig = useMemo(() => {
    switch (entity) {
      case 'categorias-clientes':
      case 'categorias-productos':
        return { columns: ['nombre', 'descripcion'], placeholder: 'Buscar por nombre o descripción...' };
      case 'familias-productos':
        return { columns: ['nombre', 'descripcion'], placeholder: 'Buscar por nombre o descripción...' };
      case 'unidades-medida':
        return { columns: ['nombre', 'abreviatura'], placeholder: 'Buscar por nombre o abreviatura...' };
      case 'listas-precios':
        return { columns: ['nombre', 'descripcion'], placeholder: 'Buscar por nombre o descripción...' };
      case 'inventario':
        return { columns: ['producto', 'codigobarra'], placeholder: 'Buscar por producto o código...' };
      case 'descuentos':
        return { columns: ['tipoaplicacion', 'producto'], placeholder: 'Buscar por tipo o producto...' };
      case 'promociones':
        return { columns: ['nombre', 'productos'], placeholder: 'Buscar por nombre o productos...' };
      case 'productos':
        return { columns: ['nombre', 'codigobarra', 'descripcion'], placeholder: 'Buscar por nombre, código o descripción...' };
      case 'clientes':
        return { columns: ['nombre', 'rfc', 'correo', 'codigobarra'], placeholder: 'Buscar por nombre, RFC, correo...' };
      default:
        return { columns: ['nombre'], placeholder: 'Buscar por nombre...' };
    }
  }, [entity]);

  // Find relevant column indices for search
  const searchColumnIndices = useMemo(() => {
    const indices: number[] = [];
    headers.forEach((h, i) => {
      const lower = h.toLowerCase().trim();
      if (searchConfig.columns.includes(lower)) {
        indices.push(i);
      }
    });
    // If no known columns found, search all columns
    return indices.length > 0 ? indices : headers.map((_, i) => i);
  }, [headers, searchConfig]);

  // Filtered rows based on search (visual filter only, doesn't affect selection)
  const filteredRows = useMemo(() => {
    const rows = allRows.map((row, i) => ({ row, index: i, empty: isRowEmpty(row) }));
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter(({ row }) =>
      searchColumnIndices.some(colIdx => row[colIdx]?.toLowerCase().includes(term))
    );
  }, [allRows, isRowEmpty, searchTerm, searchColumnIndices]);

  // Derived — global counts (not affected by search filter)
  const totalRows = allRows.length;
  const selectedCount = selectedIndices.size;

  // Derived — visible counts (affected by search filter)
  const visibleIndices = useMemo(() => filteredRows.filter(r => !r.empty).map(r => r.index), [filteredRows]);
  const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every(i => selectedIndices.has(i));
  const someVisibleSelected = visibleIndices.some(i => selectedIndices.has(i)) && !allVisibleSelected;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = currentPage * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, currentPage]);

  // ─── File handling ───

  const handleFile = useCallback((selectedFile: File) => {
    setParseError(null);

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error(t('onlyCsvAccepted'));
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error(t('fileTooLarge', { size: MAX_FILE_SIZE_MB }));
      return;
    }

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          setParseError(t('noDataInFile'));
          return;
        }

        const csvHeaders = data[0];
        const csvRows = data.slice(1).filter(row => !row.every(cell => !cell || cell.trim() === ''));

        if (csvRows.length === 0) {
          setParseError(t('noDataRows'));
          return;
        }

        setHeaders(csvHeaders);
        setAllRows(csvRows);
        // Select all rows by default
        setSelectedIndices(new Set(csvRows.map((_, i) => i)));
        setStep('preview');
      },
      error: () => {
        setParseError(t('errorReadingCsv'));
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  // ─── Selection ───

  const toggleRow = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      // Deselect only visible rows
      setSelectedIndices(prev => {
        const next = new Set(prev);
        visibleIndices.forEach(i => next.delete(i));
        return next;
      });
    } else {
      // Select all visible rows (add to existing selection)
      setSelectedIndices(prev => {
        const next = new Set(prev);
        visibleIndices.forEach(i => next.add(i));
        return next;
      });
    }
  };

  // ─── Import ───

  const handleImport = async () => {
    if (selectedCount === 0) {
      toast.error(t('selectAtLeastOne'));
      return;
    }

    try {
      setImporting(true);
      setImportError(null);
      const selectedRows = allRows.filter((_, i) => selectedIndices.has(i));
      const importResult = await importFilteredCsv(entity, headers, selectedRows);
      setResult(importResult);
      setStep('result');

      if (importResult.importados > 0) {
        toast.success(t('importedSuccessfully', { count: importResult.importados, entity: entityLabel }));
        onSuccess?.();
      }
      if (importResult.errores > 0) {
        toast.error(t('rowsWithErrors', { count: importResult.errores }));
      }
    } catch (err: unknown) {
      console.error('Error al importar:', err);

      // Extract detailed error message from backend response
      let errorMessage = t('errorUnknown');

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: Record<string, unknown> }; message?: string };
        const status = axiosErr.response?.status;
        const data = axiosErr.response?.data;

        if (status === 400) {
          errorMessage = (data?.error as string) || (data?.message as string) || t('errorBadRequest');
        } else if (status === 401) {
          errorMessage = t('errorSessionExpired');
        } else if (status === 413) {
          errorMessage = t('errorFileTooLarge');
        } else if (status === 500) {
          const serverMsg = (data?.message as string) || (data?.title as string) || '';
          if (serverMsg.toLowerCase().includes('header') || serverMsg.toLowerCase().includes('csv')) {
            errorMessage = t('errorServerCsv', { headers: headers.join(', ') });
          } else {
            errorMessage = serverMsg
              ? t('errorServer', { message: serverMsg })
              : t('errorServerGeneric');
          }
        } else if (status) {
          errorMessage = t('errorStatus', { status, message: (data?.error as string) || (data?.message as string) || t('errorStatusFallback') });
        }
      } else if (err instanceof Error) {
        if (err.message.includes('Network Error') || err.message.includes('timeout')) {
          errorMessage = t('errorNetwork');
        } else {
          errorMessage = err.message;
        }
      }

      setImportError(errorMessage);
      toast.error(t('errorImporting'));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate(entity);
      toast.success(t('templateDownloaded'));
    } catch (err) {
      console.error('Error al descargar template:', err);
      toast.error(t('errorDownloadingTemplate'));
    }
  };

  // ─── Navigation ───

  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setAllRows([]);
    setSelectedIndices(new Set());
    setResult(null);
    setParseError(null);
    setImportError(null);
    setSearchTerm('');
    setCurrentPage(0);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleBackToUpload = () => {
    setFile(null);
    setHeaders([]);
    setAllRows([]);
    setSelectedIndices(new Set());
    setParseError(null);
    setSearchTerm('');
    setCurrentPage(0);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Footer ───

  const footerContent = (() => {
    if (step === 'result') {
      return (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('importAnother')}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90"
          >
            {t('close')}
          </button>
        </div>
      );
    }
    if (step === 'preview') {
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {t('selectedOfTotalRows', { selected: selectedCount, total: totalRows })}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToUpload}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('back')}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t('importBtn', { count: selectedCount, rowLabel: selectedCount === 1 ? t('row') : t('rows') })}
                </>
              )}
            </button>
          </div>
        </div>
      );
    }
    // Upload step
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => drawerRef.current?.requestClose()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {tc('cancel')}
        </button>
      </div>
    );
  })();

  // ─── Step indicator ───

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-4">
      {(['upload', 'preview', 'result'] as Step[]).map((s, i) => {
        const labels = [t('stepFile'), t('stepReview'), t('stepResult')];
        const isActive = s === step;
        const isCompleted = (['upload', 'preview', 'result'].indexOf(step)) > i;
        return (
          <React.Fragment key={s}>
            {i > 0 && <div className={`flex-1 h-px ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />}
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                isCompleted ? 'bg-green-100 text-green-700' :
                isActive ? 'bg-success text-success-foreground' :
                'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${isActive ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Drawer
      ref={drawerRef}
      isOpen={isOpen}
      onClose={handleClose}
      title={t('importTitle', { entity: entityLabel })}
      icon={<Upload className="w-5 h-5 text-green-600" />}
      width="xl"
      isDirty={step === 'preview'}
      footer={footerContent}
    >
      <div className="px-6 py-4 space-y-4">
        {stepIndicator}

        {/* ═══════════ STEP 1: Upload ═══════════ */}
        {step === 'upload' && (
          <>
            {/* Info note */}
            {infoNote && (
              <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
                <SbAlert size={16} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{infoNote}</span>
              </div>
            )}

            {/* Template download */}
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t('downloadTemplate')}
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded hover:bg-muted"
              >
                <Download className="w-3.5 h-3.5" />
                {t('template')}
              </button>
            </div>

            {/* File size limit info */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5" />
              {t('maxFileSize', { size: MAX_FILE_SIZE_MB })}
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragOver ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <SbDownload size={40} className="mb-3" />
              <p className="text-sm font-medium text-gray-700">
                {t('dragOrClick')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('csvOnly')}</p>
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

            {/* Parse error */}
            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{parseError}</p>
              </div>
            )}
          </>
        )}

        {/* ═══════════ STEP 2: Preview ═══════════ */}
        {step === 'preview' && file && (
          <>
            {/* File info bar */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {t('fileInfo', { size: (file.size / 1024).toFixed(1), rows: totalRows, rowLabel: totalRows === 1 ? t('row') : t('rows'), cols: headers.length })}
                </p>
              </div>
              <button onClick={handleBackToUpload} className="text-gray-400 hover:text-gray-600" title={t('changeFile')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Import error banner */}
            {importError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">{t('importError')}</p>
                  <p className="text-xs text-red-700 mt-0.5 whitespace-pre-wrap">{importError}</p>
                  {headers.length > 0 && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {t('detectedHeaders')} {headers.join(', ')}
                    </p>
                  )}
                </div>
                <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchConfig.placeholder}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selection bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAllVisible}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    allVisibleSelected ? 'bg-green-600 border-green-600' :
                    someVisibleSelected ? 'bg-green-600 border-green-600' :
                    'border-gray-300 bg-white hover:border-green-400'
                  }`}
                >
                  {allVisibleSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  {someVisibleSelected && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
                <span className="text-xs font-medium text-green-800">
                  {selectedCount === 0 ? t('noneSelected') :
                   selectedCount === totalRows ? t('allSelected') :
                   t('selectedOfTotal', { selected: selectedCount, total: totalRows })}
                  {searchTerm && ` · ${filteredRows.length} ${t('visible', { plural: filteredRows.length !== 1 ? 's' : '' })}`}
                </span>
              </div>
              {selectedCount > 0 && (
                <button
                  onClick={() => setSelectedIndices(new Set())}
                  className="text-xs text-green-700 hover:text-green-900 underline"
                >
                  {t('deselectAll')}
                </button>
              )}
            </div>

            {/* No results */}
            {searchTerm && filteredRows.length === 0 && (
              <div className="flex flex-col items-center py-8 text-gray-400">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-sm">{t('noRowsFound')} &quot;{searchTerm}&quot;</p>
                <button onClick={() => setSearchTerm('')} className="text-xs text-green-600 hover:text-green-700 mt-1 underline">
                  {t('clearSearch')}
                </button>
              </div>
            )}

            {/* Data table */}
            {filteredRows.length > 0 && (
            <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2 text-left w-8 bg-gray-100">
                      <button
                        onClick={toggleAllVisible}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          allVisibleSelected ? 'bg-green-600 border-green-600' :
                          someVisibleSelected ? 'bg-green-600 border-green-600' :
                          'border-gray-300 bg-white hover:border-green-400'
                        }`}
                      >
                        {allVisibleSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        {someVisibleSelected && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                    </th>
                    <th className="px-2 py-2 text-left text-gray-500 font-normal bg-gray-100 w-8">#</th>
                    {headers.map((h, i) => (
                      <th key={i} className="px-2 py-2 text-left font-medium text-gray-700 bg-gray-100 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map(({ row, index, empty }) => {
                    const isSelected = selectedIndices.has(index);
                    return (
                      <tr
                        key={index}
                        onClick={() => !empty && toggleRow(index)}
                        className={`border-t border-gray-100 cursor-pointer transition-colors ${
                          empty ? 'opacity-40 cursor-not-allowed' :
                          isSelected ? 'bg-green-50/50 hover:bg-green-50' :
                          'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          {!empty && (
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-gray-400 font-mono">{index + 1}</td>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`px-2 py-1.5 max-w-[180px] truncate whitespace-nowrap ${
                              isSelected ? 'text-gray-900' : 'text-gray-500'
                            }`}
                            title={cell}
                          >
                            {cell || <span className="text-gray-300 italic">{t('empty')}</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-gray-500">
                  {currentPage * ROWS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ROWS_PER_PAGE, filteredRows.length)} de {filteredRows.length} filas
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className="px-2 py-1 text-[11px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-2 py-1 text-[11px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <span className="px-2 text-[11px] text-gray-700 font-medium">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-2 py-1 text-[11px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="px-2 py-1 text-[11px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
            </>
            )}
          </>
        )}

        {/* ═══════════ STEP 3: Result ═══════════ */}
        {step === 'result' && result && (
          <div className="space-y-3">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {result.totalFilas}
                </p>
                <p className="text-xs text-gray-500">{t('totalRows')}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">
                  {result.importados}
                </p>
                <p className="text-xs text-green-600">{t('imported')}</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${result.errores > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-2xl font-bold ${result.errores > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                  {result.errores}
                </p>
                <p className={`text-xs ${result.errores > 0 ? 'text-red-600' : 'text-gray-500'}`}>{t('withErrors')}</p>
              </div>
            </div>

            {/* Success message */}
            {result.importados > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  {t('importedSuccessfully', { count: result.importados, entity: entityLabel })}
                </p>
              </div>
            )}

            {/* Error details */}
            {result.detalleErrores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-700">{t('errorDetails')}</p>
                <div className="max-h-64 overflow-auto space-y-2">
                  {result.detalleErrores.map((err, i) => (
                    <div key={i} className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="font-semibold text-red-800">{t('rowN', { n: err.fila })}</span>
                        <span className="text-red-600">— {err.nombre}</span>
                      </div>
                      <ul className="ml-5 space-y-0.5">
                        {err.errores.map((error, j) => (
                          <li key={j} className="text-red-700 list-disc">{error}</li>
                        ))}
                      </ul>
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
