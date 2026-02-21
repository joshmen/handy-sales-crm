'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { API_CONFIG } from '@/lib/constants';
import { AuthLayout } from '@/components/auth/AuthLayout';

const schema = z.object({
  email: z.string().email('Ingrese un correo válido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
        email: data.email,
      }, {
        headers: { Origin: window.location.origin },
      });
      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {submitted ? (
        /* Success state */
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Revise su correo
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Si el correo está registrado, recibirá un enlace para
            restablecer su contraseña. El enlace expira en 30 minutos.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            No olvide revisar la carpeta de spam.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al login
          </Link>
        </div>
      ) : (
        /* Form state */
        <>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-sm text-gray-500">
              Ingresa tu correo y te enviaremos instrucciones para
              restablecerla.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="tu@empresa.com"
                className="w-full h-12 px-3.5 rounded-[10px] border border-[#D1D5DB] text-[15px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                autoFocus
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[15px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Enviar instrucciones'
              )}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al login
              </Link>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
