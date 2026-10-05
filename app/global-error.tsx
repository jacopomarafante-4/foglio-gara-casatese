'use client';
// Confine di errore di tutta l'app (0058): se qualcosa va storto nel layout stesso (raro: di norma basta error.tsx di
// ogni pagina), Next mostra questo al posto di una pagina bianca, e l'errore arriva comunque a Sentry (instrumentation.ts
// lo cattura già per gli altri casi; qui serve mandarlo a mano perché siamo fuori dal layout normale).
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
// global-error sostituisce TUTTO il layout, compreso app/layout.tsx: serve il proprio CSS
import './globals.css';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center font-sans">
        <h1 className="font-display text-2xl font-bold">Qualcosa non ha funzionato</h1>
        <p className="text-grigio">Riprova tra poco. Se continua, fallo sapere all&rsquo;amministratore.</p>
        <button onClick={() => location.reload()} className="bottone">Ricarica la pagina</button>
      </body>
    </html>
  );
}
