import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Copia dei PDF nell'archivio (archiviaPdf) e documenti delle famiglie: i file passano dall'azione del server.
    // Su Vercel una richiesta non supera comunque 4,5 MB
    serverActions: { bodySizeLimit: '4.5mb' },
  },
  // Il vecchio Portale squadre (public/portale/, JavaScript senza build) è spento: tutte le sue schede sono pagine dell'app.
  // Chi apre un vecchio indirizzo o segnalibro va alla Home (senza accesso, il proxy lo manda al PIN). In public/portale/
  // restano solo gli stemmi usati dalle pagine e dai PDF.
  async redirects() {
    return ['/portale', '/portale/', '/portale/index.html', '/portale/js/:file*', '/portale/css/:file*']
      .map((source) => ({ source, destination: '/inizio', permanent: false }));
  },
};

export default nextConfig;
