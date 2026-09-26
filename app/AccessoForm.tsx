'use client';

import { useActionState, useEffect } from 'react';
import { accedi, type StatoAccesso } from '@/app/auth/actions';

export function AccessoForm({ next }: { next?: string }) {
  const [stato, azione, inCorso] = useActionState<StatoAccesso, FormData>(accedi, {});
  const admin = stato.passo === 'admin';

  // Pagina completa: il Portale squadre non fa parte del router di Next
  useEffect(() => {
    if (stato.vai) window.location.assign(stato.vai);
  }, [stato.vai]);

  return (
    <form action={azione} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      {admin ? (
        // Il form si svuota dopo ogni invio: il PIN admin torna dallo stato
        <input type="hidden" name="pin" value={stato.pin ?? ''} />
      ) : (
        <label className="block">
          <span className="sr-only">PIN</span>
          <input
            className="campo h-16 rounded-2xl border-2 bg-carta text-center font-display text-4xl tracking-[0.4em] placeholder:text-grigio/40 focus:bg-white"
            type="password"
            name="pin"
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
            aria-label="PIN"
            required
            autoFocus
          />
        </label>
      )}

      {admin && (
        <>
          <p className="text-grigio">PIN amministratore corretto. Ora accedi con email e password.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input className="campo" type="email" name="email" autoComplete="email" required autoFocus />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input className="campo" type="password" name="password" autoComplete="current-password" required />
          </label>
        </>
      )}

      {stato.errore && (
        <p role="alert" className="rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">
          {stato.errore}
        </p>
      )}
      <button type="submit" className="bottone h-14 w-full rounded-2xl text-lg" disabled={inCorso || Boolean(stato.vai)}>
        {inCorso || stato.vai ? 'Accesso in corso…' : 'Entra'}
      </button>
      {admin && (
        <button type="button" className="w-full text-sm font-medium text-grigio" onClick={() => window.location.reload()}>
          ← Non sei l’admin? Torna al PIN
        </button>
      )}
    </form>
  );
}
