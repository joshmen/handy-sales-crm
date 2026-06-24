import { api } from '@/lib/api';
import { downloadBlob } from '@/lib/download';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
export interface ImportResult {
  importados: number;
  errores: number;
  totalFilas: number;
  detalleErrores: ImportErrorDetail[];
}

export interface ImportErrorDetail {
  fila: number;
  nombre: string;
  errores: string[];
}

export type ExportEntity = 'clientes' | 'productos' | 'inventario' | 'pedidos' | 'cobros' | 'rutas' | 'zonas' | 'categorias-clientes' | 'categorias-productos' | 'familias-productos' | 'unidades-medida' | 'listas-precios' | 'descuentos' | 'promociones';
export type ImportEntity = 'clientes' | 'productos' | 'inventario' | 'zonas' | 'categorias-clientes' | 'categorias-productos' | 'familias-productos' | 'unidades-medida' | 'listas-precios' | 'descuentos' | 'promociones';

// ═══════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════

export async function exportToCsv(
  entity: ExportEntity,
  params?: { desde?: string; hasta?: string }
): Promise<void> {
  const queryParams = new URLSearchParams();
  if (params?.desde) queryParams.set('desde', params.desde);
  if (params?.hasta) queryParams.set('hasta', params.hasta);

  const queryString = queryParams.toString();
  const url = `/api/export/${entity}${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url, { responseType: 'blob' });

  // Create download link
  const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${entity}.csv`);
}

// ═══════════════════════════════════════════════════════
// TEMPLATE DOWNLOAD
// ═══════════════════════════════════════════════════════

export async function downloadTemplate(entity: ImportEntity): Promise<void> {
  const response = await api.get(`/api/import/template/${entity}`, { responseType: 'blob' });

  const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `template_${entity}.csv`);
}

// ═══════════════════════════════════════════════════════
// IMPORT FUNCTION
// ═══════════════════════════════════════════════════════

export async function importFromCsv(
  entity: ImportEntity,
  file: File
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('archivo', file);

  const response = await api.post<ImportResult>(`/api/import/${entity}`, formData);
  return response.data;
}

/**
 * Import only selected rows from a CSV. Reconstructs a CSV with headers + selected rows,
 * then sends it as a file to the backend.
 */
export async function importFilteredCsv(
  entity: ImportEntity,
  headers: string[],
  selectedRows: string[][]
): Promise<ImportResult> {
  const csvContent = [
    headers.join(','),
    ...selectedRows.map(row =>
      row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const file = new File([blob], `import_${entity}.csv`, { type: 'text/csv' });

  const formData = new FormData();
  formData.append('archivo', file);

  const response = await api.post<ImportResult>(`/api/import/${entity}`, formData);
  return response.data;
}
