import { useEmpresa } from './useEmpresa';

/**
 * True si el plan de subscription del tenant incluye `tracking_vendedor`.
 * Backend lo expone via `GET /api/mobile/empresa` campo `trackingGpsEnabled`,
 * leido del SubscriptionFeatureGuard.HasFeatureAsync(tenantId, "tracking_vendedor").
 *
 * Default false — fail-closed por privacidad. Si el flag no llega del backend
 * (network down, version vieja del API), el toggle queda oculto y el vendedor
 * sigue con tracking foreground-only.
 *
 * Reliability Sprint Fase 3 (GPS Background): gate el UI toggle + el
 * startBackgroundLocationUpdates en LocationTrackingBridge.
 */
export function useTrackingGpsEnabled(): boolean {
  const { data } = useEmpresa();
  return data?.trackingGpsEnabled === true;
}
