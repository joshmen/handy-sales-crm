import { redirect } from 'next/navigation';

/**
 * Audit H-5 (2026-05-25): Esta página se movió a /clients/transferir-cartera
 * porque reasignar cartera es una operación de Clientes, no de Equipo.
 * Mantenemos este path como redirect permanente para no romper bookmarks ni
 * links externos (notificaciones de Slack, emails antiguos, etc.).
 *
 * Plan: mantener este redirect 90 días, luego evaluar telemetría y posiblemente
 * eliminar si <1% del tráfico viene por aquí.
 */
export default function TransferirCarteraRedirect() {
  redirect('/clients/transferir-cartera');
}
