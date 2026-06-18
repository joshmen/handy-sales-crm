import { router, type Href } from 'expo-router';

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

/**
 * Back seguro (patrón oficial expo-router: canGoBack + back).
 *
 * Si hay una pantalla previa en el stack, vuelve a ella. Si NO (entrada por deep
 * link, cold-start, o navegación cross-tab que no dejó historial en esta
 * sección), hace `replace` al `fallback` en lugar de `router.back()` — que
 * saldría de la app o saltaría al Hoy. Esto arregla el "te saca de la app".
 *
 * El `fallback` es el índice de la sección de la pantalla (ej. una pantalla bajo
 * `vender/` usa `'/(tabs)/vender'`; las compartidas usan `'/(tabs)'`). Acepta un
 * string crudo para no obligar a importar `route` en cada callsite del barrido.
 */
export function safeBack(fallback: string): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as Href);
  }
}

/**
 * Navega a una pantalla que vive en OTRA sección/tab, anclando su `index`.
 *
 * `withAnchor: true` fuerza que la ruta inicial de esa sección
 * (`unstable_settings.initialRouteName = 'index'` en cada `_layout`) quede
 * debajo del destino en el stack. Así el back regresa a la lista de la sección
 * en vez de volver al Hoy o salir de la app. (Doc oficial: `initialRouteName`
 * solo aplica en deep links; `withAnchor` lo fuerza al navegar dentro de la app.)
 *
 * Usar SOLO en cruces cross-tab (ej. dashboard del Hoy → `equipo/vendedor/[id]`,
 * o el hub de "Más" → `clients`). Dentro de la misma sección, `router.push`
 * normal basta (el `index` ya está en el stack).
 */
export function goToSection(href: Href): void {
  router.navigate(href, { withAnchor: true });
}
