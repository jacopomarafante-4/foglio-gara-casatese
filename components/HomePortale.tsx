'use client';
// Home del Portale nell'app (tappa 3), come viewHome/viewHomeOrg del Portale. I pulsanti che portano alla Squadra (ancora
// nel Portale) aprono l'indirizzo giusto (#/allenamenti/<id>, #/tabellini/<id>, #/s:<squadra>/… per lo staff); quelli che
// devono prima creare qualcosa (allenamento di oggi, tabellino, prossima gara nel foglio) passano dalle azioni del server.
import { useState } from 'react';
import { CALENDARI, type Calendario } from '@/lib/condivisi';
import { calendario as calDi, fmtData, giorno, type Evento, type Impegno, type Partita } from '@/lib/programma';
import { SOGLIA_PRESENZE, assente, presenzaDi, type Allenamento, type DaFare, type riepilogo } from '@/lib/registro';
import type { Portieri } from '@/lib/portale-dati';
import type { Avviso } from '@/components/calendario/Avvisi';
import { Legenda, RigaPartita } from '@/components/calendario/Righe';
import { ChipsPortieri } from '@/components/calendario/Portieri';
import { allenamentoDiOggi, preparaGara, tabellinoDi } from '@/app/(aree)/docs-actions';

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

export function HomeSquadra(p: {
  squadra: { id: string; name: string; category: string; mister: string }; portale: string; squadraQs: string; oggi: string; weekend: string[]; adb: boolean;
  impegni: Impegno[]; portieri: Portieri | null; prossima: (Partita & { id: string }) | null; foglioPronto: boolean;
  allenamentoOggi: Allenamento | null; giocatori: string[]; daFare: DaFare[]; calendario: (Partita & { id: string })[];
  riepilogo: ReturnType<typeof riepilogo>; avvisi: Avviso[]; soloLettura: boolean;
}) {
  const [attesa, setAttesa] = useState('');
  /* pagine della Squadra già nell'app: indirizzo con la squadra dello staff (squadraQs = "squadra=<id>" o "") */
  const app = (path: string, q = '') => path + (q || p.squadraQs ? '?' + [q, p.squadraQs].filter(Boolean).join('&') : '');
  const NELL_APP_SQUADRA: Record<string, (id?: string) => string> = {
    allenamenti: (id) => app('/squadra/presenze', id ? 'allenamento=' + id : ''), rosa: () => app('/squadra/rosa'),
    statallen: () => app('/squadra/statistiche-allenamento'), tabellini: (id) => app('/squadra/tabellini', id ? 'partita=' + id : ''),
    statpartite: () => app('/squadra/statistiche-partite'),
  };
  const vai = (scheda: string) => {
    const [k, id] = scheda.split('/');
    window.location.assign(NELL_APP_SQUADRA[k] ? NELL_APP_SQUADRA[k](id) : p.portale + scheda);
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
  const [sab, dom] = p.weekend, r = p.riepilogo, max = 6;
  const presenti = p.allenamentoOggi ? p.giocatori.filter((g) => presenzaDi(p.allenamentoOggi!, g) === 'P').length : 0;
  const assenti = p.allenamentoOggi ? p.giocatori.filter((g) => assente(presenzaDi(p.allenamentoOggi!, g))).length : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold">{p.squadra.name}</h1>
        <p className="text-grigio">{[p.squadra.category, p.squadra.mister && 'Mister ' + p.squadra.mister].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AvvisiSocieta avvisi={p.avvisi} />

        <Scheda titolo={`Weekend · sab ${fmtData(sab).slice(0, 5)} e dom ${fmtData(dom).slice(0, 5)}`} larga>
          {p.impegni.length ? (
            <>
              <Legenda />
              <ul className="mt-1 divide-y divide-linea">
                {p.impegni.map((m, i) => (
                  <li key={(m.team?.id ?? 'ev') + m.id + i}>
                    <RigaPartita m={m} tutte={!!p.portieri} conData={false} nomeSquadra={p.squadra.name} squadre={[]}>
                      {p.portieri && <ChipsPortieri m={m} portieri={p.portieri} />}
                    </RigaPartita>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-grigio">Nessun impegno questo weekend.
              {p.prossima && ` Prossima partita: ${giorno(p.prossima.date)} ${fmtData(p.prossima.date)} · ${p.prossima.opponent || ''}.`}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {p.prossima && !p.adb && <button className={bottone(true)} onClick={() => prepara('partita')}>{p.foglioPronto ? 'Apri la gara' : 'Prepara la gara'}</button>}
            {p.prossima && <button className={bottone(p.adb)} onClick={() => prepara('convocazioni')}>Convocazioni</button>}
            <a className={bottone()} href="/calendari/squadra">{p.prossima ? 'Calendario' : 'Apri il calendario'}</a>
          </div>
        </Scheda>

        <Scheda titolo="Da fare">
          <ul>
            {p.allenamentoOggi
              ? <Voce href={app('/squadra/presenze', 'allenamento=' + p.allenamentoOggi.id)}>Presenze di oggi: <b>{presenti} presenti</b>, {assenti} assenti</Voce>
              : <Voce primo onClick={() => esegui('Apro l’allenamento di oggi…', () => allenamentoDiOggi(p.squadra.id, p.oggi, p.giocatori), (id) => (id ? 'allenamenti/' + id : 'allenamenti'))}>
                  Segna le presenze dell’allenamento di oggi</Voce>}
            {p.daFare.slice(0, max).map((x, i) => <Voce key={i} onClick={() => apriDaFare(x)}>{x.testo}</Voce>)}
          </ul>
          {p.daFare.length > max && <p className="text-sm text-grigio">…e altre {p.daFare.length - max}</p>}
          {!p.daFare.length && <p className="mt-1.5 text-sm text-grigio">Tabellini e gol in ordine ✓</p>}
        </Scheda>

        <Scheda titolo="Riepilogo stagione">
          <div className="grid grid-cols-2 gap-2">
            <a href={app('/squadra/statistiche-allenamento')} className="flex flex-col gap-0.5 rounded-lg border border-linea p-2.5 text-sm hover:border-blu">
              <b className="font-display text-base">Allenamento</b>
              <span><b>{r.nT}</b> allenamenti</span><span><b>{pct(r.mediaPresenze)}</b> presenza media</span>
              <span><b>{r.sottoSoglia}</b> sotto il {SOGLIA_PRESENZE * 100}%</span><span className="mt-1 font-semibold text-blu">Statistiche ›</span>
            </a>
            {p.adb ? (
              <a href={app('/squadra/tabellini')} className="flex flex-col gap-0.5 rounded-lg border border-linea p-2.5 text-sm hover:border-blu">
                <b className="font-display text-base">Partite</b>
                <span><b>{r.nG}</b> giocate</span><span><b>{r.presentiPerPartita == null ? '—' : r.presentiPerPartita.toFixed(1)}</b> presenti a partita</span>
                <span className="mt-1 font-semibold text-blu">Tabellini ›</span>
              </a>
            ) : (
              <a href={app('/squadra/statistiche-partite')} className="flex flex-col gap-0.5 rounded-lg border border-linea p-2.5 text-sm hover:border-blu">
                <b className="font-display text-base">Partite</b>
                <span><b>{r.nG}</b> giocate{r.nNoti ? ` · ${r.v}V ${r.n}N ${r.p}P` : ''}</span>
                <span><b>{r.nNoti ? `${r.gf}-${r.gs}` : '—'}</b> gol fatti-subiti</span>
                <span><b>{r.nNoti ? r.inviolata : '—'}</b> porta inviolata</span><span className="mt-1 font-semibold text-blu">Statistiche ›</span>
              </a>
            )}
          </div>
        </Scheda>
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
