import { api } from '@/lib/api';

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

export type ExportEntity = 'clientes' | 'productos' | 'inventario' | 'pedidos';
export type ImportEntity = 'clientes' | 'productos';

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
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${entity}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ═══════════════════════════════════════════════════════
// TEMPLATE DOWNLOAD
// ═══════════════════════════════════════════════════════

export async function downloadTemplate(entity: ImportEntity): Promise<void> {
  const response = await api.get(`/api/import/template/${entity}`, { responseType: 'blob' });

  const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `template_${entity}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
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
