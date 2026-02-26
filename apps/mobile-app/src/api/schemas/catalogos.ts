import { z } from 'zod';

export const CatalogoItemSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    descripcion: z.string().optional(),
  })
  .passthrough();

export type CatalogoItem = z.infer<typeof CatalogoItemSchema>;
