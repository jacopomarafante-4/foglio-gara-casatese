import type { NextConfig } from "next";

// Intestazioni di sicurezza su tutte le pagine. Il browser parla solo col sito e con Supabase (dati e file);
// Google Calendar si chiama dal server, Google Maps sono solo link. Next ha bisogno degli script in linea ('unsafe-inline');
// in sviluppo anche di 'unsafe-eval' (ricarica a caldo).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseWs = supabase.replace(/^https:/, 'wss:');
const sviluppo = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${sviluppo ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs}`.trim(),
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
const SICUREZZA = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  experimental: {
    // Copia dei PDF nell'archivio (archiviaPdf) e documenti delle famiglie: i file passano dall'azione del server.
    // Su Vercel una richiesta non supera comunque 4,5 MB
    serverActions: { bodySizeLimit: '4.5mb' },
  },
  // Il vecchio Portale squadre (public/portale/, JavaScript senza build) è spento: tutte le sue schede sono pagine dell'app.
  // Chi apre un vecchio indirizzo o segnalibro va alla Home (senza accesso, il proxy lo manda al PIN). In public/portale/
  // restano solo gli stemmi usati dalle pagine e dai PDF.
  async headers() {
    return [{ source: '/:path*', headers: SICUREZZA }];
  },
  async redirects() {
    return ['/portale', '/portale/', '/portale/index.html', '/portale/js/:file*', '/portale/css/:file*']
      .map((source) => ({ source, destination: '/inizio', permanent: false }));
  },
};

export default nextConfig;
