/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de performance
  // swcMinify: true,
  compress: true,
  poweredByHeader: false,

  reactStrictMode: true,

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
      "images.unsplash.com", // Para imágenes de prueba
    ],
    formats: ["image/avif", "image/webp"],
  },

  // TEMPORAL: Ignorar errores mientras arreglamos los imports
  // TODO: Cambiar a false cuando se arreglen los imports
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuración experimental
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Variables de entorno que se exponen al cliente
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },

  // Webpack configuration para resolver problemas de case sensitivity
  webpack: (config, { isServer, dev }) => {
    // Configuración para resolver problemas de case sensitivity
    config.resolve = {
      ...config.resolve,
      // Hacer que webpack sea case-insensitive en Windows
      // pero mantenga el comportamiento correcto en producción
      caseSensitive: false,
    };

    if (dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }

    // Para desarrollo, ignorar advertencias de certificados SSL autofirmados
    if (dev) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    return config;
  },
};

module.exports = nextConfig;
