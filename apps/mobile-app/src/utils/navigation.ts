import type { Href } from 'expo-router';

/**
 * Type-safe route helper — avoids `as any` casts throughout the codebase.
 * Usage: router.push(route('/clients/crear'))
 */
export function route(path: string): Href {
  return path as Href;
}

/**
 * Type-safe route with params helper.
 * Usage: router.push(routeWithParams('/(tabs)/cobrar/recibo', { monto: '100' }))
 */
export function routeWithParams(pathname: string, params: Record<string, string | number>): Href {
  return { pathname, params } as unknown as Href;
}
