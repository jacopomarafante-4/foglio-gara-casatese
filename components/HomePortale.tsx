'use client';
// Home del Portale nell'app (tappa 3), come viewHome/viewHomeOrg del Portale. I pulsanti che portano alla Squadra (ancora
// nel Portale) aprono l'indirizzo giusto (#/allenamenti/<id>, #/tabellini/<id>, #/s:<squadra>/… per lo staff); quelli che
// devono prima creare qualcosa (allenamento di oggi, tabellino, prossima gara nel foglio) passano dalle azioni del server.
import { useState } from 'react';
import { CALENDARI, type Calendario } from '@/lib/condivisi';
import { calendario as calDi, fmtData, giorno, type Evento, type Impegno, type Partita } from '@/lib/programma';
import { SOGLIA_PRESENZE, assente, presenzaDi, type Allenamento, type DaFare, type riepilogo } from '@/lib/registro';
import { SIGLE } from '@/lib/statistiche';
import type { Portieri } from '@/lib/portale-dati';
import type { Avviso } from '@/components/calendario/Avvisi';
import { Legenda, RigaPartita } from '@/components/calendario/Righe';
import { ChipsPortieri } from '@/components/calendario/Portieri';
import { allenamentoDiOggi, preparaGara, tabellinoDi } from '@/app/(aree)/docs-actions';
import type { Risultato, stagioneSquadra } from '@/lib/home';

const pct = (v: number | null) => (v == null ? '—' : Math.round(v * 100) + '%');
const Scheda = ({ titolo, larga, children, bordo }: { titolo: string; larga?: boolean; children: React.ReactNode; bordo?: string }) => (
  <section className={`rounded-xl border border-linea bg-white p-4 ${larga ? 'md:col-span-2' : ''}`} style={bordo ? { borderLeft: `5px solid ${bordo}` } : undefined}>
    <h2 className="mb-2 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">{titolo}</h2>
    {children}
  </section>
);
const bottone = (primario = false) => `rounded-lg border px-3 py-1.5 text-sm font-semibold ${primario ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`;
const Voce = ({ onClick, href, children, primo }: { onClick?: () => void; href?: string; children: React.ReactNode; primo?: boolean }) => {
  const cls = `flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-carta ${primo ? 'font-semibold text-blu' : ''}`;
  return <li>{href ? <a href={href} className={cls}><span>{children}</span><span aria-hidden>›</span></a>
    : <button onClick={onClick} className={cls}><span>{children}</span><span aria-hidden>›</span></button>}</li>;
};
function AvvisiSocieta({ avvisi }: { avvisi: Avviso[] }) {
  if (!avvisi.length) return null;
  return (
    <Scheda titolo="Avvisi della società" larga bordo="#6B3FA0">
      <div className="space-y-2">
        {avvisi.map((a) => (
          <div key={a.id} className="rounded-lg bg-carta p-2.5">
            <p className="text-sm text-grigio">{[fmtData(a.data), a.autore].filter(Boolean).join(' · ')}</p>
            {a.titolo && <b className="block">{a.titolo}</b>}
            <p className="whitespace-pre-line">{a.testo}</p>
          </div>
        ))}
      </div>
    </Scheda>
  );
}

