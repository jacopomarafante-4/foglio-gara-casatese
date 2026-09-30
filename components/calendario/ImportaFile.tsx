'use client';
// Calendario → Tutte le squadre → "Importa da file" (admin, direttori, organizzativo): amichevoli, tornei ed eventi da un file
// ICS (Google Calendar, Outlook), CSV o Excel. Il file si legge qui nel browser (lib/import-calendario.ts, lib/xlsx.ts), si
// controlla in anteprima (squadra, casa o trasferta, quali righe) e si salva voce per voce (modificaDoc). Le righe già
// importate (stessa `fonte`) si aggiornano; quelle che sembrano già in calendario (stessa data e avversario) partono spente.
// Le voci importate non si mandano a Google: spesso arrivano proprio da lì e si creerebbero doppioni.
import { useState } from 'react';
import { modificaDoc } from '@/app/(aree)/docs-actions';
import { etaCategoria } from '@/lib/condivisi';
import { daTabella, leggiCsv, leggiIcs, type RigaImport } from '@/lib/import-calendario';
import { leggiXlsx } from '@/lib/xlsx';
import { nuovoId } from '@/lib/calendario-portale';
import type { Evento, Partita, SquadraCal } from '@/lib/programma';

type Riga = RigaImport & { scelta: boolean; dove: string; casaScelta: boolean; gia: boolean };
const EVENTO = '__evento';
const norm = (s?: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const giorno = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

export function ImportaFile({ squadre, eventi, oggi }: { squadre: SquadraCal[]; eventi: Evento[]; oggi: string }) {
  const [aperto, setAperto] = useState(false);
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [nomeFile, setNomeFile] = useState('');
  const [esito, setEsito] = useState('');
  const [occupato, setOccupato] = useState(false);
  const valide = squadre.filter((t) => !t.organizza && !t.vedeTutte);
  const perEta = (eta: number | null) => (eta === null ? undefined : valide.find((t) => etaCategoria(t) === eta));

  async function leggi(file: File) {
    setEsito(''); setRighe(null); setNomeFile(file.name);
    try {
      const nome = file.name.toLowerCase();
      let lette: RigaImport[];
      if (nome.endsWith('.ics')) lette = leggiIcs(await file.text(), oggi);
      else if (nome.endsWith('.csv') || nome.endsWith('.txt')) lette = daTabella(leggiCsv(await file.text()), oggi);
      else if (nome.endsWith('.xlsx')) lette = daTabella(await leggiXlsx(new Uint8Array(await file.arrayBuffer())), oggi);
      else if (nome.endsWith('.pdf')) { setEsito('I PDF dei calendari federali per ora li importo io con lo script: mandameli. Qui vanno ICS, CSV ed Excel.'); return; }
      else if (nome.endsWith('.xls')) { setEsito('Formato Excel vecchio (.xls): aprilo e salvalo come .xlsx o .csv, poi riprova.'); return; }
      else { setEsito('Formato non riconosciuto: usa un file .ics, .csv o .xlsx.'); return; }
      if (!lette.length) { setEsito('Nel file non ho trovato impegni da oggi in poi (gli allenamenti si saltano).'); return; }
      setRighe(lette.map((r) => {
        const t = perEta(r.eta);
        const esistenti: (Partita | Evento)[] = t ? t.matches : eventi;
        const stessaFonte = esistenti.some((x) => x.fonte === r.chiave);
        const gia = !stessaFonte && (t
          ? t.matches.some((m) => m.date === r.data && (norm(m.opponent).includes(norm(r.avversario)) || norm(r.avversario).includes(norm(m.opponent))) && !!norm(m.opponent))
          : eventi.some((e) => e.data === r.data && norm(e.titolo) === norm(r.titolo)));
        const casa = r.casa ?? /merate|cernusco/i.test(r.campo);
        return { ...r, scelta: !gia, gia, dove: t?.id ?? (r.eta === null ? EVENTO : ''), casaScelta: casa };
      }));
    } catch (e) {
      setEsito('File non letto: ' + (e as Error).message);
    }
  }
  const cambia = (i: number, campi: Partial<Riga>) => setRighe((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...campi } : r)));

  async function importa() {
    if (!righe) return;
    const da = righe.filter((r) => r.scelta && r.dove);
    if (!da.length) return;
    setOccupato(true); setEsito('Salvataggio…');
    const perDoc = new Map<string, { lista: string; id: string; voce: Record<string, unknown> & { id: string } }[]>();
    for (const r of da) {
      if (r.dove === EVENTO) {
        const prima = eventi.find((e) => e.fonte === r.chiave);
        const luogo = /merate/i.test(r.campo) ? 'merate' : /cernusco/i.test(r.campo) ? 'cernusco' : 'altro';
        const ev: Evento = { ...(prima ?? {}), id: prima?.id ?? nuovoId('ev_'), titolo: r.titolo || r.avversario, tipo: prima?.tipo ?? 'Altro',
          data: r.data, inizio: r.ora, fine: r.fine, luogo, indirizzo: luogo === 'altro' ? r.campo : '', squadre: prima?.squadre ?? [], note: r.note, fonte: r.chiave };
        (perDoc.get('shared/eventi') ?? perDoc.set('shared/eventi', []).get('shared/eventi')!).push({ lista: 'items', id: ev.id, voce: ev });
      } else {
        const t = valide.find((x) => x.id === r.dove)!;
        const prima = t.matches.find((m) => m.fonte === r.chiave);
        const m: Partita = { ...(prima ?? {}), id: prima?.id ?? nuovoId('f'), date: r.data, time: r.ora, opponent: r.avversario, home: r.casaScelta,
          venue: r.campo, friendly: true, tipo: r.tipo === 'Torneo' ? 'Torneo' : 'Amichevole', note: r.note, fonte: r.chiave };
        const path = 'calendar/' + t.id;
        (perDoc.get(path) ?? perDoc.set(path, []).get(path)!).push({ lista: 'matches', id: m.id!, voce: m as Partita & { id: string } });
      }
    }
    const errori: string[] = [];
    for (const [path, modifiche] of perDoc) {
      const r = await modificaDoc(path, modifiche).catch(() => ({ ok: false, errore: 'rete assente' }));
      if (!r.ok) errori.push(`${path}: ${r.errore}`);
    }
    setOccupato(false);
    if (errori.length) { setEsito('Non salvato: ' + errori.join('; ')); return; }
    setEsito(`Importati ${da.length} impegni. Ricarico…`);
    window.location.reload();
  }

  if (!aperto) return <button className="rounded-lg border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-blu" onClick={() => setAperto(true)}>Importa da file</button>;
  const scelte = righe?.filter((r) => r.scelta && r.dove).length ?? 0;
  return (
    <section className="w-full rounded-xl border border-linea bg-white p-4" aria-labelledby="importa-titolo">
      <div className="flex items-start justify-between gap-2">
        <h2 id="importa-titolo" className="font-display text-2xl font-bold">Importa da file</h2>
        <button className="rounded-lg px-2 text-2xl leading-none text-grigio hover:text-inchiostro" aria-label="Chiudi" onClick={() => { setAperto(false); setRighe(null); setEsito(''); }}>×</button>
      </div>
      <p className="mt-1 text-sm text-grigio">
        Amichevoli, tornei ed eventi da oggi in poi. File <b>.ics</b> (Google Calendar: Impostazioni → Importa ed esporta → Esporta),
        <b> .csv</b> o <b>.xlsx</b> con le colonne Data, Ora, Squadra (o Categoria, Annata), Avversario, Casa/Trasferta, Campo, Note.
        Il campionato no: vale il calendario ufficiale.
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Scegli il file</span>
        <input type="file" accept=".ics,.csv,.txt,.xlsx,.xls,.pdf" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blu file:px-3 file:py-2 file:font-semibold file:text-white"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) leggi(f); }} />
      </label>
      {esito && <p role="status" className="mt-3 rounded-lg bg-carta p-3 text-sm font-semibold">{esito}</p>}
      {righe && (
        <>
          <p className="mt-3 text-sm text-grigio">{nomeFile}: {righe.length} impegni. Controlla squadra e campo; togli la spunta a quelli da non importare.</p>
          <ul className="mt-2 divide-y divide-linea rounded-xl border border-linea">
            {righe.map((r, i) => (
              <li key={r.chiave + i} className={`grid gap-2 p-2.5 sm:grid-cols-[auto_7rem_1fr_11rem_8rem] sm:items-center ${r.scelta ? '' : 'opacity-60'}`}>
                <input type="checkbox" className="size-5" aria-label={`Importa ${r.titolo}`} checked={r.scelta} onChange={(e) => cambia(i, { scelta: e.target.checked })} />
                <span className="text-sm font-semibold">{giorno(r.data)}{r.ora ? ' · ' + r.ora : ''}</span>
                <span className="min-w-0 text-sm">
                  <b>{r.dove === EVENTO ? r.titolo : r.avversario}</b>
                  {r.campo && <span className="text-grigio"> · {r.campo}</span>}
                  {r.gia && <span className="ml-1 rounded bg-oro/25 px-1.5 py-0.5 text-xs font-semibold">sembra già in calendario</span>}
                </span>
                <select className="campo py-1.5 text-sm" aria-label="Squadra" value={r.dove} onChange={(e) => cambia(i, { dove: e.target.value, scelta: !!e.target.value })}>
                  <option value="">Scegli la squadra</option>
                  {valide.map((t) => <option key={t.id} value={t.id}>{t.category || t.name}</option>)}
                  <option value={EVENTO}>Evento della società</option>
                </select>
                {r.dove && r.dove !== EVENTO ? (
                  <select className="campo py-1.5 text-sm" aria-label="Casa o trasferta" value={r.casaScelta ? 'casa' : 'fuori'} onChange={(e) => cambia(i, { casaScelta: e.target.value === 'casa' })}>
                    <option value="casa">In casa</option><option value="fuori">Trasferta</option>
                  </select>
                ) : <span />}
              </li>
            ))}
          </ul>
          <button className="mt-3 rounded-lg border border-blu bg-blu px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={occupato || !scelte} onClick={importa}>
            {occupato ? 'Salvataggio…' : `Importa ${scelte} impegni`}
          </button>
        </>
      )}
    </section>
  );
}
