interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
  headerLabels?: string[];
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 6, 
  className = "",
  showHeader = true,
  headerLabels = []
}: TableSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <table className="w-full">
        {showHeader && (
          <thead>
            <tr className="border-b border-gray-200">
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-4">
                  {colIndex === 0 ? (
                    // Primera columna - simular usuario con avatar y texto
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                  ) : colIndex === 1 || colIndex === 2 ? (
                    // Segunda y tercera columna - badges/pills
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  ) : (
                    // Otras columnas - texto simple
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Variantes específicas para diferentes catálogos
export function UsersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeleton 
      rows={rows}
      columns={6}
      headerLabels={["Usuario", "Rol", "Estado", "Zona", "Último acceso", "Acciones"]}
    />
  );
}

export function ProductsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeleton 
      rows={rows}
      columns={5}
      headerLabels={["Producto", "Categoría", "Precio", "Stock", "Acciones"]}
    />
  );
}

export function ClientsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeleton 
      rows={rows}
      columns={6}
      headerLabels={["Cliente", "Email", "Teléfono", "Ciudad", "Estado", "Acciones"]}
    />
  );
}

export function RolesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeleton 
      rows={rows}
      columns={5}
      headerLabels={["Rol", "Descripción", "Estado", "Creado", "Acciones"]}
    />
  );
}