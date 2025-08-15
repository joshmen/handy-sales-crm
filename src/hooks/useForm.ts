import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useToast } from './useToast'

// Generic form hook with Zod validation
export function useZodForm<TFieldValues extends FieldValues = FieldValues>(
  schema: z.ZodSchema<TFieldValues>,
  options?: Omit<UseFormProps<TFieldValues>, 'resolver'>
): UseFormReturn<TFieldValues> {
  return useForm<TFieldValues>({
    resolver: zodResolver(schema),
    ...options,
  })
}

// Enhanced form hook with submission handling
export function useFormHandler<TFieldValues extends FieldValues = FieldValues>(
  schema: z.ZodSchema<TFieldValues>,
  onSubmit: (data: TFieldValues) => Promise<void> | void,
  options?: {
    successMessage?: string
    errorMessage?: string
    resetOnSuccess?: boolean
    validateOnChange?: boolean
  }
) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  const form = useZodForm(schema, {
    mode: options?.validateOnChange ? 'onChange' : 'onSubmit',
  })

  const handleSubmit = form.handleSubmit(async (data: TFieldValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      
      if (options?.successMessage) {
        toast({
          title: 'Éxito',
          description: options.successMessage,
          variant: 'default',
        })
      }
      
      if (options?.resetOnSuccess !== false) {
        form.reset()
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : options?.errorMessage || 'Ocurrió un error inesperado'
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  })

  return {
    ...form,
    handleSubmit,
    isSubmitting,
  }
}

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().regex(/^[\\+]?[1-9][\\d]{0,15}$/, 'Ingresa un teléfono válido'),
  required: (message = 'Este campo es requerido') => z.string().min(1, message),
  optionalString: z.string().optional(),
  positiveNumber: z.number().positive('Debe ser un número positivo'),
  currency: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
}

// Form schemas for different entities
export const formSchemas = {
  // Auth schemas
  login: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),
  
  register: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: commonSchemas.password,
    role: z.enum(['ADMIN', 'SUPERVISOR', 'VENDEDOR']).optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  }),
  
  // Client schemas
  client: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email.optional().or(z.literal('')),
    phone: commonSchemas.phone.optional().or(z.literal('')),
    address: commonSchemas.required('La dirección es requerida'),
    zone: commonSchemas.required('La zona es requerida'),
    type: z.enum(['mayorista', 'medio-mayorista', 'minorista', 'vip']),
    isActive: z.boolean().default(true),
  }),
  
  // Product schemas
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
  
  // User schemas
  user: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email,
    phone: commonSchemas.phone.optional().or(z.literal('')),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'VENDEDOR']),
    territory: commonSchemas.optionalString,
    isActive: z.boolean().default(true),
  }),
  
  // Settings schemas
  profile: z.object({
    name: commonSchemas.required('El nombre es requerido'),
    email: commonSchemas.email,
    phone: commonSchemas.phone.optional().or(z.literal('')),
    territory: commonSchemas.optionalString,
    bio: commonSchemas.optionalString,
  }),
  
  changePassword: z.object({
    currentPassword: commonSchemas.password,
    newPassword: commonSchemas.password,
    confirmPassword: commonSchemas.password,
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  }),
  
  // Search and filter schemas
  searchFilter: z.object({
    search: commonSchemas.optionalString,
    sortBy: commonSchemas.optionalString,
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
}

// Type helpers
export type LoginFormData = z.infer<typeof formSchemas.login>
export type RegisterFormData = z.infer<typeof formSchemas.register>
export type ClientFormData = z.infer<typeof formSchemas.client>
export type ProductFormData = z.infer<typeof formSchemas.product>
export type UserFormData = z.infer<typeof formSchemas.user>
export type ProfileFormData = z.infer<typeof formSchemas.profile>
export type ChangePasswordFormData = z.infer<typeof formSchemas.changePassword>
export type SearchFilterData = z.infer<typeof formSchemas.searchFilter>

// Custom form field component props
export interface FormFieldProps {
  name: string
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

// Form state helpers
export function getFormError<T extends FieldValues>(form: UseFormReturn<T>, fieldName: string): string | undefined {
  const error = form.formState.errors[fieldName]
  return error?.message as string | undefined
}

export function isFieldInvalid<T extends FieldValues>(form: UseFormReturn<T>, fieldName: string): boolean {
  return !!form.formState.errors[fieldName] && form.formState.touchedFields[fieldName]
}

export function getFieldProps<T extends FieldValues>(form: UseFormReturn<T>, fieldName: string) {
  return {
    ...form.register(fieldName),
    error: getFormError(form, fieldName),
    invalid: isFieldInvalid(form, fieldName),
  }
}
