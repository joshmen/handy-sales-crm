/**
 * Sprint pre-prod #45 + correctivo 2026-06-06: catalogo SAT centralizado.
 *
 * Fuente verificada: SAT Anexo 20 v4.0 — catalogo c_RegimenFiscal.
 *   URL oficial:
 *   http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm
 *   (descargar "Catálogos del Anexo 20 (xls)").
 *
 * Validacion del CFDI:
 *   - El XML CFDI 4.0 transmite SOLO el `RegimenFiscalReceptor` codigo
 *     (atributo de 3 digitos). La descripcion NO se envia — es solo
 *     display al usuario.
 *   - El PAC valida que el codigo este en c_RegimenFiscal vigente al
 *     momento del timbrado. Los 19 codigos aqui estan vigentes en v4.0
 *     (verificado 2026-06-06).
 *
 * Reglas adicionales del SAT (no enforced aqui, pero documento):
 *   - PERSONA FISICA (RFC con 13 chars) NO puede usar regimen 601, 603,
 *     620, 622, 623, 624 (son solo morales).
 *   - PERSONA MORAL (RFC con 12 chars) NO puede usar regimen 605, 606,
 *     607, 608, 611, 612, 614, 615, 616, 621, 625 (son solo fisicas).
 *   - 610 y 626 aplican a ambos.
 *   El frontend deberia filtrar el dropdown segun el tipo de RFC del
 *   receptor (futuro: usar `applies` field). Por ahora mostramos todos.
 *
 * Mantenibilidad: si SAT publica un Anexo 20 v4.1 con nuevos codigos,
 * actualizar este array. NO eliminar codigos viejos sin verificar que
 * ningun tenant los tenga asignados (rompe re-timbrado).
 *
 * Antes vivian 20+ <option> hardcoded en billing/settings/page.tsx con
 * em-dash separador ("601 — General...") que viola la regla
 * feedback_no_em_dashes_no_pastels. Separador `: ` en lugar de em-dash.
 */

export interface RegimenFiscal {
  code: string;
  description: string;
  /** Aplica a personas fisicas (F), morales (M), o ambas (A). */
  applies: 'F' | 'M' | 'A';
}

export const REGIMENES_FISCALES: RegimenFiscal[] = [
  { code: '601', description: 'General de Ley Personas Morales', applies: 'M' },
  { code: '603', description: 'Personas Morales con Fines no Lucrativos', applies: 'M' },
  { code: '605', description: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', applies: 'F' },
  { code: '606', description: 'Arrendamiento', applies: 'F' },
  { code: '607', description: 'Régimen de Enajenación o Adquisición de Bienes', applies: 'F' },
  { code: '608', description: 'Demás ingresos', applies: 'F' },
  { code: '610', description: 'Residentes en el Extranjero sin Establecimiento Permanente en México', applies: 'A' },
  { code: '611', description: 'Ingresos por Dividendos (socios y accionistas)', applies: 'F' },
  { code: '612', description: 'Personas Físicas con Actividades Empresariales y Profesionales', applies: 'F' },
  { code: '614', description: 'Ingresos por intereses', applies: 'F' },
  { code: '615', description: 'Régimen de los ingresos por obtención de premios', applies: 'F' },
  { code: '616', description: 'Sin obligaciones fiscales', applies: 'F' },
  { code: '620', description: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', applies: 'M' },
  { code: '621', description: 'Incorporación Fiscal', applies: 'F' },
  { code: '622', description: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', applies: 'M' },
  { code: '623', description: 'Opcional para Grupos de Sociedades', applies: 'M' },
  { code: '624', description: 'Coordinados', applies: 'M' },
  { code: '625', description: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', applies: 'F' },
  { code: '626', description: 'Régimen Simplificado de Confianza', applies: 'A' },
];

/**
 * Formato display: "601: General de Ley Personas Morales".
 * Usa `:` en lugar de em-dash (regla memoria).
 */
export function formatRegimenLabel(reg: RegimenFiscal): string {
  return `${reg.code}: ${reg.description}`;
}
