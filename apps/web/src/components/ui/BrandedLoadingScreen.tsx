'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface BrandedLoadingScreenProps {
  message?: string;
}

export function BrandedLoadingScreen({ message }: BrandedLoadingScreenProps) {
  const tc = useTranslations('common');
  const resolvedMessage = message ?? tc('loading');
  const [displayMessage, setDisplayMessage] = useState(resolvedMessage);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('impersonation-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.isImpersonating && parsed?.state?.tenant?.name) {
          setDisplayMessage(tc('accessingTenant', { name: parsed.state.tenant.name }));
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    setDisplayMessage(resolvedMessage);
  }, [resolvedMessage, tc]);

  // Loader minimal (Claude Design): fondo neutro + tile con el logo + un anillo delgado
  // girando en el color de marca. `--company-primary-color` lo setea el script inline en
  // <head> (disponible antes de hidratar); el fondo usa --background y respeta dark mode.
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-[18px]"
      style={{ background: 'var(--background, #ffffff)' }}
    >
      <div className="relative h-16 w-16">
        {/* Tile con el logo de la marca */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-card shadow-sm ring-1 ring-border">
          <img src="/logo-icon.svg" alt="Handy Suites" className="h-9 w-9" />
        </div>
        {/* Anillo girando en el color de marca */}
        <svg
          viewBox="0 0 64 64"
          className="absolute -inset-2 h-20 w-20 animate-spin"
          style={{ animationDuration: '1.1s' }}
        >
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="none"
            stroke="var(--company-primary-color, #0176D3)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="48 140"
            opacity="0.6"
          />
        </svg>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{displayMessage}</span>
    </div>
  );
}
