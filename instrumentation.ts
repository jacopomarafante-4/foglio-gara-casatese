// Avviso errori in produzione: carica la configurazione di Sentry giusta per il runtime (server o edge/proxy.ts) e
// manda a Sentry anche gli errori che Next cattura da solo (pagine, Server Actions, Route Handler). Vedi instrumentation-client.ts.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}

export const onRequestError = Sentry.captureRequestError;
