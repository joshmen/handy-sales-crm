/** @type {import('next').NextConfig} */

// Dominios padre permitidos para embeber el widget (iframe). En prod, configurar
// WIDGET_FRAME_ANCESTORS con los dominios de la landing (ej. "https://handysuites.com").
const FRAME_ANCESTORS =
  process.env.WIDGET_FRAME_ANCESTORS ||
  "'self' http://localhost:1083 http://localhost:3000";

const CHATBOT_URL = process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:1054';
const RECAPTCHA = 'https://www.google.com https://www.gstatic.com';

// CSP propia del widget: permite el embed (frame-ancestors) y el canal al chatbot
// (connect-src para fetch/SSE). NO se fija X-Frame-Options (rompería el iframe).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${RECAPTCHA}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${CHATBOT_URL} https://www.google.com`,
  `frame-src ${RECAPTCHA}`,
  `frame-ancestors ${FRAME_ANCESTORS}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
