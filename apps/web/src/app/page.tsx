import { Metadata } from 'next';
import Script from 'next/script';
import { Figtree } from 'next/font/google';
import HandyLanding from '@/components/landing/HandyLanding';
import './landing.css';

// Origen del widget "Preguntale a Handy" (app propia). En prod: dominio Vercel del widget.
const WIDGET_URL = process.env.NEXT_PUBLIC_WIDGET_URL || 'http://localhost:1084';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Handy Suites® | La plataforma todo-en-uno para tu negocio',
  description:
    'Pedidos, cobranza, rutas y facturación CFDI 4.0 en una sola plataforma. Vende en la calle y cobra hoy. Diseñado para PYMEs en Latinoamérica.',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Handy Suites',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en Latinoamérica.',
  url: 'https://app.handysuites.com',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'MXN',
    lowPrice: '499',
    highPrice: '1499',
    offerCount: '3',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Handy Suites',
    url: 'https://handysuites.com',
  },
};

export default function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className={figtree.variable}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HandyLanding />
      {/* Widget del bot: loader aislado por iframe, carga diferida (sin regresion de CWV). */}
      <Script src={`${WIDGET_URL}/embed.js`} strategy="lazyOnload" />
    </main>
  );
}
