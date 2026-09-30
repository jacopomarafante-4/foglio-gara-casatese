'use client';
// Squadra → Partite → Foglio gara (come viewPdf del Portale): anteprima delle pagine, "Mostra la categoria" (sheet.senzaCategoria)
// e "Scarica PDF"; una copia va nell'Archivio documenti.
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import { useEffect, useRef, useState } from 'react';
import { creaFoglioGara, pagineFoglioGara, schemiScelti, type DatiFoglioGara, type FoglioGara as Foglio } from '@/lib/pdf-foglio-gara';
import { scarica } from '@/lib/pdf-moduli';
import { archiviaPdf } from '@/app/(aree)/modulistica/actions';
import { Messaggio } from '@/components/calendario/salvataggio';
import { useFoglio } from './useFoglio';

export function FoglioGara(p: Omit<DatiFoglioGara, 'categoria'> & { squadraId: string; categoria: string; soloLettura: boolean; linkFormazione: string; linkPiazzati: string }) {
  const u = useFoglio(p.squadraId, p.foglio, p.soloLettura), { cambia, messaggio, setMessaggio } = u, foglio = u.foglio as Foglio;
  const [anteprima, setAnteprima] = useState('Preparo l’anteprima…');
  const box = useRef<HTMLDivElement>(null);
  const dati: DatiFoglioGara = { ...p, foglio, categoria: foglio.senzaCategoria ? '' : foglio.category || p.categoria };
  const chiave = JSON.stringify([foglio.senzaCategoria]);
  const sel = schemiScelti(foglio, p.schemi).length;

  useEffect(() => {
    let annullato = false;
    pagineFoglioGara(dati).then((pagine) => {
      if (annullato || !box.current) return;
      box.current.replaceChildren(...pagine.map((c, i) => {
        c.setAttribute('aria-label', `Pagina ${i + 1}`);
        c.className = 'block h-auto w-full rounded-lg border border-linea bg-white shadow-sm';
        return c;
      }));
      setAnteprima('');
    }).catch(() => setAnteprima('Anteprima non riuscita: ricarica la pagina'));
    return () => { annullato = true; };
    // l'anteprima cambia solo con la casella della categoria (il resto arriva dalle altre schede, ricaricando)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  async function scaricaPdf() {
    setMessaggio('Creo il PDF…');
    try {
      const { nome, blob } = await creaFoglioGara(dati);
      scarica(nome, blob); setMessaggio('PDF pronto');
      archiviaPdf(nome, 'Foglio gara', blob, p.squadraId).catch(() => { /* il PDF c'è comunque */ });
    } catch { setMessaggio('PDF non creato: riprova'); }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3 rounded-xl border border-linea bg-white p-4">
        <p className="text-sm text-grigio">
          A4 orizzontale: prima pagina con distinta e formazione, poi una pagina per ogni schema scelto ({sel}).
          Titolari e panchina si cambiano in <a className="font-semibold text-blu underline" href={p.linkFormazione}>Formazione</a>, gli
          schemi in <a className="font-semibold text-blu underline" href={p.linkPiazzati}>Piazzati</a>.
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-5" disabled={p.soloLettura} checked={!foglio.senzaCategoria}
            onChange={(e) => cambia({ senzaCategoria: !e.target.checked }, 0)} />
          Mostra la categoria nell&apos;intestazione
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="bottone" onClick={scaricaPdf}>Scarica PDF</button>
          <Messaggio testo={messaggio} />
        </div>
      </div>
      {anteprima && <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">{anteprima}</p>}
      <div ref={box} className="grid gap-4" aria-label="Anteprima del foglio gara" />
    </section>
  );
}
