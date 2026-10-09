'use client';

import { STATI, type StatoGiocatore } from '@/lib/tipi';
import { spostaStato } from '@/app/(app)/giocatori/actions';

/* Cambio rapido dello stato dall'elenco Giocatori (admin e direttori): si sceglie e si salva subito */
export default function StatoRapido({ id, stato, ritorno }: { id: string; stato: StatoGiocatore; ritorno: string }) {
  return (
    <form action={spostaStato}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ritorno" value={ritorno} />
      <select
        name="stato"
        defaultValue={stato}
        aria-label="Cambia stato"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-linea bg-white px-2 py-0.5 text-xs font-semibold text-blu hover:border-blu"
      >
        {Object.entries(STATI).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </form>
  );
}
