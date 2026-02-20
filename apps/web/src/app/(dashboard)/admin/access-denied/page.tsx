'use client';

import Link from 'next/link';
import { ShieldWarning, ArrowLeft, Buildings } from '@phosphor-icons/react';

export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 max-w-lg w-full">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <ShieldWarning size={32} className="text-amber-600" weight="duotone" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Acceso no disponible
        </h1>
        <p className="text-gray-500 mb-2">
          La página que intentaste acceder no está disponible para tu rol.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          Como Super Admin, debes impersonar una empresa para acceder a sus datos.
          Dirígete a <strong>Empresas</strong> y selecciona la empresa que deseas gestionar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/system-dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Ir al Dashboard
          </Link>
          <Link
            href="/admin/tenants"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Buildings size={18} />
            Ver Empresas
          </Link>
        </div>
      </div>
    </div>
  );
}
