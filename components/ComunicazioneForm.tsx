'use client';
// Modulistica → Comunicazione: modello (gli stessi degli Avvisi, MODELLI_AVVISO), categoria nell'intestazione, titolo, testo
// e firma; PDF su carta intestata (lib/pdf-comunicazione.ts) con una copia nell'Archivio documenti. La bozza resta solo qui.
import '@fontsource/barlow/700.css';
import { useState } from 'react';
import { MODELLI_AVVISO } from '@/lib/condivisi';
import { impaginaComunicazione } from '@/lib/pdf-comunicazione';
import { inBase64, scarica } from '@/lib/pdf-moduli';
import { archiviaPdf } from '@/app/(aree)/modulistica/actions';

const etichetta = 'mb-1 block text-sm font-semibold text-grigio';

export function ComunicazioneForm({ mia, categorie, firma, squadraId, oggi }: {
  mia: string; categorie: string[]; firma: string; squadraId: string | null; oggi: string;
}) {
  const vuota = { modello: 'libero', titolo: '', testo: '', autore: firma, mostraCat: !!mia, categoria: mia };
  const [b, setB] = useState(vuota);
  const [messaggio, setMessaggio] = useState('');
  const cambia = (campi: Partial<typeof b>) => setB({ ...b, ...campi });

  async function pdf() {
    setMessaggio('Preparo il PDF…');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const nome = await impaginaComunicazione(doc, { titolo: b.titolo, testo: b.testo, autore: b.autore, categoria: b.mostraCat ? b.categoria : '', data: oggi });
      const blob = doc.output('blob');
      scarica(nome, blob);
      setMessaggio('PDF pronto');
      archiviaPdf(nome, 'Comunicazione', await inBase64(blob), squadraId).catch(() => { /* il PDF c'è comunque */ });
    } catch {
      setMessaggio('PDF non creato: riprova');
    }
  }

  return (
    <div className="space-y-4">
      <label className="block sm:max-w-xs">
        <span className={etichetta}>Modello</span>
        <select className="campo" value={b.modello} onChange={(e) => {
          const m = MODELLI_AVVISO[e.target.value];
          cambia({ modello: e.target.value, ...(m ? { titolo: m.titolo, testo: m.testo } : {}) });
        }}>
          {Object.entries(MODELLI_AVVISO).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-5" checked={b.mostraCat} onChange={(e) => cambia({ mostraCat: e.target.checked })} />
          Mostra la categoria nell&apos;intestazione
        </label>
        {mia ? <span className="text-sm text-grigio">{mia}</span> : (
          <select className="campo w-auto" aria-label="Categoria nell’intestazione" value={b.categoria} disabled={!b.mostraCat}
            onChange={(e) => cambia({ categoria: e.target.value })}>
            <option value="">Scegli la categoria</option>
            {categorie.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
      </div>

      <label className="block">
        <span className={etichetta}>Titolo</span>
        <input className="campo" value={b.titolo} placeholder="Es. Cambio orario allenamenti" onChange={(e) => cambia({ titolo: e.target.value })} />
      </label>
      <label className="block">
        <span className={etichetta}>Testo</span>
        <textarea className="campo" rows={10} value={b.testo} onChange={(e) => cambia({ testo: e.target.value })} />
        <span className="mt-1 block text-sm text-grigio">Riga vuota = nuovo paragrafo; righe che iniziano con “- ” o “1.” = elenco.</span>
      </label>
      <label className="block">
        <span className={etichetta}>Firma</span>
        <input className="campo" value={b.autore} placeholder="Es. Il responsabile del settore giovanile" onChange={(e) => cambia({ autore: e.target.value })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="bottone" onClick={pdf} disabled={!b.testo.trim()}>Scarica PDF</button>
        <button className="rounded-lg border border-linea bg-white px-4 py-2 font-semibold hover:border-blu" onClick={() => setB(vuota)}>Svuota</button>
      </div>

      {messaggio && (
        <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {messaggio}
        </p>
      )}
    </div>
  );
}
