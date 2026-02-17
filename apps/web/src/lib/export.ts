// Utilidades genéricas para exportación de datos

export interface ExportColumn<T = unknown> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

export interface ExportOptions<T = unknown> {
  filename?: string;
  columns?: ExportColumn<T>[];
  includeTimestamp?: boolean;
}

// Función para convertir datos a CSV
export function exportToCSV<T>(data: T[], options: ExportOptions<T> = {}): void {
  const { filename = 'export', columns, includeTimestamp = true } = options;

  if (!data || data.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  // Si no se especifican columnas, usar todas las propiedades del primer objeto
  const finalColumns: ExportColumn<T>[] =
    columns ||
    Object.keys(data[0] as object).map(key => ({
      key: key as keyof T,
      header: key.charAt(0).toUpperCase() + key.slice(1),
    }));

  // Crear headers
  const headers = finalColumns.map(col => col.header);

  // Crear filas
  const rows = data.map(item =>
    finalColumns.map(col => {
      const value = getNestedValue(item, col.key as string);
      return col.formatter ? col.formatter(value, item) : formatCellValue(value);
    })
  );

  // Combinar headers y datos
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Generar nombre del archivo
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`
    : '';
  const finalFilename = `${filename}${timestamp}.csv`;

  // Descargar archivo
  downloadFile(csvContent, finalFilename, 'text/csv;charset=utf-8;');
}

// Función para convertir datos a JSON
export function exportToJSON<T>(data: T[], options: ExportOptions<T> = {}): void {
  const { filename = 'export', columns, includeTimestamp = true } = options;

  if (!data || data.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  let exportData: T[] = data;

  // Si se especifican columnas, filtrar los datos
  if (columns) {
    exportData = data.map(item => {
      const filteredItem: Record<string, unknown> = {};
      columns.forEach(col => {
        const value = getNestedValue(item, col.key as string);
        filteredItem[col.header] = col.formatter ? col.formatter(value, item) : value;
      });
      return filteredItem as T;
    });
  }

  const jsonContent = JSON.stringify(exportData, null, 2);

  // Generar nombre del archivo
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`
    : '';
  const finalFilename = `${filename}${timestamp}.json`;

  // Descargar archivo
  downloadFile(jsonContent, finalFilename, 'application/json;charset=utf-8;');
}

// Función para obtener valores anidados usando dot notation
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

// Función para formatear valores de celda
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleString('es-MX');
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Función para descargar archivo
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Limpiar URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Formatters comunes para reutilizar
export const commonFormatters = {
  date: (value: unknown) =>
    typeof value === 'string' || typeof value === 'number' || value instanceof Date
      ? new Date(value).toLocaleDateString('es-MX')
      : '',
  dateTime: (value: unknown) =>
    typeof value === 'string' || typeof value === 'number' || value instanceof Date
      ? new Date(value).toLocaleString('es-MX')
      : '',
  boolean: (value: unknown) => (value ? 'Sí' : 'No'),
  currency: (value: unknown) =>
    value ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00',
  percentage: (value: unknown) => (value ? `${Number(value).toFixed(2)}%` : '0%'),
  phone: (value: unknown) => value || 'N/A',
  email: (value: unknown) => value || 'N/A',
  status: (value: unknown) => {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      SUSPENDED: 'Suspendido',
      PENDING: 'Pendiente',
      true: 'Activo',
      false: 'Inactivo',
    };
    return statusMap[String(value)] || String(value);
  },
};
