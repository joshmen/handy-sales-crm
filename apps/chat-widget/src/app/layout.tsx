import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Handy Suites · Chat widget',
  description: 'Widget de chat de la landing de Handy Suites',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