/* Stile A della Home (scelto il 30/09/2026): colori del club su fondo chiaro, la prossima partita in grande */
const Card = ({ titolo, destra, children, className = '', bordo }: { titolo?: string; destra?: React.ReactNode; children: React.ReactNode; className?: string; bordo?: string }) => (
  <section className={`rounded-2xl border border-linea bg-white p-4 ${className}`} style={bordo ? { borderLeft: `5px solid ${bordo}` } : undefined}>
    {titolo && <h2 className="mb-2 flex items-center justify-between gap-2 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">{titolo}{destra}</h2>}
    {children}
  </section>
);
const mese = (m: string) => ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'][+m.slice(5, 7) - 1];
/** Data in un riquadro: 9 / VEN */
const DataBox = ({ d, casa }: { d?: string; casa?: boolean }) => (
  <span className={`flex w-11 flex-none flex-col items-center rounded-lg py-1 font-display text-lg font-bold leading-none ${casa ? 'bg-blu/10 text-blu' : 'bg-carta'}`}>
    {d ? +d.slice(8, 10) : '–'}<small className="mt-0.5 font-sans text-[11px] font-semibold uppercase">{d ? giorno(d).slice(0, 3) : ''}</small>
  </span>
);
/** Andamento delle presenze mese per mese: linea sottile con l'ultimo punto evidenziato */
function Andamento({ punti }: { punti: { mese: string; pct: number }[] }) {
  if (punti.length < 2) return null;
  const w = 100, h = 40, x = (i: number) => 4 + (i * (w - 8)) / (punti.length - 1), y = (v: number) => h - 4 - v * (h - 8);
  const linea = punti.map((q, i) => `${x(i)},${y(q.pct)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-10 w-full" role="img" aria-label={punti.map((q) => `${mese(q.mese)} ${Math.round(q.pct * 100)}%`).join(', ')}>
      <polyline points={linea} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blu" />
      <circle cx={x(punti.length - 1)} cy={y(punti.at(-1)!.pct)} r="3.5" className="fill-blu" />
    </svg>
  );
}

export function HomeSquadra(p: {
  squadra: { id: string; name: string; category: string; mister: string }; squadraQs: string; oggi: string; weekend: string[]; adb: boolean;
  impegni: Impegno[]; portieri: Portieri | null; prossima: (Partita & { id: string }) | null; foglioPronto: boolean;
  allenamentoOggi: Allenamento | null; giocatori: string[]; daFare: DaFare[]; calendario: (Partita & { id: string })[];
  riepilogo: ReturnType<typeof riepilogo>; avvisi: Avviso[]; soloLettura: boolean;
  /* stile A */
  saluto: string; nomi: Record<string, string>; prossimi: Impegno[]; ultima: Risultato | null; andamento: { mese: string; pct: number }[];
  risposte: { si: number; no: number } | null; linkCampo: string; traQuanto: string;
  /* indicatori della dashboard (lib/statistiche.ts) */
  kpi: { tar: number | null; tmr: number | null };
}) {
  const [attesa, setAttesa] = useState('');
  /* pagine della Squadra già nell'app: indirizzo con la squadra dello staff (squadraQs = "squadra=<id>" o "") */
  const app = (path: string, q = '') => path + (q || p.squadraQs ? '?' + [q, p.squadraQs].filter(Boolean).join('&') : '');
  const NELL_APP_SQUADRA: Record<string, (id?: string) => string> = {
    allenamenti: (id) => app('/squadra/presenze', id ? 'allenamento=' + id : ''), rosa: () => app('/squadra/rosa'),
    statallen: () => app('/squadra/statistiche-allenamento'), tabellini: (id) => app('/squadra/tabellini', id ? 'partita=' + id : ''),
    statpartite: () => app('/squadra/statistiche-partite'), partita: () => app('/squadra/partita'),
    convocazioni: () => app('/squadra/convocazioni'),
  };
  const vai = (scheda: string) => {
    const [k, id] = scheda.split('/');
    window.location.assign(NELL_APP_SQUADRA[k] ? NELL_APP_SQUADRA[k](id) : app('/inizio'));
  };
  /* crea (se serve) e apre; i direttori sono in sola lettura: aprono soltanto */
  async function esegui(etichetta: string, azione: () => Promise<{ ok: boolean; errore?: string; valore?: string }>, poi: (id?: string) => string) {
    if (p.soloLettura) { vai(poi()); return; }
    setAttesa(etichetta);
    const r = await azione().catch(() => ({ ok: false, errore: 'rete assente', valore: undefined }));
    if (!r.ok) { setAttesa(`Non riuscito: ${r.errore ?? 'riprova'}`); return; }
    vai(poi(r.valore));
  }
  const prepara = (scheda: 'partita' | 'convocazioni') => p.prossima && (p.foglioPronto
    ? vai(scheda) : esegui('Preparo la gara…', () => preparaGara(p.squadra.id, p.prossima!), () => scheda));
  const apriDaFare = (x: DaFare) => {
    if (x.tipo === 'assenze') return vai('allenamenti');
    if (x.tipo === 'portieri') return vai('rosa');
    if (x.tipo === 'gol') return vai('tabellini/' + x.garaId);
    const m = p.calendario.find((c) => c.id === x.calId); if (!m) return;
    esegui('Apro il tabellino…', () => tabellinoDi(p.squadra.id, m), (id) => (id ? 'tabellini/' + id : 'tabellini'));
  };
  const [sab, dom] = p.weekend, r = p.riepilogo, max = 5, m = p.prossima;
  const presenti = p.allenamentoOggi ? p.giocatori.filter((g) => presenzaDi(p.allenamentoOggi!, g) === 'P').length : 0;
  const assenti = p.allenamentoOggi ? p.giocatori.filter((g) => assente(presenzaDi(p.allenamentoOggi!, g))).length : 0;
  const dataLunga = new Date(p.oggi + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const ultimoMese = p.andamento.at(-1), primoMese = p.andamento.at(-2);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-4xl font-bold">{p.saluto}{p.soloLettura ? '' : ', Mister'}</h1>
        <p className="text-grigio first-letter:uppercase">{dataLunga} · {[p.squadra.category, p.soloLettura && p.squadra.mister && 'Mister ' + p.squadra.mister].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AvvisiSocieta avvisi={p.avvisi} />

        {p.portieri ? (
          /* preparatori dei portieri: il weekend delle categorie dei loro portieri */
          <Card titolo={`Weekend · sab ${fmtData(sab).slice(0, 5)} e dom ${fmtData(dom).slice(0, 5)}`} className="md:col-span-2">
            {p.impegni.length ? (
              <><Legenda /><ul className="mt-1 divide-y divide-linea">
                {p.impegni.map((x, i) => (
                  <li key={(x.team?.id ?? 'ev') + x.id + i}>
                    <RigaPartita m={x} tutte conData={false} nomeSquadra={p.squadra.name} squadre={[]}><ChipsPortieri m={x} portieri={p.portieri!} /></RigaPartita>
                  </li>))}
              </ul></>
            ) : <p className="text-sm text-grigio">Nessuna partita delle tue categorie questo weekend.</p>}
            <a className={`${bottone()} mt-3 inline-block`} href="/squadra/calendario">Calendario</a>
          </Card>
        ) : (
          <Card titolo="Prossima partita" bordo="#003da5" className="md:col-span-2"
            destra={m && <span className="rounded-full bg-blu/10 px-2 py-1 font-display text-[13px] normal-case tracking-normal text-blu">{p.traQuanto}</span>}>
            {m ? (
              <>
                <p className="text-sm font-semibold first-letter:uppercase">{giorno(m.date)} {fmtData(m.date).slice(0, 5)}{m.time ? ' · ' + m.time : ''} · {m.friendly ? m.tipo || 'Amichevole' : 'Campionato'}</p>
                <p className="my-1 font-display text-3xl font-bold leading-tight">{m.opponent || 'Avversario da definire'}</p>
                <p className="text-sm text-grigio">{m.home ? 'In casa' : 'Trasferta'}{m.venue ? ' · ' + m.venue : ''}</p>
                {p.risposte && (p.risposte.si + p.risposte.no > 0) && (
                  <p className="mt-2 text-sm"><b className="text-verde">{p.risposte.si} ci saranno</b>{p.risposte.no ? <> · <b className="text-rosso">{p.risposte.no} non ci saranno</b></> : null} <span className="text-grigio">(risposte delle famiglie)</span></p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={bottone(true)} onClick={() => prepara('convocazioni')}>Convocazioni</button>
                  {!p.adb && <button className={bottone()} onClick={() => prepara('partita')}>{p.foglioPronto ? 'Apri la gara' : 'Prepara la gara'}</button>}
                  {p.linkCampo && <a className={bottone()} href={p.linkCampo} target="_blank" rel="noopener">Campo</a>}
                </div>
              </>
            ) : <p className="text-sm text-grigio">Nessuna partita in calendario. <a className="font-semibold text-blu" href="/squadra/calendario">Apri il calendario</a></p>}
          </Card>
        )}

        <Card titolo="Da fare">
          <ul>
            {p.allenamentoOggi
              ? <Voce href={app('/squadra/presenze', 'allenamento=' + p.allenamentoOggi.id)}>Presenze di oggi: <b>{presenti} present{presenti === 1 ? 'e' : 'i'}</b>, {assenti} assent{assenti === 1 ? 'e' : 'i'}</Voce>
              : !p.soloLettura && <Voce primo onClick={() => esegui('Apro l’allenamento di oggi…', () => allenamentoDiOggi(p.squadra.id, p.oggi, p.giocatori), (id) => (id ? 'allenamenti/' + id : 'allenamenti'))}>
                  Segna le presenze dell’allenamento di oggi</Voce>}
            {p.daFare.slice(0, max).map((x, i) => <Voce key={i} onClick={() => apriDaFare(x)}>{x.testo}</Voce>)}
          </ul>
          {p.daFare.length > max && <p className="text-sm text-grigio">…e altre {p.daFare.length - max}</p>}
          {!p.daFare.length && (
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-verde/15 text-verde" aria-hidden>✓</span>Tabellini e gol in ordine
            </p>
          )}
        </Card>

        {!p.portieri && (
          <Card titolo="Prossimi impegni">
            {p.prossimi.length ? (
              <ul className="divide-y divide-linea">
                {p.prossimi.map((x, i) => (
                  <li key={`${x.id}${i}`} className="flex items-center gap-3 py-2 text-sm">
                    <DataBox d={x.date} casa={x.home} />
                    <span className="min-w-0 flex-1"><b className="block truncate">{x.evento ? x.evento.titolo || 'Evento' : x.opponent}</b>
                      <span className="text-grigio">{[x.time, x.evento ? '' : x.home ? 'In casa' : 'Trasferta'].filter(Boolean).join(' · ')}</span></span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-bold ${x.evento ? 'bg-carta text-grigio' : x.friendly ? 'bg-oro/20 text-inchiostro' : 'bg-blu/10 text-blu'}`}>
                      {x.evento ? 'Evento' : x.friendly ? x.tipo || 'Amichevole' : 'Campionato'}</span>
                  </li>))}
              </ul>
            ) : <p className="text-sm text-grigio">Niente altro nelle prossime tre settimane.</p>}
            <a className="mt-2 inline-block text-sm font-semibold text-blu" href="/squadra/calendario">Calendario completo ›</a>
          </Card>
        )}

        {p.ultima && (
          <Card titolo="Ultimo risultato">
            <p className="text-sm text-grigio first-letter:uppercase">{giorno(p.ultima.data)} {fmtData(p.ultima.data).slice(0, 5)} · {p.ultima.casa ? 'in casa' : 'trasferta'}</p>
            <p className="my-1 flex items-baseline gap-3">
              <span className={`font-display text-3xl font-bold ${p.ultima.gf > p.ultima.ga ? 'text-verde' : p.ultima.gf < p.ultima.ga ? 'text-rosso' : ''}`}>{p.ultima.gf}–{p.ultima.ga}</span>
              <span className="font-semibold">{p.ultima.avversario}</span>
            </p>
            {p.ultima.marcatori.length > 0 && <p className="text-sm text-grigio">⚽ {p.ultima.marcatori.map((x) => `${p.nomi[x.id] ?? '?'}${x.gol > 1 ? ' ' + x.gol : ''}`).join(', ')}</p>}
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-2">
          <a href={app(p.adb ? '/squadra/tabellini' : '/squadra/statistiche-partite')} className="rounded-2xl border border-linea bg-white p-4 hover:border-blu">
            <h2 className="mb-1 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">Stagione</h2>
            {p.adb || !r.nNoti ? (
              <><p className="font-display text-4xl font-bold text-blu">{r.nG}</p><p className="text-sm text-grigio">partite giocate</p></>
            ) : (
              <><p className="font-display text-4xl font-bold text-blu">{r.v}–{r.n}–{r.p}</p>
                <p className="text-sm text-grigio">vinte · pari · perse<br />gol {r.gf} fatti, {r.gs} subiti</p></>
            )}
          </a>
          <a href={app('/squadra/statistiche-allenamento')} className="rounded-2xl border border-linea bg-white p-4 hover:border-blu">
            <h2 className="mb-1 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">Presenze</h2>
            <p className="font-display text-4xl font-bold text-blu">{pct(r.mediaPresenze)}</p>
            <Andamento punti={p.andamento} />
            <p className="text-sm text-grigio">{primoMese && ultimoMese ? `${mese(primoMese.mese)} ${pct(primoMese.pct)} → ${mese(ultimoMese.mese)} ${pct(ultimoMese.pct)}` : `${r.nT} allenamenti`}
              {r.sottoSoglia ? ` · ${r.sottoSoglia} sotto il ${SOGLIA_PRESENZE * 100}%` : ''}</p>
          </a>
          <a href={app('/squadra/dashboard')} className="col-span-2 rounded-2xl border border-linea bg-white p-4 hover:border-blu sm:col-span-1">
            <h2 className="mb-1 flex justify-between font-display text-[13px] font-bold uppercase tracking-wider text-grigio">Dashboard<span aria-hidden>›</span></h2>
            <dl className="space-y-2 text-sm">
              {([['TAR', pct(p.kpi.tar)], ['TMR', p.kpi.tmr == null ? '—' : p.kpi.tmr.toFixed(1)]] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="flex items-baseline justify-between gap-2"><span><b className="font-display text-blu">{k}</b> {SIGLE[k].nome}</span>
                    <b className="font-display text-2xl text-blu">{v}</b></dt>
                  <dd className="text-grigio">{SIGLE[k].spiegazione}</dd>
                </div>
              ))}
            </dl>
          </a>
        </div>
      </div>
      {attesa && <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">{attesa}</p>}
    </div>
  );
}

