// Avviso errori in produzione: cattura gli errori del browser e li manda a Sentry (sentry.io), un'email appena
// ne arriva uno nuovo. NEXT_PUBLIC_SENTRY_DSN su Vercel (prod+preview); senza non fa niente (nessun errore, solo silenzio).
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,   // solo errori, niente tracing delle prestazioni (non serve qui)
});
