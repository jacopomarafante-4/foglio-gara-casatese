// Home di admin e direttori come dashboard della società (07/10/2026): fascia del club con 4 numeri e i loro mini-grafici,
// presenze per squadra, risultati della stagione, weekend per calendario, imbuto dello scouting. Grafici in SVG, ogni numero con
// la sua spiegazione. Componente server: i dati li prepara app/(aree)/inizio/page.tsx.
import { CALENDARI, type Calendario } from '@/lib/condivisi';
import { calendario as calDi, fmtData, giorno, type Impegno } from '@/lib/programma';
import { SOGLIA_PRESENZE } from '@/lib/registro';
import { STATI, type StatoGiocatore } from '@/lib/tipi';
import type { Avviso } from '@/components/calendario/Avvisi';
import { Colonne, Fascia, NumeroFascia, Riquadro, Sparkline } from '@/components/dashboard/Pezzi';

export type SquadraDash = {
  id: string; sigla: string; categoria: string; adb: boolean; rosa: number; allenamenti: number; presenza: number | null;
  andamento: { mese: string; pct: number }[]; giocate: number; v: number; n: number; p: number; gf: number; gs: number; conRisultato: number;
  sottoSoglia: number; tabelliniMancanti: number;
};
export type RisultatoDash = { id: string; sigla: string; data: string; avversario: string; casa: boolean; gf: number; ga: number };
export type ScoutingRecente = { id: string; tipo: 'segnalazione' | 'valutazione'; data: string; giocatoreId: string; giocatore: string; annata: number;
  societa: string; autore: string; esito: string | null };
const ESITI: Record<string, [string, string]> = {
  positiva: ['Positiva', 'bg-verde/15 text-verde'], da_rivedere: ['Da rivedere', 'bg-oro/25 text-inchiostro'], negativa: ['Negativa', 'bg-rosso/10 text-rosso'],
  da_prendere: ['Da prendere', 'bg-verde/15 text-verde'], non_a_livello: ['Non a livello', 'bg-rosso/10 text-rosso'],
};
export type ScoutingDash = { settimane: { da: string; n: number }[]; perStato: Partial<Record<StatoGiocatore, number>>; valutazioni30: number; incarichi: number; necessita: number };

const pct = (v: number | null) => (v == null ? '—' : Math.round(v * 100) + '%');
const colorePresenza = (v: number | null) => (v == null ? 'var(--color-linea)' : v < SOGLIA_PRESENZE ? 'var(--color-rosso)' : v < 0.85 ? 'var(--color-oro)' : 'var(--color-verde)');

