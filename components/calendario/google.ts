'use client';
// Calendari Google (MERATE, CERNUSCO, TRASFERTA) dalle pagine dell'app: /api/calendario-google riconosce da solo chi chiama
// (sessione di admin e direttori, tessera dell'organizzativo). Dopo una modifica si aspetta qualche secondo (si sta ancora
// scrivendo), poi un solo invio per partita o evento; l'id dell'evento Google torna indietro e si salva nella voce.
import { useRef } from 'react';
import type { Evento, Partita } from '@/lib/programma';

async function chiama(azione: string, dati: Record<string, unknown> = {}) {
  const r = await fetch('/api/calendario-google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ azione, ...dati }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore || 'Errore con Google Calendar');
  return j;
}

export function useGoogle(attivo: boolean, avvisa: (testo: string) => void) {
  const attesa = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dopo = (chiave: string, fn: () => Promise<void>) => {
    if (!attivo) return;
    clearTimeout(attesa.current[chiave]);
    attesa.current[chiave] = setTimeout(() => { fn().catch((e) => avvisa('Google Calendar: ' + e.message)); }, 4000);
  };
  return {
    partita(squadra: string, m: Partita, gcal: (g: { gcal: string; gcalCal: string }) => void) {
      if (!m.friendly || m.garaId || !m.date) return;
      dopo('p:' + m.id, async () => {
        const j = await chiama('partita', { squadra, partita: m });
        if (j.gcal !== m.gcal || j.gcalCal !== m.gcalCal) gcal(j);
        avvisa('Salvato anche su Google');
      });
    },
    evento(ev: Evento, gcal: (g: { gcal: string; gcalCal: string }) => void) {
      if (!ev.data) return;
      dopo('e:' + ev.id, async () => {
        const j = await chiama('evento', { evento: ev });
        if (j.gcal !== ev.gcal || j.gcalCal !== ev.gcalCal) gcal(j);
        avvisa('Salvato anche su Google');
      });
    },
    cancella(x: { id?: string; gcal?: string; gcalCal?: string }) {
      clearTimeout(attesa.current['p:' + x.id]); clearTimeout(attesa.current['e:' + x.id]);
      if (!x.gcal || !x.gcalCal) return;
      dopo('c:' + x.gcal, async () => { await chiama('cancella', { gcal: x.gcal, gcalCal: x.gcalCal }); avvisa('Tolto anche da Google'); });
    },
    importa: () => chiama('importa') as Promise<{ partite: number; squadre: { aggiunte: number; aggiornate: number; tolte: number }[] }>,
    /** all'apertura: rilegge Google se sono passati 30 minuti dall'ultima volta (se no `saltato`) */
    auto: () => chiama('auto') as Promise<{ saltato?: string; squadre?: { aggiunte: number; aggiornate: number; tolte: number }[] }>,
  };
}
