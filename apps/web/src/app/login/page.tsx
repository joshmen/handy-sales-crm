'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Space_Grotesk } from 'next/font/google';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { toast } from '@/hooks/useToast';
import { Eye, EyeOff, Monitor, Shield, AlertTriangle } from 'lucide-react';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import axios from 'axios';
import { API_CONFIG } from '@/lib/constants';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

// Types for login API responses
interface LoginSuccessResponse {
  user: { id: string; email: string; name: string; role: string };
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [navigating, setNavigating] = useState(false);

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
          title: 'Sesión cerrada',
          description: 'Tu sesión fue cerrada porque se inició sesión en otro dispositivo.',
          variant: 'destructive',
        });
      }
    } catch { /* ignore */ }

    // Handle OAuth 2FA redirect: ?requires2FA=true&tempToken=xxx
    const requires2FA = searchParams.get('requires2FA');
    const token = searchParams.get('tempToken');
    if (requires2FA === 'true' && token) {
      setTempToken(token);
      setLoginStep('totp');
    }

    // Handle OAuth error
    const error = searchParams.get('error');
    if (error === 'AccessDenied') {
      toast({
        title: 'Acceso denegado',
        description: 'Tu cuenta de correo no está registrada en el sistema. Contacta al administrador.',
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
  const callLoginApi = async (email: string, password: string) => {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/auth/login`,
      { email, password },
      { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
    );
    return { status: response.status, data: response.data };
  };

  // Establish NextAuth session from pre-authenticated tokens
  const establishSession = async (loginResponse: LoginSuccessResponse) => {
    const result = await signIn('credentials', {
      loginResponse: JSON.stringify(loginResponse),
      redirect: false,
    });

    if (result?.ok) {
      setNavigating(true);
      router.push(searchParams.get('callbackUrl') || '/dashboard');
    } else {
      toast({
        title: 'Error de sesión',
        description: 'No se pudo establecer la sesión. Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setSigningIn(true);
    try {
      const { status, data: responseData } = await callLoginApi(data.email, data.password);

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
        title: 'Error de autenticación',
        description: responseData.message || 'Email o contraseña incorrectos.',
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
          callbackUrl: searchParams.get('callbackUrl') || '/dashboard',
        });
        if (result?.ok) {
          setNavigating(true);
          router.push(searchParams.get('callbackUrl') || '/dashboard');
          return;
        }
      }

      toast({
        title: 'Error del sistema',
        description: 'No se pudo conectar con el servidor. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleVerify2FA = async () => {
    const cleanCode = totpCode.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      toast.error('Ingresa un código de 6 dígitos');
      return;
    }

    setVerifying2FA(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/verify-2fa`,
        { tempToken, code: cleanCode },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.status === 200 && response.data.user && response.data.token) {
        await establishSession(response.data as LoginSuccessResponse);
      } else {
        toast.error(response.data.error || 'Código inválido. Intenta nuevamente.');
        setTotpCode('');
        totpInputRef.current?.focus();
      }
    } catch {
      toast.error('Error al verificar código');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleForceLogin = async () => {
    if (!savedCredentials) return;

    setForcingLogin(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/force-login`,
        { email: savedCredentials.email, password: savedCredentials.password },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.status === 200 && response.data.user && response.data.token) {
        await establishSession(response.data as LoginSuccessResponse);
      } else if (response.data.error === '2FA_REQUIRED') {
        toast.error('Este usuario tiene 2FA activado. Usa tu código de autenticación.');
      } else {
        toast.error(response.data.message || 'Error al forzar inicio de sesión');
      }
    } catch {
      toast.error('Error de conexión');
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

          {/* ═══ STEP: Credentials ═══ */}
          {loginStep === 'credentials' && (
            <>
              <div className="space-y-2">
                <h1 className={`text-[28px] font-bold text-[#111827] ${spaceGrotesk.className}`}>
                  Iniciar Sesión
                </h1>
                <p className="text-sm text-[#6B7280]">
                  Ingresa tus credenciales para acceder
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      Verificando...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>

              {/* Social login separator + buttons */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E7EB]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[#9CA3AF]">o continúa con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: searchParams.get('callbackUrl') || '/dashboard' })}
                disabled={isDisabled}
                className="w-full h-11 border border-[#D1D5DB] text-sm font-medium text-[#374151] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </button>

              <div className="flex items-center justify-center gap-1">
                <span className="text-[13px] text-[#6B7280]">¿No tienes cuenta?</span>
                <a
                  href="mailto:ventas@handysales.com"
                  className="text-[13px] font-medium text-[#2563EB] hover:text-blue-700"
                >
                  Contactar ventas
                </a>
              </div>

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
            </>
          )}

          {/* ═══ STEP: 2FA TOTP Input ═══ */}
          {loginStep === 'totp' && (
            <>
              <div className="space-y-2">
                <h1 className={`text-[28px] font-bold text-[#111827] ${spaceGrotesk.className}`}>
                  Verificación 2FA
                </h1>
                <p className="text-sm text-[#6B7280]">
                  Ingresa el código de 6 dígitos de tu app de autenticación
                </p>
              </div>

              {/* Session conflict info banner (if applicable) */}
              {conflictInfo && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Monitor className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Sesión activa detectada</p>
                      {conflictInfo.activeDevice && (
                        <p className="text-xs mt-1">Dispositivo: {conflictInfo.activeDevice}</p>
                      )}
                      {conflictInfo.lastActivity && (
                        <p className="text-xs">Última actividad: {conflictInfo.lastActivity}</p>
                      )}
                      <p className="text-xs mt-1">Al verificar tu código, se cerrará la sesión anterior.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-[#16A34A]" />
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
                    className="w-48 h-14 text-center text-2xl tracking-[0.5em] font-mono border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] outline-none disabled:bg-gray-50"
                  />

                  <p className="text-xs text-[#9CA3AF]">El código cambia cada 30 segundos</p>
                </div>

                <button
                  type="button"
                  onClick={handleVerify2FA}
                  disabled={totpCode.replace(/\s/g, '').length !== 6 || verifying2FA}
                  className="w-full h-11 bg-[#16A34A] hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {verifying2FA ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    'Verificar y continuar'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="w-full text-sm text-[#6B7280] hover:text-[#374151] transition-colors"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </>
          )}

          {/* ═══ STEP: Session Conflict Dialog ═══ */}
          {loginStep === 'session-conflict' && conflictInfo && (
            <>
              <div className="space-y-2">
                <h1 className={`text-[28px] font-bold text-[#111827] ${spaceGrotesk.className}`}>
                  Sesión activa
                </h1>
                <p className="text-sm text-[#6B7280]">
                  Ya tienes una sesión abierta en otro dispositivo
                </p>
              </div>

              <div className="space-y-6">
                {/* Active session info */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#111827]">
                        {conflictInfo.activeDevice || 'Dispositivo desconocido'}
                      </p>
                      {conflictInfo.lastActivity && (
                        <p className="text-xs text-[#6B7280]">
                          Última actividad: {conflictInfo.lastActivity}
                        </p>
                      )}
                      {conflictInfo.ip && (
                        <p className="text-xs text-[#6B7280]">IP: {conflictInfo.ip}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2FA suggestion */}
                {conflictInfo.suggest2FA && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">
                        Activa la autenticación de dos factores (2FA) en Configuración &gt; Seguridad para proteger tu cuenta.
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      Al continuar, la sesión en el otro dispositivo se cerrará inmediatamente.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleForceLogin}
                    disabled={forcingLogin}
                    className="w-full h-11 bg-[#16A34A] hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {forcingLogin ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Iniciando sesión...
                      </>
                    ) : (
                      'Cerrar sesión anterior e iniciar aquí'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="w-full h-11 border border-[#D1D5DB] text-sm font-medium text-[#374151] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== Full-Page Navigation Overlay ===== */}
      {navigating && <BrandedLoadingScreen message="Preparando tu escritorio..." />}
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
