/**
 * JWT payload decoder. Implementación mínima — no valida firma (eso es trabajo
 * del backend), solo lee el `exp` claim para refresh proactivo.
 *
 * Reliability Sprint Fase 1: refresh BEFORE 401 si el token está por expirar.
 * Sin esto, cada request tras expiración hace round-trip 401 → refresh → retry
 * (latencia ~500ms-2s en redes lentas). Con esto, refresh silencioso 10min antes
 * de expirar y el siguiente request va directo.
 */

interface JwtPayload {
  exp?: number; // seconds since epoch
  nbf?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

/** Base64-URL safe decode (handles `-_` instead of `+/` + missing padding). */
function base64UrlDecode(s: string): string {
  let str = s.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  // atob no está nativo en React Native — usar Buffer si disponible, sino fallback.
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(str);
  }
  // RN provee Buffer global en runtime (via expo-modules-core polyfill)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer;
  if (B?.from) return B.from(str, 'base64').toString('binary');
  throw new Error('No base64 decoder available');
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

/** Returns seconds until token expires. Negative = already expired. Null = no exp claim. */
export function secondsUntilJwtExpiry(token: string): number | null {
  const payload = decodeJwt(token);
  if (!payload?.exp) return null;
  return payload.exp - Math.floor(Date.now() / 1000);
}

/** True si el token expira en menos de `withinSeconds`. False si todavía falta tiempo o si no se puede decodificar. */
export function isJwtNearExpiry(token: string, withinSeconds: number = 600): boolean {
  const remaining = secondsUntilJwtExpiry(token);
  if (remaining === null) return false; // Sin exp claim no podemos saber — confiar en flow reactivo on 401.
  return remaining < withinSeconds;
}
