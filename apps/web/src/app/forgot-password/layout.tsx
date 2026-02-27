import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recuperar Contraseña',
  description: 'Recupera el acceso a tu cuenta de Handy Suites.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
