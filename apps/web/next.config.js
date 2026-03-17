const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    runtimeCaching: [
      {
        // App shell (HTML pages)
        urlPattern: /^https?:\/\/.*\/(dashboard|clients|orders|products|settings|deliveries|visits|routes|subscription|integrations).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "app-pages",
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        // API calls — network first, exclude auth/sensitive endpoints
        urlPattern: /^https?:\/\/.*\/api\/(?!auth|proxy\/auth).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        // Static assets (images, fonts, icons)
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico|woff2?)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 128, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // JS/CSS bundles
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de performance
  output: "standalone", // Optimizado para Vercel/Docker (smaller bundle, faster cold starts)
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
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
          {
            key: process.env.NODE_ENV === "development"
              ? "Content-Security-Policy-Report-Only"
              : "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://accounts.google.com https://www.google.com https://www.gstatic.com https://js.stripe.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:* https://*.railway.app https://accounts.google.com https://www.google.com https://www.gstatic.com https://res.cloudinary.com wss: ws:",
              "frame-src 'self' https://accounts.google.com https://www.google.com https://js.stripe.com https://*.stripe.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      // CORS para el API
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXTAUTH_URL || "http://localhost:1083" },
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
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

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
      allowedOrigins: [
        "localhost:1083",
        "handy-sales-crm.vercel.app",
        "handysuites.com",
        "www.handysuites.com",
      ],
    },
  },

  // Suprimir warnings de hidratación causados por extensiones del navegador
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Variables de entorno que se exponen al cliente
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },

  // Webpack configuration para ignorar advertencias de certificados SSL en desarrollo
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }

    return config;
  },
};

module.exports = withPWA(nextConfig);
