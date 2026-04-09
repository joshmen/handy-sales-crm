'use client';

import { useTranslations } from 'next-intl';

/** Renders a Zod error message, translating it if it's a formValidation key */
export function FieldError({ message }: { message?: string }) {
  const tv = useTranslations('formValidation');
  if (!message) return null;

  // If message has no spaces, treat it as a translation key
  const translated = !message.includes(' ')
    ? (() => { try { return tv(message); } catch { return message; } })()
    : message;

  return <p className="text-red-500 text-xs mt-1">{translated}</p>;
}
