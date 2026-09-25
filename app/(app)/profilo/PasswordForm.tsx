'use client';

import { useActionState } from 'react';
import { cambiaPassword, type StatoForm } from '@/app/auth/actions';

export function PasswordForm() {
  const [stato, azione, inCorso] = useActionState<StatoForm, FormData>(cambiaPassword, {});

  return (
    <form action={azione} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nuova password</span>
        <input className="campo" type="password" name="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Ripeti la nuova password</span>
        <input className="campo" type="password" name="conferma" autoComplete="new-password" minLength={8} required />
      </label>
      {stato.errore && (
        <p role="alert" className="rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">{stato.errore}</p>
      )}
      {stato.ok && (
        <p role="status" className="rounded-md bg-blu/10 px-3 py-2 text-sm text-blu">{stato.ok}</p>
      )}
      <button type="submit" className="bottone" disabled={inCorso}>
        {inCorso ? 'Salvataggio…' : 'Cambia password'}
      </button>
    </form>
  );
}
