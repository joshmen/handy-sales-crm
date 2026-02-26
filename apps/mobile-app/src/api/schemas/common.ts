import { z } from 'zod';

// --- Pagination ---

export const PaginationSchema = z
  .object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .passthrough();

export type Pagination = z.infer<typeof PaginationSchema>;

// --- Generic wrappers (take an item schema as parameter) ---

export function ApiResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z
    .object({
      success: z.boolean(),
      data: itemSchema,
      message: z.string().optional(),
    })
    .passthrough();
}

export function PaginatedApiResponseSchema<T extends z.ZodType>(
  itemSchema: T
) {
  return z
    .object({
      success: z.boolean(),
      data: z.array(itemSchema),
      count: z.number().optional(),
      pagination: PaginationSchema,
    })
    .passthrough();
}

export const ApiErrorSchema = z
  .object({
    success: z.literal(false),
    message: z.string(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .passthrough();

export type ApiError = z.infer<typeof ApiErrorSchema>;
