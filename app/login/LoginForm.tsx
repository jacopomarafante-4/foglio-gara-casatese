'use client';

import { useActionState } from 'react';
import { accedi, type StatoForm } from '@/app/auth/actions';

export function LoginForm({ next }: { next?: string }) {
  const [stato, azione, inCorso] = useActionState<StatoForm, FormData>(accedi, {});

  return (
    <form action={azione} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input className="campo" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Password</span>
        <input className="campo" type="password" name="password" autoComplete="current-password" required />
      </label>
      {stato.errore && (
        <p role="alert" className="rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">
          {stato.errore}
        </p>
      )}
      <button type="submit" className="bottone w-full" disabled={inCorso}>
        {inCorso ? 'Accesso in corso…' : 'Accedi'}
      </button>
    </form>
  );
}
