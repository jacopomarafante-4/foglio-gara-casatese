// Squadra → Dashboard: statistiche della squadra in un colpo d'occhio (spunto: la dashboard di YouCoach). Ogni sigla ha la sua
// spiegazione sotto il numero. Calcoli in lib/statistiche.ts, grafici in components/squadra/Grafici.tsx.
import Link from 'next/link';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import type { Partita } from '@/lib/programma';
import { SOGLIA_PRESENZE, mesiDelRegistro, pctTesto, type Registro } from '@/lib/registro';
import { dashboard, SIGLE, storiaRosa, type Storico } from '@/lib/statistiche';
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

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ squadra?: string; periodo?: string; coppie?: string; con?: string }> }) {
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
  const storia = storiaRosa(giocatori, (docs['roster/' + id] as { storico?: Storico } | null)?.storico);

  /* tabella delle coppie: minuti insieme (SMM) o % di partite insieme (PPC); i ragazzi che hanno giocato, dal più presente */
  // vista della tabella: minuti insieme (solo con i minuti), numero di partite insieme, o % delle partite della squadra
  const vista: 'min' | 'num' | 'pct' = q.coppie === 'pct' ? 'pct' : q.coppie === 'num' || !d.conMinuti ? 'num' : 'min';
  const inMinuti = vista === 'min';
  const inCampo = d.minuti.filter((m) => m.partite).sort((a, b) => b.min - a.min || b.partite - a.partite).map((m) => m.p);
  const valore = (a: string, b: string) => { const c = d.coppie[a]?.[b]; return !c ? 0 : vista === 'min' ? c.min : vista === 'num' ? c.insieme : c.insieme / d.partite; };
  const scritto = (v: number) => (vista === 'pct' ? Math.round(v * 100) : v);
  const spiega = (v: number) => (vista === 'min' ? `${v} minuti` : vista === 'num' ? `${v} ${v === 1 ? 'partita' : 'partite'} insieme` : `${Math.round(v * 100)}% delle partite`);
  /* "Con chi gioca di più": il ragazzo scelto (?con=id) e gli altri in ordine di partite insieme */
  const scelto = inCampo.find((p) => p.id === q.con) ?? inCampo[0];
  const compagni = scelto ? inCampo.filter((p) => p.id !== scelto.id).map((p) => ({ p, n: d.coppie[scelto.id]?.[p.id]?.insieme ?? 0 })).sort((x, y) => y.n - x.n) : [];
  const partiteScelto = d.minuti.find((m) => m.p.id === scelto?.id)?.partite ?? 0;
  const massimo = Math.max(1e-9, ...inCampo.flatMap((a) => inCampo.map((b) => (a.id === b.id ? 0 : valore(a.id, b.id)))));
  const link = (coppie: string, con = q.con) => conSquadra(`/squadra/dashboard?coppie=${coppie}${con ? '&con=' + con : ''}${periodo !== 'all' ? '&periodo=' + periodo : ''}`);
  const chip = (attivo: boolean) => `rounded-full px-3 py-1 text-sm font-semibold ${attivo ? 'bg-blu text-white' : 'border border-linea bg-white'}`;
  const sigla = inMinuti ? 'SMM' : 'PPC';
  const titoloTabella = vista === 'min' ? `SMM · ${SIGLE.SMM.nome}` : vista === 'num' ? 'Partite giocate insieme' : `PPC · ${SIGLE.PPC.nome}`;
  const spiegazioneTabella = vista === 'num' ? 'Per ogni coppia di ragazzi, quante partite hanno giocato tutti e due (convocato = presente).' : SIGLE[sigla].spiegazione;

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
            <Riquadro sigla="RR" valore={pctTesto(storia?.rr ?? null)} attivo={!!storia}
              spiegazione={storia ? `${SIGLE.RR.spiegazione} ${storia.rimasti} su ${storia.primaQuanti} del ${storia.stagione}.` : undefined} />
            <Riquadro sigla="DOR" valore={pctTesto(storia?.dor ?? null)} attivo={!!storia}
              spiegazione={storia ? `${SIGLE.DOR.spiegazione} ${storia.usciti} su ${storia.primaQuanti} del ${storia.stagione}.` : undefined} />
            <Riquadro sigla="YIA" valore={storia?.yia == null ? '—' : storia.yia.toFixed(1).replace('.', ',')} attivo={!!storia}
              spiegazione={storia ? `${SIGLE.YIA.spiegazione} ${storia.nuovi} ragazzi sono al primo anno.` : undefined} />
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
            <>
            <Sezione titolo="Con chi gioca di più" spiegazione="Scegli un ragazzo: gli altri in ordine di partite giocate insieme a lui.">
              <div className="flex flex-wrap gap-1.5">
                {inCampo.map((p) => <Link key={p.id} href={link(q.coppie ?? '', p.id)} className={chip(p.id === scelto?.id)}>{corto(p.name)}</Link>)}
              </div>
              {scelto && <p className="text-sm text-grigio"><b className="text-inchiostro">{scelto.name}</b> ha giocato {partiteScelto} {partiteScelto === 1 ? 'partita' : 'partite'}. Insieme a:</p>}
              <Barre unita="" voci={compagni.map((x) => ({ l: x.p.name, n: x.n, sotto: partiteScelto ? `${Math.round((x.n / partiteScelto) * 100)}% delle sue` : undefined }))} />
            </Sezione>
            <Sezione titolo={titoloTabella} spiegazione={spiegazioneTabella + ' Più il colore è scuro, più giocano insieme.'}>
              <div className="flex flex-wrap gap-2">
                {d.conMinuti && <Link href={link('min')} className={chip(vista === 'min')}>Minuti insieme</Link>}
                <Link href={link('num')} className={chip(vista === 'num')}>Partite insieme</Link>
                <Link href={link('pct')} className={chip(vista === 'pct')}>% delle partite</Link>
              </div>
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
                            <td key={b.id} title={`${a.name} e ${b.name}: ${spiega(v)}`}
                              className="size-9 border border-white text-center" style={{ background: `rgba(0, 61, 165, ${0.08 + forza * 0.85})`, color: forza > 0.5 ? 'white' : undefined }}>
                              {v ? scritto(v) : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Sezione>
            </>
          )}

          <Sezione titolo="Da attivare" spiegazione="Indicatori che servono a te ma per cui oggi l'app non registra i dati.">
            <ul className="space-y-1.5 text-sm">
              {!storia && <li><b className="font-display text-blu">RR, DOR, YIA</b>: <span className="text-grigio">mancano le rose delle stagioni passate per questa annata.</span></li>}
              <li><b>Fasi, mezzi, obiettivi e difficoltà dell’allenamento</b>: <span className="text-grigio">servono le sedute con gli esercizi (Esercitazioni, in lavorazione).</span></li>
            </ul>
          </Sezione>
        </>
      )}
    </div>
  );
}
