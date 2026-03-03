# Diseño: Alineación Visual de Productos con Clientes

**Fecha**: 2026-03-02
**Objetivo**: Hacer que `/products` se vea visualmente idéntico a `/clients`, adaptando solo lo propio de la entidad.
**Referencia**: `apps/web/src/app/(dashboard)/clients/page.tsx`

## Cambios por zona

### 1. Tabla Desktop — Responsive Column Hiding

**Actual**: Todas las columnas visibles siempre, `min-w-[850px]`
**Target (como Clientes)**: `min-w-[900px]`, columnas secundarias se ocultan en pantallas medianas

| Columna | Width actual | Width target | Responsive |
|---------|-------------|-------------|------------|
| Checkbox | `w-[28px]` | `w-[28px]` | Siempre visible |
| Imagen | `w-[45px]` | `w-[45px]` | Siempre visible |
| Código | `w-[95px]` | `w-[95px]` | Siempre visible |
| Nombre | `flex-1 min-w-[120px]` | `flex-1 min-w-[250px]` | Siempre visible (como Cliente en Clientes) |
| Precio | `w-[85px]` | `w-[90px]` | Siempre visible |
| Existencia | `w-[70px]` | `w-[90px]` | Siempre visible |
| Familia | `w-[85px]` | `w-[100px]` | `hidden md:block` |
| Categoría | `w-[85px]` | `w-[130px]` | `hidden lg:block` |
| Unidad | `w-[65px]` | **Eliminar de tabla** | Mover a mobile card badge |
| Activo | `w-[50px]` | `w-[50px]` | Siempre visible |
| Editar | `w-[45px]` con label | `w-8` sin label | Siempre visible |

**Decisión Unidad**: Actualmente la tabla tiene 11 columnas (vs 8 en Clientes). Quitar Unidad de desktop para alinearse. Se mantiene en el mobile card como badge.

### 2. Tabla Desktop — Row Styling

| Aspecto | Actual | Target (como Clientes) |
|---------|--------|----------------------|
| Row padding | varía | `px-5 py-3.5` |
| Header height | varía | `h-10` |
| Header bg | `bg-gray-50` | `bg-gray-50` (ya igual) |
| Inactive row | `bg-gray-50` | `bg-gray-50` (ya igual) |
| Hover | — | `hover:bg-gray-50` |
| Font sizes | mixto | `text-[13px]` consistente |

### 3. Mobile Cards

| Aspecto | Actual | Target |
|---------|--------|--------|
| Card padding | `p-4` | `p-3` |
| Precio badge | `bg-gray-100 text-gray-700` | `bg-emerald-50 text-emerald-700` (más prominente) |
| Stock badge | colors variados | `bg-red-50 text-red-600` (bajo stock) / `bg-gray-100 text-gray-700` (normal) |
| Familia badge | `bg-blue-50 text-blue-600` | `bg-blue-50 text-blue-700` (match Clientes zona) |
| Categoría | plain text | `bg-purple-50 text-purple-700` pill (match Clientes categoría) |
| Unidad badge | no existe | `bg-gray-100 text-gray-500` pill (nuevo, ya que se quitó de tabla) |

### 4. Edit Column

**Actual**: columna `w-[45px]` con header label "Editar", botón con icono `Pencil`
**Target**: columna `w-8` sin label en header, botón icono-only (como Clientes)

### 5. Tour Documentation

Verificar/agregar estos `data-tour` attributes:

| Elemento | Attribute |
|----------|-----------|
| Botón "Nuevo producto" | `data-tour="products-new-btn"` (ya existe) |
| Search | `data-tour="products-search"` (ya existe) |
| Filtro Familia | `data-tour="products-family-filter"` (ya existe) |
| Filtro Categoría | `data-tour="products-category-filter"` (ya existe) |
| Tabla | `data-tour="products-table"` (ya existe) |
| Form drawer | `data-tour="product-form"` (ya existe) |
| Import/Export dropdown | `data-tour="products-import-export"` (**agregar**) |

## Archivos a modificar

1. `apps/web/src/app/(dashboard)/products/page.tsx` — cambios visuales en tabla, cards, column widths

## Lo que NO cambia

- Header layout (ya alineado)
- Filter row (ya alineado)
- Form drawer (contenido propio de productos)
- Import/Export dropdown (ya alineado)
- Batch action bar styling
- Pagination
- Lógica de negocio
