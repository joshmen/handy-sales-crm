'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Space_Grotesk } from 'next/font/google';
import { z } from 'zod';
import { toast } from '@/hooks/useToast';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { API_CONFIG } from '@/lib/constants';
import axios from 'axios';
import { Suspense } from 'react';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

// Schema for manual registration
const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Formato de correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  nombreEmpresa: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  rfc: z.string().max(13, 'El RFC no debe exceder 13 caracteres').optional().or(z.literal('')),
  contacto: z.string().max(100).optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Schema for Google registration (no password)
const googleRegisterSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Formato de correo inválido'),
  nombreEmpresa: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  rfc: z.string().max(13, 'El RFC no debe exceder 13 caracteres').optional().or(z.literal('')),
  contacto: z.string().max(100).optional().or(z.literal('')),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type GoogleRegisterFormData = z.infer<typeof googleRegisterSchema>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if coming from Google OAuth redirect
  const googleEmail = searchParams.get('email');
  const googleName = searchParams.get('name');
  const googleAvatar = searchParams.get('avatar');
  const googleProvider = searchParams.get('provider');
  const isGoogleMode = !!googleProvider && !!googleEmail;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manual registration form
  const manualForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      confirmPassword: '',
      nombreEmpresa: '',
      rfc: '',
      contacto: '',
    },
  });

  // Google registration form (no password fields)
  const googleForm = useForm<GoogleRegisterFormData>({
    resolver: zodResolver(googleRegisterSchema),
    defaultValues: {
      nombre: googleName || '',
      email: googleEmail || '',
      nombreEmpresa: '',
      rfc: '',
      contacto: '',
    },
  });

  const spinnerSvg = (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  // Manual registration submit
  const onManualSubmit = async (data: RegisterFormData) => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/register`,
        {
          email: data.email,
          password: data.password,
          nombre: data.nombre,
          nombreEmpresa: data.nombreEmpresa,
          rfc: data.rfc || undefined,
          contacto: data.contacto || undefined,
        },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.status === 200 && response.data.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }

      if (response.data.error) {
        toast({ title: 'Error', description: response.data.error, variant: 'destructive' });
        return;
      }

      toast({ title: 'Error', description: 'Error inesperado al registrarse.', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo conectar con el servidor.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Google registration submit
  const onGoogleSubmit = async (data: GoogleRegisterFormData) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/social-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          nombre: data.nombre,
          provider: googleProvider,
          avatarUrl: googleAvatar || undefined,
          nombreEmpresa: data.nombreEmpresa,
          rfc: data.rfc || undefined,
          contacto: data.contacto || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({ title: 'Error', description: result.error || 'Error al registrarse.', variant: 'destructive' });
        return;
      }

      // Auto-login: use the returned token via credentials provider
      if (result.user && result.token) {
        const signInResult = await signIn('credentials', {
          loginResponse: JSON.stringify(result),
          redirect: false,
        });

        if (signInResult?.ok) {
          router.push('/dashboard');
          return;
        }
      }

      toast({ title: 'Error', description: 'Error al establecer la sesión.', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo conectar con el servidor.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName = (hasError: boolean) =>
    `w-full h-12 px-3.5 border rounded-[10px] text-[15px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
      hasError ? 'border-red-500' : 'border-[#D1D5DB]'
    } disabled:bg-gray-50 disabled:text-gray-500`;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className={`text-[28px] font-bold text-[#0F172A] tracking-tight ${spaceGrotesk.className}`}>
            {isGoogleMode ? 'Completa tu registro' : 'Crea tu cuenta'}
          </h1>
          <p className="text-[15px] text-[#64748B]">
            {isGoogleMode
              ? 'Solo necesitamos los datos de tu empresa'
              : 'Registra tu empresa y comienza gratis'}
          </p>
        </div>

        {isGoogleMode ? (
          /* ═══ Google Registration Form ═══ */
          <form onSubmit={googleForm.handleSubmit(onGoogleSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-[#374151]">Nombre</label>
              <input
                {...googleForm.register('nombre')}
                disabled={submitting}
                className={inputClassName(!!googleForm.formState.errors.nombre)}
              />
              {googleForm.formState.errors.nombre && (
                <p className="text-xs text-red-500">{googleForm.formState.errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-[#374151]">Correo electrónico</label>
              <input
                {...googleForm.register('email')}
                readOnly
                className={`${inputClassName(false)} bg-gray-50 text-gray-500 cursor-not-allowed`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-[#374151]">Nombre de la empresa *</label>
              <input
                {...googleForm.register('nombreEmpresa')}
                placeholder="Mi Empresa S.A. de C.V."
                disabled={submitting}
                className={inputClassName(!!googleForm.formState.errors.nombreEmpresa)}
              />
              {googleForm.formState.errors.nombreEmpresa && (
                <p className="text-xs text-red-500">{googleForm.formState.errors.nombreEmpresa.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-[#374151]">RFC</label>
                <input
                  {...googleForm.register('rfc')}
                  placeholder="Opcional"
                  disabled={submitting}
                  className={inputClassName(!!googleForm.formState.errors.rfc)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-[#374151]">Contacto</label>
                <input
                  {...googleForm.register('contacto')}
                  placeholder="Opcional"
                  disabled={submitting}
                  className={inputClassName(!!googleForm.formState.errors.contacto)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[16px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              {submitting ? (<>{spinnerSvg}Creando cuenta...</>) : 'Completar registro'}
            </button>
          </form>
        ) : (
          /* ═══ Manual Registration Form ═══ */
          <>
            <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-[#374151]">Nombre completo</label>
                <input
                  {...manualForm.register('nombre')}
                  placeholder="Juan Pérez"
                  disabled={submitting}
                  className={inputClassName(!!manualForm.formState.errors.nombre)}
                />
                {manualForm.formState.errors.nombre && (
                  <p className="text-xs text-red-500">{manualForm.formState.errors.nombre.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-[#374151]">Correo electrónico</label>
                <input
                  {...manualForm.register('email')}
                  type="email"
                  placeholder="tu@empresa.com"
                  disabled={submitting}
                  className={inputClassName(!!manualForm.formState.errors.email)}
                />
                {manualForm.formState.errors.email && (
                  <p className="text-xs text-red-500">{manualForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[14px] font-medium text-[#374151]">Contraseña</label>
                  <div className="relative">
                    <input
                      {...manualForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 caracteres"
                      disabled={submitting}
                      className={inputClassName(!!manualForm.formState.errors.password)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {manualForm.formState.errors.password && (
                    <p className="text-xs text-red-500">{manualForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[14px] font-medium text-[#374151]">Confirmar</label>
                  <div className="relative">
                    <input
                      {...manualForm.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repetir"
                      disabled={submitting}
                      className={inputClassName(!!manualForm.formState.errors.confirmPassword)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {manualForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-500">{manualForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-[#374151]">Nombre de la empresa *</label>
                <input
                  {...manualForm.register('nombreEmpresa')}
                  placeholder="Mi Empresa S.A. de C.V."
                  disabled={submitting}
                  className={inputClassName(!!manualForm.formState.errors.nombreEmpresa)}
                />
                {manualForm.formState.errors.nombreEmpresa && (
                  <p className="text-xs text-red-500">{manualForm.formState.errors.nombreEmpresa.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[14px] font-medium text-[#374151]">RFC</label>
                  <input
                    {...manualForm.register('rfc')}
                    placeholder="Opcional"
                    disabled={submitting}
                    className={inputClassName(!!manualForm.formState.errors.rfc)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[14px] font-medium text-[#374151]">Contacto</label>
                  <input
                    {...manualForm.register('contacto')}
                    placeholder="Opcional"
                    disabled={submitting}
                    className={inputClassName(!!manualForm.formState.errors.contacto)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[16px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                {submitting ? (<>{spinnerSvg}Creando cuenta...</>) : 'Crear mi cuenta'}
              </button>
            </form>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#9CA3AF]">o</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              disabled={submitting}
              className="w-full h-12 border border-[#D1D5DB] text-[15px] font-medium text-[#374151] rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>
          </>
        )}

        <p className="text-center text-[14px] text-[#64748B]">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Inicia sesión
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<BrandedLoadingScreen />}>
      <RegisterContent />
    </Suspense>
  );
}
