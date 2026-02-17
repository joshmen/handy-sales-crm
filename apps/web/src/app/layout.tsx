import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import "@/lib/suppress-hydration-warnings";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Handy CRM - Sistema de Gestión de Ventas",
  description: "Sistema completo de gestión de ventas, rutas e inventario",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('handy-crm-theme');
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
                      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
                    }
                    if (settings.secondaryColor) {
                      document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
                    }
                  }
                } catch (e) {
                  // Si localStorage no está disponible, usar valores por defecto
                  document.documentElement.classList.add('light');
                  document.documentElement.style.setProperty('--primary-color', '#3B82F6');
                  document.documentElement.style.setProperty('--secondary-color', '#8B5CF6');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
