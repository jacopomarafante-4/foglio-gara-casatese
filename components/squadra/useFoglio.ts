'use client';
// Foglio della partita in una pagina dell'app: si mostra subito e si salva dopo un attimo (mentre si scrive), solo i campi
// cambiati (aggiornaFoglio), così le altre parti del foglio (formazione, piazzati…) cambiate altrove non si toccano.
import { useRef, useState } from 'react';
import { aggiornaFoglio } from '@/app/(aree)/docs-actions';
import type { FoglioPartita } from '@/lib/foglio';

export function useFoglio(squadraId: string, iniziale: FoglioPartita, soloLettura: boolean) {
  const [foglio, setFoglio] = useState(iniziale);
  const [messaggio, setMessaggio] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendenti = useRef<Record<string, unknown>>({});
  function cambia(campi: Partial<FoglioPartita>, attesa = 700) {
    setFoglio((f) => ({ ...f, ...campi }));
    if (soloLettura) return;
    Object.assign(pendenti.current, campi);
    setMessaggio('Salvataggio…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const c = pendenti.current; pendenti.current = {};
      const r = await aggiornaFoglio(squadraId, c).catch(() => ({ ok: false, errore: 'rete assente' }));
      setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
    }, attesa);
  }
  return { foglio, setFoglio, cambia, messaggio, setMessaggio };
}
