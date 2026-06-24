import { redirect } from 'next/navigation';

// Factura manual "desde cero" eliminada: todo CFDI nace de un pedido entregado.
// Esta ruta redirige al selector de pedidos por facturar.
export default function NewInvoiceRedirect() {
  redirect('/billing/invoices/select-order');
}
