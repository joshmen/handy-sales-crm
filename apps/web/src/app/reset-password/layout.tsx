import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña',
  description: 'Establece una nueva contraseña para tu cuenta de Handy Suites.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
