'use client';
// Salvataggio delle modifiche del calendario: si mostrano subito e si mandano al server dopo un attimo (mentre si scrive),
// voce per voce (modificaDoc). Più modifiche allo stesso documento nell'attesa partono insieme.
import { useRef, useState } from 'react';
import { modificaDoc } from '@/app/(aree)/docs-actions';
import type { Modifica } from '@/lib/modifiche';

export function useSalva() {
  const [messaggio, setMessaggio] = useState('');
  const timer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendenti = useRef<Record<string, Map<string, Modifica>>>({});

  /** Mette in coda le modifiche di un documento; `attesa` 0 = subito (aggiunte ed eliminazioni) */
  function salva(path: string, modifiche: Modifica[], attesa = 700) {
    const coda = (pendenti.current[path] ??= new Map());
    modifiche.forEach((m) => coda.set(`${m.lista}|${m.id}`, m));
    setMessaggio('Salvataggio…');
    clearTimeout(timer.current[path]);
    timer.current[path] = setTimeout(async () => {
      const tutte = [...(pendenti.current[path]?.values() ?? [])]; delete pendenti.current[path];
      const r = await modificaDoc(path, tutte).catch(() => ({ ok: false, errore: 'rete assente' }));
      setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
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
