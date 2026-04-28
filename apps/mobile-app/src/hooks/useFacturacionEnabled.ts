import { useEmpresa } from './useEmpresa';

/**
 * Gating funcional de la sección de facturación electrónica.
 *
 * El backend decide qué países están soportados (hoy solo MX con SAT CFDI;
 * mañana cuando agreguemos DIAN/SUNAT/etc. solo se extiende la lista en
 * `BillingCountrySupport.cs` y este hook empieza a devolver true para esos
 * tenants sin más cambios).
 *
 * Default SEGURO: si aún no cargó el query, retorna false para no mostrar
 * UI de facturación antes de confirmar disponibilidad.
 */
export function useFacturacionEnabled(): boolean {
  const { data } = useEmpresa();
  return data?.billingEnabled === true;
}
