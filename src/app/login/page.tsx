'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Eye, EyeOff, LogIn } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('from') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa tu email y contraseña',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await signIn('credentials', {
        email,
        password,
        redirect: true, // <- clave
        callbackUrl: searchParams.get('callbackUrl') || '/dashboard',
      });
      // No hagas router.push/replace ni refresh aquí.
    } catch {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al iniciar sesión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">H</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">HandySales CRM</h1>
          <p className="text-gray-600">Ingresa a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              className="w-full"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="ml-2 text-sm text-gray-600">Recordarme</span>
            </label>
            <a href="#" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white py-2.5"
          >
            {loading ? (
              <>
                <Loading className="mr-2" />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Necesitas acceso?{' '}
            <a
              href="mailto:ventas@handysales.com"
              className="font-medium text-teal-600 hover:text-teal-700"
            >
              Contacta a ventas
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Sistema exclusivo para clientes con membresía activa
          </p>
        </div>

        {/* Credenciales de demo para desarrollo */}
        {process.env.NODE_ENV === 'development' ||
          process.env.ALLOW_DEV_LOGIN === 'true' ||
          process.env.VERCEL_ENV === 'preview' ||
          (process.env.VERCEL_ENV === 'production' && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Credenciales de prueba:</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Admin:</span> admin@handysales.com / admin123
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Vendedor:</span> vendedor@handysales.com /
                  vendedor123
                </p>
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
