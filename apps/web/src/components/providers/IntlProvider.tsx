'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useCompany } from '@/contexts/CompanyContext';
import { getMessages } from '@/i18n/messages';

// Read locale synchronously from localStorage — works on client, returns 'es' on server
function readLocaleFromStorage(): string {
  if (typeof window === 'undefined') return 'es';
  try {
    const stored = localStorage.getItem('company_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.language) return parsed.language;
    }
  } catch { /* ignore */ }
  return 'es';
}

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useCompany();
  // API settings take priority, then localStorage cache
  const locale = settings?.language || readLocaleFromStorage();
  const messages = getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
