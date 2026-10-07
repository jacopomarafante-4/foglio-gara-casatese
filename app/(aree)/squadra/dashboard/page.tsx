// Squadra → Dashboard: statistiche della squadra in un colpo d'occhio (spunto: la dashboard di YouCoach). Ogni sigla ha la sua
// spiegazione sotto il numero. Calcoli in lib/statistiche.ts, grafici in components/squadra/Grafici.tsx.
import Link from 'next/link';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import type { Partita } from '@/lib/programma';
import { SOGLIA_PRESENZE, mesiDelRegistro, pctTesto, type Registro } from '@/lib/registro';
import { dashboard, SIGLE } from '@/lib/statistiche';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SceltaPeriodo } from '@/components/squadra/SceltaPeriodo';
import { SchedeStatistiche } from '@/components/squadra/SottoSchede';
import { Barre, Ciambella, Linea, Riquadro } from '@/components/squadra/Grafici';

const Sezione = ({ titolo, spiegazione, children }: { titolo: string; spiegazione?: string; children: React.ReactNode }) => (
  <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
    <div><h2 className="font-display text-2xl font-bold">{titolo}</h2>{spiegazione && <p className="text-sm text-grigio">{spiegazione}</p>}</div>
    {children}
  </section>
);
/** "Rossi Mario" → "Rossi M." per le intestazioni strette della tabella delle coppie */
const corto = (n: string) => { const [a, ...b] = n.split(' '); return b.length ? `${a} ${b[0][0]}.` : a; };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ squadra?: string; periodo?: string; coppie?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  const id = squadra.id, adb = eta <= 13;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'calendar/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as Registro;
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const calendario = [...((docs['calendar/' + id]?.matches ?? []) as (Partita & { id: string })[]), ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true }))];
  const mesi = mesiDelRegistro(reg, calendario);
  const periodo = q.periodo && mesi.includes(q.periodo) ? q.periodo : 'all';
  const d = dashboard(reg, giocatori, calendario, periodo);

  /* tabella delle coppie: minuti insieme (SMM) o % di partite insieme (PPC); i ragazzi che hanno giocato, dal più presente */
  const inMinuti = d.conMinuti && q.coppie !== 'pct';
  const inCampo = d.minuti.filter((m) => m.partite).sort((a, b) => b.min - a.min || b.partite - a.partite).map((m) => m.p);
  const valore = (a: string, b: string) => { const c = d.coppie[a]?.[b]; return !c ? 0 : inMinuti ? c.min : c.insieme / d.partite; };
  const massimo = Math.max(1e-9, ...inCampo.flatMap((a) => inCampo.map((b) => (a.id === b.id ? 0 : valore(a.id, b.id)))));
  const link = (coppie: string) => conSquadra(`/squadra/dashboard?coppie=${coppie}${periodo !== 'all' ? '&periodo=' + periodo : ''}`);
  const chip = (attivo: boolean) => `rounded-full px-3 py-1 text-sm font-semibold ${attivo ? 'bg-blu text-white' : 'border border-linea bg-white'}`;
  const sigla = inMinuti ? 'SMM' : 'PPC';

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Dashboard</h1>
      <SchedeStatistiche attiva="/squadra/dashboard" adb={adb} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {giocatori.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima serve la rosa (Squadra → Rosa).</p> : (
        <>
          <SceltaPeriodo mesi={mesi} periodo={periodo} />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Riquadro nome="Allenamenti" valore={d.allenamenti} spiegazione="Allenamenti con le presenze segnate nel periodo." />
            <Riquadro sigla="TAR" valore={pctTesto(d.tar)} />
            <Riquadro sigla="TMR" valore={d.tmr == null ? '—' : d.tmr.toFixed(1)} />
            <Riquadro nome="Partite giocate" valore={d.partite}
              spiegazione={!adb && d.risultati.noti ? `${d.risultati.v} vinte, ${d.risultati.n} pari, ${d.risultati.p} perse (col risultato nel tabellino).` : 'Partite con il tabellino compilato nel periodo.'} />
            <Riquadro sigla="RR" valore="" attivo={false} />
            <Riquadro sigla="DOR" valore="" attivo={false} />
          </div>

          <Sezione titolo="Presenze allenamento per allenamento" spiegazione={`% di ragazzi presenti a ogni seduta (esclusi gli infortunati). La linea rossa è la soglia del ${SOGLIA_PRESENZE * 100}%.`}>
            <Linea punti={d.andamento} soglia={SOGLIA_PRESENZE} />
          </Sezione>

          <Sezione titolo="Assenze per motivo" spiegazione="Quante assenze agli allenamenti, divise per il motivo segnato nelle presenze.">
            <Ciambella voci={d.assenze} unita="Assenze" />
          </Sezione>

          {d.partite > 0 && (
            <Sezione titolo={d.conMinuti ? 'Minuti giocati' : 'Partite giocate'}
              spiegazione={d.conMinuti ? 'Minuti in campo di ogni ragazzo nel periodo, con le partite giocate.' : 'Partite in cui ogni ragazzo era presente.'}>
              <Barre unita={d.conMinuti ? "'" : ''}
                voci={d.minuti.slice().sort((a, b) => b.min - a.min || b.partite - a.partite)
                  .map((m) => ({ l: m.p.name, n: d.conMinuti ? m.min : m.partite, sotto: d.conMinuti ? `${m.partite} partite` : undefined }))} />
            </Sezione>
          )}

          {inCampo.length > 1 && (
            <Sezione titolo={`${sigla} · ${SIGLE[sigla].nome}`} spiegazione={SIGLE[sigla].spiegazione + ' Più il colore è scuro, più giocano insieme.'}>
              {d.conMinuti && (
                <div className="flex gap-2">
                  <Link href={link('min')} className={chip(inMinuti)}>Minuti insieme</Link>
                  <Link href={link('pct')} className={chip(!inMinuti)}>% partite insieme</Link>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead><tr><th className="sticky left-0 bg-white" />
                    {inCampo.map((b) => <th key={b.id} title={b.name} className="h-28 w-9 whitespace-nowrap px-0.5 align-bottom font-semibold">
                      <span className="inline-block -rotate-60 origin-bottom-left translate-x-3">{corto(b.name)}</span></th>)}
                  </tr></thead>
                  <tbody>
                    {inCampo.map((a) => (
                      <tr key={a.id}>
                        <th className="sticky left-0 whitespace-nowrap bg-white pr-2 text-left font-semibold">{corto(a.name)}</th>
                        {inCampo.map((b) => {
                          if (a.id === b.id) return <td key={b.id} className="bg-carta" />;
                          const v = valore(a.id, b.id), forza = v / massimo;
                          return (
                            <td key={b.id} title={`${a.name} e ${b.name}: ${inMinuti ? v + ' minuti' : Math.round(v * 100) + '% delle partite'}`}
                              className="size-9 border border-white text-center" style={{ background: `rgba(0, 61, 165, ${0.08 + forza * 0.85})`, color: forza > 0.5 ? 'white' : undefined }}>
                              {v ? (inMinuti ? v : Math.round(v * 100)) : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Sezione>
          )}

          <Sezione titolo="Da attivare" spiegazione="Indicatori che servono a te ma per cui oggi l'app non registra i dati.">
            <ul className="space-y-1.5 text-sm">
              {(['RR', 'DOR', 'YIA'] as const).map((k) => (
                <li key={k}><b className="font-display text-blu">{k}</b> · <b>{SIGLE[k].nome}</b>: {SIGLE[k].spiegazione}{' '}
                  <span className="text-grigio">{k === 'YIA' ? 'Serve l’anno di arrivo in Academy di ogni ragazzo.' : 'Serve la data di entrata e di uscita dalla rosa.'}</span></li>
              ))}
              <li><b>Fasi, mezzi, obiettivi e difficoltà dell’allenamento</b>: <span className="text-grigio">servono le sedute con gli esercizi (Esercitazioni, in lavorazione).</span></li>
            </ul>
          </Sezione>
        </>
      )}
    </div>
  );
}
