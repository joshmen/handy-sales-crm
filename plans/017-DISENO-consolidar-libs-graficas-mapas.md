# Plan 017 (DISEÑO/SPIKE): Consolidar librerías de gráficas y mapas

> Plan de **diseño**, no de ejecución directa. Requiere QA visual humano que un agente autónomo no puede hacer. Ejecutar con revisión visual después de cada migración de componente.

## Status
- Prioridad: P3 | Esfuerzo: M–L | Riesgo: MED (regresión visual) | Categoría: deps/perf | Planned at: commit `975e4145`, 2026-06-14

## Por qué (y por qué NO one-shot)
`apps/web` carga **3 librerías de gráficas** y **2 de mapas**:
- Gráficas: `apexcharts` + `react-apexcharts` (dynamic import), `recharts` (import estático en 3 charts del dashboard), `@tremor/react` (usa recharts internamente).
- Mapas: `leaflet` + `react-leaflet`, y `@react-google-maps/api`.
Esto infla el bundle (cada lib ~150–300 KB+) y duplica mantenimiento. **No es one-shot** porque migrar un chart de una lib a otra cambia su apariencia y **un agente no puede verificar visualmente** que no haya regresión.

## Estado actual (a investigar/confirmar)
- Gráficas dashboard (recharts): `apps/web/src/components/dashboard/{SalesChart,ActivityChart,VisitsChart}.tsx`.
- Reportes (apexcharts): `apps/web/src/components/reports/*` (dynamic import de react-apexcharts).
- Tremor: `apps/web/src/components/reports/DashboardEjecutivoReport.tsx` (Card/Metric/Text/Flex/BadgeDelta/BarList).
- Mapas: tracking/ubicaciones usan leaflet; el form de cliente usa @react-google-maps/api.
- `apps/web/package.json`: confirmar las 5 deps.

## Enfoque propuesto
1. **Auditar uso**: `grep -rn 'apexcharts|recharts|tremor|leaflet|google-maps' apps/web/src` → matriz página↔lib.
2. **Elegir ganador de gráficas**: ApexCharts ya cubre la mayoría y se carga dynamic (correcto). Migrar las 3 de recharts → ApexCharts (con `dynamic()`). Evaluar reemplazar `@tremor/react` por los componentes propios `apps/web/src/components/ui/` (Card/Badge) para soltar recharts del todo.
3. **Elegir ganador de mapas**: decidir leaflet (gratis) vs google-maps (necesita API key + costo). Migrar el componente minoritario.
4. **Quitar deps** del package.json una vez sin usos.
5. **Medir**: `@next/bundle-analyzer` antes/después para cuantificar la reducción.
6. **QA visual obligatorio**: comparar cada chart/mapa migrado contra el original (humano).

## Verificación
- `cd apps/web && npm run type-check` + `npm run lint` verdes.
- `grep` de la lib eliminada → 0 imports.
- **QA visual** de cada gráfica/mapa migrado (paso humano — bloqueante).

## Preguntas abiertas (decidir antes de ejecutar)
- ¿Conservar `@tremor/react` (trae recharts) o reemplazarlo por UI propia?
- ¿Mapas: estandarizar en Leaflet (gratis) o Google Maps (API key + costo)? El form de cliente usa Google; el tracking usa Leaflet.
- ¿Aceptable algún cambio visual menor en los charts migrados?

## Recomendación
Valor real (bundle), pero **riesgo visual**. Hacerlo en una rama con revisión visual chart-por-chart. Primer paso barato y seguro: quitar la lib que esté **sin usar** (si alguna no tiene imports), sin migrar nada.
