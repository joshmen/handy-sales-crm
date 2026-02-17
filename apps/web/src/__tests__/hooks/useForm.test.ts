/// <reference path="../jest.d.ts" />

import { renderHook, act, waitFor } from '@testing-library/react';
import { z } from 'zod';
import {
  useZodForm,
  useFormHandler,
  commonSchemas,
  formSchemas,
  getFormError,
  isFieldInvalid,
  getFieldProps,
} from '@/hooks/useForm';

// Mock useToast
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useForm', () => {
  describe('useZodForm', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email'),
      age: z.number().min(0, 'Age must be positive'),
    });

    it('returns form methods', () => {
      const { result } = renderHook(() => useZodForm(testSchema));

      expect(result.current.register).toBeDefined();
      expect(result.current.handleSubmit).toBeDefined();
      expect(result.current.formState).toBeDefined();
      expect(result.current.reset).toBeDefined();
      expect(result.current.setValue).toBeDefined();
      expect(result.current.getValues).toBeDefined();
    });

    it('validates against schema', async () => {
      const { result } = renderHook(() => useZodForm(testSchema));

      await act(async () => {
        await result.current.trigger();
      });

      expect(result.current.formState.errors.name).toBeDefined();
      expect(result.current.formState.errors.email).toBeDefined();
    });

    it('accepts default values', () => {
      const { result } = renderHook(() =>
        useZodForm(testSchema, {
          defaultValues: {
            name: 'Test User',
            email: 'test@example.com',
            age: 25,
          },
        })
      );

      expect(result.current.getValues('name')).toBe('Test User');
      expect(result.current.getValues('email')).toBe('test@example.com');
      expect(result.current.getValues('age')).toBe(25);
    });

    it('clears errors on valid input', async () => {
      const { result } = renderHook(() =>
        useZodForm(testSchema, { mode: 'onChange' })
      );

      // Trigger validation
      await act(async () => {
        await result.current.trigger('name');
      });

      expect(result.current.formState.errors.name).toBeDefined();

      // Set valid value
      await act(async () => {
        result.current.setValue('name', 'Valid Name', { shouldValidate: true });
      });

      await waitFor(() => {
        expect(result.current.formState.errors.name).toBeUndefined();
      });
    });
  });

  describe('useFormHandler', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
    });

    it('provides isSubmitting state', () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() => useFormHandler(testSchema, onSubmit));

      expect(result.current.isSubmitting).toBe(false);
    });

    it('sets isSubmitting during submission', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      const onSubmit = jest.fn(() => submitPromise);
      const { result } = renderHook(() => useFormHandler(testSchema, onSubmit));

      // Set valid data
      await act(async () => {
        result.current.setValue('name', 'Test');
      });

      // Start submission
      act(() => {
        result.current.handleSubmit();
      });

      // Should be submitting
      expect(result.current.isSubmitting).toBe(true);

      // Complete submission
      await act(async () => {
        resolveSubmit!();
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('calls onSubmit with form data on valid submission', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() => useFormHandler(testSchema, onSubmit));

      await act(async () => {
        result.current.setValue('name', 'Test Name');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Test Name' });
    });

    it('does not submit invalid form', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() => useFormHandler(testSchema, onSubmit));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('resets form on success by default', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useFormHandler(testSchema, onSubmit, { resetOnSuccess: true })
      );

      await act(async () => {
        result.current.setValue('name', 'Test');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.getValues('name')).toBe('');
    });

    it('keeps form data when resetOnSuccess is false', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useFormHandler(testSchema, onSubmit, { resetOnSuccess: false })
      );

      await act(async () => {
        result.current.setValue('name', 'Test');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.getValues('name')).toBe('Test');
    });
  });

  describe('commonSchemas', () => {
    describe('email', () => {
      it('validates correct email', () => {
        expect(() => commonSchemas.email.parse('test@example.com')).not.toThrow();
      });

      it('rejects invalid email', () => {
        expect(() => commonSchemas.email.parse('invalid-email')).toThrow();
      });
    });

    describe('password', () => {
      it('accepts password with 6+ characters', () => {
        expect(() => commonSchemas.password.parse('123456')).not.toThrow();
      });

      it('rejects password with less than 6 characters', () => {
        expect(() => commonSchemas.password.parse('12345')).toThrow();
      });
    });

    describe('phone', () => {
      it('validates international format', () => {
        expect(() => commonSchemas.phone.parse('+1234567890')).not.toThrow();
      });

      it('validates without plus', () => {
        expect(() => commonSchemas.phone.parse('1234567890')).not.toThrow();
      });
    });

    describe('required', () => {
      it('validates non-empty string', () => {
        const schema = commonSchemas.required();
        expect(() => schema.parse('value')).not.toThrow();
      });

      it('rejects empty string', () => {
        const schema = commonSchemas.required();
        expect(() => schema.parse('')).toThrow();
      });

      it('uses custom message', () => {
        const schema = commonSchemas.required('Campo requerido');
        try {
          schema.parse('');
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('Campo requerido');
          }
        }
      });
    });

    describe('positiveNumber', () => {
      it('accepts positive numbers', () => {
        expect(() => commonSchemas.positiveNumber.parse(10)).not.toThrow();
        expect(() => commonSchemas.positiveNumber.parse(0.5)).not.toThrow();
      });

      it('rejects zero and negative numbers', () => {
        expect(() => commonSchemas.positiveNumber.parse(0)).toThrow();
        expect(() => commonSchemas.positiveNumber.parse(-5)).toThrow();
      });
    });

    describe('currency', () => {
      it('accepts zero and positive numbers', () => {
        expect(() => commonSchemas.currency.parse(0)).not.toThrow();
        expect(() => commonSchemas.currency.parse(100.50)).not.toThrow();
      });

      it('rejects negative numbers', () => {
        expect(() => commonSchemas.currency.parse(-10)).toThrow();
      });
    });
  });

  describe('formSchemas', () => {
    describe('login', () => {
      it('validates correct login data', () => {
        const data = {
          email: 'user@example.com',
          password: 'password123',
        };
        expect(() => formSchemas.login.parse(data)).not.toThrow();
      });

      it('rejects invalid email', () => {
        const data = {
          email: 'invalid',
          password: 'password123',
        };
        expect(() => formSchemas.login.parse(data)).toThrow();
      });
    });

    describe('register', () => {
      it('validates matching passwords', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        };
        expect(() => formSchemas.register.parse(data)).not.toThrow();
      });

      it('rejects non-matching passwords', () => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'different',
        };
        expect(() => formSchemas.register.parse(data)).toThrow();
      });
    });

    describe('client', () => {
      it('validates complete client data', () => {
        const data = {
          name: 'Cliente Test',
          email: 'cliente@test.com',
          phone: '+525512345678',
          address: 'Calle Test 123',
          zone: 'Norte',
          type: 'mayorista' as const,
          isActive: true,
        };
        expect(() => formSchemas.client.parse(data)).not.toThrow();
      });

      it('accepts empty optional fields', () => {
        const data = {
          name: 'Cliente Test',
          email: '',
          phone: '',
          address: 'Calle Test 123',
          zone: 'Norte',
          type: 'minorista' as const,
          isActive: true,
        };
        expect(() => formSchemas.client.parse(data)).not.toThrow();
      });

      it('validates client type enum', () => {
        const data = {
          name: 'Test',
          address: 'Address',
          zone: 'Zone',
          type: 'invalid-type',
        };
        expect(() => formSchemas.client.parse(data)).toThrow();
      });
    });

    describe('product', () => {
      it('validates complete product data', () => {
        const data = {
          name: 'Producto Test',
          code: 'PROD-001',
          description: 'Descripción',
          price: 100.50,
          stock: 25,
          category: 'Electrónicos',
          family: 'Accesorios',
          isActive: true,
        };
        expect(() => formSchemas.product.parse(data)).not.toThrow();
      });

      it('rejects negative stock', () => {
        const data = {
          name: 'Producto Test',
          code: 'PROD-001',
          price: 100,
          stock: -5,
          category: 'Cat',
          family: 'Fam',
        };
        expect(() => formSchemas.product.parse(data)).toThrow();
      });

      it('rejects negative price', () => {
        const data = {
          name: 'Producto Test',
          code: 'PROD-001',
          price: -100,
          stock: 5,
          category: 'Cat',
          family: 'Fam',
        };
        expect(() => formSchemas.product.parse(data)).toThrow();
      });
    });

    describe('user', () => {
      it('validates user with valid role', () => {
        const data = {
          name: 'Usuario Test',
          email: 'user@test.com',
          phone: '+521234567890',
          role: 'ADMIN' as const,
          isActive: true,
        };
        expect(() => formSchemas.user.parse(data)).not.toThrow();
      });

      it('accepts all valid roles', () => {
        const roles = ['ADMIN', 'SUPERVISOR', 'VENDEDOR'] as const;
        roles.forEach((role) => {
          const data = {
            name: 'Test',
            email: 'test@test.com',
            role,
          };
          expect(() => formSchemas.user.parse(data)).not.toThrow();
        });
      });
    });

    describe('changePassword', () => {
      it('validates matching new passwords', () => {
        const data = {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
          confirmPassword: 'newpassword',
        };
        expect(() => formSchemas.changePassword.parse(data)).not.toThrow();
      });

      it('rejects non-matching passwords', () => {
        const data = {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
          confirmPassword: 'different',
        };
        expect(() => formSchemas.changePassword.parse(data)).toThrow();
      });
    });

    describe('searchFilter', () => {
      it('validates search filter data', () => {
        const data = {
          search: 'query',
          sortBy: 'name',
          sortOrder: 'asc' as const,
          page: 1,
          limit: 10,
        };
        expect(() => formSchemas.searchFilter.parse(data)).not.toThrow();
      });

      it('rejects invalid sortOrder', () => {
        const data = {
          sortOrder: 'invalid',
        };
        expect(() => formSchemas.searchFilter.parse(data)).toThrow();
      });

      it('rejects limit over 100', () => {
        const data = {
          limit: 150,
        };
        expect(() => formSchemas.searchFilter.parse(data)).toThrow();
      });
    });
  });

  describe('Helper Functions', () => {
    const schema = z.object({
      name: z.string().min(1, 'Name required'),
      nested: z.object({
        field: z.string().min(1, 'Nested required'),
      }),
    });

    describe('getFormError', () => {
      it('returns error message for invalid field', async () => {
        const { result } = renderHook(() => useZodForm(schema));

        await act(async () => {
          await result.current.trigger();
        });

        const error = getFormError(result.current, 'name');
        expect(error).toBe('Name required');
      });

      it('returns undefined for valid field', async () => {
        const { result } = renderHook(() =>
          useZodForm(schema, {
            defaultValues: { name: 'Valid', nested: { field: 'Valid' } },
          })
        );

        const error = getFormError(result.current, 'name');
        expect(error).toBeUndefined();
      });
    });

    describe('isFieldInvalid', () => {
      it('returns true for touched invalid field', async () => {
        const { result } = renderHook(() =>
          useZodForm(schema, { mode: 'onChange' })
        );

        await act(async () => {
          result.current.setValue('name', '', { shouldTouch: true, shouldValidate: true });
        });

        const invalid = isFieldInvalid(result.current, 'name');
        expect(invalid).toBe(true);
      });
    });

    describe('getFieldProps', () => {
      it('returns field registration and error info', async () => {
        const { result } = renderHook(() => useZodForm(schema));

        const props = getFieldProps(result.current, 'name');

        expect(props.name).toBe('name');
        expect(typeof props.onChange).toBe('function');
        expect(typeof props.onBlur).toBe('function');
        expect(props.ref).toBeDefined();
      });
    });
  });
});
