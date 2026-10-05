'use client';
// Salvataggio delle modifiche (presenze, tabellini, calendario, avvisi…): si mostrano subito, si scrivono sul telefono
// (lib/coda-offline.ts) e si mandano al server dopo un attimo (mentre si scrive), voce per voce (modificaDoc). Senza rete
// restano sul telefono e partono da sole quando torna (InviaInSospeso).
import { useRef, useState } from 'react';
import type { Modifica } from '@/lib/modifiche';
import { accoda, invia } from '@/lib/coda-offline';

export const SENZA_RETE = 'Senza rete: salvato sul telefono, parte da solo quando torna la rete';

export function useSalva() {
  const [messaggio, setMessaggio] = useState('');
  const timer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /** Mette in coda le modifiche di un documento; `attesa` 0 = subito (aggiunte ed eliminazioni) */
  function salva(path: string, modifiche: Modifica[], attesa = 700) {
    accoda(path, modifiche);
    setMessaggio('Salvataggio…');
    clearTimeout(timer.current[path]);
    timer.current[path] = setTimeout(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) { setMessaggio(SENZA_RETE); return; }
      const r = await invia(path);
      setMessaggio(!r.rete ? SENZA_RETE : r.errore ? `Non salvato: ${r.errore}` : 'Salvato');
    }, attesa);
  }
  return { salva, messaggio, setMessaggio };
}

export function Messaggio({ testo }: { testo: string }) {
  if (!testo) return null;
  return (
    <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">
      {testo}
    </p>
  );
}
