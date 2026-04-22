'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { toast } from '@/hooks/useToast';
import { Eye, EyeOff, Monitor, Shield, AlertTriangle } from 'lucide-react';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { Spinner } from '@/components/ui/Spinner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import axios from 'axios';
import { API_CONFIG } from '@/lib/constants';

// Types for login API responses
interface LoginSuccessResponse {
  user: { id: string; email: string; name: string; role: string; onboardingCompleted?: boolean };
  token: string;
  refreshToken: string;
}

interface LoginRequires2FAResponse {
  requires2FA: true;
  tempToken: string;
  sessionConflict: boolean;
  activeDevice: string | null;
  lastActivity: string | null;
  ip: string | null;
}

interface SessionConflictResponse {
  code: 'ACTIVE_SESSION_EXISTS';
  activeDevice: string | null;
  lastActivity: string | null;
  ip: string | null;
  suggest2FA: boolean;
}

type LoginStep = 'credentials' | 'totp' | 'session-conflict';

/** Sanitize backend error messages — never show technical details to the user */
function sanitizeErrorMessage(msg: string | undefined, fallback: string): string {
  if (!msg) return fallback;
  // Block messages that look technical (exception names, stack traces, etc.)
  const technicalPatterns = /Exception|Stack[Tt]race|at\s+\w+\.\w+|NullReference|InvalidOperation|Npgsql|System\.|Microsoft\./;
  if (technicalPatterns.test(msg)) return fallback;
  return msg;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const t = useTranslations('auth');

  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA state
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const totpInputRef = useRef<HTMLInputElement>(null);

  // Session conflict state
  const [conflictInfo, setConflictInfo] = useState<SessionConflictResponse | null>(null);
  const [forcingLogin, setForcingLogin] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<LoginFormData | null>(null);

  const isDisabled = signingIn || navigating || verifying2FA || forcingLogin;

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

  // Check for session_replaced flag and OAuth 2FA redirect on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem('session_replaced') === 'true') {
        sessionStorage.removeItem('session_replaced');
        toast({
          title: t('sessionClosed'),
          description: t('sessionClosedDesc'),
          variant: 'destructive',
        });
      }
    } catch { /* ignore */ }

    // Handle OAuth 2FA redirect — exchange opaque ref for actual temp token
    const requires2FA = searchParams.get('requires2FA');
    const t2faRef = searchParams.get('t2fa_ref');
    if (requires2FA === 'true' && t2faRef) {
      // Clean ref from URL immediately
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('t2fa_ref');
      cleanUrl.searchParams.delete('requires2FA');
      cleanUrl.searchParams.delete('provider');
      window.history.replaceState({}, '', cleanUrl.toString());

      // Exchange ref for actual temp token (one-time use, server-side)
      fetch('/api/auth/exchange-2fa-ref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: t2faRef }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tempToken) {
            setTempToken(data.tempToken);
            setLoginStep('totp');
          }
        })
        .catch(() => {
          toast({ title: t('sessionExpired'), description: t('sessionExpiredDesc'), variant: 'destructive' });
        });
    }

    // Handle OAuth error
    const error = searchParams.get('error');
    if (error === 'AccessDenied') {
      toast({
        title: t('accessDenied'),
        description: t('accessDeniedDesc'),
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  // Auto-focus TOTP input when step changes
  useEffect(() => {
    if (loginStep === 'totp') {
      setTimeout(() => totpInputRef.current?.focus(), 100);
    }
  }, [loginStep]);

  // Direct API call to backend (bypasses NextAuth for initial check)
  const callLoginApi = async (email: string, password: string, recaptchaToken?: string) => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/auth/login`,
      { email, password, recaptchaToken },
      { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
    );
    return { status: response.status, data: response.data };
  };

  // Establish NextAuth session from pre-authenticated tokens
  const establishSession = async (loginResponse: LoginSuccessResponse) => {
    const result = await signIn('credentials', {
      loginResponse: JSON.stringify({ ...loginResponse, rememberMe }),
      redirect: false,
    });

    if (result?.ok) {
      setNavigating(true);
      const callbackUrl = searchParams.get('callbackUrl');
      // Validate callback URL to prevent open redirect (reject protocol-relative URLs like //evil.com)
      const safeCallback = callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : '/dashboard';
      router.push(safeCallback);
    } else {
      toast({
        title: t('sessionError'),
        description: t('sessionErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setSigningIn(true);
    try {
      const recaptchaToken = executeRecaptcha ? await executeRecaptcha('login') : undefined;
      const { status, data: responseData } = await callLoginApi(data.email, data.password, recaptchaToken);

      // Email verification required
      if (status === 200 && responseData.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(responseData.email)}`);
        setSigningIn(false);
        return;
      }

      // Normal success — user + token
      if (status === 200 && responseData.user && responseData.token) {
        await establishSession(responseData as LoginSuccessResponse);
        setSigningIn(false);
        return;
      }

      // 2FA required
      if (status === 200 && responseData.requires2FA) {
        const twoFAData = responseData as LoginRequires2FAResponse;
        setTempToken(twoFAData.tempToken);
        setSavedCredentials(data);

        if (twoFAData.sessionConflict) {
          // 2FA + session conflict — show info in TOTP step
          setConflictInfo({
            code: 'ACTIVE_SESSION_EXISTS',
            activeDevice: twoFAData.activeDevice,
            lastActivity: twoFAData.lastActivity,
            ip: twoFAData.ip,
            suggest2FA: false,
          });
        }
        setLoginStep('totp');
        setSigningIn(false);
        return;
      }

      // Tenant deactivated
      if (responseData.code === 'TENANT_DEACTIVATED') {
        toast({
          title: t('accountDeactivated'),
          description: sanitizeErrorMessage(responseData.message, t('accountDeactivatedDesc')),
          variant: 'destructive',
        });
        setSigningIn(false);
        return;
      }

      // Session conflict (no 2FA)
      if (status === 409 && responseData.code === 'ACTIVE_SESSION_EXISTS') {
        setConflictInfo(responseData as SessionConflictResponse);
        setSavedCredentials(data);
        setLoginStep('session-conflict');
        setSigningIn(false);
        return;
      }

      // Authentication failure
      toast({
        title: t('authError'),
        description: sanitizeErrorMessage(responseData.message, t('invalidCredentials')),
        variant: 'destructive',
      });
      setValue('password', '');
    } catch {
      // Backend unreachable — try NextAuth mock fallback (dev only)
      if (process.env.NODE_ENV === 'development') {
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl: searchParams.get('callbackUrl')?.startsWith('/') ? searchParams.get('callbackUrl')! : '/dashboard',
        });
        if (result?.ok) {
          setNavigating(true);
          const cb = searchParams.get('callbackUrl');
          router.push(cb && cb.startsWith('/') && !cb.startsWith('//') ? cb : '/dashboard');
          return;
        }
      }

      toast({
        title: t('systemError'),
        description: t('systemErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleVerify2FA = async () => {
    const cleanCode = totpCode.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error(t('enter6Digits'));
      return;
    }

    setVerifying2FA(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/verify-2fa`,
        { tempToken, code: cleanCode },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.data?.code === 'TENANT_DEACTIVATED') {
        toast({
          title: t('accountDeactivated'),
          description: response.data.message || t('accountDeactivatedDesc'),
          variant: 'destructive',
        });
        handleBackToCredentials();
      } else if (response.status === 200 && response.data.user && response.data.token) {
        await establishSession(response.data as LoginSuccessResponse);
      } else {
        toast.error(sanitizeErrorMessage(response.data.error, t('invalidCode')));
        setTotpCode('');
        totpInputRef.current?.focus();
      }
    } catch {
      toast.error(t('errorVerifying'));
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleForceLogin = async () => {
    if (!savedCredentials) return;

    setForcingLogin(true);
    try {
      const recaptchaToken = executeRecaptcha ? await executeRecaptcha('force_login') : undefined;
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/force-login`,
        { email: savedCredentials.email, password: savedCredentials.password, recaptchaToken },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.data?.code === 'TENANT_DEACTIVATED') {
        toast({
          title: t('accountDeactivated'),
          description: response.data.message || t('accountDeactivatedDesc'),
          variant: 'destructive',
        });
        handleBackToCredentials();
      } else if (response.status === 200 && response.data.user && response.data.token) {
        await establishSession(response.data as LoginSuccessResponse);
      } else if (response.data.error === '2FA_REQUIRED') {
        toast.error(t('twoFARequired'));
      } else {
        toast.error(sanitizeErrorMessage(response.data.message, t('errorForceLogin')));
      }
    } catch {
      toast.error(t('connectionError'));
    } finally {
      setForcingLogin(false);
    }
  };

  const handleTotpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && totpCode.replace(/\s/g, '').length === 6) {
      handleVerify2FA();
    }
  };

  const handleBackToCredentials = () => {
    setLoginStep('credentials');
    setTotpCode('');
    setTempToken('');
    setConflictInfo(null);
    setSavedCredentials(null);
  };

  const spinnerSvg = <Spinner size="sm" className="-ml-1 mr-2 text-white" />;

  return (
    <>
      <AuthLayout>
        <div className="space-y-7">
          {/* ═══ STEP: Credentials ═══ */}
          {loginStep === 'credentials' && (
            <>
              <div className="space-y-2 text-center auth-animate auth-animate-delay-1">
                <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight">
                  {t('signIn')}
                </h1>
                <p className="text-[15px] text-[#64748B]">
                  {t('signInSubtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5 auth-animate auth-animate-delay-2">
                  <label htmlFor="email" className="block text-[14px] font-medium text-[#374151]">
                    {t('emailLabel')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    {...register('email')}
                    disabled={isDisabled}
                    className={`auth-input w-full h-12 px-3.5 border rounded-[10px] text-[15px] bg-surface-1/50 outline-none ${
                      errors.email ? 'border-red-400 bg-red-50/30' : 'border-[#D1D5DB]'
                    } disabled:bg-surface-1 disabled:text-muted-foreground`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      <FieldError message={errors.email?.message} />
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 auth-animate auth-animate-delay-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-[14px] font-medium text-[#374151]">
                      {t('password')}
                    </label>
                    <a href="/forgot-password" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                      {t('forgotPassword')}
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      disabled={isDisabled}
                      className={`auth-input w-full h-12 px-3.5 pr-10 border rounded-[10px] text-[15px] bg-surface-1/50 outline-none ${
                        errors.password ? 'border-red-400 bg-red-50/30' : 'border-[#D1D5DB]'
                      } disabled:bg-surface-1 disabled:text-muted-foreground`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/70 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      <FieldError message={errors.password?.message} />
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer auth-animate auth-animate-delay-4">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-[18px] h-[18px] rounded border-[#D1D5DB] text-indigo-600 focus:ring-indigo-500 transition-colors"
                  />
                  <span className="text-[14px] text-[#374151]">{t('rememberSession')}</span>
                </label>

                <div className="auth-animate auth-animate-delay-5">
                  <button
                    type="submit"
                    disabled={isDisabled}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[16px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {signingIn ? (<>{spinnerSvg}{t('signingIn')}</>) : t('signInButton')}
                  </button>
                </div>
              </form>

              {/* Separator — gradient fade */}
              <div className="relative auth-animate auth-animate-delay-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full auth-separator" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-surface-2 px-4 text-muted-foreground uppercase tracking-widest text-[11px]">o</span>
                </div>
              </div>

              <div className="auth-animate auth-animate-delay-6">
                <button
                  type="button"
                  onClick={() => {
                    const raw = searchParams.get('callbackUrl');
                    const safe = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
                    signIn('google', { callbackUrl: safe });
                  }}
                  disabled={isDisabled}
                  className="w-full h-12 border border-[#D1D5DB] text-[15px] font-medium text-[#374151] rounded-[10px] hover:bg-surface-1 hover:border-border-strong transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {t('continueWithGoogle')}
                </button>
              </div>

              <p className="text-center text-[14px] text-[#64748B] auth-animate auth-animate-delay-7">
                {t('noAccount')}{' '}
                <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  {t('registerFree')}
                </a>
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div className="p-3 bg-surface-1 rounded-lg border border-border-subtle auth-animate auth-animate-delay-7">
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t('testCredentials')}</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Admin:</span> admin@jeyma.com / test123
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Vendedor:</span> vendedor1@jeyma.com / test123
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ STEP: 2FA TOTP Input ═══ */}
          {loginStep === 'totp' && (
            <>
              <div className="space-y-2 text-center auth-animate auth-animate-delay-1">
                <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight">
                  {t('verification2FA')}
                </h1>
                <p className="text-[15px] text-[#64748B]">
                  {t('verification2FADesc')}
                </p>
              </div>

              {conflictInfo && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg auth-animate auth-animate-delay-2">
                  <div className="flex items-start gap-2">
                    <Monitor className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">{t('activeSessionDetected')}</p>
                      {conflictInfo.activeDevice && (
                        <p className="text-xs mt-1">{t('deviceLabel')}: {conflictInfo.activeDevice}</p>
                      )}
                      {conflictInfo.lastActivity && (
                        <p className="text-xs">{t('lastActivityLabel')}: {conflictInfo.lastActivity}</p>
                      )}
                      <p className="text-xs mt-1">{t('verifyWillCloseOther')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 auth-animate auth-animate-delay-3">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-indigo-600" />
                  </div>

                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTotpCode(val);
                    }}
                    onKeyDown={handleTotpKeyDown}
                    disabled={verifying2FA}
                    className="auth-input w-48 h-14 text-center text-2xl tracking-[0.5em] font-mono border border-[#D1D5DB] rounded-[10px] outline-none disabled:bg-surface-1"
                  />

                  <p className="text-xs text-[#9CA3AF]">{t('codeChanges30s')}</p>
                </div>

                <div className="auth-animate auth-animate-delay-4">
                  <button
                    type="button"
                    onClick={handleVerify2FA}
                    disabled={totpCode.replace(/\s/g, '').length !== 6 || verifying2FA}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[15px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {verifying2FA ? (<>{spinnerSvg}{t('signingIn')}</>) : t('verifyAndContinue')}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="w-full text-sm text-[#64748B] hover:text-[#374151] transition-colors auth-animate auth-animate-delay-5"
                >
                  {t('backToSignIn')}
                </button>
              </div>
            </>
          )}

          {/* ═══ STEP: Session Conflict Dialog ═══ */}
          {loginStep === 'session-conflict' && conflictInfo && (
            <>
              <div className="space-y-3 text-center auth-animate auth-animate-delay-1">
                <div className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                  <Monitor className="h-7 w-7 text-amber-600" />
                </div>
                <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight">
                  {t('activeSession')}
                </h1>
                <p className="text-[14px] text-[#64748B] leading-relaxed">
                  {t('activeSessionDesc', { device: conflictInfo.activeDevice || 'otro dispositivo', time: conflictInfo.lastActivity?.toLowerCase() || '' })}
                </p>
              </div>

              <div className="space-y-4 auth-animate auth-animate-delay-2">
                <button
                  type="button"
                  onClick={handleForceLogin}
                  disabled={forcingLogin}
                  className="w-full h-12 bg-success hover:bg-success/90 text-white text-[15px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {forcingLogin ? (<>{spinnerSvg}{t('connecting')}</>) : t('continueHere')}
                </button>

                <p className="text-xs text-center text-[#94A3B8]">
                  {t('otherSessionClosed')}
                </p>

                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="w-full h-11 text-sm font-medium text-[#64748B] rounded-[10px] hover:bg-surface-1 transition-all active:scale-[0.98]"
                >
                  {t('useOtherAccount')}
                </button>
              </div>
            </>
          )}
        </div>
      </AuthLayout>

      {/* Full-Page Navigation Overlay */}
      {navigating && <BrandedLoadingScreen message={t('preparing')} />}
    </>
  );
}

export default function LoginPage() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Spinner size="lg" className="text-green-600" /></div>}>
        <LoginContent />
      </Suspense>
    </GoogleReCaptchaProvider>
  );
}
