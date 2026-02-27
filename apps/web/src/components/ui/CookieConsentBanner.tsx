'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'cookie-consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Small delay so it doesn't flash on page load
        const timer = setTimeout(() => setVisible(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available (SSR, private mode, etc.)
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    } catch {
      // Ignore localStorage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] transform transition-transform duration-300 ease-out animate-in slide-in-from-bottom"
    >
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <p className="text-[13px] sm:text-[14px] text-gray-600 flex-1">
              Usamos cookies para mejorar tu experiencia. Al continuar navegando, aceptas nuestro uso de cookies conforme a nuestro{' '}
              <Link href="/privacidad" className="text-indigo-600 hover:text-indigo-700 underline">
                Aviso de Privacidad
              </Link>.
            </p>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Link
                href="/privacidad"
                className="flex-1 sm:flex-none text-center px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Saber mas
              </Link>
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none text-center px-5 py-2 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
