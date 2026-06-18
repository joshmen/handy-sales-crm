'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { cn } from '@/lib/utils';
import { callLoginApi, establishSession, callRegisterApi } from '@/lib/auth-client';

export type AuthTab = 'login' | 'registro';

interface Props {
  open: boolean;
  tab: AuthTab;
  onClose: () => void;
  onTab: (t: AuthTab) => void;
}

// Mismas reglas que el backend (UsuarioRegisterDtoValidator, OWASP): 12+ con minúscula, mayúscula y dígito.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export default function LandingAuthModal({ open, tab, onClose, onTab }: Props) {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const modalRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lEmail, setLEmail] = useState('');
  const [lPassword, setLPassword] = useState('');
  const [rNegocio, setRNegocio] = useState('');
  const [rNombre, setRNombre] = useState('');
  const [rTel, setRTel] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPassword, setRPassword] = useState('');

  // Focus trap + foco inicial + restauración + bloqueo de scroll del body + Escape.
  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const node = modalRef.current;
    const SEL = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(SEL) ?? []).filter((el) => el.offsetParent !== null);

    const t = window.setTimeout(() => focusables()[0]?.focus(), 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    const sbw = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  const google = () => signIn('google', { callbackUrl: '/dashboard' });

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = executeRecaptcha ? await executeRecaptcha('login') : undefined;
      const { status, data } = await callLoginApi(lEmail.trim(), lPassword, token);
      if (status === 200 && data.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email || lEmail)}`);
        return;
      }
      if (status === 200 && data.user && data.token) {
        const { ok } = await establishSession(data);
        if (ok) {
          router.push('/dashboard');
          return;
        }
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
        return;
      }
      // 2FA o sesión activa: el flujo completo vive en /login
      if ((status === 200 && data.requires2FA) || (status === 409 && data.code === 'ACTIVE_SESSION_EXISTS')) {
        router.push(`/login?email=${encodeURIComponent(lEmail)}`);
        return;
      }
      setError(data.error || 'Correo o contraseña incorrectos.');
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!PASSWORD_RE.test(rPassword)) {
      setError('La contraseña debe tener 12+ caracteres, con mayúscula, minúscula y número.');
      return;
    }
    setLoading(true);
    try {
      const token = executeRecaptcha ? await executeRecaptcha('register') : undefined;
      const { status, data } = await callRegisterApi(
        {
          email: rEmail.trim(),
          password: rPassword,
          nombre: rNombre.trim(),
          nombreEmpresa: rNegocio.trim(),
          contacto: rTel.trim() || undefined,
        },
        token,
      );
      if (data.error) {
        setError(data.error);
        return;
      }
      if (status === 200) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email || rEmail)}`);
        return;
      }
      if (status === 400) {
        // FluentValidation devuelve un diccionario por campo (sin .error). Aplanar el primer mensaje.
        const dict = data as Record<string, unknown>;
        const first = Object.values(dict)
          .flat()
          .find((v) => typeof v === 'string') as string | undefined;
        setError(first || 'Revisa los datos e intenta de nuevo.');
        return;
      }
      setError('No se pudo crear la cuenta. Intenta de nuevo.');
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-scrim"
      data-open={open ? '' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="hsl-auth-title">
        <button className="auth-close" aria-label="Cerrar" onClick={onClose}>
          ✕
        </button>
        <div className="auth-tabs" role="tablist" aria-label="Acceso">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={cn(tab === 'login' && 'on')}
            onClick={() => {
              setError('');
              onTab('login');
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'registro'}
            className={cn(tab === 'registro' && 'on')}
            onClick={() => {
              setError('');
              onTab('registro');
            }}
          >
            Crear cuenta
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={submitLogin}>
            <div className="auth-h">
              <h3 id="hsl-auth-title">Bienvenido de vuelta</h3>
              <p>Entra a tu cuenta de Handy Suites.</p>
            </div>
            <div className="auth-sso">
              <button type="button" className="s" onClick={google}>
                Continuar con Google
              </button>
            </div>
            <div className="auth-or">o con tu correo</div>
            {error && <div className="auth-err" role="alert">{error}</div>}
            <div className="fld">
              <label htmlFor="hsl-l-email">Correo</label>
              <input id="hsl-l-email" type="email" required autoComplete="email" placeholder="tu@empresa.com" value={lEmail} onChange={(e) => setLEmail(e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="hsl-l-pass">Contraseña</label>
              <input id="hsl-l-pass" type="password" required autoComplete="current-password" placeholder="••••••••" value={lPassword} onChange={(e) => setLPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-pri" style={{ width: '100%', marginTop: 6 }} disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
            <p className="auth-foot">
              ¿Olvidaste tu contraseña? <a href="/forgot-password">Recupérala</a>
            </p>
          </form>
        ) : (
          <form onSubmit={submitRegister}>
            <div className="auth-h">
              <h3 id="hsl-auth-title">Da de alta tu negocio</h3>
              <p>14 días gratis. Sin tarjeta.</p>
            </div>
            <div className="auth-sso">
              <button type="button" className="s" onClick={google}>
                Continuar con Google
              </button>
            </div>
            <div className="auth-or">o con tu correo</div>
            {error && <div className="auth-err" role="alert">{error}</div>}
            <div className="fld">
              <label htmlFor="hsl-r-negocio">Nombre del negocio</label>
              <input id="hsl-r-negocio" type="text" required placeholder="Tu negocio" value={rNegocio} onChange={(e) => setRNegocio(e.target.value)} />
            </div>
            <div className="fld2">
              <div className="fld">
                <label htmlFor="hsl-r-nombre">Tu nombre</label>
                <input id="hsl-r-nombre" type="text" required placeholder="Nombre y apellido" value={rNombre} onChange={(e) => setRNombre(e.target.value)} />
              </div>
              <div className="fld">
                <label htmlFor="hsl-r-tel">Teléfono</label>
                <input id="hsl-r-tel" type="tel" placeholder="+52 …" value={rTel} onChange={(e) => setRTel(e.target.value)} />
              </div>
            </div>
            <div className="fld">
              <label htmlFor="hsl-r-email">Correo de trabajo</label>
              <input id="hsl-r-email" type="email" required autoComplete="email" placeholder="tu@empresa.com" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="hsl-r-pass">Contraseña</label>
              <input id="hsl-r-pass" type="password" required autoComplete="new-password" placeholder="12+ con mayúscula, minúscula y número" value={rPassword} onChange={(e) => setRPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-pri" style={{ width: '100%', marginTop: 6 }} disabled={loading}>
              {loading ? 'Creando…' : 'Crear cuenta gratis'}
            </button>
            <p className="auth-foot">
              Al crear tu cuenta aceptas los <a href="/terminos">Términos</a> y el <a href="/privacidad">Aviso de privacidad</a>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
