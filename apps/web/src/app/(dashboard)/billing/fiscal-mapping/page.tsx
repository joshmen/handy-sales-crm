import { redirect } from 'next/navigation';

// Mapeo Fiscal se eliminó: la clave SAT ahora vive en el producto (Catálogo → Productos).
// Esta ruta queda como redirect por compatibilidad con enlaces/bookmarks antiguos.
export default function FiscalMappingRedirect() {
  redirect('/products');
}
