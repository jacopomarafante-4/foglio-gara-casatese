'use client';
// Squadra → Partite → Formazione (tappa 3; era viewFormazione del Portale). Sul campo: tocca una posizione per scegliere chi
// metterci, trascina una pedina per spostarla (slotPos). Sotto: titolari, panchina, disponibili (tocca = prossima posizione
// libera). Poi modulo, capitani, piazzati scelti e note. Si salva il foglio della partita per campi (useFoglio).
import { useRef, useState } from 'react';
import { MODULI, cognome, metti, numeroMaglia, panchina, posizione, posizioniDi, primaLibera, slotDi, titolari, togli, type FoglioFormazione } from '@/lib/formazione';
import { Messaggio } from '@/components/calendario/salvataggio';
import { useFoglio } from './useFoglio';
import type { FoglioPartita } from '@/lib/foglio';

type Giocatore = { id: string; name: string };
const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';

export function Formazione({ squadraId, giocatori, iniziale, soloLettura, piazzati, linkPiazzati }: {
  squadraId: string; giocatori: Giocatore[]; iniziale: FoglioFormazione & FoglioPartita; soloLettura: boolean; piazzati: string[]; linkPiazzati: string;
}) {
  const { foglio, cambia, messaggio } = useFoglio(squadraId, iniziale, soloLettura);
  const f = foglio as FoglioFormazione;
  const [scelta, setScelta] = useState<number | null>(null);
  const campo = useRef<HTMLDivElement>(null);
  const trascina = useRef<{ n: number; x0: number; y0: number; mosso: boolean } | null>(null);
  const [spostata, setSpostata] = useState<{ n: number; x: number; y: number } | null>(null);
  const nome = (pid?: string | null) => giocatori.find((g) => g.id === pid)?.name ?? '';
  const numero = (pid: string) => numeroMaglia(f, pid);
  const bench = f.bench ?? [];
  const liberi = giocatori.filter((g) => !slotDi(f.lineup, g.id) && !bench.includes(g.id));
  const salva = (campi: Partial<FoglioFormazione>) => { if (!soloLettura) cambia(campi as Partial<FoglioPartita>, 300); };

  /* trascinamento delle pedine: se ci si sposta poco è un tocco (si apre la scelta del giocatore) */
  const suGiu = (e: React.PointerEvent, n: number) => {
    if (soloLettura) { setScelta(null); return; }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    trascina.current = { n, x0: e.clientX, y0: e.clientY, mosso: false };
  };
  const muovi = (e: React.PointerEvent) => {
    const t = trascina.current, r = campo.current?.getBoundingClientRect();
    if (!t || !r) return;
    if (!t.mosso && Math.hypot(e.clientX - t.x0, e.clientY - t.y0) < 8) return;
    t.mosso = true;
    setSpostata({ n: t.n, x: Math.min(97, Math.max(3, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(97, Math.max(3, ((e.clientY - r.top) / r.height) * 100)) });
  };
  const su = () => {
    const t = trascina.current; trascina.current = null;
    if (!t) return;
    if (t.mosso && spostata) salva({ slotPos: { ...(f.slotPos ?? {}), [t.n]: { x: Math.round(spostata.x), y: Math.round(spostata.y) } } });
    else setScelta(t.n);
    setSpostata(null);
  };

  if (!giocatori.length) return <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima inserisci la rosa (Squadra → Rosa).</p>;
  const tit = titolari(f);
  const opzioniCapitano = giocatori.filter((g) => slotDi(f.lineup, g.id) || bench.includes(g.id));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_minmax(300px,380px)_1fr]">
      {/* ---------- campo ---------- */}
      <div className="lg:order-2">
        <div ref={campo} className="relative aspect-[68/100] w-full touch-none select-none overflow-hidden rounded-2xl border-[3px] border-[#2F6B45] shadow-lg"
          style={{ background: 'repeating-linear-gradient(180deg,#E3EFE6 0 8.33%,#D8E9DD 8.33% 16.66%)' }} onPointerMove={muovi} onPointerUp={su}>
          {/* linee del campo */}
          {[{ left: 0, right: 0, top: '50%', height: 0, borderTopWidth: 2 }, { left: '20%', right: '20%', top: 0, height: '15.7%' }, { left: '36.5%', right: '36.5%', top: 0, height: '5.2%' },
            { left: '20%', right: '20%', bottom: 0, height: '15.7%' }, { left: '36.5%', right: '36.5%', bottom: 0, height: '5.2%' }].map((st, i) => (
            <div key={i} className="absolute border-2 border-[#2F6B45]/55" style={st} />))}
          <div className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2F6B45]/55" />
          {posizioniDi(f.formation).map(([n, bx, by]) => {
            const pid = (f.lineup ?? {})[n], p = spostata?.n === n ? spostata : posizione(f, n, bx, by);
            return (
              <button key={n} type="button" aria-label={pid ? `Posizione ${n}: ${nome(pid)}` : `Posizione ${n} da assegnare`}
                onPointerDown={(e) => suGiu(e, n)} onClick={(e) => { if (!soloLettura && e.detail === 0) setScelta(n); /* da tastiera */ }}
                className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: `${p.x}%`, top: `${p.y}%`, cursor: soloLettura ? 'default' : 'grab' }}>
                <span className={`grid size-10 place-items-center rounded-full font-display text-xl font-bold ${pid ? 'border-2 border-white bg-blu text-white shadow-md' : 'border-2 border-dashed border-inchiostro/60 bg-white/40 text-inchiostro/70'}`}>{n}</span>
                {pid && <span className="max-w-20 truncate rounded-md bg-white px-1.5 py-0.5 text-xs font-bold shadow-sm">{cognome(nome(pid))}</span>}
              </button>
            );
          })}
        </div>
        {!soloLettura && Object.keys(f.slotPos ?? {}).length > 0 && (
          <button className={`${piccolo} mt-2 border-linea bg-white hover:border-blu`} onClick={() => salva({ slotPos: {} })}>Ripristina le posizioni del modulo</button>
        )}
        <p className="mt-2 text-sm text-grigio">{soloLettura ? 'Sola lettura.' : 'Tocca una posizione per scegliere chi metterci; trascina una pedina per spostarla.'}</p>
      </div>

      {/* ---------- titolari, panchina, disponibili ---------- */}
      <div className="space-y-4 lg:order-1">
        <section>
          <h2 className="mb-1 font-display text-xl font-bold">Titolari</h2>
          <ul className="divide-y divide-linea rounded-xl border border-linea bg-white px-3">
            {tit.map(({ slot, pid }) => (
              <li key={slot} className="flex items-center gap-2 py-1.5 text-sm">
                <b className="w-7 text-center font-display text-lg text-blu">{pid ? numero(pid) : '–'}</b>
                {pid ? <><span className="min-w-0 flex-1 truncate font-semibold">{nome(pid)}</span>
                  {pid === f.captain && <span className="rounded bg-oro px-1 text-[11px] font-bold">K</span>}{pid === f.vice && <span className="rounded bg-oro/50 px-1 text-[11px] font-bold">VK</span>}
                  {!soloLettura && <button className="px-1.5 text-lg text-grigio hover:text-rosso" aria-label={`Togli ${nome(pid)}`} onClick={() => salva(togli(f, slot))}>×</button>}</>
                  : <button type="button" className="flex-1 text-left text-grigio" onClick={() => !soloLettura && setScelta(slot)}>Posizione {slot} da assegnare</button>}
              </li>))}
          </ul>
        </section>
        <section>
          <h2 className="mb-1 font-display text-xl font-bold">Panchina</h2>
          {bench.length ? (
            <ul className="divide-y divide-linea rounded-xl border border-linea bg-white px-3">
              {bench.map((pid) => (
                <li key={pid} className="flex items-center gap-2 py-1.5 text-sm">
                  <b className="w-7 text-center font-display text-lg text-grigio">{numero(pid)}</b><span className="min-w-0 flex-1 truncate font-semibold">{nome(pid)}</span>
                  {!soloLettura && <button className="px-1.5 text-lg text-grigio hover:text-rosso" aria-label={`Togli ${nome(pid)} dalla panchina`} onClick={() => salva(panchina(f, pid))}>×</button>}
                </li>))}
            </ul>
          ) : <p className="text-sm text-grigio">Nessuno in panchina: aggiungili dai disponibili.</p>}
        </section>
        {liberi.length > 0 && (
          <section>
            <h2 className="mb-1 font-display text-xl font-bold">Disponibili</h2>
            <ul className="divide-y divide-linea rounded-xl border border-linea bg-white px-3">
              {liberi.map((g) => (
                <li key={g.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <button type="button" disabled={soloLettura} className="min-w-0 flex-1 truncate text-left font-semibold hover:text-blu"
                    onClick={() => { const n = primaLibera(f); if (n != null) salva(metti(f, n, g.id)); }}>{g.name}</button>
                  {!soloLettura && <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => salva(panchina(f, g.id))}>Panchina</button>}
                </li>))}
            </ul>
          </section>
        )}
      </div>

      {/* ---------- modulo, capitani, piazzati, note ---------- */}
      <div className="space-y-3 lg:order-3">
        <label className="block text-sm font-semibold">Modulo
          <select id="f-modulo" className="campo mt-1 font-display text-lg" value={f.formation || '1-4-4-1-1'} disabled={soloLettura} onChange={(e) => salva({ formation: e.target.value })}>
            {MODULI.map((m) => <option key={m}>{m}</option>)}
          </select></label>
        {(['captain', 'vice'] as const).map((k) => (
          <label key={k} className="block text-sm font-semibold">{k === 'captain' ? 'Capitano' : 'Vice capitano'}
            <select id={`f-${k}`} className="campo mt-1" value={f[k] || ''} disabled={soloLettura} onChange={(e) => salva({ [k]: e.target.value })}>
              <option value="">Nessuno</option>
              {opzioniCapitano.map((g) => <option key={g.id} value={g.id}>{[numero(g.id), g.name].filter(Boolean).join(' ')}</option>)}
            </select></label>))}
        <div className="text-sm">
          <span className="font-semibold">Calci piazzati</span>
          {piazzati.length ? <ol className="mt-1 list-inside list-decimal text-grigio">{piazzati.map((n, i) => <li key={i}>{n}</li>)}</ol>
            : <p className="text-grigio">Nessuno scelto.</p>}
          <a className={`${piccolo} mt-1 inline-block border-linea bg-white hover:border-blu`} href={linkPiazzati}>Scegli i piazzati</a>
        </div>
        <label className="block text-sm font-semibold">Note per la squadra
          <textarea id="f-note" className="campo mt-1" rows={5} value={f.notes || ''} readOnly={soloLettura} onChange={(e) => cambia({ notes: e.target.value })} /></label>
      </div>

      {/* ---------- scelta del giocatore per una posizione ---------- */}
      {scelta != null && !soloLettura && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={`Scegli il giocatore per la posizione ${scelta}`}
          onClick={(e) => { if (e.target === e.currentTarget) setScelta(null); }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <b className="font-display text-2xl">Posizione {scelta}</b>
              <button className={`${piccolo} border-linea`} onClick={() => setScelta(null)}>Chiudi</button>
            </div>
            {(f.lineup ?? {})[scelta] && (
              <button className={`${piccolo} mt-2 border-rosso text-rosso`} onClick={() => { salva(togli(f, scelta)); setScelta(null); }}>Togli {nome((f.lineup ?? {})[scelta])} dal campo</button>
            )}
            <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-grigio">Da mettere in campo</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {giocatori.filter((g) => !slotDi(f.lineup, g.id)).map((g) => (
                <button key={g.id} className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => { salva(metti(f, scelta, g.id)); setScelta(null); }}>
                  {bench.includes(g.id) && <b className="mr-1 text-grigio">{numero(g.id)}</b>}{g.name}</button>))}
            </div>
            {giocatori.some((g) => slotDi(f.lineup, g.id) && (f.lineup ?? {})[scelta] !== g.id) && (
              <>
                <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-grigio">Già in campo (si spostano qui)</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {giocatori.filter((g) => slotDi(f.lineup, g.id) && (f.lineup ?? {})[scelta] !== g.id).map((g) => (
                    <button key={g.id} className={`${piccolo} border-linea bg-carta hover:border-blu`} onClick={() => { salva(metti(f, scelta, g.id)); setScelta(null); }}>
                      <b className="mr-1 text-blu">{numero(g.id)}</b>{g.name}</button>))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}
