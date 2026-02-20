'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Space_Grotesk } from 'next/font/google';
import { toast } from '@/hooks/useToast';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import axios from 'axios';
import { API_CONFIG } from '@/lib/constants';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no email param
  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setCode(newCode);

    // Focus the next empty input or the last one
    const nextEmpty = newCode.findIndex((c) => !c);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const fullCode = code.join('');

  const handleVerify = useCallback(async () => {
    if (fullCode.length !== 6 || verifying) return;

    setVerifying(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/verify-email`,
        { email, code: fullCode },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.status === 200 && response.data.user && response.data.token) {
        // Auto-login with the returned token
        const signInResult = await signIn('credentials', {
          loginResponse: JSON.stringify(response.data),
          redirect: false,
        });

        if (signInResult?.ok) {
          setNavigating(true);
          router.push('/dashboard');
          return;
        }

        toast({ title: 'Error', description: 'No se pudo establecer la sesión.', variant: 'destructive' });
      } else {
        const errorMsg = response.data?.error || 'Código inválido o expirado.';
        toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo conectar con el servidor.', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  }, [fullCode, verifying, email, router]);

  const handleResend = async () => {
    if (resending || countdown > 0) return;

    setResending(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/resend-verification`,
        { email },
        { timeout: API_CONFIG.TIMEOUT, validateStatus: () => true }
      );

      if (response.status === 200) {
        toast({ title: 'Código reenviado', description: 'Revisa tu bandeja de entrada.' });
        setCountdown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        toast({ title: 'Error', description: response.data?.error || 'No se pudo reenviar el código.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo conectar con el servidor.', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  const spinnerSvg = (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  if (!email) return null;

  return (
    <>
      <AuthLayout>
        <div className="space-y-7">
          <div className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h1 className={`text-[28px] font-bold text-[#0F172A] tracking-tight ${spaceGrotesk.className}`}>
              Verifica tu correo
            </h1>
            <p className="text-[15px] text-[#64748B]">
              Enviamos un código de 6 dígitos a
            </p>
            <p className="text-[15px] font-medium text-[#0F172A]">{email}</p>
          </div>

          {/* OTP Input - 6 individual boxes */}
          <div className="flex justify-center gap-3">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={verifying}
                className="w-12 h-14 text-center text-2xl font-mono border border-[#D1D5DB] rounded-[10px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={fullCode.length !== 6 || verifying}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[16px] font-semibold rounded-[10px] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
          >
            {verifying ? (<>{spinnerSvg}Verificando...</>) : 'Verificar'}
          </button>

          <div className="space-y-3 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-[14px] font-medium text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {countdown > 0
                ? `Reenviar código en ${countdown}s`
                : resending
                  ? 'Reenviando...'
                  : 'Reenviar código'}
            </button>

            <div>
              <a
                href="/register"
                className="inline-flex items-center gap-1 text-[14px] text-[#64748B] hover:text-[#374151] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cambiar correo
              </a>
            </div>
          </div>
        </div>
      </AuthLayout>

      {navigating && <BrandedLoadingScreen message="Preparando tu escritorio..." />}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<BrandedLoadingScreen />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
