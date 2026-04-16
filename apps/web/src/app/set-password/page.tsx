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
import { useTranslations } from 'next-intl';

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const t = useTranslations('setPassword');

  const schema = z
    .object({
      password: z.string().min(8, t('minChars')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });

  type FormData = z.infer<typeof schema>;

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
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t('invalidLink')}
        </h2>
        <p className="text-sm text-foreground/70 mb-6">
          {t('invalidLinkDesc')}
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-[10px] hover:from-green-700 hover:to-green-800 transition-all shadow-sm"
        >
          {t('goToLogin')}
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
            t('errorSettingPassword')
        );
      }
    } catch {
      setError(t('couldNotConnect'));
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
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t('accountReady')}
        </h2>
        <p className="text-sm text-foreground/70 mb-6">
          {t('accountReadyDesc')}
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-[10px] hover:from-green-700 hover:to-green-800 transition-all shadow-sm"
        >
          {t('signIn')}
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
        <h2 className="text-xl font-bold text-foreground mb-1">
          {t('welcomeTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('createPasswordFor')}{' '}
          <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            {t('passwordLabel')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder={t('minChars')}
              className="w-full h-12 px-3.5 pr-10 rounded-[10px] border border-[#D1D5DB] text-[15px] focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/70"
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
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            {t('confirmPasswordLabel')}
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder={t('repeatPasswordPlaceholder')}
              className="w-full h-12 px-3.5 pr-10 rounded-[10px] border border-[#D1D5DB] text-[15px] focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/70"
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
            t('createMyPassword')
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
