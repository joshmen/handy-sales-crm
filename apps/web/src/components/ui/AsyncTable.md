# AsyncTable - Sistema de Tablas Asíncronas Reutilizable

Sistema completo para implementar tablas con loading states suaves y transiciones elegantes.

## Componentes Disponibles

### 1. `useAsyncTableState` - Hook base
Hook principal para manejar estados de transición asíncrona en cualquier componente.

```typescript
import { useAsyncTableState } from '@/hooks/useAsyncTableState';

const MyComponent = () => {
  const { data, loading } = useSomeData();
  
  const {
    displayData,
    isTransitioning,
    showSkeleton,
    transitionClasses
  } = useAsyncTableState(data, loading, {
    minLoadingTime: 300,      // Tiempo mínimo de loading
    keepPreviousData: true,   // Mantener datos anteriores
    disableLoading: false     // Para testing
  });

  return (
    <div className={transitionClasses.opacity}>
      {showSkeleton ? <Skeleton /> : <Content data={displayData} />}
    </div>
  );
};
```

### 2. `useAsyncPaginatedTable` - Hook específico para tablas paginadas

```typescript
import { useAsyncPaginatedTable } from '@/hooks/useAsyncTableState';

const MyTablePage = () => {
  const { data, loading, currentPage, totalPages, hasNextPage, hasPreviousPage } = usePaginatedData();
  
  const asyncTableState = useAsyncPaginatedTable(
    data,
    loading,
    { currentPage, totalPages, hasNextPage, hasPreviousPage },
    { minLoadingTime: 500, keepPreviousData: true }
  );

  return (
    <Card>
      {asyncTableState.showSkeleton ? (
        <MyTableSkeleton rows={5} />
      ) : (
        <Table {...asyncTableState.tableProps}>
          {/* Contenido de la tabla */}
        </Table>
      )}
    </Card>
  );
};
```

### 3. TableSkeleton - Componentes de skeleton

#### Skeleton genérico
```typescript
import { TableSkeleton } from '@/components/ui/TableSkeleton';

<TableSkeleton 
  rows={5}
  columns={6}
  showHeader={true}
  headerLabels={["Col1", "Col2", "Col3"]}
/>
```

#### Skeletons específicos por catálogo
```typescript
import { 
  UsersTableSkeleton,
  ProductsTableSkeleton,
  ClientsTableSkeleton 
} from '@/components/ui/TableSkeleton';

<UsersTableSkeleton rows={5} />
<ProductsTableSkeleton rows={10} />
<ClientsTableSkeleton rows={8} />
```

## Ejemplo Completo - Catálogo de Productos

```typescript
// pages/products/page.tsx
import { useAsyncPaginatedTable } from '@/hooks/useAsyncTableState';
import { ProductsTableSkeleton } from '@/components/ui/TableSkeleton';
import { usePaginatedProducts } from '@/hooks/useProducts';

export default function ProductsPage() {
  // 1. Hook de datos (igual que antes)
  const {
    products,
    totalCount,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    goToPage,
    nextPage,
    previousPage
  } = usePaginatedProducts();

  // 2. Hook de estado asíncrono
  const asyncTableState = useAsyncPaginatedTable(
    products,
    isLoading,
    { currentPage, totalPages, hasNextPage, hasPreviousPage },
    { minLoadingTime: 400, keepPreviousData: true }
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1>Catálogo de Productos</h1>
        
        {/* Filtros y controles */}
        <Card>
          {/* Filtros aquí */}
        </Card>

        {/* Tabla con loading asíncrono */}
        <Card>
          {asyncTableState.showSkeleton ? (
            <ProductsTableSkeleton rows={10} />
          ) : (
            <Table {...asyncTableState.tableProps}>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asyncTableState.displayData.map((product) => (
                  <TableRow key={product.id}>
                    {/* Filas de productos */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Paginación */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPreviousPage={previousPage}
          />
        </Card>
      </div>
    </Layout>
  );
}
```

## Crear Nuevo Skeleton para Catálogo

```typescript
// En TableSkeleton.tsx, agregar:
export function MyNewCatalogSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeleton 
      rows={rows}
      columns={4} // Número de columnas
      headerLabels={["Campo1", "Campo2", "Campo3", "Acciones"]}
    />
  );
}
```

## Ventajas del Sistema

✅ **Reutilizable**: Un solo código para todos los catálogos
✅ **UX Suave**: Transiciones elegantes sin flashes
✅ **Configurable**: Tiempo de loading, comportamiento personalizable
✅ **Accesible**: Props de aria-busy y data-loading automáticos
✅ **Responsive**: Funciona en cualquier tamaño de pantalla
✅ **TypeScript**: Completamente tipado

## Configuración Recomendada por Catálogo

| Catálogo | minLoadingTime | keepPreviousData | rows |
|----------|----------------|------------------|------|
| Usuarios | 500ms | true | 5-10 |
| Productos | 400ms | true | 8-12 |
| Clientes | 300ms | true | 6-10 |
| Pedidos | 600ms | true | 5-8 |

## Notas Técnicas

- **keepPreviousData: true**: Mantiene datos anteriores mientras carga (recomendado)
- **minLoadingTime**: Evita flashes molestos en conexiones rápidas
- **showSkeleton**: Para casos donde no hay datos anteriores
- **transitionClasses**: CSS automático para opacity, transitions y pointer-events