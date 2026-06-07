/**
 * Sprint pre-prod #24 audit 2026-06-06: contacto comercial centralizado
 * para pantallas de pago (subscription/expired, billing/suspended).
 *
 * Antes habia un placeholder hardcoded `+52 555 123 4567` y
 * `ventas@handysuites.com` en subscription/expired/page.tsx que ya estaba
 * en produccion. Cliente intentando renovar marcaba el numero falso.
 *
 * Configuracion via env vars en runtime:
 *   NEXT_PUBLIC_SUPPORT_PHONE       = "+52 81 1234 5678"
 *   NEXT_PUBLIC_SUPPORT_WHATSAPP    = "+52 81 1234 5678"  (mismo o distinto)
 *   NEXT_PUBLIC_SUPPORT_EMAIL       = "soporte@handysuites.com"
 *
 * Si una env var NO esta definida, su getter retorna null y el componente
 * que la usa debe OCULTAR el bloque correspondiente (no mostrar placeholder).
 *
 * Definir en .env.local (dev), Vercel project env (prod), y staging.
 */

export interface SupportContactInfo {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  /** Horario humano-legible (puede ser i18n key o texto plano del env). */
  hours: string | null;
}

const sanitize = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function getSupportContactInfo(): SupportContactInfo {
  return {
    phone: sanitize(process.env.NEXT_PUBLIC_SUPPORT_PHONE),
    whatsapp: sanitize(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP),
    email: sanitize(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
    hours: sanitize(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
  };
}

/** Helper para mostrar contacto solo si esta configurado en env. */
export function hasAnyContactConfigured(info: SupportContactInfo): boolean {
  return !!(info.phone || info.whatsapp || info.email);
}
