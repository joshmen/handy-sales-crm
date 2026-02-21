'use client';

import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { ShieldOff } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export default function TenantSuspendedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#16A34A] rounded-xl flex items-center justify-center">
            <span className={`text-white font-bold text-lg ${spaceGrotesk.className}`}>H</span>
          </div>
          <span className={`text-[#111827] text-2xl font-bold ${spaceGrotesk.className}`}>
            Handy Suites
          </span>
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-red-500" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className={`text-2xl font-bold text-[#111827] ${spaceGrotesk.className}`}>
            Cuenta Desactivada
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Su empresa ha sido desactivada por el administrador del sistema.
            Si cree que esto es un error, contacte al soporte técnico.
          </p>
        </div>

        {/* Contact info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-left space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Soporte</p>
          <p className="text-sm text-gray-700">
            Email: <a href="mailto:soporte@handysuites.com" className="text-blue-600 hover:underline">soporte@handysuites.com</a>
          </p>
        </div>

        {/* Back to login */}
        <button
          onClick={() => router.push('/login')}
          className="w-full h-11 bg-[#16A34A] hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Volver al Inicio de Sesión
        </button>
      </div>
    </div>
  );
}
