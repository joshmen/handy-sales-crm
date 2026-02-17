'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Space_Grotesk } from 'next/font/google';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { toast } from '@/hooks/useToast';
import { Eye, EyeOff } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const isDisabled = signingIn || navigating;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setSigningIn(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: searchParams.get('callbackUrl') || '/dashboard',
      });

      if (result?.error) {
        toast({
          title: 'Error de autenticación',
          description: 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.',
          variant: 'destructive',
        });
        setValue('password', '');
        setSigningIn(false);
      } else if (result?.ok) {
        setSigningIn(false);
        setNavigating(true);
        toast({
          title: 'Bienvenido',
          description: 'Iniciando sesión...',
          variant: 'default',
        });
        router.push(searchParams.get('callbackUrl') || '/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error del sistema',
        description: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
      console.error('Login error:', error);
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ===== LEFT: Brand Panel (desktop) ===== */}
      <div className="hidden md:flex md:w-1/2 bg-[#16A34A] items-center justify-center p-16">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className={`text-[#16A34A] font-bold text-xl ${spaceGrotesk.className}`}>H</span>
            </div>
            <span className={`text-white text-4xl font-bold ${spaceGrotesk.className}`}>
              HandySales
            </span>
          </div>
          <p className="text-white/80 text-lg">
            Tu CRM de ventas inteligente
          </p>
        </div>
      </div>

      {/* ===== Mobile Brand Header (< md) ===== */}
      <div className="flex md:hidden bg-[#16A34A] px-6 py-8 items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className={`text-[#16A34A] font-bold text-lg ${spaceGrotesk.className}`}>H</span>
          </div>
          <span className={`text-white text-2xl font-bold ${spaceGrotesk.className}`}>
            HandySales
          </span>
        </div>
      </div>

      {/* ===== RIGHT: Form Panel ===== */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 md:px-16 lg:px-[120px]">
        <div className="w-full max-w-[480px] space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <h1 className={`text-[28px] font-bold text-[#111827] ${spaceGrotesk.className}`}>
              Iniciar Sesión
            </h1>
            <p className="text-sm text-[#6B7280]">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-[#374151]">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@jeyma.com"
                {...register('email')}
                disabled={isDisabled}
                className={`w-full h-11 px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] outline-none transition-colors ${
                  errors.email ? 'border-red-500' : 'border-[#D1D5DB]'
                } disabled:bg-gray-50 disabled:text-gray-500`}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-[#374151]">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isDisabled}
                  className={`w-full h-11 px-3.5 py-2.5 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] outline-none transition-colors ${
                    errors.password ? 'border-red-500' : 'border-[#D1D5DB]'
                  } disabled:bg-gray-50 disabled:text-gray-500`}
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
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-[18px] h-[18px] rounded border-[#D1D5DB] text-[#16A34A] focus:ring-[#16A34A]"
                />
                <span className="text-[13px] text-[#374151]">Recordarme</span>
              </label>
              <a href="#" className="text-[13px] font-medium text-[#2563EB] hover:text-blue-700">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full h-11 bg-[#16A34A] hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {signingIn ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Contact Row */}
          <div className="flex items-center justify-center gap-1">
            <span className="text-[13px] text-[#6B7280]">¿No tienes cuenta?</span>
            <a
              href="mailto:ventas@handysales.com"
              className="text-[13px] font-medium text-[#2563EB] hover:text-blue-700"
            >
              Contactar ventas
            </a>
          </div>

          {/* Dev credentials */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Credenciales de prueba:</p>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Admin:</span> admin@jeyma.com / test123
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Vendedor:</span> vendedor1@jeyma.com / test123
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Full-Page Navigation Overlay ===== */}
      {navigating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#16A34A]">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className={`text-[#16A34A] font-bold text-xl ${spaceGrotesk.className}`}>H</span>
              </div>
              <span className={`text-white text-4xl font-bold ${spaceGrotesk.className}`}>
                HandySales
              </span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-white/90 text-sm">Preparando tu escritorio...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#16A34A] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <span className="text-[#111827] text-2xl font-bold">HandySales</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
