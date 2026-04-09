import es from '../../messages/es.json';
import en from '../../messages/en.json';

const messages: Record<string, typeof es> = { es, en };

export function getMessages(locale: string) {
  return messages[locale] || messages.es;
}

export type Messages = typeof es;
