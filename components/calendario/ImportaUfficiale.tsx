'use client';
// Calendario → Tutte le squadre → "Calendario ufficiale (PDF)" (admin e direttori): si sceglie il PDF del campionato (LND o
// delegazione), si guarda l'anteprima (categoria, gironi, nostre partite, società nuove, dubbi) e si importa. Le gare vanno nello
// Scouting, le nostre partite nel calendario della squadra di quella categoria. Le gare già confermate o variate da un comunicato
// non si toccano. Il PDF si rimanda a ogni passaggio e si rilegge sul server (app/(aree)/calendari/ufficiale-actions.ts).
import { useState } from 'react';
import { anteprimaUfficiale, importaUfficiale, type Anteprima, type Importato } from '@/app/(aree)/calendari/ufficiale-actions';

const giorno = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

export function ImportaUfficiale() {
  const [aperto, setAperto] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState('');
  const [prova, setProva] = useState<Anteprima | null>(null);
  const [fatto, setFatto] = useState<Importato | null>(null);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState('');

  const modulo = (f: File, cat: string) => {
    const fd = new FormData(); fd.set('file', f); fd.set('nome', f.name); if (cat) fd.set('categoria', cat); return fd;
  };
  async function guarda(f: File, cat: string) {
    setErrore(''); setFatto(null); setAttesa('Leggo il PDF…');
    const r = await anteprimaUfficiale(modulo(f, cat)).catch(() => ({ ok: false as const, errore: 'Rete assente: riprova.' }));
    setAttesa('');
    if (!r.ok) { setErrore(r.errore); setProva(null); return; }
    setProva(r.valore); setCategoria(r.valore.categoria);
  }
  async function importa() {
    if (!file) return;
    setErrore(''); setAttesa('Importo il calendario…');
    const r = await importaUfficiale(modulo(file, categoria)).catch(() => ({ ok: false as const, errore: 'Rete assente: riprova.' }));
    setAttesa('');
    if (!r.ok) { setErrore(r.errore); return; }
    setFatto(r.valore); setProva(null);
  }

  if (!aperto) return (
    <button className="rounded-lg border border-linea bg-white px-3 py-2 text-sm font-semibold hover:border-blu" onClick={() => setAperto(true)}>
      Importa calendario ufficiale (PDF)
    </button>
  );
  const categoriaCambiata = !!prova && categoria.trim() !== prova.categoria;
  return (
    <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Calendario ufficiale (PDF)</h2>
          <p className="max-w-prose text-sm text-grigio">
            Il PDF del campionato della LND o della delegazione, con l&apos;elenco dei campi. Le gare vanno nello Scouting e le nostre
            partite nel calendario della squadra di quella categoria. Le gare già confermate o variate da un comunicato non si toccano.
          </p>
        </div>
        <button className="text-sm font-semibold text-grigio underline" onClick={() => { setAperto(false); setProva(null); setFatto(null); setFile(null); }}>Chiudi</button>
      </div>
      <input type="file" accept="application/pdf,.pdf" className="block w-full text-sm" aria-label="PDF del calendario"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setCategoria(''); void guarda(f, ''); } }} />
      {attesa && <p role="status" className="text-sm font-semibold text-blu">{attesa}</p>}
      {errore && <p role="alert" className="rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">{errore}</p>}

      {prova && file && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-grigio">Categoria (controllala: dà il nome alle gare e sceglie la nostra squadra)</span>
            <div className="flex flex-wrap gap-2">
              <input className="campo max-w-md" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Under 15 Provinciali Lecco" />
              {categoriaCambiata && <button className="rounded-lg border border-blu px-3 py-2 text-sm font-semibold text-blu" onClick={() => guarda(file, categoria)}>Ricontrolla</button>}
            </div>
          </label>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            <li><b>Stagione</b> {prova.stagione} · <b>{prova.gironi.length}</b> {prova.gironi.length === 1 ? 'girone' : 'gironi'}: {prova.gironi.map((g) => `${g.g} (${g.squadre} squadre)`).join(', ')}</li>
            <li><b>{prova.gare}</b> gare: {prova.gia} già nello Scouting, <b>{prova.gare - prova.gia}</b> nuove</li>
            <li><b>{prova.bloccate}</b> confermate o variate: restano come sono</li>
            <li><b>{prova.collegate}</b> società già in archivio{prova.nuove.length ? `, ${prova.nuove.length} nuove` : ''}</li>
          </ul>
          {prova.nuove.length > 0 && <p className="text-sm"><b>Società nuove:</b> {prova.nuove.slice(0, 20).join(', ')}{prova.nuove.length > 20 ? '…' : ''}</p>}
          <div className="rounded-lg bg-carta p-3">
            <p className="text-sm font-semibold">
              {prova.squadre.length ? `Nostre partite (${prova.nostre.length}) → calendario di ${prova.squadre.map((s) => s.nome).join(', ')}`
                : prova.nostre.length ? `Nostre partite: ${prova.nostre.length}, ma nessuna nostra squadra ha questa categoria (vanno solo nello Scouting)`
                : 'In questo calendario non giochiamo noi: le gare vanno solo nello Scouting.'}
            </p>
            {prova.nostre.length > 0 && (
              <ul className="mt-2 max-h-64 divide-y divide-linea overflow-auto text-sm">
                {prova.nostre.map((p, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 py-1">
                    <b>{giorno(p.data)}{p.ora ? ' · ' + p.ora : ' · ora da definire'}</b>
                    <span>{p.casa ? 'in casa con' : 'in trasferta a'} {p.avversario}</span>
                    {p.campo && <span className="text-grigio">{p.campo}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {prova.dubbi.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Da controllare ({prova.dubbi.length})</summary>
              <ul className="mt-1 list-disc pl-5 text-grigio">{prova.dubbi.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </details>
          )}
          <button className="bottone" disabled={!!attesa || categoriaCambiata || /\?/.test(categoria)} onClick={importa}>Importa {prova.gare} gare</button>
          {/\?/.test(categoria) && <p className="text-sm text-rosso">Completa la categoria (al posto del punto di domanda).</p>}
        </div>
      )}

      {fatto && (
        <div role="status" className="rounded-lg bg-verde/10 p-3 text-sm">
          <p className="font-semibold">Calendario importato: {fatto.scritte} gare scritte nello Scouting ({fatto.bloccate} confermate o variate lasciate come erano){fatto.nuove ? `, ${fatto.nuove} società nuove` : ''}.</p>
          {fatto.squadre.map((s, i) => (
            <p key={i}>{s.nome}: {s.errore ? `non aggiornato (${s.errore})` : `${s.aggiunte} partite aggiunte, ${s.aggiornate} aggiornate`}</p>
          ))}
        </div>
      )}
    </section>
  );
}
