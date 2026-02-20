'use client';

import { useEffect, useState } from 'react';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

interface BrandedLoadingScreenProps {
  message?: string;
}

export function BrandedLoadingScreen({ message = 'Cargando...' }: BrandedLoadingScreenProps) {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('impersonation-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.isImpersonating && parsed?.state?.tenant?.name) {
          setDisplayMessage(`Accediendo a ${parsed.state.tenant.name}...`);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    setDisplayMessage(message);
  }, [message]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#16A34A]">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
            <span className={`text-[#16A34A] font-bold text-xl ${spaceGrotesk.className}`}>H</span>
          </div>
          <span className={`text-white text-4xl font-bold ${spaceGrotesk.className}`}>
            HandySales
          </span>
        </div>
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-white/90 text-sm">{displayMessage}</span>
        </div>
      </div>
    </div>
  );
}
