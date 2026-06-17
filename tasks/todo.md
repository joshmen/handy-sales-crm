# WS-B (Plan 017) — Consolidar graficas: quitar @tremor/react + recharts -> ApexCharts

## Recon (hecho)
- @tremor/react: 15 archivos en components/reports/. 13 usan SOLO `Card` (contenedor de ApexCharts que YA usan). 2 (DashboardEjecutivoReport, ReportKPICards) usan Card+Metric+Text+Flex+BadgeDelta (+BarList importado pero NO renderizado).
- recharts: 5 archivos (3 dashboard charts + admin/system-dashboard + admin/crash-reports). El plan decia 3; son 5.
- Card local: ui/Card.tsx (no soporta decoration). useChartTheme: hooks/useChartTheme.ts. Patron ApexCharts: dynamic(() => import('react-apexcharts')) + key theme.

## Parte A — quitar @tremor (15 archivos)
- [ ] Crear components/ui/reportPrimitives.tsx: Card (tremor-compat, decoration/decorationColor + p-6 default, tokens del design system), Metric, Text, Flex, BadgeDelta. (BarList no se usa -> no crear, quitar import de DashboardEjecutivo.)
- [ ] Swap import en los 15 archivos: '@tremor/react' -> '@/components/ui/reportPrimitives'. (InventarioReport usa `Card as TremorCard`.)
- [ ] Quitar @tremor/react de package.json.
- [ ] Verify: type-check + grep 0 '@tremor'.

## Parte B — migrar 5 recharts -> ApexCharts
- [ ] VisitsChart (low: bar stacked/grouped, 4 series, tooltip+legend custom).
- [ ] crash-reports page (low: bar simple).
- [ ] SalesChart (medium: line/area switch, gradient, tooltip i18n).
- [ ] ActivityChart (medium: 4 area series, 2 gradients, tooltip+legend i18n).
- [ ] system-dashboard page (medium-high: 3 chart types, gradients, multi-data).
- [ ] Quitar recharts de package.json.
- [ ] Verify: type-check + lint + grep 0 'recharts'.

## Verify final
- [ ] npm run type-check + npm run lint verdes.
- [ ] grep -rn 'recharts|@tremor' apps/web/src = 0.
- [ ] Bundle measure (antes/despues si @next/bundle-analyzer disponible).
- [ ] QA visual humano por chart (dark+light) — BLOQUEANTE, lo hace el usuario.

## Notas
- Mapas (Leaflet + Google) NO se tocan (cada uno su nicho).
- Commit por parte (A, luego B). NO push sin instruccion.
