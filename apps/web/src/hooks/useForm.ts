import {
  useForm,
  UseFormProps,
  FieldValues,
  UseFormReturn,
  Path,
  FieldErrors,
  FieldError,
} from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useToast } from './useToast';
import { ZodSchema, ZodType } from 'zod/v3';

/* ============================================================================
   Helpers seguros (sin any) para navegar errores/touched por path (a.b.c)
   ========================================================================== */

function getAtPath(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

function getErrorMessageAtPath<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: Path<T>
): string | undefined {
  const raw = getAtPath(errors, (name as string).split('.'));
  const fe = raw as FieldError | undefined;
  return fe?.message?.toString();
}

function getBooleanAtPath(obj: unknown, name: string): boolean {
  const v = getAtPath(obj, name.split('.'));
  return Boolean(v);
}

/* ============================================================================
   Hook base: useZodForm (infiriendo tipo desde el esquema)
   ========================================================================== */

export function useZodForm<TSchema extends z.AnyZodObject>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>
): UseFormReturn<z.infer<TSchema>> {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema), // <- sin genéricos aquí
    ...options,
  });
}

/* ============================================================================
   Hook mejorado: manejo de submit + toasts
   ========================================================================== */

export function useFormHandler<TSchema extends z.AnyZodObject>(
  schema: TSchema,
  onSubmit: (data: z.infer<TSchema>) => Promise<void> | void,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    resetOnSuccess?: boolean;
    validateOnChange?: boolean;
  }
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useZodForm(schema, {
    mode: options?.validateOnChange ? 'onChange' : 'onSubmit',
  });

  const handleSubmit = form.handleSubmit(async (data: z.infer<TSchema>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);

      if (options?.successMessage) {
        toast({
          title: 'Éxito',
          description: options.successMessage,
        });
      }

      if (options?.resetOnSuccess !== false) {
        form.reset();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : options?.errorMessage || 'Ocurrió un error inesperado';

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return { ...form, handleSubmit, isSubmitting };
}

/* ============================================================================
   Esquemas comunes y de entidades
   ========================================================================== */

export const commonSchemas = {
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  // Regex E.164 simple
  phone: z.string().regex(/^\+?[1-9]\d{0,15}$/, 'Ingresa un teléfono válido'),
  required: (message = 'Este campo es requerido') => z.string().min(1, message),
  optionalString: z.string().optional(),
  positiveNumber: z.number().positive('Debe ser un número positivo'),
  currency: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
};

export const formSchemas = {
  // Auth
  login: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),

  register: z
    .object({
      name: commonSchemas.required('El nombre es requerido'),
      email: commonSchemas.email,
      password: commonSchemas.password,
      confirmPassword: commonSchemas.password,
      role: z.enum(['ADMIN', 'SUPERVISOR', 'VENDEDOR']).optional(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    }),

  // Client
  client: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email.optional().or(z.literal('')),
    phone: commonSchemas.phone.optional().or(z.literal('')),
    address: commonSchemas.required('La dirección es requerida'),
    zone: commonSchemas.required('La zona es requerida'),
    type: z.enum(['mayorista', 'medio-mayorista', 'minorista', 'vip']),
    isActive: z.boolean().default(true),
  }),

  // Product
  product: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    code: commonSchemas.required('El código es requerido'),
    description: commonSchemas.optionalString,
    price: commonSchemas.currency,
    stock: z.number().int().min(0, 'El stock debe ser mayor o igual a 0'),
    category: commonSchemas.required('La categoría es requerida'),
    family: commonSchemas.required('La familia es requerida'),
    isActive: z.boolean().default(true),
  }),

  // User
  user: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email,
    phone: commonSchemas.phone.optional().or(z.literal('')),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'VENDEDOR']),
    territory: commonSchemas.optionalString,
    isActive: z.boolean().default(true),
  }),

  // Settings
  profile: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email,
    phone: commonSchemas.phone.optional().or(z.literal('')),
    territory: commonSchemas.optionalString,
    bio: commonSchemas.optionalString,
  }),

  changePassword: z
    .object({
      currentPassword: commonSchemas.password,
      newPassword: commonSchemas.password,
      confirmPassword: commonSchemas.password,
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    }),

  // Search/filter
  searchFilter: z.object({
    search: commonSchemas.optionalString,
    sortBy: commonSchemas.optionalString,
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
};

/* ============================================================================
   Tipos inferidos
   ========================================================================== */

export type LoginFormData = z.infer<typeof formSchemas.login>;
export type RegisterFormData = z.infer<typeof formSchemas.register>;
export type ClientFormData = z.infer<typeof formSchemas.client>;
export type ProductFormData = z.infer<typeof formSchemas.product>;
export type UserFormData = z.infer<typeof formSchemas.user>;
export type ProfileFormData = z.infer<typeof formSchemas.profile>;
export type ChangePasswordFormData = z.infer<typeof formSchemas.changePassword>;
export type SearchFilterData = z.infer<typeof formSchemas.searchFilter>;

/* ============================================================================
   Helpers para campos (type-safe con Path<T>)
   ========================================================================== */

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function getFormError<T extends FieldValues, K extends Path<T>>(
  form: UseFormReturn<T>,
  fieldName: K
): string | undefined {
  return getErrorMessageAtPath(form.formState.errors, fieldName);
}

export function isFieldInvalid<T extends FieldValues, K extends Path<T>>(
  form: UseFormReturn<T>,
  fieldName: K
): boolean {
  const hasError = Boolean(getFormError(form, fieldName));
  const touched = getBooleanAtPath(form.formState.touchedFields, fieldName as string);
  return hasError && touched;
}

export function getFieldProps<T extends FieldValues, K extends Path<T>>(
  form: UseFormReturn<T>,
  fieldName: K
) {
  return {
    ...form.register(fieldName),
    error: getFormError(form, fieldName),
    invalid: isFieldInvalid(form, fieldName),
  };
}
