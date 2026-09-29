'use client';
// Calendario → Avvisi: per una o più squadre (nessuna = tutta la società), solo nell'app: li vedono i mister nella Home e le
// famiglie (per 14 giorni). Niente WhatsApp. Li pubblicano ed eliminano admin, direttori e organizzativo (shared/avvisi);
// ogni avviso si può scaricare in PDF su carta intestata, anche prima di pubblicarlo.
import '@fontsource/barlow/700.css';
import { useState } from 'react';
import { MODELLI_AVVISO } from '@/lib/condivisi';
import { fmtData, siglaSquadra, type SquadraCal } from '@/lib/programma';
import { nuovoId, squadreTesto } from '@/lib/calendario-portale';
import { impaginaComunicazione } from '@/lib/pdf-comunicazione';
import { inBase64, scarica } from '@/lib/pdf-moduli';
import { archiviaPdf } from '@/app/(aree)/modulistica/actions';
import { Messaggio, useSalva } from './salvataggio';

export type Avviso = { id: string; data: string; squadre: string[]; titolo: string; testo: string; autore: string };
type Bozza = { modello: string; squadre: string[]; titolo: string; testo: string };
const vuota: Bozza = { modello: 'libero', squadre: [], titolo: '', testo: '' };
const etichetta = 'mb-1 block text-sm font-semibold text-grigio';

export function Avvisi({ avvisi: iniziali, squadre, autore, oggi, bozzaIniziale }: {
  avvisi: Avviso[]; squadre: SquadraCal[]; autore: string; oggi: string; bozzaIniziale: Bozza | null;
}) {
  const [avvisi, setAvvisi] = useState(iniziali);
  const [b, setB] = useState<Bozza>(bozzaIniziale ?? vuota);
  const { salva, messaggio, setMessaggio } = useSalva();
  const elenco = avvisi.slice().sort((x, y) => (y.data || '').localeCompare(x.data || ''));

  function pubblica() {
    const a: Avviso = { id: nuovoId('av'), data: oggi, squadre: [...b.squadre], titolo: b.titolo.trim(), testo: b.testo.trim(), autore };
    if (!a.testo) return;
    setAvvisi((l) => [...l, a]); setB(vuota);
    salva('shared/avvisi', [{ lista: 'items', id: a.id, voce: a }], 0);
  }
  function elimina(a: Avviso) {
    if (!confirm('Eliminare questo avviso?')) return;
    setAvvisi((l) => l.filter((x) => x.id !== a.id));
    salva('shared/avvisi', [{ lista: 'items', id: a.id, voce: null }], 0);
  }
  async function pdf(a: { titolo: string; testo: string; squadre: string[]; data: string; autore: string }) {
    setMessaggio('Preparo il PDF…');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      /* categoria nell'intestazione: la squadra, se è una sola */
      const categoria = a.squadre.length === 1 ? squadre.find((t) => t.id === a.squadre[0])?.category || '' : '';
      const nome = await impaginaComunicazione(doc, { titolo: a.titolo, testo: a.testo, autore: a.autore || 'La società', categoria, data: a.data });
      const blob = doc.output('blob');
      scarica(nome, blob); setMessaggio('PDF pronto');
      archiviaPdf(nome, 'Comunicazione', await inBase64(blob), a.squadre.length === 1 ? a.squadre[0] : null).catch(() => { /* il PDF c'è comunque */ });
    } catch {
      setMessaggio('PDF non creato: riprova');
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Nuovo avviso</h2>
        <p className="max-w-prose text-sm text-grigio">
          Scegli le squadre (nessuna = tutta la società) e un modello, completa il testo. “Pubblica” lo mette nell’app: nella Home dei
          mister e delle famiglie delle squadre scelte. “Scarica come PDF” lo prepara su carta intestata (anche senza pubblicarlo).
        </p>
        <div>
          <p className={etichetta}>Squadre</p>
          <div className="flex flex-wrap gap-1.5">
            {squadre.map((t) => {
              const on = b.squadre.includes(t.id);
              return <button key={t.id} aria-pressed={on} onClick={() => setB({ ...b, squadre: on ? b.squadre.filter((x) => x !== t.id) : [...b.squadre, t.id] })}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`}>{siglaSquadra(t)}</button>;
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label><span className={etichetta}>Modello</span>
            <select className="campo" value={b.modello} onChange={(e) => {
              const m = MODELLI_AVVISO[e.target.value];
              setB({ ...b, modello: e.target.value, ...(m && (m.testo || !b.testo.trim()) ? { titolo: m.titolo, testo: m.testo } : {}) });
            }}>{Object.entries(MODELLI_AVVISO).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
          </label>
          <label><span className={etichetta}>Titolo</span>
            <input className="campo" placeholder="Es. Cambio campo U12" value={b.titolo} onChange={(e) => setB({ ...b, titolo: e.target.value })} /></label>
        </div>
        <label className="block"><span className={etichetta}>Testo</span>
          <textarea className="campo" rows={6} placeholder="Scrivi l'avviso. Le parti tra [ ] vanno completate." value={b.testo} onChange={(e) => setB({ ...b, testo: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2">
          <button className="bottone" disabled={!b.testo.trim()} onClick={pubblica}>Pubblica avviso</button>
          <button className="rounded-lg border border-linea bg-white px-4 py-2 font-semibold hover:border-blu" onClick={() => pdf({ ...b, data: oggi, autore: autore || 'La società' })}>Scarica come PDF</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">Avvisi pubblicati</h2>
        {elenco.length === 0 && <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun avviso.</p>}
        {elenco.map((a) => (
          <div key={a.id} className="rounded-xl border border-l-4 border-linea border-l-[#6B3FA0] bg-white p-3">
            <p className="text-sm text-grigio">{[fmtData(a.data), squadreTesto(a.squadre, squadre), a.autore].filter(Boolean).join(' · ')}</p>
            {a.titolo && <b className="mt-0.5 block">{a.titolo}</b>}
            <p className="whitespace-pre-line">{a.testo}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-blu" onClick={() => pdf(a)}>Scarica PDF</button>
              <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-rosso hover:bg-rosso/5" onClick={() => elimina(a)}>Elimina</button>
            </div>
          </div>
        ))}
      </section>
      <Messaggio testo={messaggio} />
    </div>
  );
}
