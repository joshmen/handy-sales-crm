/**
 * SLDS-inspired per-section accent colors. Each nav section tints its PageHeader
 * icon tile + eyebrow + active filter-tab underline. Mirrors `SLDS_ACCENT` from the
 * Claude Design mock (web-shell.jsx). Presentation only — no logic depends on this.
 */
export type SectionKey =
  | 'navegacion'
  | 'ventas'
  | 'catalogo'
  | 'operacion'
  | 'herramientas'
  | 'equipo'
  | 'empresa'
  | 'superadmin';

export const SECTION_ACCENT: Record<SectionKey, string> = {
  navegacion: '#0176D3', // azul (Navegación / general)
  ventas: '#2E844A', // verde
  catalogo: '#5867E8', // índigo
  operacion: '#06A59A', // teal
  herramientas: '#0176D3', // azul
  equipo: '#9050E9', // violeta
  empresa: '#C77B05', // ámbar (Facturación / Empresa)
  superadmin: '#0176D3', // azul (Administración / Super Admin)
};

/** Default Spanish eyebrow label per section (override per-page when needed). */
export const SECTION_LABEL: Record<SectionKey, string> = {
  navegacion: 'Navegación',
  ventas: 'Ventas',
  catalogo: 'Catálogo',
  operacion: 'Operación',
  herramientas: 'Herramientas',
  equipo: 'Equipo',
  empresa: 'Empresa',
  superadmin: 'Administración',
};

/** Resolve a section's accent hex; falls back to the brand blue. */
export function getSectionAccent(section?: SectionKey): string {
  return (section && SECTION_ACCENT[section]) || SECTION_ACCENT.navegacion;
}

/** Background tint for the icon tile: 12% accent mixed into the card surface. */
export function accentTileBg(accent: string): string {
  return `color-mix(in srgb, ${accent} 12%, var(--card))`;
}
