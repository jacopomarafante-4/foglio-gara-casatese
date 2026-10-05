'use client';
// Squadra → Partite → Tabellini (come viewGames/gameEditor/viewGamesAdb/gameEditorAdb del Portale). Tabella: una colonna per
// partita del calendario (giocate + la prossima) e per quelle fuori calendario; toccandola si apre il tabellino. Agonistica:
// minuti, gol, gol subiti del portiere, autogol, durata; attività di base: presenti e risultato a tempi (3–5). Si salva da solo
// nel registro (registro/<squadra>.games, amichevoli in .friendlies); direttori in sola lettura.
import { useEffect, useRef, useState } from 'react';
import { segnaTabellinoPortiere } from '@/app/(aree)/docs-actions';
import {
  DURATA_PARTITA, TIPI_GARA, colonnePartite, garaGiocata, haGiocato, infoGara, inPortaGara, pctTesto, riepilogoTempi, risultato, testoTempi,
  type Gara, type Giocata, type Tempo,
} from '@/lib/registro';
import { fmtData, giorno, type Partita } from '@/lib/programma';
import { nuovoId } from '@/lib/calendario-portale';
import { Messaggio, useSalva } from '@/components/calendario/salvataggio';

type Cal = Partita & { id: string; friendly?: boolean; daRegistro?: boolean };
type GaraAdb = Gara & { tempi?: Tempo[]; nTempi?: number };
const num = (v: unknown) => +(v as number) || 0;
const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';
const etichetta = 'mb-1 block text-sm font-semibold text-grigio';

