import { z } from 'zod';

export const MobileProductoSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    codigoBarra: z.string(),
    descripcion: z.string().optional(),
    imagenUrl: z.string().optional(),
    familiaId: z.number().optional(),
    categoriaId: z.number().optional(),
    unidadMedidaId: z.number().optional(),
    precioBase: z.number(),
    activo: z.boolean(),
    familiaNombre: z.string().optional(),
    categoriaNombre: z.string().optional(),
    unidadNombre: z.string().optional(),
    cantidadActual: z.number().optional(),
    stockMinimo: z.number().optional(),
  })
  .passthrough();

export type MobileProducto = z.infer<typeof MobileProductoSchema>;

export const ProductStockSchema = z
  .object({
    productoId: z.number(),
    stock: z.number(),
    disponible: z.boolean(),
    minimo: z.number(),
    enAlerta: z.boolean(),
  })
  .passthrough();

export type ProductStock = z.infer<typeof ProductStockSchema>;
