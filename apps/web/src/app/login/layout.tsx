import { Metadata } from 'next';
import { cookies } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = store.get('NEXT_LOCALE')?.value || 'es';
  return {
    title: locale === 'en' ? 'Sign In' : 'Iniciar Sesión',
    description: locale === 'en'
      ? 'Sign in to Handy Suites to manage your business.'
      : 'Inicia sesión en Handy Suites para gestionar tu negocio.',
    robots: { index: false, follow: false },
  };
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
