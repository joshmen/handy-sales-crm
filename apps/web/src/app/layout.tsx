import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
import { ErrorListener } from "@/components/ErrorListener";
import "@/lib/suppress-hydration-warnings";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.handysuites.com"),
  title: {
    default: "Handy Suites® — La plataforma todo-en-uno para tu negocio",
    template: "%s | Handy Suites®",
  },
  description:
    "Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en México. Certificado SAT CFDI 4.0.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Handy Suites",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Handy Suites®",
    title: "Handy Suites® — La plataforma todo-en-uno para tu negocio",
    description:
      "Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en México.",
    images: [
      {
        url: "/images/hero-dashboard.png",
        width: 1200,
        height: 630,
        alt: "Handy Suites — Sistema de Gestión Empresarial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Handy Suites® — La plataforma todo-en-uno para tu negocio",
    description:
      "Gestiona clientes, ventas, rutas, inventario y facturación desde un solo lugar. Diseñado para PYMEs en México.",
    images: ["/images/hero-dashboard.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#16a34a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('handy-suites-theme') || localStorage.getItem('handy-crm-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                  
                  // Cargar configuración de empresa si existe
                  var companySettings = localStorage.getItem('company_settings');
                  if (companySettings) {
                    var settings = JSON.parse(companySettings);
                    var pc = settings.companyPrimaryColor || settings.primaryColor;
                    if (pc && /^#[0-9a-fA-F]{6}$/.test(pc) && pc !== '#007bff') {
                      document.documentElement.style.setProperty('--company-primary-color', pc);
                      // Convert hex to HSL for design tokens
                      var r = parseInt(pc.slice(1,3),16)/255, g = parseInt(pc.slice(3,5),16)/255, b = parseInt(pc.slice(5,7),16)/255;
                      var max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min, h=0, s=0, l=(max+min)/2;
                      if(d>0){s=d/(1-Math.abs(2*l-1));if(max===r)h=60*((g-b)/d%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}
                      if(h<0)h+=360;
                      var hsl = Math.round(h)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%';
                      document.documentElement.style.setProperty('--primary', hsl);
                      document.documentElement.style.setProperty('--success', hsl);
                      document.documentElement.style.setProperty('--ring', hsl);
                    }
                  }
                } catch (e) {
                  // Si localStorage no está disponible, usar valores por defecto
                  document.documentElement.classList.add('light');
                  document.documentElement.style.setProperty('--company-primary-color', '#16a34a');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <a
          id="skip-link"
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-700 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-indigo-500"
        >
          Skip to main content
        </a>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('company_settings')||'{}');if(s.language!=='en'){document.getElementById('skip-link').textContent='Saltar al contenido principal';}}catch(e){}`,
          }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientProviders>{children}</ClientProviders>
        </NextIntlClientProvider>
        <ErrorListener />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
