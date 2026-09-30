'use client';
// Squadra → Partite → Piazzati (tappa 3; era piazzati.js del Portale). Elenco: i miei schemi (della squadra, preferiti ★ in
// cima) e i modelli della società; toccando una scheda la si sceglie per la partita (va nel foglio gara). Aprendo uno schema:
// - i propri (e per l'admin i modelli della società): editor sul "foglio" come nel PDF — nome, comando, pedine e pallone da
//   trascinare, frecce/linee/scritte, riquadro dei compiti (numero, compito, etichetta di ogni pedina), indicazioni;
// - un modello della società aperto da un mister: indicazioni e nomi dei compiti solo per questa partita, "Usa come modello".
// Chi gioca in ogni pedina vale per la partita (overrides). Salvataggi voce per voce (schemi) e per campi (foglio).
import { useMemo, useState } from 'react';
import { ordinaModelli } from '@/app/(aree)/docs-actions';
import { BASES } from '@/lib/condivisi';
import { nuovoId } from '@/lib/calendario-portale';
import { cognome, numeroMaglia } from '@/lib/formazione';
import {
  coloriCompiti, copiaDaModello, doppioni, giocatoreDi, gruppiCompiti, notaDi, numeroLibero, palloneDi, pedine, rinominaCompito,
  sceltaSchema, schemaNuovo, scritteDi, segniDi, type FoglioPiazzati, type ModificaPartita, type Pedina, type Schema,
} from '@/lib/piazzati';
import { Messaggio, useSalva } from '@/components/calendario/salvataggio';
import { useFoglio } from '@/components/squadra/useFoglio';
import type { FoglioPartita } from '@/lib/foglio';
import { Campo, type SegnoScelto, type Strumento } from './Campo';

