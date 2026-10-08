'use client';
// Stellina dei preferiti: si accende e si spegne subito; se il salvataggio non riesce torna com'era
import { useState, useTransition } from 'react';
import { cambiaPreferito } from '@/app/(app)/preferiti-actions';

export function Stellina({ tipo, id, attiva, grande = false }: { tipo: 'gara' | 'giocatore'; id: string; attiva: boolean; grande?: boolean }) {
  const [on, setOn] = useState(attiva);
  const [, avvia] = useTransition();
  return (
    <button type="button" aria-pressed={on} title={on ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
      aria-label={on ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        const nuovo = !on; setOn(nuovo);
        avvia(async () => { const r = await cambiaPreferito(tipo, id, nuovo).catch(() => ({ ok: false })); if (!r.ok) setOn(!nuovo); });
      }}
      className={`relative z-10 inline-grid flex-none place-items-center rounded-full leading-none transition hover:bg-oro/15 ${grande ? 'size-11 text-3xl' : 'size-8 text-xl'} ${on ? 'text-oro' : 'text-grigio/50'}`}>
      {on ? '★' : '☆'}
    </button>
  );
}
