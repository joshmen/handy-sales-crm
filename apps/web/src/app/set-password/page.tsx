'use client';
import { FieldError } from '@/components/forms/FieldError';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { API_CONFIG } from '@/lib/constants';
import { AuthLayout } from '@/components/auth/AuthLayout';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Missing params
  if (!token || !email) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Enlace inválido
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          El enlace de invitación es inválido o ha expirado.
          Contacta al administrador de tu empresa para recibir una nueva invitación.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-[10px] hover:from-green-700 hover:to-green-800 transition-all shadow-sm"
        >
          Ir al Login
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/set-password`,
        { email, token, password: data.password },
        { validateStatus: () => true }
      );

      if (response.status === 200 && response.data.message) {
        setSuccess(true);
      } else {
        setError(
          response.data?.error ||
            'Error al establecer la contraseña. El enlace puede haber expirado.'
        );
      }
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ¡Cuenta lista!
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Tu contraseña ha sido establecida exitosamente. Ya puedes iniciar
          sesión con tu cuenta.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-[10px] hover:from-green-700 hover:to-green-800 transition-all shadow-sm"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Bienvenido a Handy Suites
        </h2>
        <p className="text-sm text-gray-500">
          Crea tu contraseña para la cuenta{' '}
          <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Mínimo 8 caracteres"
              className="w-full h-12 px-3.5 pr-10 rounded-[10px] border border-[#D1D5DB] text-[15px] focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">
              <FieldError message={errors.password?.message} />
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Repite la contraseña"
              className="w-full h-12 px-3.5 pr-10 rounded-[10px] border border-[#D1D5DB] text-[15px] focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">
              <FieldError message={errors.confirmPassword?.message} />
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-[15px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Crear mi contraseña'
          )}
        </button>
      </form>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>}>
        <SetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
