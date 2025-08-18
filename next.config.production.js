/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de performance
  // swcMinify: true,
  compress: true,
  poweredByHeader: false,

  reactStrictMode: true,

  // IMPORTANTE: Configuración para resolver módulos correctamente
  // Esto ayuda con los problemas de case sensitivity en producción
  webpack: (config, { isServer, dev }) => {
    // Resolver módulos de forma más permisiva
    config.resolve = {
      ...config.resolve,
      // Agregar extensiones para búsqueda de archivos
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      // Alias para paths absolutos
      alias: {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, './src'),
        '@/components': require('path').resolve(__dirname, './src/components'),
        '@/hooks': require('path').resolve(__dirname, './src/hooks'),
        '@/lib': require('path').resolve(__dirname, './src/lib'),
        '@/types': require('path').resolve(__dirname, './src/types'),
        '@/styles': require('path').resolve(__dirname, './src/styles'),
        '@/stores': require('path').resolve(__dirname, './src/stores'),
      },
      // Permitir resolver index files automáticamente
      mainFiles: ['index', 'index.ts', 'index.tsx', 'index.js', 'index.jsx'],
    };

    // Para desarrollo, configuraciones adicionales
    if (dev) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          net: false,
          tls: false,
          fs: false,
        };
      }
    }

    // En producción, ser más explícito con la resolución
    if (!dev) {
      config.resolve.symlinks = false;
      // Esto ayuda con problemas de case sensitivity
      config.resolve.caseSensitive = false;
    }

    return config;
  },

  // Configuración para trabajar con el backend .NET
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_API_URL || "https://localhost:7153/api"
        }/:path*`,
      },
    ];
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      // CORS para el API
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },

  // Configuración de imágenes
  images: {
    domains: [
      "localhost",
      "res.cloudinary.com",
      "images.unsplash.com",
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Configuración de TypeScript y ESLint
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configuración experimental
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Esto puede ayudar con la resolución de módulos
    optimizePackageImports: ['@/components', '@/hooks', '@/lib'],
  },

  // Variables de entorno que se exponen al cliente
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },

  // Transpile packages si es necesario
  transpilePackages: [],
};

module.exports = nextConfig;