export function HomeOrganizzazione({ weekend, impegni, eventi, avvisi }: { weekend: string[]; impegni: Impegno[]; eventi: Evento[]; avvisi: Avviso[] }) {
  const [sab, dom] = weekend;
  const conta = (k: Calendario) => impegni.filter((m) => calDi(m) === k).length;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold">Organizzazione</h1>
        <p className="text-grigio">Calendari, campi, eventi e avvisi della società</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Scheda titolo={`Weekend · sab ${fmtData(sab).slice(0, 5)} e dom ${fmtData(dom).slice(0, 5)}`} larga>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CALENDARI) as Calendario[]).map((k) => (
              <a key={k} href="/calendari/tutte" className="flex flex-col rounded-lg border border-linea p-2.5 text-sm hover:border-blu" style={{ borderLeft: `5px solid ${CALENDARI[k].colore}` }}>
                <b className="font-display text-base">{CALENDARI[k].nome}</b><span><b>{conta(k)}</b> impegni</span>
              </a>
            ))}
          </div>
          <a className={`${bottone(true)} mt-3 inline-block`} href="/calendari/tutte">Apri la vista Giorno</a>
        </Scheda>
        <Scheda titolo="Prossimi eventi">
          {eventi.length ? <ul>{eventi.map((e) => <Voce key={e.id} href="/calendari/tutte">{giorno(e.data)} {fmtData(e.data).slice(0, 5)} · {e.titolo || 'Evento'}</Voce>)}</ul>
            : <p className="text-sm text-grigio">Nessun evento in programma.</p>}
          <a className={`${bottone(true)} mt-2 inline-block`} href="/calendari/tutte">+ Nuovo evento</a>
        </Scheda>
        <Scheda titolo="Ultimi avvisi">
          {avvisi.length ? <ul>{avvisi.map((a) => <Voce key={a.id} href="/calendari/avvisi">{fmtData(a.data).slice(0, 5)} · {a.titolo || a.testo.slice(0, 40)}</Voce>)}</ul>
            : <p className="text-sm text-grigio">Nessun avviso.</p>}
          <a className={`${bottone()} mt-2 inline-block`} href="/calendari/avvisi">Nuovo avviso</a>
        </Scheda>
      </div>
    </div>
  );
}

