import { z } from 'zod';

/**
 * Audit M-8 (2026-05-25): Antes el schema vivía inline en zones/page.tsx,
 * dificultando reuso (validación en API helpers, tests, otros componentes).
 * Mismo patrón que `lib/validations/client.ts`.
 *
 * Validation keys — translated at render time via useTranslations('zones.validation').
 */
export const zoneFormSchema = z.object({
  name: z.string().min(1, 'nameRequired'),
  description: z.string().optional(),
  color: z.string().min(1, 'colorRequired'),
  frecuenciaVisita: z.number(),
  isEnabled: z.boolean(),
  vendedorId: z.number().nullable().optional(),
  centroLatitud: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
  centroLongitud: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
  radioKm: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
}).refine(
  (data) => {
    const hasLat = data.centroLatitud !== undefined;
    const hasLng = data.centroLongitud !== undefined;
    return hasLat === hasLng;
  },
  { message: 'coordinatesBothRequired', path: ['centroLongitud'] },
);

export type ZoneFormData = z.infer<typeof zoneFormSchema>;