type Giocatore = { id: string; name: string };
type Foglio = FoglioPiazzati & FoglioPartita & { bench?: string[] };
const FILTRI = { tutti: 'Tutti', favore: 'A favore', sfavore: 'A sfavore', scelti: 'Scelti' } as const;
const STRUMENTI: [Strumento, string][] = [['', '✋ Sposta'], ['arrow', '➚ Freccia'], ['arrow-dash', '⇢ Tratteggiata'], ['line', '— Linea'], ['text', 'T Testo']];
const btn = (primario = false) => `rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${primario ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`;
/** Due salvataggi (schemi e foglio della partita): si mostra quello in corso o andato male, se no "Salvato" */
const statoSalvataggio = (...m: string[]) => m.find((x) => x === 'Salvataggio…') || m.find((x) => x.startsWith('Non')) || m.find(Boolean) || '';
const Lato = ({ side }: { side: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${side === 'favore' ? 'bg-verde/15 text-verde' : 'bg-rosso/10 text-rosso'}`}>{side === 'favore' ? 'A favore' : 'A sfavore'}</span>
);

export function Piazzati({ squadraId, giocatori, iniziale, miei: mieiIniziali, modelli: modelliIniziali, puoSquadra, admin, autore, oggi, squadraNome, apri }: {
  squadraId: string; giocatori: Giocatore[]; iniziale: Foglio; miei: Schema[]; modelli: Schema[];
  puoSquadra: boolean; admin: boolean; autore: string; oggi: string; squadraNome: string; apri?: string;
}) {
  const { foglio, cambia, messaggio: msgFoglio } = useFoglio(squadraId, iniziale, !puoSquadra);
  const { salva, messaggio: msgSchemi, setMessaggio } = useSalva();
  const f = foglio as Foglio;
  const [miei, setMiei] = useState(mieiIniziali);
  const [modelli, setModelli] = useState(modelliIniziali);
  const [aperto, setAperto] = useState<string | null>(apri ?? null);
  const [filtro, setFiltro] = useState<keyof typeof FILTRI>('tutti');
  const [base, setBase] = useState('angolo-favore');
  const rosa = useMemo(() => new Set(giocatori.map((g) => g.id)), [giocatori]);
  const nome = (pid?: string | null) => giocatori.find((g) => g.id === pid)?.name ?? '';
  const selected = (f.selected ?? []) as string[];
  const ordine = [...miei, ...modelli].map((q) => q.id);
  const mio = (sc: Schema) => miei.some((q) => q.id === sc.id);
  const modificaBase = (sc: Schema) => (mio(sc) ? puoSquadra : admin);

  const apriSchema = (id: string | null) => {
    setAperto(id);
    const u = new URL(window.location.href); if (id) u.searchParams.set('schema', id); else u.searchParams.delete('schema');
    window.history.replaceState(null, '', u); window.scrollTo(0, 0);
  };
  /* salvataggio di uno schema: i miei nel registro della squadra, i modelli in shared/schemes (voce per voce) */
  function salvaSchema(sc: Schema, attesa = 700) {
    if (mio(sc)) {
      const q = { ...sc, aggiornato: oggi };
      setMiei((l) => l.map((x) => (x.id === q.id ? q : x)));
      salva('registro/' + squadraId, [{ lista: 'schemi', id: q.id, voce: q }], attesa);
    } else {
      setModelli((l) => l.map((x) => (x.id === sc.id ? sc : x)));
      salva('shared/schemes', [{ lista: 'items', id: sc.id, voce: sc }], attesa);
    }
  }
  const cambiaFoglio = (campi: Partial<Foglio>) => { if (puoSquadra) cambia(campi as Partial<FoglioPartita>, 300); };

  function scegli(sc: Schema) { if (puoSquadra) cambiaFoglio({ selected: sceltaSchema(selected, sc.id, ordine) }); }
  function usaModello(sc: Schema) {
    const { copia, selected: sel, overrides } = copiaDaModello(sc, f, nuovoId, oggi, autore);
    setMiei((l) => [copia, ...l]);
    salva('registro/' + squadraId, [{ lista: 'schemi', id: copia.id, voce: copia }], 0);
    cambiaFoglio({ selected: sel, overrides });
    setMessaggio('Copiato nei tuoi schemi'); apriSchema(copia.id);
  }
  function nuovo(dellaSocieta: boolean) {
    const q = schemaNuovo(base, nuovoId);
    if (dellaSocieta) { setModelli((l) => [...l, q]); salva('shared/schemes', [{ lista: 'items', id: q.id, voce: q }], 0); }
    else { const m = { ...q, preferito: true, autore, aggiornato: oggi }; setMiei((l) => [m, ...l]); salva('registro/' + squadraId, [{ lista: 'schemi', id: m.id, voce: m }], 0); }
    if (puoSquadra && !selected.includes(q.id)) cambiaFoglio({ selected: [...selected, q.id] });
    apriSchema(q.id);
  }
  async function sposta(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= modelli.length) return;
    const l = modelli.slice(); [l[i], l[j]] = [l[j], l[i]]; setModelli(l);
    setMessaggio('Salvataggio…');
    const r = await ordinaModelli(l.map((q) => q.id)).catch(() => ({ ok: false, errore: 'rete assente' }));
    setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore}`);
  }

  const sc = aperto ? [...miei, ...modelli].find((q) => q.id === aperto) : undefined;
  if (sc) {
    return (
      <>
        <FoglioSchema key={sc.id} sc={sc} f={f} giocatori={giocatori} rosa={rosa} nome={nome} mio={mio(sc)} modifica={modificaBase(sc)}
          puoSquadra={puoSquadra} squadraNome={squadraNome} selected={selected}
          onIndietro={() => apriSchema(null)} onSalva={salvaSchema} onFoglio={cambiaFoglio} onUsaModello={() => usaModello(sc)}
          onDuplica={() => {
            const q: Schema = { ...structuredClone(sc), id: nuovoId('s'), name: sc.name + ' (copia)', aggiornato: oggi, tokens: sc.tokens.map((t) => ({ ...t, id: nuovoId('t') })) };
            if (mio(sc)) { setMiei((l) => [q, ...l]); salva('registro/' + squadraId, [{ lista: 'schemi', id: q.id, voce: q }], 0); }
            else { setModelli((l) => [...l, q]); salva('shared/schemes', [{ lista: 'items', id: q.id, voce: q }], 0); }
            apriSchema(q.id);
          }}
          onElimina={() => {
            if (!confirm(`Eliminare lo schema "${sc.name}"?`)) return;
            if (mio(sc)) { setMiei((l) => l.filter((q) => q.id !== sc.id)); salva('registro/' + squadraId, [{ lista: 'schemi', id: sc.id, voce: null }], 0); }
            else { setModelli((l) => l.filter((q) => q.id !== sc.id)); salva('shared/schemes', [{ lista: 'items', id: sc.id, voce: null }], 0); }
            const ov = { ...(f.overrides ?? {}) }; delete ov[sc.id];
            cambiaFoglio({ selected: selected.filter((i) => i !== sc.id), overrides: ov });
            apriSchema(null);
          }} />
        <Messaggio testo={statoSalvataggio(msgSchemi, msgFoglio)} />
      </>
    );
  }

  const passa = (q: Schema) => filtro === 'tutti' || (filtro === 'scelti' ? selected.includes(q.id) : q.side === filtro);
  const mieiOrdinati = miei.slice().sort((a, b) => Number(!!b.preferito) - Number(!!a.preferito) || (b.aggiornato || '').localeCompare(a.aggiornato || ''));
  const scheda = (q: Schema, i: number, m: boolean) => {
    const sel = selected.includes(q.id);
    return (
      <div key={q.id} className={`flex flex-col rounded-xl border-2 bg-white p-2 ${sel ? 'border-blu' : 'border-linea'}`}>
        <button type="button" className="text-left" aria-pressed={sel} disabled={!puoSquadra} onClick={() => scegli(q)}
          aria-label={`${sel ? 'Togli dalla partita' : 'Scegli per la partita'}: ${q.name}`}>
          <div className="relative">
            <Campo sc={q} pedine={pedine(q, f)} pallone={palloneDi(q, f)} segni={segniDi(q, f)} scritte={[]} colori={coloriCompiti(q, f)} etichetta={() => ({ testo: '', pieno: true })} piccolo titolo={`Anteprima ${q.name}`} />
            <span className={`absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full border-2 text-sm font-bold ${sel ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-transparent'}`}>✓</span>
          </div>
          <span className="mt-1.5 block font-display text-lg font-bold leading-tight">{m && q.preferito ? <span className="text-oro">★ </span> : null}{q.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-grigio"><Lato side={q.side} />{q.subtitle ? 'Comando: ' + q.subtitle + ' · ' : ''}{q.tokens.length} pedine</span>
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {m ? <>
            <button className={btn(true)} onClick={() => apriSchema(q.id)}>Modifica</button>
            <button className={`px-1 text-xl ${q.preferito ? 'text-oro' : 'text-grigio'}`} aria-pressed={!!q.preferito} aria-label={q.preferito ? 'Togli dai preferiti' : 'Metti tra i preferiti'}
              onClick={() => puoSquadra && salvaSchema({ ...q, preferito: !q.preferito }, 0)}>★</button>
          </> : <>
            <button className={btn()} onClick={() => apriSchema(q.id)}>{admin ? 'Modifica' : 'Apri'}</button>
            {puoSquadra && <button className={btn(true)} onClick={() => usaModello(q)}>Usa come modello</button>}
            {admin && <span className="ml-auto flex gap-1"><button className={btn()} aria-label="Sposta su" onClick={() => sposta(i, -1)}>↑</button><button className={btn()} aria-label="Sposta giù" onClick={() => sposta(i, 1)}>↓</button></span>}
          </>}
        </div>
      </div>
    );
  };
  const griglia = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4';
  const basi = <select id="pz-base" className="campo w-auto py-1.5 text-sm" aria-label="Da dove partire" value={base} onChange={(e) => setBase(e.target.value)}>
    {Object.entries(BASES).map(([k, b]) => <option key={k} value={k}>{b.name}</option>)}</select>;
  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-grigio">Tocca uno schema per sceglierlo per la partita (va nel foglio gara). <b>I miei schemi</b> sono della squadra: parti da un modello della
        società con <b>Usa come modello</b>, poi cambia compiti, comando, pedine e frecce. I preferiti ★ stanno in cima.</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtro schemi">
        {(Object.keys(FILTRI) as (keyof typeof FILTRI)[]).map((k) => (
          <button key={k} aria-pressed={filtro === k} onClick={() => setFiltro(k)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${filtro === k ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`}>
            {FILTRI[k]}{k === 'scelti' ? ` (${selected.length})` : ''}</button>))}
      </div>
      <section>
        <h2 className="mb-2 font-display text-2xl font-bold">I miei schemi <span className="text-base font-normal text-grigio">({miei.length})</span></h2>
        {mieiOrdinati.filter(passa).length ? <div className={griglia}>{mieiOrdinati.filter(passa).map((q) => scheda(q, 0, true))}</div>
          : <p className="text-sm text-grigio">{miei.length ? 'Nessuno schema con questo filtro.' : 'Ancora nessuno: scegli un modello qui sotto e tocca Usa come modello.'}</p>}
        {puoSquadra && <div className="mt-2 flex flex-wrap gap-2">{basi}<button className={btn()} onClick={() => nuovo(false)}>+ Nuovo schema vuoto</button></div>}
      </section>
      <section>
        <h2 className="mb-2 font-display text-2xl font-bold">Modelli della società <span className="text-base font-normal text-grigio">({modelli.length})</span></h2>
        {modelli.filter(passa).length ? <div className={griglia}>{modelli.map((q, i) => (passa(q) ? scheda(q, i, false) : null))}</div>
          : <p className="text-sm text-grigio">{modelli.length ? 'Nessuno schema con questo filtro.' : 'Ancora nessuno schema.'}</p>}
        {admin && <div className="mt-2 flex flex-wrap gap-2">{basi}<button className={btn()} onClick={() => nuovo(true)}>+ Nuovo modello della società</button></div>}
      </section>
      <Messaggio testo={statoSalvataggio(msgSchemi, msgFoglio)} />
    </div>
  );
}

/* ---------- Il foglio dello schema, com'è nel PDF, modificabile sul posto ---------- */
function FoglioSchema({ sc, f, giocatori, rosa, nome, mio, modifica, puoSquadra, squadraNome, selected, onIndietro, onSalva, onFoglio, onUsaModello, onDuplica, onElimina }: {
  sc: Schema; f: Foglio; giocatori: Giocatore[]; rosa: Set<string>; nome: (pid?: string | null) => string; mio: boolean; modifica: boolean; puoSquadra: boolean;
  squadraNome: string; selected: string[]; onIndietro: () => void; onSalva: (s: Schema, attesa?: number) => void; onFoglio: (c: Partial<Foglio>) => void;
  onUsaModello: () => void; onDuplica: () => void; onElimina: () => void;
}) {
  const [pedinaScelta, setPedinaScelta] = useState<string | null>(null);
  const [strumento, setStrumento] = useState<Strumento>('');
  const [segno, setSegno] = useState<SegnoScelto>(null);
  const partita = !modifica && puoSquadra;   // mister su un modello della società: solo per questa partita
  const colori = coloriCompiti(sc, f), eff = pedine(sc, f);
  const numero = (pid: string) => numeroMaglia(f, pid);
  const etichetta = (t: Pedina) => { const { pid, aMano } = giocatoreDi(sc, t, f, rosa); return { testo: pid ? numero(pid) ?? '·' : t.slot, pieno: !!pid, aMano: !!pid && aMano }; };
  const modPartita = (m: ModificaPartita) => onFoglio({ schemeEdits: { ...(f.schemeEdits ?? {}), [sc.id]: m } });
  const cambiaPedina = (id: string, campi: Partial<Pedina>) => onSalva({ ...sc, tokens: sc.tokens.map((t) => (t.id === id ? { ...t, ...campi } : t)) });
  const aggiungiPedina = (role: string) => {
    const t: Pedina = { id: nuovoId('t'), slot: numeroLibero(sc), x: 0, y: 24, role, tag: '' };
    onSalva({ ...sc, tokens: [...sc.tokens, t] }, 0); setPedinaScelta(t.id); setSegno(null); setStrumento('');
  };
  const scegliGiocatore = (t: Pedina, pid: string) => {
    const ov = { ...(f.overrides ?? {}) }, mieiOv = { ...(ov[sc.id] ?? {}) };
    if (pid) mieiOv[t.id] = pid; else delete mieiOv[t.id];
    ov[sc.id] = mieiOv; onFoglio({ overrides: ov });
  };
  const doppi = doppioni(sc, f, rosa);
  const pag = selected.indexOf(sc.id);
  const luogo = [f.venue, f.category].filter(Boolean).join(' · ');
  const partitaTesto = f.opponent ? (f.home ? `${squadraNome} – ${f.opponent}` : `${f.opponent} – ${squadraNome}`) : squadraNome;
  const segnoSel = segno ? (segno.tipo === 'draw' ? (sc.draw ?? [])[segno.i] : (sc.marks ?? [])[segno.i]) : null;
  const rosaOrdinata = giocatori.slice().sort((a, b) => (numero(a.id) ?? 99) - (numero(b.id) ?? 99) || a.name.localeCompare(b.name, 'it'));
  const compitiNomi = [...colori.keys()];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn()} onClick={onIndietro}>← Tutti gli schemi</button>
        <span className="flex-1 text-sm text-grigio">{mio ? 'I miei schemi · si salva da solo' : modifica ? 'Modello della società: lo vedono tutte le squadre'
          : partita ? 'Modello della società · indicazioni e nomi dei compiti che scrivi qui valgono per questa partita' : 'Modello della società'}</span>
        {mio && modifica && <button className={`px-1 text-2xl ${sc.preferito ? 'text-oro' : 'text-grigio'}`} aria-pressed={!!sc.preferito} aria-label="Preferito"
          onClick={() => onSalva({ ...sc, preferito: !sc.preferito }, 0)}>★</button>}
      </div>
      {partita && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-oro/15 p-3 text-sm">
          <p className="min-w-52 flex-1">Per spostare pedine o frecce, o tenere le modifiche anche per le prossime partite, fanne una copia tua.</p>
          <button className={btn(true)} onClick={onUsaModello}>Usa come modello</button>
        </div>
      )}
      {modifica && (segnoSel ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blu bg-blu/5 p-2 text-sm">
          <b>{segno!.tipo === 'mark' ? 'Scritta scelta' : 'Freccia o linea scelta'}</b>
          {segno!.tipo === 'mark' && <button className={btn()} onClick={() => {
            const m = (sc.marks ?? [])[segno!.i], v = window.prompt('Testo:', m.text);
            if (v == null) return;
            const marks = (sc.marks ?? []).slice(); if (v.trim()) marks[segno!.i] = { ...m, text: v.trim() }; else marks.splice(segno!.i, 1);
            onSalva({ ...sc, marks }, 0); setSegno(null);
          }}>Cambia testo</button>}
          <button className={`${btn()} text-rosso`} onClick={() => {
            if (segno!.tipo === 'draw') onSalva({ ...sc, draw: (sc.draw ?? []).filter((_, i) => i !== segno!.i) }, 0);
            else onSalva({ ...sc, marks: (sc.marks ?? []).filter((_, i) => i !== segno!.i) }, 0);
            setSegno(null);
          }}>Cancella</button>
          <button className={btn()} onClick={() => setSegno(null)}>Fatto</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Strumento">
            {STRUMENTI.map(([k, l]) => <button key={k || 'sposta'} aria-pressed={strumento === k} onClick={() => { setStrumento(k); setPedinaScelta(null); setSegno(null); }}
              className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${strumento === k ? 'border-blu bg-blu text-white' : 'border-linea bg-white'}`}>{l}</button>)}
          </div>
          <span className="text-xs text-grigio">{strumento === 'text' ? 'Tocca il campo dove scrivere' : strumento ? 'Trascina sul campo' : 'Trascina pedine e pallone · tocca una pedina per modificarla · tocca un segno per cambiarlo'}</span>
        </div>
      ))}

      {/* il foglio, come la pagina del PDF: sempre su carta bianca */}
      <article className="overflow-hidden rounded-xl border border-linea bg-white text-[#0e1a2b] shadow-sm" aria-label={`Foglio dello schema ${sc.name}`}>
        <header className="flex flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portale/casatese-logo.png" alt="" className="size-12 rounded-md" />
          <div className="min-w-0 flex-1">
            {modifica ? <>
              <input id="pz-nome" className="w-full rounded border border-dashed border-transparent bg-transparent font-display text-3xl font-bold leading-tight text-blu hover:border-linea focus:border-linea" value={sc.name}
                aria-label="Nome dello schema" onChange={(e) => onSalva({ ...sc, name: e.target.value })} />
              <input id="pz-comando" className="w-full rounded border border-dashed border-transparent bg-transparent text-sm font-semibold hover:border-linea focus:border-linea" value={sc.subtitle || ''}
                placeholder="Comando: la chiamata, es. Braccia alzate" aria-label="Comando" onChange={(e) => onSalva({ ...sc, subtitle: e.target.value })} />
            </> : <><h2 className="font-display text-3xl font-bold leading-tight text-blu">{sc.name}</h2>{sc.subtitle && <p className="text-sm font-semibold">{sc.subtitle}</p>}</>}
          </div>
          <div className="text-right text-sm leading-tight"><b className="block">{partitaTesto}</b>{[f.date, f.time].filter(Boolean).join(' · ore ')}<span className="block text-grigio">{luogo}</span></div>
        </header>
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#003da5 0 60%,#d4af37 60% 80%,#c41e3a 80%)' }} />
        <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
          <div>
            <Campo sc={sc} pedine={eff} pallone={palloneDi(sc, f)} segni={modifica ? sc.draw ?? [] : segniDi(sc, f)} scritte={modifica ? sc.marks ?? [] : scritteDi(sc, f)}
              colori={colori} etichetta={etichetta} modifica={modifica} pedinaScelta={pedinaScelta} strumento={strumento} segnoScelto={segno}
              onCambia={(s) => onSalva(s, 300)} onPedina={(id) => { setPedinaScelta(id); if (id) setTimeout(() => document.getElementById('pz-riga-' + id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50); }}
              onSegno={setSegno} />
            {modifica ? <textarea id="pz-nota" className="campo mt-2 font-display text-lg font-bold" rows={3} value={sc.note || ''} placeholder="Indicazioni sotto lo schema (es. marcatura a uomo sui saltatori)"
              aria-label="Indicazioni sotto lo schema" onChange={(e) => onSalva({ ...sc, note: e.target.value })} />
              : partita ? <textarea id="pz-nota-partita" className="campo mt-2 font-display text-lg font-bold" rows={3} value={notaDi(sc, f)} placeholder="Indicazioni per questa partita"
                aria-label="Indicazioni per questa partita" onChange={(e) => {
                  const ed: ModificaPartita = { ...((f.schemeEdits ?? {})[sc.id] ?? {}) };
                  if (e.target.value.trim() === (sc.note || '').trim()) delete ed.note; else ed.note = e.target.value;
                  modPartita(ed);
                }} />
              : notaDi(sc, f) && <p className="mt-2 font-display text-lg font-bold">{notaDi(sc, f)}</p>}
          </div>

          {/* riquadro dei compiti */}
          <aside className="rounded-xl border border-linea p-3">
            {modifica ? (
              <div className="mb-2 flex gap-1" role="group" aria-label="Tipo">
                {(['favore', 'sfavore'] as const).map((k) => <button key={k} aria-pressed={sc.side === k} onClick={() => onSalva({ ...sc, side: k }, 0)}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${sc.side === k ? 'border-blu bg-blu text-white' : 'border-linea'}`}>{k === 'favore' ? 'A favore' : 'A sfavore'}</button>)}
              </div>
            ) : <div className="mb-2"><Lato side={sc.side} /></div>}
            <h3 className="font-display text-xl font-bold">Compiti</h3>
            {doppi.length > 0 && <p role="alert" className="my-2 rounded-lg bg-rosso/10 p-2 text-sm font-semibold text-rosso">
              ⚠ Stesso giocatore in più pedine: {doppi.map(([pid, n]) => `${cognome(nome(pid))} (n° ${n.join(' e ')})`).join('; ')}.</p>}
            {gruppiCompiti(sc, f).map(([role, ts]) => {
              const col = colori.get(role) || '#15202B', nomeCompito = role === 'Senza compito' ? '' : role;
              return (
                <div key={role} className="mt-2">
                  <div className="flex items-center gap-1.5">
                    <i className="h-5 w-1.5 flex-none rounded-sm" style={{ background: col }} />
                    {modifica || partita ? <input className="min-w-0 flex-1 rounded border border-dashed border-transparent bg-transparent font-display text-lg font-bold hover:border-linea focus:border-linea"
                      defaultValue={nomeCompito} placeholder="Senza compito: scrivi un nome" aria-label="Nome del compito"
                      onBlur={(e) => {
                        const nuovo = e.target.value.trim(); if (nuovo === nomeCompito) return;
                        const r = rinominaCompito(sc, f, nomeCompito, nuovo, modifica);
                        if (r.schema) onSalva(r.schema, 0); else if (r.modifica) modPartita(r.modifica);
                      }} /> : <b className="flex-1 font-display text-lg">{role}</b>}
                    {modifica && <button className="rounded px-2 text-lg font-bold text-blu" aria-label={`Aggiungi una pedina a ${role}`} onClick={() => aggiungiPedina(nomeCompito)}>+</button>}
                  </div>
                  {ts.map((t) => {
                    const { pid, aMano } = giocatoreDi(sc, t, f, rosa), dallaForm = f.lineup?.[t.slot], sel = pedinaScelta === t.id;
                    return (
                      <div key={t.id} id={'pz-riga-' + t.id} className={`mt-1 rounded-lg px-1 py-1 ${sel ? 'bg-blu/10' : ''}`}>
                        <div className="flex items-center gap-2">
                          <button type="button" disabled={!modifica} onClick={() => setPedinaScelta(sel ? null : t.id)} aria-label={`Pedina ${t.slot}`}
                            className="grid size-7 flex-none place-items-center rounded-full border-2 font-display text-sm font-bold"
                            style={{ background: pid ? col : 'transparent', borderColor: col, color: pid ? '#fff' : col }}>{pid ? numero(pid) ?? t.slot : t.slot}</button>
                          <select className={`campo min-w-0 flex-1 py-1 text-sm ${aMano ? 'font-semibold text-blu' : ''}`} value={aMano ? pid ?? '' : ''} disabled={!puoSquadra}
                            aria-label={`Giocatore della pedina ${t.slot}`} onChange={(e) => scegliGiocatore(t, e.target.value)}>
                            <option value="">{dallaForm && rosa.has(dallaForm) ? `${numero(dallaForm) ? numero(dallaForm) + ' · ' : ''}${nome(dallaForm)}` : 'Nessuno in formazione'}</option>
                            {rosaOrdinata.map((g) => <option key={g.id} value={g.id}>{numero(g.id) ? numero(g.id) + ' · ' : ''}{g.name}</option>)}
                          </select>
                          {t.tag && <span className="font-bold text-[#C8102E]">{t.tag}</span>}
                        </div>
                        {sel && modifica && (
                          <div className="mt-1.5 flex flex-wrap items-end gap-2 pl-9 text-sm">
                            <label>N° <select className="campo w-auto py-1" value={t.slot} onChange={(e) => cambiaPedina(t.id, { slot: +e.target.value })}>
                              {Array.from({ length: 11 }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>
                            <label>Compito <select className="campo w-auto py-1" value={(t.role || '').trim()} onChange={(e) => {
                              if (e.target.value === '__nuovo') { const n = (window.prompt('Nome del nuovo compito:', '') || '').trim(); if (n) cambiaPedina(t.id, { role: n }); }
                              else cambiaPedina(t.id, { role: e.target.value });
                            }}>{!(t.role || '').trim() && <option value="">Senza compito</option>}
                              {compitiNomi.map((c) => <option key={c}>{c}</option>)}<option value="__nuovo">+ Nuovo compito…</option></select></label>
                            <label>Etichetta <input className="campo w-16 py-1" maxLength={3} placeholder="1, M…" defaultValue={t.tag || ''} onBlur={(e) => cambiaPedina(t.id, { tag: e.target.value.trim() })} /></label>
                            <button className={`${btn()} text-rosso`} onClick={() => { onSalva({ ...sc, tokens: sc.tokens.filter((q) => q.id !== t.id) }, 0); setPedinaScelta(null); }}>Togli</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {modifica && <button className={`${btn()} mt-3`} onClick={() => { const n = (window.prompt('Nome del nuovo compito:', '') || '').trim(); if (n) aggiungiPedina(n); }}>+ Nuovo compito</button>}
            <p className="mt-3 text-xs text-grigio">{sc.legend || 'Freccia piena = palla · tratteggiata = movimento'}</p>
            {puoSquadra && <p className="text-xs text-grigio">Il giocatore scelto vale per questa partita;{' '}
              <button className="font-semibold text-blu underline" onClick={() => { const ov = { ...(f.overrides ?? {}) }; delete ov[sc.id]; onFoglio({ overrides: ov }); }}>tutti dalla formazione</button>.</p>}
          </aside>
        </div>
        <footer className="flex justify-between border-t border-linea px-4 py-2 text-xs text-grigio">
          <span>Academy Casatese Merate · Foglio gara</span><span>{pag >= 0 ? `${pag + 2} / ${selected.length + 1}` : 'Non scelto per la partita'}</span>
        </footer>
      </article>
      {modifica && (
        <div className="flex justify-between gap-2">
          <button className={btn()} onClick={onDuplica}>Duplica</button>
          <button className={`${btn()} border-rosso text-rosso`} onClick={onElimina}>Elimina schema</button>
        </div>
      )}
    </section>
  );
}
