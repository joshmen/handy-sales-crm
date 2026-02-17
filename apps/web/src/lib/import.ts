// Utilidades genéricas para importación de datos

export interface ImportColumn<T = unknown> {
  key: keyof T | string;
  header: string;
  required?: boolean;
  validator?: (value: unknown) => boolean | string;
  transformer?: (value: unknown) => string | undefined;
}

export interface ImportOptions<T = unknown> {
  columns: ImportColumn<T>[];
  skipEmptyRows?: boolean;
  maxRows?: number;
}

export interface ImportResult<T = unknown> {
  data: T[];
  errors: ImportError[];
  totalRows: number;
  validRows: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

// Función para importar desde CSV
export async function importFromCSV<T>(
  file: File,
  options: ImportOptions<T>
): Promise<ImportResult<T>> {
  return new Promise((resolve, reject) => {
    if (!file || (file.type !== 'text/csv' && !file.name.endsWith('.csv'))) {
      reject(new Error('El archivo debe ser de tipo CSV'));
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const csvContent = e.target?.result as string;
        const result = parseCSV<T>(csvContent, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

// Función para importar desde JSON
export async function importFromJSON<T>(
  file: File,
  options: ImportOptions<T>
): Promise<ImportResult<T>> {
  return new Promise((resolve, reject) => {
    if (!file || (file.type !== 'application/json' && !file.name.endsWith('.json'))) {
      reject(new Error('El archivo debe ser de tipo JSON'));
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const jsonContent = e.target?.result as string;
        const jsonData = JSON.parse(jsonContent);

        if (!Array.isArray(jsonData)) {
          reject(new Error('El archivo JSON debe contener un array de objetos'));
          return;
        }

        const result = parseJSONData<T>(jsonData, options);
        resolve(result);
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('El archivo JSON no tiene un formato válido'));
        } else {
          reject(error);
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

// Función para parsear CSV
function parseCSV<T>(csvContent: string, options: ImportOptions<T>): ImportResult<T> {
  const lines = csvContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);

  if (lines.length === 0) {
    throw new Error('El archivo CSV está vacío');
  }

  // Parsear headers
  const headers = parseCSVRow(lines[0]);
  const dataLines = lines.slice(1);

  // Limitar filas si se especifica
  const processLines = options.maxRows ? dataLines.slice(0, options.maxRows) : dataLines;

  const data: T[] = [];
  const errors: ImportError[] = [];

  processLines.forEach((line, index) => {
    if (options.skipEmptyRows && !line.trim()) return;

    const rowIndex = index + 2; // +2 porque empezamos desde la línea 1 y saltamos el header
    const values = parseCSVRow(line);

    try {
      const rowData = processRow<T>(values, headers, options.columns, rowIndex);
      if (rowData) {
        data.push(rowData);
      }
    } catch (error) {
      if (error instanceof Array) {
        errors.push(...error);
      } else {
        errors.push({
          row: rowIndex,
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }
  });

  return {
    data,
    errors,
    totalRows: processLines.length,
    validRows: data.length,
  };
}

// Función para parsear datos JSON
function parseJSONData<T>(jsonData: unknown[], options: ImportOptions<T>): ImportResult<T> {
  const data: T[] = [];
  const errors: ImportError[] = [];

  // Limitar filas si se especifica
  const processData = options.maxRows ? jsonData.slice(0, options.maxRows) : jsonData;

  processData.forEach((item, index) => {
    if (options.skipEmptyRows && (!item || Object.keys(item).length === 0)) return;

    const rowIndex = index + 1;

    try {
      if (typeof item === 'object' && item !== null) {
        const rowData = processJSONRow<T>(
          item as Record<string, unknown>,
          options.columns,
          rowIndex
        );
        if (rowData) {
          data.push(rowData);
        }
      }
    } catch (error) {
      if (error instanceof Array) {
        errors.push(...error);
      } else {
        errors.push({
          row: rowIndex,
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }
  });

  return {
    data,
    errors,
    totalRows: processData.length,
    validRows: data.length,
  };
}

// Función para parsear una fila CSV
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < row.length) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Comillas escapadas ""
        current += '"';
        i += 2;
      } else {
        // Cambiar estado de comillas
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Separador de columna
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());
  return result;
}

// Función para procesar una fila de datos
function processRow<T>(
  values: string[],
  headers: string[],
  columns: ImportColumn<T>[],
  rowIndex: number
): T | null {
  const rowData: Record<string | number | symbol, unknown> = {};
  const rowErrors: ImportError[] = [];

  columns.forEach(column => {
    const headerIndex = headers.findIndex(
      h => h.toLowerCase().trim() === column.header.toLowerCase().trim()
    );

    let value = headerIndex !== -1 ? values[headerIndex] : undefined;

    // Limpiar valor
    if (value !== undefined) {
      value = value.trim();
      if (value === '') value = undefined;
    }

    // Validar campo requerido
    if (column.required && (value === undefined || value === '')) {
      rowErrors.push({
        row: rowIndex,
        field: String(column.key),
        message: `El campo "${column.header}" es requerido`,
        value,
      });
      return;
    }

    // Transformar valor si hay transformer
    if (value !== undefined && column.transformer) {
      try {
        value = column.transformer(value);
      } catch (error) {
        rowErrors.push({
          row: rowIndex,
          field: String(column.key),
          message: `Error al transformar el valor en "${column.header}": ${
            error instanceof Error ? error.message : 'Error desconocido'
          }`,
          value,
        });
        return;
      }
    }

    // Validar valor si hay validador
    if (value !== undefined && column.validator) {
      const validation = column.validator(value);
      if (validation !== true) {
        rowErrors.push({
          row: rowIndex,
          field: String(column.key),
          message:
            typeof validation === 'string' ? validation : `Valor inválido en "${column.header}"`,
          value,
        });
        return;
      }
    }

    rowData[column.key] = value;
  });

  if (rowErrors.length > 0) {
    throw rowErrors;
  }

  return rowData as T;
}

// Función para procesar una fila JSON
function processJSONRow<T>(
  item: Record<string, unknown>,
  columns: ImportColumn<T>[],
  rowIndex: number
): T | null {
  const rowData: Record<string | number | symbol, unknown> = {};
  const rowErrors: ImportError[] = [];

  columns.forEach(column => {
    let value = getNestedValue(item, String(column.key));

    // Buscar por header si no se encuentra por key
    if (value === undefined && typeof item === 'object' && item !== null) {
      const headerKey = Object.keys(item).find(
        k => k.toLowerCase().trim() === column.header.toLowerCase().trim()
      );
      if (headerKey) {
        value = item[headerKey];
      }
    }

    // Limpiar valor
    if (typeof value === 'string') {
      value = value.trim();
      if (value === '') value = undefined;
    }

    // Validar campo requerido
    if (column.required && (value === undefined || value === null || value === '')) {
      rowErrors.push({
        row: rowIndex,
        field: String(column.key),
        message: `El campo "${column.header}" es requerido`,
        value,
      });
      return;
    }

    // Transformar valor si hay transformer
    if (value !== undefined && value !== null && column.transformer) {
      try {
        value = column.transformer(value);
      } catch (error) {
        rowErrors.push({
          row: rowIndex,
          field: String(column.key),
          message: `Error al transformar el valor en "${column.header}": ${
            error instanceof Error ? error.message : 'Error desconocido'
          }`,
          value,
        });
        return;
      }
    }

    // Validar valor si hay validador
    if (value !== undefined && value !== null && column.validator) {
      const validation = column.validator(value);
      if (validation !== true) {
        rowErrors.push({
          row: rowIndex,
          field: String(column.key),
          message:
            typeof validation === 'string' ? validation : `Valor inválido en "${column.header}"`,
          value,
        });
        return;
      }
    }

    rowData[column.key] = value;
  });

  if (rowErrors.length > 0) {
    throw rowErrors;
  }

  return rowData as T;
}

// Función para obtener valores anidados
function getNestedValue(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce((current, key) => (current as { [key: string]: unknown })?.[key], obj);
}

// Validadores comunes
export const commonValidators = {
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Formato de email inválido';
  },
  phone: (value: string) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value) || 'Formato de teléfono inválido';
  },
  number: (value: unknown) => {
    return !isNaN(Number(value)) || 'Debe ser un número válido';
  },
  date: (value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) || 'Formato de fecha inválido';
  },
  boolean: (value: unknown) => {
    const validValues = ['true', 'false', '1', '0', 'yes', 'no', 'sí', 'si'];
    return validValues.includes(String(value).toLowerCase()) || 'Debe ser verdadero/falso';
  },
  required: (value: unknown) => {
    return (value !== undefined && value !== null && value !== '') || 'Campo requerido';
  },
};

// Transformers comunes
export const commonTransformers = {
  string: (value: unknown) => String(value),
  number: (value: unknown) => Number(value),
  boolean: (value: unknown) => {
    const val = String(value).toLowerCase();
    return ['true', '1', 'yes', 'sí', 'si'].includes(val);
  },
  date: (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    throw new Error('Invalid date value');
  },
  trim: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
  lowercase: (value: unknown) => (typeof value === 'string' ? value.toLowerCase() : value),
  uppercase: (value: unknown) => (typeof value === 'string' ? value.toUpperCase() : value),
};
