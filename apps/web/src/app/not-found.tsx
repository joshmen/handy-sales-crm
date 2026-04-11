import { FileQuestion, Home } from 'lucide-react';
import { cookies } from 'next/headers';

const texts = {
  en: {
    title: 'Page not found',
    description: 'The page you are looking for does not exist or has been moved.',
    button: 'Go to Dashboard',
  },
  es: {
    title: 'Página no encontrada',
    description: 'La página que buscas no existe o fue movida.',
    button: 'Ir al Dashboard',
  },
};

export default async function NotFound() {
  const store = await cookies();
  const locale = (store.get('NEXT_LOCALE')?.value || 'es') as keyof typeof texts;
  const t = texts[locale] || texts.es;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-gray-300">404</h1>
          <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          {t.button}
        </a>
      </div>
    </div>
  );
}
