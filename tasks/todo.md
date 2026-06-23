# Fase E — Reportes: PDFs por spec + Excel + Programar envío

Fases A–D del módulo de reportes DONE. Hook `useReportExport.ts` ya genera PDF (membrete logo+ID fiscal+dirección, barra título con periodo, KPIs, gráfica, tabla autotable, pie "Generado por Handy Suites® · fecha · Pág X de Y", landscape A4). jeyma local = plan contabilidad (ve todos los reportes).

## E1 — PDF polish a spec (frontend, sin deps) — EN CURSO
- [ ] Agregar **usuario que genera** al membrete del PDF (fuente: ProfileContext).
- [ ] **Negativos y fila de totales en ROJO** en la tabla autotable (didParseCell).
- [ ] Verif: `npm run type-check` + revisar PDFs en localhost.

## E2 — Export Excel (frontend, requiere dep `exceljs`)
- [ ] `exportExcel(config)` en useReportExport → .xlsx (cabecera empresa/título/periodo/KPIs + tabla). 
- [ ] Botón **Excel** junto al PDF en `ReportFilters` (`onExportExcel` + botón).
- [ ] Confirmar dependencia exceljs (npm install).

## E3 — Programar envío (NECESITA BACKEND — opcional/seguimiento)
- [ ] Backend job/endpoint para agendar envío por correo + UI modal "Programar".
- [ ] Confirmar si se hace ahora o se agenda.

## Orden: E1 (rápido) → E2 (exceljs) → E3 (backend, confirmar).