export function Tabellini({ squadraId, nomeSquadra, giocatori, portieri, calendario: cal0, gare: gare0, foglio, adb, oggi, aperto: aperto0, soloLettura, soloPortieriScrivibile = false }: {
  squadraId: string; nomeSquadra: string; giocatori: { id: string; name: string }[]; portieri: string[]; calendario: Cal[]; gare: GaraAdb[];
  foglio: { date?: string; opponent?: string; lineup?: Record<string, string>; bench?: string[] }; adb: boolean; oggi: string; aperto: string | null; soloLettura: boolean;
  /** preparatore dei portieri su un'altra squadra DELLE SUE CATEGORIE: minuti e gol subiti dei soli portieri (non in attività di base) */
  soloPortieriScrivibile?: boolean;
}) {
  const [gare, setGare] = useState(gare0);
  const [calendario, setCalendario] = useState(cal0);
  const [aperto, setAperto] = useState(aperto0);
  const { salva, messaggio, setMessaggio } = useSalva();
  const tabella = useRef<HTMLDivElement>(null);
  const path = 'registro/' + squadraId;
  const g = gare.find((x) => x.id === aperto) ?? null;

  useEffect(() => { if (tabella.current) tabella.current.scrollLeft = tabella.current.scrollWidth; }, [aperto]);
  function apri(id: string | null) {
    setAperto(id);
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('partita', id); else u.searchParams.delete('partita');
    window.history.replaceState(null, '', u); window.scrollTo(0, 0);
  }
  const salvaGara = (x: GaraAdb, attesa?: number) => { setGare((l) => (l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [...l, x])); salva(path, [{ lista: 'games', id: x.id, voce: x }], attesa); };
  /* colonna del calendario senza tabellino: si crea toccandola */
  function apriCal(m: Cal) {
    const c = gare.find((x) => x.calId === m.id); if (c) return apri(c.id);
    if (soloLettura) return;
    const nuova: GaraAdb = { id: nuovoId('gm'), calId: m.id, date: m.date, opponent: m.opponent || '', home: !!m.home, comp: m.friendly ? 'Amichevole' : 'Campionato', dur: DURATA_PARTITA, og: '', pl: {} };
    salvaGara(nuova, 0); apri(nuova.id);
  }
  function nuovaAmichevole() {
    const f: Cal = { id: nuovoId('am'), date: oggi, time: '', opponent: '', venue: '', home: true };
    const nuova: GaraAdb = { id: nuovoId('gm'), calId: f.id, date: f.date, opponent: '', home: true, comp: 'Amichevole', dur: DURATA_PARTITA, og: '', pl: {} };
    setCalendario((l) => [...l, { ...f, friendly: true, daRegistro: true }]);
    setGare((l) => [...l, nuova]);
    salva(path, [{ lista: 'friendlies', id: f.id, voce: f }, { lista: 'games', id: nuova.id, voce: nuova }], 0);
    apri(nuova.id);
  }
  function cambiaAmichevole(f: Cal, campi: Partial<Partita>) {
    const nuova = { ...f, ...campi };
    setCalendario((l) => l.map((x) => (x.id === f.id ? nuova : x)));
    const { friendly: _f, daRegistro: _d, ...voce } = nuova; void _f; void _d;
    salva(path, [{ lista: 'friendlies', id: f.id, voce }]);
  }
  function elimina(x: GaraAdb) {
    const cal = x.calId ? calendario.find((m) => m.id === x.calId) : undefined, fr = cal?.daRegistro ? cal : undefined;
    if (!confirm(fr ? `Eliminare l'amichevole del ${fmtData(fr.date)} con ${adb ? 'le presenze' : 'minuti e gol'}?` : x.calId ? `Cancellare ${adb ? 'le presenze' : 'minuti e gol'} di questa partita?` : `Eliminare la partita del ${fmtData(x.date)}?`)) return;
    setGare((l) => l.filter((y) => y.id !== x.id));
    if (fr) setCalendario((l) => l.filter((m) => m.id !== fr.id));
    salva(path, [{ lista: 'games', id: x.id, voce: null }, ...(fr ? [{ lista: 'friendlies', id: fr.id, voce: null }] : [])], 0);
    apri(null);
  }
  const titolo = (x: GaraAdb) => { const i = infoGara(x, calendario); return i.opponent ? (i.home ? `${nomeSquadra} - ${i.opponent}` : `${i.opponent} - ${nomeSquadra}`) : `Partita del ${fmtData(i.date)}`; };

  /* ---------- tabellino di una partita ---------- */
  if (g) {
    const i = infoGara(g, calendario), cal = i.cal as Cal | undefined, pl = g.pl ?? {};
    const scheda = (
      <div className="rounded-xl border border-linea bg-white p-3">
        <small className="text-grigio">{i.comp} · {giorno(i.date)} {fmtData(i.date)}{i.time ? ' · ' + i.time : ''}</small>
        <b className="block font-display text-xl">{titolo(g)}</b>{i.venue && <span className="text-sm text-grigio">{i.venue}</span>}
      </div>
    );
    const fondo = (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3"><button className="bottone" onClick={() => apri(null)}>Fatto</button>{!soloLettura && <span className="text-sm text-grigio">Si salva da solo.</span>}</div>
        {!soloLettura && <button className={`${piccolo} border-transparent text-rosso hover:bg-rosso/5`} onClick={() => elimina(g)}>{cal && !cal.daRegistro ? (adb ? 'Svuota presenze' : 'Svuota dati partita') : 'Elimina partita'}</button>}
      </div>
    );
    const indietro = <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => apri(null)}>← {adb ? 'Tabellini' : 'Tabella partite'}</button>;

    if (adb) {
      const nt = g.nTempi || Math.max(3, (g.tempi ?? []).length), t = g.tempi ?? [], r = riepilogoTempi(g.tempi), presenti = giocatori.filter((p) => haGiocato(pl[p.id] ?? {})).length;
      const tempo = (k: number, lato: 'noi' | 'loro', v: string) => {
        const nuovi = [...t]; nuovi[k] = { ...(nuovi[k] ?? {}), [lato]: v === '' ? '' : Math.max(0, Math.min(30, +v)) };
        salvaGara({ ...g, tempi: nuovi });
      };
      const presenza = (pid: string, on: boolean) => { const n = { ...pl }; if (on) n[pid] = { pres: true }; else delete n[pid]; salvaGara({ ...g, pl: n }); };
      return (
        <div className="space-y-3">
          {indietro}{scheda}
          <section className="rounded-xl border border-linea bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>Risultato a tempi</b>
              <div className="inline-flex overflow-hidden rounded-lg border border-linea" role="group" aria-label="Quanti tempi">
                {[3, 4, 5].map((k) => <button key={k} disabled={soloLettura} aria-pressed={nt === k} onClick={() => salvaGara({ ...g, nTempi: k, tempi: g.tempi?.slice(0, k) })}
                  className={`px-3 py-1.5 text-sm font-semibold ${nt === k ? 'bg-blu text-white' : 'bg-white'}`}>{k} tempi</button>)}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {Array.from({ length: nt }, (_, k) => (
                <div key={k} className="text-center"><small className="block text-grigio">{k + 1}° tempo</small>
                  <div className="flex items-center gap-1">
                    {(['noi', 'loro'] as const).map((lato, j) => (
                      <span key={lato} className="flex items-center gap-1">{j === 1 && '–'}
                        <input type="number" inputMode="numeric" min={0} max={30} placeholder="–" readOnly={soloLettura} aria-label={`Tempo ${k + 1}, gol ${lato === 'noi' ? 'nostri' : 'loro'}`}
                          className="w-12 rounded-lg border border-linea px-1 py-1.5 text-center" value={String(t[k]?.[lato] ?? '')} onChange={(e) => tempo(k, lato, e.target.value)} /></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-grigio">{r ? 'Tempi: ' + testoTempi(r) : 'A sinistra i nostri gol, a destra i loro. Facoltativo.'}</p>
          </section>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-verde/10 px-3 py-1 text-sm"><b>{presenti}</b> presenti</span>
            {!soloLettura && <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => salvaGara({ ...g, pl: Object.fromEntries(giocatori.map((p) => [p.id, { pres: true }])) })}>Tutti presenti</button>}
          </div>
          <ul className="space-y-1.5">
            {giocatori.map((p) => { const on = haGiocato(pl[p.id] ?? {});
              return (
                <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-2.5 ${on ? 'border-verde/40' : 'border-linea'}`}>
                  <b>{p.name}</b>
                  <div className="inline-flex overflow-hidden rounded-lg border border-linea" role="group" aria-label={`Presenza ${p.name}`}>
                    <button disabled={soloLettura} aria-pressed={on} onClick={() => presenza(p.id, true)} className={`px-3 py-1.5 text-sm font-semibold ${on ? 'bg-verde text-white' : 'bg-white'}`}>Presente</button>
                    <button disabled={soloLettura} aria-pressed={!on} onClick={() => presenza(p.id, false)} className={`px-3 py-1.5 text-sm font-semibold ${!on ? 'bg-rosso text-white' : 'bg-white'}`}>Assente</button>
                  </div>
                </li>
              ); })}
          </ul>
          {fondo}<Messaggio testo={messaggio} />
        </div>
      );
    }

    const sc = risultato(g, portieri);
    const inForm = !!foglio.date && (foglio.date === i.date || (!!i.opponent && (foglio.opponent || '').trim().toLowerCase() === i.opponent.trim().toLowerCase()));
    const ordinati = giocatori.slice().sort((a, b) => +inPortaGara(g, b.id, portieri) - +inPortaGara(g, a.id, portieri));
    const cambiaGioc = (pid: string, campi: Partial<Giocata>) => {
      const x = { ...(pl[pid] ?? {}), ...campi };
      if ('min' in campi) delete x.pres;   // con i minuti scritti la presenza "senza minuti" non serve più
      salvaGara({ ...g, pl: { ...pl, [pid]: x } });
    };
    /* preparatore su un'altra squadra: solo minuti e gol subiti DEI SUOI portieri (coach_tabellino_portiere; i gol fatti e
       "in porta in questa partita" restano al mister) */
    async function segnaMinGcPortiere(pid: string, min: number | null, gc: number | null) {
      setGare((l) => l.map((y) => (y.id !== g!.id ? y : { ...y, pl: { ...(y.pl ?? {}), [pid]: { ...(y.pl?.[pid] ?? {}), min: min ?? '', gc: gc ?? '', gk: true } } })));
      setMessaggio('Salvataggio…');
      const r = await segnaTabellinoPortiere(squadraId, g!.id, pid, min, gc).catch(() => ({ ok: false, errore: 'rete assente' }));
      setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
    }
    const numero = (v: string) => (v === '' ? '' : Math.max(0, +v || 0));
    const campoGara = (l: string, k: 'date' | 'opponent', tipo = 'text') => (
      <label><span className={etichetta}>{l}</span><input type={tipo} className="campo" readOnly={soloLettura} value={String(g[k] ?? '')} onChange={(e) => salvaGara({ ...g, [k]: e.target.value })} /></label>
    );
    return (
      <div className="space-y-3">
        {indietro}
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            {cal?.daRegistro ? (
              <div className="grid grid-cols-2 gap-2">
                <label><span className={etichetta}>Data</span><input type="date" className="campo" readOnly={soloLettura} value={cal.date || ''} onChange={(e) => cambiaAmichevole(cal, { date: e.target.value })} /></label>
                <label><span className={etichetta}>Ora</span><input type="time" className="campo" readOnly={soloLettura} value={cal.time || ''} onChange={(e) => cambiaAmichevole(cal, { time: e.target.value })} /></label>
                <label><span className={etichetta}>Avversario</span><input className="campo" placeholder="Es. Merate" readOnly={soloLettura} value={cal.opponent || ''} onChange={(e) => cambiaAmichevole(cal, { opponent: e.target.value })} /></label>
                <label><span className={etichetta}>Campo</span><input className="campo" placeholder="Campo" readOnly={soloLettura} value={cal.venue || ''} onChange={(e) => cambiaAmichevole(cal, { venue: e.target.value })} /></label>
                <label><span className={etichetta}>Sede</span><select className="campo" disabled={soloLettura} value={cal.home ? '1' : ''} onChange={(e) => cambiaAmichevole(cal, { home: !!e.target.value })}><option value="1">Casa</option><option value="">Trasferta</option></select></label>
              </div>
            ) : cal ? scheda : (
              <div className="grid grid-cols-2 gap-2">
                {campoGara('Data', 'date', 'date')}{campoGara('Avversario', 'opponent')}
                <label><span className={etichetta}>Sede</span><select className="campo" disabled={soloLettura} value={g.home ? '1' : ''} onChange={(e) => salvaGara({ ...g, home: !!e.target.value })}><option value="1">Casa</option><option value="">Trasferta</option></select></label>
                <label><span className={etichetta}>Tipo</span><select className="campo" disabled={soloLettura} value={i.comp} onChange={(e) => salvaGara({ ...g, comp: e.target.value })}>{TIPI_GARA.map((c) => <option key={c}>{c}</option>)}</select></label>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-linea bg-white px-4 py-2 text-center"><span className="block text-xs font-semibold text-grigio">Risultato</span>
            <b className="block font-display text-3xl">{sc ? `${sc.gf} - ${sc.ga}` : '– -'}</b><small className="text-grigio">calcolato dai gol</small></div>
        </div>
        {soloPortieriScrivibile && <p className="rounded-md bg-blu/10 px-4 py-3 text-sm text-blu">🧤 Qui scrivi solo minuti e gol subiti dei tuoi portieri.</p>}
        <div className="grid grid-cols-2 gap-2">
          <label><span className={etichetta}>Durata partita (minuti)</span><input type="number" inputMode="numeric" className="campo" readOnly={soloLettura} value={String(g.dur ?? DURATA_PARTITA)} onChange={(e) => salvaGara({ ...g, dur: e.target.value })} /></label>
          <label><span className={etichetta}>Autogol a favore</span><input type="number" inputMode="numeric" min={0} placeholder="0" className="campo" readOnly={soloLettura} value={String(g.og ?? '')} onChange={(e) => salvaGara({ ...g, og: e.target.value })} /></label>
        </div>
        {g.nomin && <p className="text-sm text-grigio">Per questa partita i minuti non sono stati registrati: ✓ = ha giocato. Se li conosci, scrivili.</p>}
        {inForm && !soloLettura && (
          <div className="flex flex-wrap items-center gap-2">
            <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => {
              const dur = num(g.dur) || DURATA_PARTITA, n = { ...pl };
              Object.values(foglio.lineup ?? {}).forEach((pid) => { n[pid] = { ...(n[pid] ?? {}), min: dur }; delete n[pid].pres; });
              (foglio.bench ?? []).forEach((pid) => { const x = { ...(n[pid] ?? {}) }; if (x.min == null || x.min === '') x.min = 0; n[pid] = x; });
              salvaGara({ ...g, pl: n }, 0);
            }}>Prendi titolari e panchina dalla Formazione</button>
            <span className="text-sm text-grigio">i titolari partono con i minuti pieni, la panchina a 0</span>
          </div>
        )}
        <ul className="space-y-1.5">
          {ordinati.map((p) => {
            const x = pl[p.id] ?? {}, gk = inPortaGara(g, p.id, portieri), on = haGiocato(x);
            /* min e gc: il preparatore può scriverli sui SUOI portieri (coach_tabellino_portiere), anche fuori dalla sua squadra */
            const puoScrivereGk = soloPortieriScrivibile && gk && portieri.includes(p.id);
            const casella = (l: string, k: 'min' | 'g' | 'gc', max: number, ph: string) => (
              <label className="text-center text-xs font-semibold text-grigio">{l}
                <input type="number" inputMode="numeric" min={0} max={max} placeholder={ph} readOnly={soloLettura && !(puoScrivereGk && k !== 'g')}
                  className="mt-0.5 block w-16 rounded-lg border border-linea px-1 py-1.5 text-center text-base text-inchiostro" value={String(x[k] ?? '')}
                  onChange={(e) => {
                    const v = numero(e.target.value);
                    if (!soloLettura) return cambiaGioc(p.id, { [k]: v });
                    if (puoScrivereGk && (k === 'min' || k === 'gc')) {
                      const altra = k === 'min' ? 'gc' : 'min', valoreAltra = x[altra] === '' || x[altra] == null ? null : num(x[altra]);
                      const questo = v === '' ? null : v;
                      segnaMinGcPortiere(p.id, k === 'min' ? questo : valoreAltra, k === 'gc' ? questo : valoreAltra);
                    }
                  }} />
              </label>
            );
            return (
              <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-2 ${on ? 'border-verde/40' : 'border-linea'}`}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <button disabled={soloLettura} aria-pressed={gk} title={gk ? 'In porta in questa partita' : 'Segna come portiere in questa partita'}
                    onClick={() => cambiaGioc(p.id, { gk: !gk })} className={`rounded-md px-1.5 py-1 ${gk ? 'bg-oro/30' : 'opacity-40 grayscale'}`}>🧤</button>
                  <b className="min-w-0 truncate">{p.name}</b>
                </span>
                <span className="flex gap-2">
                  {casella('Minuti', 'min', 130, x.pres && !num(x.min) ? '✓' : '0')}
                  {casella('Gol', 'g', 20, '0')}
                  {gk && casella('Subiti', 'gc', 30, '0')}
                </span>
              </li>
            );
          })}
        </ul>
        {fondo}<Messaggio testo={messaggio} />
      </div>
    );
  }

  /* ---------- tabella delle partite ---------- */
  const colonne = colonnePartite({ games: gare }, calendario, oggi);
  const giocate = colonne.filter((c) => c.gara && garaGiocata(c.gara));
  return (
    <div className="space-y-3">
      {!soloLettura && (
        <div className="flex flex-wrap items-center gap-2">
          <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={nuovaAmichevole}>+ Amichevole</button>
          <span className="text-sm text-grigio">finisce anche nel calendario della squadra</span>
        </div>
      )}
      {colonne.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna partita: le partite arrivano dal Calendario, oppure aggiungi un’amichevole.</p>
      ) : (
        <>
          <div ref={tabella} className="overflow-x-auto rounded-xl border border-linea bg-white">
            <table className="text-sm">
              <thead><tr className="border-b border-linea">
                <th className="sticky left-0 z-[1] bg-white px-2 py-1.5 text-left">Giocatore</th>
                {colonne.map(({ cal, gara }, ci) => {
                  const inf = gara ? infoGara(gara, calendario) : { date: cal!.date || '', opponent: cal!.opponent || '', home: !!cal!.home };
                  const futura = inf.date > oggi, sc = gara && !adb ? risultato(gara, portieri) : null, n = gara ? Object.values(gara.pl ?? {}).filter(haGiocato).length : 0;
                  const tt = gara && adb ? riepilogoTempi((gara as GaraAdb).tempi) : null;
                  return (
                    <th key={(gara?.id ?? cal!.id) + ci} className={`p-0 ${futura ? 'opacity-60' : ''}`}>
                      <button onClick={() => (gara ? apri(gara.id) : apriCal(cal!))} className="flex w-20 flex-col items-center px-1 py-1 leading-tight hover:bg-carta">
                        <small className="font-normal text-grigio">{fmtData(inf.date).slice(0, 5)}</small>
                        <span className="w-full truncate">{inf.opponent || 'Amichevole'}</span>
                        <em className="text-xs font-normal not-italic text-grigio">
                          {adb ? (futura ? 'prossima' : n ? `${n} presenti` : 'da segnare') : sc ? `${sc.gf}-${sc.ga}` : futura ? 'prossima' : inf.opponent ? (inf.home ? 'casa' : 'trasf.') : ''}
                          {tt && <><br />tempi {tt.v}-{tt.pa}-{tt.pe}</>}
                        </em>
                      </button>
                    </th>
                  );
                })}
                {adb ? <><th className="px-2">Pres.</th><th className="px-2">%</th></> : <><th className="px-2">Pres.</th><th className="px-2">Min</th><th className="px-2">Gol</th></>}
              </tr></thead>
              <tbody className="divide-y divide-linea">
                {giocatori.map((p) => {
                  let pres = 0, min = 0, gol = 0;
                  const celle = colonne.map(({ gara }, ci) => {
                    const x = gara ? (gara.pl ?? {})[p.id] ?? {} : {}, m = num(x.min);
                    if (haGiocato(x)) pres++; min += m; gol += num(x.g);
                    if (!haGiocato(x)) return <td key={ci} className="text-center text-grigio">{gara && garaGiocata(gara) ? '–' : ''}</td>;
                    if (adb || !m) return <td key={ci} className="bg-blu/5 text-center" title={adb ? 'Presente' : 'Ha giocato, minuti non registrati'}>✓</td>;
                    const gk = gara && inPortaGara(gara, p.id, portieri);
                    return <td key={ci} className="whitespace-nowrap bg-blu/5 px-1 text-center">{m}&apos;{num(x.g) ? <span className="ml-0.5">⚽{num(x.g) > 1 ? x.g : ''}</span> : null}{gk && x.gc != null && x.gc !== '' ? <span className="ml-0.5">🧤{x.gc}</span> : null}</td>;
                  });
                  return (
                    <tr key={p.id}>
                      <th scope="row" className="sticky left-0 z-[1] max-w-40 truncate bg-white px-2 py-1.5 text-left font-semibold">{!adb && portieri.includes(p.id) && '🧤 '}{p.name}</th>
                      {celle}
                      {adb ? <><td className="px-2 text-center font-semibold">{pres}</td><td className="px-2 text-center font-semibold">{giocate.length ? pctTesto(pres / giocate.length) : '—'}</td></>
                        : <><td className="px-2 text-center font-semibold">{pres}</td><td className="px-2 text-center font-semibold">{min}&apos;</td><td className="px-2 text-center font-semibold">{gol || ''}</td></>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-grigio">
            {adb ? 'Tocca una partita per segnare chi era presente. ✓ presente · – assente.'
              : 'Le partite arrivano dal Calendario (campionato e amichevoli): tocca una partita per segnare minuti, gol e gol subiti dal portiere. ⚽ gol · 🧤 gol subiti (portiere).'}
          </p>
        </>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}