/* ---------- Home della società (admin e direttori) ---------- */
export type RigaSocieta = {
  squadra: { id: string; name?: string; category?: string }; adb: boolean; stagione: ReturnType<typeof stagioneSquadra>;
  risultati: Risultato[]; weekend: Impegno[]; tabelliniMancanti: number;
};
const sigla = (c?: string) => (c || '').split(' - ')[0].replace('Under ', 'U');

export function HomeSocieta(p: {
  saluto: string; nome: string; oggi: string; weekend: string[]; righe: RigaSocieta[]; eventiWeekend: Impegno[]; avvisi: Avviso[];
  scouting: { segnalazioni: number; incarichi: number; necessita: number };
}) {
  const [sab, dom] = p.weekend;
  const [tutti, setTutti] = useState(false);
  const dataLunga = new Date(p.oggi + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const impegni = [...p.righe.flatMap((r) => r.weekend), ...p.eventiWeekend]
    .sort((a, b) => ((a.date ?? '') + (a.time ?? '')).localeCompare((b.date ?? '') + (b.time ?? '')));
  const recenti = p.righe.flatMap((r) => r.risultati.map((x) => ({ ...x, squadra: r.squadra }))).sort((a, b) => b.data.localeCompare(a.data));
  const daSistemare = p.righe.flatMap((r) => [
    ...(r.tabelliniMancanti ? [{ testo: `${r.tabelliniMancanti} tabellin${r.tabelliniMancanti === 1 ? 'o' : 'i'} o gol da completare`, href: `/squadra/tabellini?squadra=${r.squadra.id}`, r }] : []),
    ...(r.stagione.sottoSoglia ? [{ testo: `${r.stagione.sottoSoglia} ragazz${r.stagione.sottoSoglia === 1 ? 'o' : 'i'} sotto il ${SOGLIA_PRESENZE * 100}% di presenze`, href: `/squadra/statistiche-allenamento?squadra=${r.squadra.id}`, r }] : []),
  ]);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-4xl font-bold">{p.saluto}{p.nome ? ', ' + p.nome : ''}</h1>
        <p className="text-grigio first-letter:uppercase">{dataLunga} · tutta la società</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AvvisiSocieta avvisi={p.avvisi} />

        <Card titolo={`Weekend · sab ${fmtData(sab).slice(0, 5)} e dom ${fmtData(dom).slice(0, 5)}`} bordo="#003da5" className="md:col-span-2"
          destra={<span className="rounded-full bg-blu/10 px-2 py-1 font-display text-[13px] normal-case tracking-normal text-blu">{impegni.length} impegni</span>}>
          {impegni.length ? (
            <>
              <Legenda />
              {[sab, dom].map((d) => {
                const delGiorno = impegni.filter((x) => x.date === d);
                const visibili = tutti ? delGiorno : delGiorno.slice(0, Math.max(0, 8 - (d === dom ? impegni.filter((x) => x.date === sab).length : 0)));
                if (!delGiorno.length || !visibili.length) return null;
                return (
                  <div key={d} className="mt-2">
                    <h3 className="text-sm font-bold first-letter:uppercase">{giorno(d)} {fmtData(d).slice(0, 5)} <span className="font-normal text-grigio">· {delGiorno.length}</span></h3>
                    <ul className="divide-y divide-linea">
                      {visibili.map((x, i) => (
                        <li key={`${x.team?.id ?? 'ev'}${x.id}${i}`} className="flex items-center gap-2 py-1.5 text-sm">
                          <span className="w-11 flex-none tabular-nums text-grigio">{x.time || '––'}</span>
                          <span className="size-2.5 flex-none rounded-full" style={{ background: CALENDARI[calDi(x)].colore }} title={CALENDARI[calDi(x)].nome} />
                          <span className="w-9 flex-none font-display font-bold text-blu">{x.evento ? 'Ev.' : sigla(x.team?.category)}</span>
                          <span className="min-w-0 flex-1 truncate">{x.evento ? x.evento.titolo || 'Evento' : x.opponent}</span>
                          {!x.evento && <span className={`flex-none rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${x.friendly ? 'bg-oro/20' : 'bg-blu/10 text-blu'}`}>{x.friendly ? x.tipo || 'Amich.' : 'Camp.'}</span>}
                        </li>))}
                    </ul>
                  </div>
                );
              })}
              {impegni.length > 8 && (
                <button className="mt-2 text-sm font-semibold text-blu" onClick={() => setTutti(!tutti)}>{tutti ? 'Mostra meno' : `Mostra tutti (${impegni.length})`}</button>
              )}
            </>
          ) : <p className="text-sm text-grigio">Nessun impegno questo weekend.</p>}
          <a className={`${bottone()} mt-3 inline-block`} href="/calendari/tutte">Tutte le squadre</a>
        </Card>

        <Card titolo="Risultati degli ultimi 10 giorni">
          {recenti.length ? (
            <ul className="divide-y divide-linea">
              {recenti.map((x) => (
                <li key={x.squadra.id + x.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-10 flex-none rounded-md bg-blu/10 py-0.5 text-center font-display text-sm font-bold text-blu">{sigla(x.squadra.category)}</span>
                  <span className={`w-12 flex-none text-center font-display text-xl font-bold ${x.gf > x.ga ? 'text-verde' : x.gf < x.ga ? 'text-rosso' : ''}`}>{x.gf}–{x.ga}</span>
                  <span className="min-w-0 flex-1"><b className="block truncate">{x.avversario}</b>
                    <span className="text-grigio">{fmtData(x.data).slice(0, 5)} · {x.casa ? 'in casa' : 'trasferta'}</span></span>
                </li>))}
            </ul>
          ) : <p className="text-sm text-grigio">Nessun risultato inserito negli ultimi 10 giorni.</p>}
        </Card>

        <Card titolo="Da sistemare">
          {daSistemare.length ? (
            <ul>{daSistemare.map((x, i) => <Voce key={i} href={x.href}><b>{sigla(x.r.squadra.category)}</b> · {x.testo}</Voce>)}</ul>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-6 place-items-center rounded-full bg-verde/15 text-verde" aria-hidden>✓</span>Tabellini e presenze in ordine</p>
          )}
          <h3 className="mb-1 mt-4 font-display text-[13px] font-bold uppercase tracking-wider text-grigio">Scouting</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Segnalazioni', p.scouting.segnalazioni, 'ultimi 7 giorni', '/giocatori'], ['Incarichi', p.scouting.incarichi, 'aperti', '/home'], ['Necessità', p.scouting.necessita, 'aperte', '/necessita']].map(([t, n, sotto, href]) => (
              <a key={t as string} href={href as string} className="rounded-xl bg-carta p-2 hover:bg-blu/10">
                <b className="block font-display text-2xl text-blu">{n}</b><span className="block text-xs font-semibold">{t}</span><span className="block text-[11px] text-grigio">{sotto}</span>
              </a>))}
          </div>
        </Card>

        <Card titolo="Stagione, squadra per squadra" className="md:col-span-2">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-grigio">
                <th className="px-1 py-1.5">Squadra</th><th className="px-1 text-center">Giocate</th><th className="px-1 text-center">V</th><th className="px-1 text-center">N</th>
                <th className="px-1 text-center">P</th><th className="px-1 text-center">Gol</th><th className="px-1 text-center">Presenze</th><th className="px-1" /></tr></thead>
              <tbody className="divide-y divide-linea">
                {p.righe.map((r) => {
                  const s = r.stagione, conRis = !r.adb && s.conRisultato > 0;
                  return (
                    <tr key={r.squadra.id}>
                      <td className="px-1 py-2 font-semibold">{r.squadra.category || r.squadra.name}</td>
                      <td className="px-1 text-center">{s.giocate}</td>
                      <td className="px-1 text-center">{conRis ? s.v : '–'}</td><td className="px-1 text-center">{conRis ? s.n : '–'}</td><td className="px-1 text-center">{conRis ? s.p : '–'}</td>
                      <td className="px-1 text-center">{conRis ? `${s.gf}–${s.gs}` : '–'}</td>
                      <td className={`px-1 text-center font-semibold ${s.presenze != null && s.presenze < SOGLIA_PRESENZE ? 'text-rosso' : ''}`}>{pct(s.presenze)}</td>
                      <td className="px-1 text-right"><a className="font-semibold text-blu" href={`/inizio?squadra=${r.squadra.id}`}>Apri ›</a></td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-grigio">Vinte, pari e perse contano le partite col risultato segnato nel tabellino; attività di base: solo le partite giocate.</p>
        </Card>
      </div>
    </div>
  );
}