export function DashboardSocieta(p: {
  saluto: string; nome: string; oggi: string; weekend: string[]; squadre: SquadraDash[]; impegni: Impegno[]; recenti: RisultatoDash[];
  avvisi: Avviso[]; scouting: ScoutingDash; scoutingWeekend: { sab: string; dom: string; righe: ScoutingRecente[]; delWeekend: boolean };
}) {
  const sw = p.scoutingWeekend;
  const [sab, dom] = p.weekend;
  const dataLunga = new Date(p.oggi + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const conPresenza = p.squadre.filter((s) => s.presenza != null);
  const presenzaMedia = conPresenza.length ? conPresenza.reduce((a, s) => a + s.presenza!, 0) / conPresenza.length : null;
  /* presenza della società mese per mese: media delle squadre che hanno allenamenti in quel mese */
  const mesi = [...new Set(p.squadre.flatMap((s) => s.andamento.map((x) => x.mese)))].sort();
  const andamento = mesi.map((m) => { const v = p.squadre.map((s) => s.andamento.find((x) => x.mese === m)?.pct).filter((x): x is number => x != null); return v.reduce((a, x) => a + x, 0) / v.length; });
  const ago = p.squadre.filter((s) => !s.adb);
  const tot = ago.reduce((a, s) => ({ g: a.g + s.giocate, v: a.v + s.v, n: a.n + s.n, p: a.p + s.p, gf: a.gf + s.gf, gs: a.gs + s.gs }), { g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0 });
  const giocateTutte = p.squadre.reduce((a, s) => a + s.giocate, 0);
  const segn8 = p.scouting.settimane.reduce((a, x) => a + x.n, 0);
  const perCal = (Object.keys(CALENDARI) as Calendario[]).map((k) => ({ k, n: p.impegni.filter((x) => calDi(x) === k).length }));
  const stati: StatoGiocatore[] = ['in_lista', 'in_osservazione', 'positivo', 'da_rivedere', 'inserito'];
  const maxStato = Math.max(1, ...stati.map((s) => p.scouting.perStato[s] ?? 0));
  const daSistemare = p.squadre.filter((s) => s.tabelliniMancanti || s.sottoSoglia);
  const maxGiocate = Math.max(1, ...ago.map((s) => s.v + s.n + s.p));

  return (
    <div className="space-y-4">
      <Fascia titolo={`${p.saluto}${p.nome ? ', ' + p.nome : ''}`} sottotitolo={`${dataLunga} · tutta la società · ${p.squadre.length} squadre`}>
          <NumeroFascia titolo="Presenza" valore={pct(presenzaMedia)} sotto="Media degli allenamenti di tutte le squadre, esclusi gli infortuni.">
            <Sparkline valori={andamento} />
          </NumeroFascia>
          <NumeroFascia titolo="Partite" valore={giocateTutte} sotto={tot.v + tot.n + tot.p ? `Agonistica: ${tot.v} vinte · ${tot.n} pari · ${tot.p} perse.` : 'Partite col tabellino compilato.'}>
            {tot.v + tot.n + tot.p > 0 && (
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
                <i className="bg-verde" style={{ width: `${(tot.v / (tot.v + tot.n + tot.p)) * 100}%` }} />
                <i className="bg-white/70" style={{ width: `${(tot.n / (tot.v + tot.n + tot.p)) * 100}%` }} />
                <i className="bg-rosso" style={{ width: `${(tot.p / (tot.v + tot.n + tot.p)) * 100}%` }} />
              </div>
            )}
          </NumeroFascia>
          <NumeroFascia titolo="Gol" valore={<>{tot.gf}<span className="text-white/60">–</span>{tot.gs}</>} sotto={`Fatti e subiti dalle squadre agonistiche (${tot.gf - tot.gs >= 0 ? '+' : ''}${tot.gf - tot.gs}).`} />
          <NumeroFascia titolo="Segnalazioni" valore={segn8} sotto="Scouting: nuove segnalazioni nelle ultime 8 settimane.">
            <Colonne valori={p.scouting.settimane.map((x) => x.n)} />
          </NumeroFascia>
        </Fascia>

      {p.avvisi.length > 0 && (
        <Riquadro titolo="Avvisi della società" spiegazione="Pubblicati negli ultimi 14 giorni." href="/calendari/avvisi">
          <ul className="space-y-2">{p.avvisi.map((a) => (
            <li key={a.id} className="rounded-lg bg-carta p-2.5"><p className="text-sm text-grigio">{fmtData(a.data)}{a.autore ? ' · ' + a.autore : ''}</p>
              {a.titolo && <b className="block">{a.titolo}</b>}<p className="line-clamp-2 whitespace-pre-line">{a.testo}</p></li>))}</ul>
        </Riquadro>
      )}

      <Riquadro titolo={`Scouting del weekend · ${fmtData(sw.sab).slice(0, 5)} e ${fmtData(sw.dom).slice(0, 5)}`}
        spiegazione={sw.delWeekend ? `Segnalazioni e valutazioni di giocatori visti nel weekend: ${sw.righe.filter((x) => x.tipo === 'segnalazione').length} segnalazioni, ${sw.righe.filter((x) => x.tipo === 'valutazione').length} valutazioni.`
          : 'Nel weekend nessuna segnalazione o valutazione: qui le ultime 5.'} href="/giocatori">
        {sw.righe.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {sw.righe.map((x) => (
              <li key={x.id}>
                <a href={`/giocatori/${x.giocatoreId}`} className={`flex items-start gap-3 rounded-xl border-l-4 bg-carta p-2.5 hover:bg-blu/5 ${x.tipo === 'valutazione' ? 'border-oro' : 'border-blu'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2"><b className="truncate">{x.giocatore}</b><span className="text-sm text-grigio">{x.annata}</span></span>
                    <span className="block truncate text-sm text-grigio">{[x.societa, x.autore].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-grigio">{x.tipo === 'valutazione' ? 'Valutazione' : 'Segnalazione'} · {fmtData(x.data).slice(0, 5)}</span>
                    {x.esito && ESITI[x.esito] && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESITI[x.esito][1]}`}>{ESITI[x.esito][0]}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-grigio">Ancora nessuna segnalazione.</p>}
      </Riquadro>

      <div className="grid gap-4 lg:grid-cols-2">
        <Riquadro titolo="Presenze per squadra" spiegazione={`Verde dall’85%, oro fino al ${SOGLIA_PRESENZE * 100}%, rosso sotto. La riga tratteggiata è la soglia.`}>
          <ul className="space-y-2">
            {p.squadre.map((s) => (
              <li key={s.id}>
                <a href={`/inizio?squadra=${s.id}`} className="grid grid-cols-[3rem_1fr_3.2rem] items-center gap-2 text-sm hover:opacity-80">
                  <b className="font-display text-base text-blu">{s.sigla}</b>
                  <span className="relative h-5 overflow-hidden rounded-md bg-carta">
                    <i className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${(s.presenza ?? 0) * 100}%`, background: colorePresenza(s.presenza) }} />
                    <i className="absolute inset-y-0 border-l-2 border-dashed border-inchiostro/40" style={{ left: `${SOGLIA_PRESENZE * 100}%` }} />
                  </span>
                  <span className="text-right font-display text-base font-bold tabular-nums">{s.presenza == null ? <span className="text-grigio">—</span> : pct(s.presenza)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Riquadro>

        <Riquadro titolo="Risultati della stagione" spiegazione="Squadre agonistiche: vinte, pari e perse, col risultato segnato nel tabellino.">
          {ago.some((s) => s.conRisultato) ? (
            <ul className="space-y-2.5">
              {ago.map((s) => {
                const tt = s.v + s.n + s.p;
                return (
                  <li key={s.id} className="grid grid-cols-[3rem_1fr_4.5rem] items-center gap-2 text-sm">
                    <b className="font-display text-base text-blu">{s.sigla}</b>
                    <span className="flex h-5 overflow-hidden rounded-md bg-carta" title={`${s.v} vinte, ${s.n} pari, ${s.p} perse`} style={{ width: `${Math.max(8, (tt / maxGiocate) * 100)}%` }}>
                      {tt > 0 && <>
                        <i className="flex items-center justify-center bg-verde text-[11px] font-bold text-white" style={{ width: `${(s.v / tt) * 100}%` }}>{s.v || ''}</i>
                        <i className="flex items-center justify-center bg-linea text-[11px] font-bold" style={{ width: `${(s.n / tt) * 100}%` }}>{s.n || ''}</i>
                        <i className="flex items-center justify-center bg-rosso text-[11px] font-bold text-white" style={{ width: `${(s.p / tt) * 100}%` }}>{s.p || ''}</i>
                      </>}
                    </span>
                    <span className="text-right tabular-nums text-grigio">{tt ? `${s.gf}–${s.gs}` : '—'}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-grigio">Nessun risultato ancora segnato nei tabellini.</p>}
          <p className="mt-3 flex flex-wrap gap-3 text-xs text-grigio">
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-verde" />vinte</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-linea" />pari</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-rosso" />perse</span>
            <span>· a destra gol fatti–subiti</span>
          </p>
        </Riquadro>

        <Riquadro titolo={`Questo weekend · ${fmtData(sab).slice(0, 5)} e ${fmtData(dom).slice(0, 5)}`} spiegazione="Partite ed eventi di tutte le squadre, divisi per calendario." href="/calendari/tutte">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {perCal.map(({ k, n }) => (
              <div key={k} className="rounded-xl p-2.5 text-center" style={{ background: `color-mix(in srgb, ${CALENDARI[k].colore} 22%, white)` }}>
                <b className="block font-display text-3xl leading-none">{n}</b><span className="text-xs font-semibold">{CALENDARI[k].nome}</span>
              </div>
            ))}
          </div>
          {p.impegni.length ? (
            <ElencoWeekend impegni={p.impegni} giorni={[sab, dom]} />
          ) : <p className="text-sm text-grigio">Nessun impegno questo weekend.</p>}
        </Riquadro>

        <Riquadro titolo="Scouting" spiegazione="Giocatori per stato: da segnalato a osservato, esito e inserito." href="/giocatori/stati">
          <ul className="space-y-2">
            {stati.map((s, i) => {
              const n = p.scouting.perStato[s] ?? 0;
              return (
                <li key={s} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-sm">
                  <span className="font-semibold">{STATI[s]}</span>
                  <span className="flex items-center gap-2">
                    <i className="block h-5 rounded-md" style={{ width: `${Math.max(2, (n / maxStato) * 100)}%`, background: `color-mix(in srgb, var(--color-blu) ${100 - i * 18}%, white)` }} />
                    <b className="font-display text-base tabular-nums">{n}</b>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {([['Valutazioni', p.scouting.valutazioni30, 'ultimi 30 giorni', '/giocatori'], ['Incarichi', p.scouting.incarichi, 'aperti', '/home'], ['Necessità', p.scouting.necessita, 'aperte', '/necessita']] as const).map(([t, n, sotto, href]) => (
              <a key={t} href={href} className="rounded-xl bg-carta p-2 hover:bg-blu/10">
                <b className="block font-display text-2xl text-blu">{n}</b><span className="block text-xs font-semibold">{t}</span><span className="block text-[11px] text-grigio">{sotto}</span>
              </a>))}
          </div>
        </Riquadro>

        <Riquadro titolo="Ultimi risultati" spiegazione="Partite degli ultimi 10 giorni col risultato nel tabellino.">
          {p.recenti.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.recenti.map((x) => (
                <li key={x.sigla + x.id} className={`flex items-center gap-3 rounded-xl border-l-4 bg-carta p-2.5 ${x.gf > x.ga ? 'border-verde' : x.gf < x.ga ? 'border-rosso' : 'border-linea'}`}>
                  <span className="text-center"><b className="block font-display text-sm text-blu">{x.sigla}</b><span className="font-display text-2xl font-bold leading-none tabular-nums">{x.gf}–{x.ga}</span></span>
                  <span className="min-w-0"><b className="block truncate text-sm">{x.avversario}</b><span className="text-xs text-grigio">{fmtData(x.data).slice(0, 5)} · {x.casa ? 'in casa' : 'trasferta'}</span></span>
                </li>))}
            </ul>
          ) : <p className="text-sm text-grigio">Nessun risultato inserito negli ultimi 10 giorni.</p>}
        </Riquadro>

        <Riquadro titolo="Da sistemare" spiegazione="Tabellini da completare e ragazzi sotto la soglia di presenze, squadra per squadra.">
          {daSistemare.length ? (
            <ul className="divide-y divide-linea">
              {daSistemare.map((s) => (
                <li key={s.id}>
                  <a href={s.tabelliniMancanti ? `/squadra/tabellini?squadra=${s.id}` : `/squadra/statistiche-allenamento?squadra=${s.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-blu">
                    <b className="w-10 font-display text-base text-blu">{s.sigla}</b>
                    <span className="flex flex-1 flex-wrap gap-1.5">
                      {s.tabelliniMancanti > 0 && <span className="rounded-full bg-oro/25 px-2 py-0.5 text-xs font-semibold">{s.tabelliniMancanti} tabellin{s.tabelliniMancanti === 1 ? 'o' : 'i'}</span>}
                      {s.sottoSoglia > 0 && <span className="rounded-full bg-rosso/10 px-2 py-0.5 text-xs font-semibold text-rosso">{s.sottoSoglia} sotto il {SOGLIA_PRESENZE * 100}%</span>}
                    </span>
                    <span aria-hidden>›</span>
                  </a>
                </li>))}
            </ul>
          ) : <p className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-6 place-items-center rounded-full bg-verde/15 text-verde" aria-hidden>✓</span>Tabellini e presenze in ordine</p>}
        </Riquadro>
      </div>
    </div>
  );
}

const sigla = (c?: string) => (c || '').split(' - ')[0].replace('Under ', 'U');
/** Elenco del weekend: i primi 8, gli altri in "Mostra tutti" */
function ElencoWeekend({ impegni, giorni }: { impegni: Impegno[]; giorni: string[] }) {
  const riga = (x: Impegno, i: number) => (
    <li key={`${x.team?.id ?? 'ev'}${x.id}${i}`} className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-11 flex-none tabular-nums text-grigio">{x.time || '––'}</span>
      <span className="size-2.5 flex-none rounded-full" style={{ background: CALENDARI[calDi(x)].colore }} title={CALENDARI[calDi(x)].nome} />
      <span className="w-9 flex-none font-display font-bold text-blu">{x.evento ? 'Ev.' : sigla(x.team?.category)}</span>
      <span className="min-w-0 flex-1 truncate">{x.evento ? x.evento.titolo || 'Evento' : x.opponent}</span>
    </li>
  );
  const blocco = (lista: Impegno[]) => giorni.map((d) => {
    const del = lista.filter((x) => x.date === d);
    if (!del.length) return null;
    return (
      <div key={d} className="mt-1">
        <h3 className="text-sm font-bold first-letter:uppercase">{giorno(d)} {fmtData(d).slice(0, 5)}</h3>
        <ul className="divide-y divide-linea">{del.map(riga)}</ul>
      </div>
    );
  });
  return (
    <>
      {blocco(impegni.slice(0, 8))}
      {impegni.length > 8 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-blu">Mostra tutti ({impegni.length})</summary>
          {blocco(impegni.slice(8))}
        </details>
      )}
    </>
  );
}
