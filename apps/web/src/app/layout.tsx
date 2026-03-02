import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
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
                    if (settings.primaryColor) {
                      document.documentElement.style.setProperty('--company-primary-color', settings.primaryColor);
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
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-700 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-indigo-500"
        >
          Saltar al contenido principal
        </a>
        <ClientProviders>{children}</ClientProviders>
        <CookieConsentBanner />
      </body>
    </html>
  );
}
