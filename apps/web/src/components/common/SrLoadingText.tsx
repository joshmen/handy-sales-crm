'use client';

import { useEffect, useState } from 'react';

/**
 * Screen-reader-only loading text that respects the user's language preference.
 * Designed for use in Suspense fallbacks and other contexts outside IntlProvider.
 * Reads the language from localStorage (same source as CompanyContext).
 */
export function SrLoadingText() {
  const [text, setText] = useState('Loading...');

  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem('company_settings') || '{}');
      if (settings.language !== 'en') {
        setText('Cargando...');
      }
    } catch {
      // Default to English
    }
  }, []);

  return <span className="sr-only">{text}</span>;
}
