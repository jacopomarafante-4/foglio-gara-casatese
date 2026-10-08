// Home del Portale (nell'app dalla tappa 3; /home resta la Home dello Scouting). Mister e preparatori: la loro squadra;
// admin e direttori: la società intera (HomeSocieta), o con ?squadra= la Home di quella squadra; organizzativo: weekend di tutta
// la società, eventi e avvisi. Stile A (30/09/2026): la prossima partita in grande; calcoli in lib/home.ts.
// Riquadri come nel Portale: avvisi della società (14 giorni), impegni del weekend, da fare, riepilogo della stagione.
import { redirect } from 'next/navigation';
import { istanteTraOre, oggiIso } from '@/lib/utili';
import { createClient } from '@/lib/supabase/server';
import { calendariTutti, chiEntra, datiPreparatore, filtraSquadre, leggiDocs, risposteFamiglie, squadreDelPortale } from '@/lib/portale-dati';
import { eventoCome, etaSquadra, settimanaDi, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import { inOrdine } from '@/lib/calendario-portale';
import { daFare, riepilogo, type Registro } from '@/lib/registro';
import { nomiMister } from '@/lib/distinta';
import type { Avviso } from '@/components/calendario/Avvisi';
import { HomeOrganizzazione, HomeSquadra } from '@/components/HomePortale';
import { DashboardSocieta, type RisultatoDash, type ScoutingRecente, type SquadraDash } from '@/components/DashboardSocieta';
import type { StatoGiocatore } from '@/lib/tipi';
import { contaRisposte, presenzePerMeseSquadra, risultati, saluto, stagioneSquadra, traQuanto } from '@/lib/home';
import { linkLuogo, type Campi } from '@/lib/campi';
import { dashboard } from '@/lib/statistiche';

type Id = Partita & { id: string };

export default async function Home({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo === 'segreteria') redirect('/segreteria');
  if (chi.profilo && chi.profilo.ruolo !== 'admin' && chi.profilo.ruolo !== 'direttore') redirect('/home');
  if (!chi.profilo && !chi.mister) redirect('/');
  const oggi = oggiIso(), { al } = settimanaDi(oggi);
  const sab = new Date(al + 'T12:00:00'); sab.setDate(sab.getDate() - 1);
  const weekend = [sab.toISOString().slice(0, 10), al];
  const limiteAvvisi = new Date(oggi + 'T12:00:00'); limiteAvvisi.setDate(limiteAvvisi.getDate() - 14);
  const daQuando = limiteAvvisi.toISOString().slice(0, 10);
  const piu = (giorni: number) => { const d = new Date(oggi + 'T12:00:00'); d.setDate(d.getDate() + giorni); return d.toISOString().slice(0, 10); };
  const ora = +new Intl.DateTimeFormat('it-IT', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(new Date(istanteTraOre(0)));
  const { squadra: sceltaSquadra } = await searchParams;

  /* ---------- admin e direttori: la dashboard della società (con ?squadra= la Home di una squadra) ---------- */
  if (chi.profilo && !sceltaSquadra) {
    const supabase = await createClient();
    /* weekend appena passato: l'ultimo sabato iniziato (oggi compreso) e la domenica dopo */
    const g0 = new Date(oggi + 'T12:00:00Z'), indietro = (g0.getUTCDay() + 1) % 7;
    const sabPassato = new Date(g0.getTime() - indietro * 864e5).toISOString().slice(0, 10), domPassata = new Date(g0.getTime() - (indietro - 1) * 864e5).toISOString().slice(0, 10);
    const GIOC = 'giocatore:giocatori(id, cognome, nome, descrizione, annata, societa(nome))';
    const [{ data: docsTutti }, segn, val, stati, inc, nec, segnWk, valWk] = await Promise.all([
      supabase.from('docs').select('path, data').or('path.eq.shared/teams,path.eq.shared/eventi,path.eq.shared/avvisi,path.like.calendar/%,path.like.registro/%,path.like.roster/%'),
      supabase.from('segnalazioni').select('created_at').gte('created_at', istanteTraOre(-24 * 7 * 8)),
      supabase.from('valutazioni').select('id', { count: 'exact', head: true }).gte('created_at', istanteTraOre(-24 * 30)),
      supabase.from('giocatori').select('stato').eq('osservato', true),
      supabase.from('incarichi').select('id', { count: 'exact', head: true }).eq('fatto', false),
      supabase.from('necessita').select('id', { count: 'exact', head: true }).eq('aperta', true),
      supabase.from('segnalazioni').select(`id, data, created_at, impressione, squadra, autore:profiles(nome, cognome), ${GIOC}`).order('data', { ascending: false }).order('created_at', { ascending: false }).limit(30),
      supabase.from('valutazioni').select(`id, data, created_at, giudizio, autore_squadra, autore:profiles(nome, cognome), ${GIOC}`).order('data', { ascending: false }).order('created_at', { ascending: false }).limit(30),
    ]);
    const doc = (path: string) => docsTutti?.find((d) => d.path === path)?.data as Record<string, unknown> | undefined;
    const squadreSoc = filtraSquadre(chi, ((doc('shared/teams')?.items ?? []) as SquadraCal[]).filter((t) => !t.organizza && !t.vedeTutte));
    const sigla = (c?: string) => (c || '').split(' - ')[0].replace('Under ', 'U');
    const impegni: Impegno[] = [], recenti: RisultatoDash[] = [];
    const squadreDash: SquadraDash[] = squadreSoc.map((t) => {
      const reg = (doc('registro/' + t.id) ?? {}) as Registro;
      const giocatori = ((doc('roster/' + t.id)?.players ?? []) as { id: string }[]);
      const cal: Id[] = [...((doc('calendar/' + t.id)?.matches ?? []) as Id[]), ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true }))];
      const adbT = etaSquadra(t) <= 13;
      const fare = daFare(reg, cal, oggi, adbT, giocatori.length > 0);
      const st = stagioneSquadra(reg, giocatori, cal);
      impegni.push(...cal.filter((m) => weekend.includes(m.date ?? '')).map((m) => ({ ...m, team: { ...t, matches: [] } })));
      recenti.push(...risultati(reg, cal).filter((x) => x.data >= piu(-10)).map((x) => ({ id: x.id, sigla: sigla(t.category), data: x.data, avversario: x.avversario, casa: x.casa, gf: x.gf, ga: x.ga })));
      return {
        id: t.id, sigla: sigla(t.category) || t.name || '?', categoria: t.category || t.name || '', adb: adbT, rosa: giocatori.length, allenamenti: st.allenamenti,
        presenza: st.presenze, andamento: presenzePerMeseSquadra(reg, giocatori), giocate: st.giocate, v: st.v, n: st.n, p: st.p, gf: st.gf, gs: st.gs,
        conRisultato: st.conRisultato, sottoSoglia: st.sottoSoglia, tabelliniMancanti: fare.filter((x) => x.tipo === 'tabellino' || x.tipo === 'gol').length,
      };
    });
    const eventi = ((doc('shared/eventi')?.items ?? []) as Evento[]);
    impegni.push(...eventi.filter((e) => weekend.includes(e.data ?? '')).map(eventoCome));
    impegni.sort((a, b) => ((a.date ?? '') + (a.time ?? '')).localeCompare((b.date ?? '') + (b.time ?? '')));
    recenti.sort((a, b) => b.data.localeCompare(a.data));
    /* segnalazioni per settimana, dalla più vecchia (8 settimane fino a oggi) */
    const adesso = Date.parse(istanteTraOre(0));
    const settimane = Array.from({ length: 8 }, (_, i) => ({ da: new Date(adesso - (8 - i) * 7 * 864e5).toISOString().slice(0, 10), n: 0 }));
    for (const x of segn.data ?? []) { const i = 7 - Math.floor((adesso - Date.parse(x.created_at)) / (7 * 864e5)); if (i >= 0 && i < 8) settimane[i].n++; }
    const perStato: Partial<Record<StatoGiocatore, number>> = {};
    for (const g of stati.data ?? []) perStato[g.stato as StatoGiocatore] = (perStato[g.stato as StatoGiocatore] ?? 0) + 1;
    /* scouting del weekend appena passato (data dell'osservazione); se vuoto, le ultime 5 */
    type RigaSc = { id: string; data: string; created_at: string; impressione?: string | null; giudizio?: string | null; squadra?: string | null; autore_squadra?: string | null;
      autore: { nome: string | null; cognome: string | null } | null; giocatore: { id: string; cognome: string | null; nome: string | null; descrizione: string | null; annata: number; societa: { nome: string } | null } | null };
    const tutteSc: ScoutingRecente[] = [
      ...((segnWk.data as unknown as RigaSc[] | null) ?? []).map((x) => ({ ...x, tipo: 'segnalazione' as const })),
      ...((valWk.data as unknown as RigaSc[] | null) ?? []).map((x) => ({ ...x, tipo: 'valutazione' as const })),
    ].filter((x) => x.giocatore).map((x) => ({
      id: x.tipo + x.id, tipo: x.tipo, data: x.data, giocatoreId: x.giocatore!.id,
      giocatore: [x.giocatore!.cognome, x.giocatore!.nome].filter(Boolean).join(' ') || x.giocatore!.descrizione || 'Senza nome',
      annata: x.giocatore!.annata, societa: x.giocatore!.societa?.nome ?? '',
      autore: x.autore ? [x.autore.nome, x.autore.cognome].filter(Boolean).join(' ') : (x.squadra || x.autore_squadra ? `Mister ${x.squadra || x.autore_squadra}` : ''),
      esito: x.tipo === 'segnalazione' ? x.impressione ?? null : x.giudizio ?? null,
    })).sort((a, b) => b.data.localeCompare(a.data));
    const delWeekend = tutteSc.filter((x) => x.data >= sabPassato && x.data <= domPassata);
    return <DashboardSocieta scoutingWeekend={{ sab: sabPassato, dom: domPassata, righe: delWeekend.length ? delWeekend : tutteSc.slice(0, 5), delWeekend: delWeekend.length > 0 }} saluto={saluto(ora)} nome={chi.profilo.nome || ''} oggi={oggi} weekend={weekend} squadre={squadreDash} impegni={impegni} recenti={recenti}
      avvisi={((doc('shared/avvisi')?.items ?? []) as Avviso[]).filter((a) => (a.data || '') >= daQuando).sort((x, y) => (y.data || '').localeCompare(x.data || '')).slice(0, 3)}
      scouting={{ settimane, perStato, valutazioni30: val.count ?? 0, incarichi: inc.count ?? 0, necessita: nec.count ?? 0 }} />;
  }

  /* ---------- organizzativo ---------- */
  if (chi.mister?.squadra.organizza) {
    const [{ squadre, eventi }, docs] = await Promise.all([calendariTutti(chi), leggiDocs(chi, ['shared/avvisi'])]);
    const tutte: Impegno[] = [...squadre.flatMap((t) => t.matches.map((m) => ({ ...m, team: t }))), ...eventi.map(eventoCome)];
    return <HomeOrganizzazione weekend={weekend} impegni={tutte.filter((m) => weekend.includes(m.date ?? ''))}
      eventi={eventi.filter((e) => e.data && e.data >= oggi).sort((a, b) => (a.data! + (a.inizio || '')).localeCompare(b.data! + (b.inizio || ''))).slice(0, 5)}
      avvisi={((docs['shared/avvisi']?.items ?? []) as Avviso[]).slice().sort((x, y) => (y.data || '').localeCompare(x.data || '')).slice(0, 3)} />;
  }

  /* ---------- una squadra ---------- */
  let squadre: SquadraCal[] = [], squadra: SquadraCal | undefined;
  if (chi.mister) squadra = { ...chi.mister.squadra, matches: [] };
  else {
    squadre = (await squadreDelPortale(chi)).filter((t) => !t.organizza).map((t) => ({ ...t, matches: [] }));
    squadra = squadre.find((t) => t.id === sceltaSquadra) ?? squadre[0];
  }
  if (!squadra) return <p className="text-grigio">Nessuna squadra da mostrare.</p>;
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'calendar/' + id, 'sheet/' + id, 'shared/eventi', 'shared/avvisi']);
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]);
  const reg = (docs['registro/' + id] ?? {}) as Registro;
  /* calendario della squadra = partite ufficiali + amichevoli del registro (allCalendar del Portale) */
  const calendario: Id[] = [...((docs['calendar/' + id]?.matches ?? []) as Id[]), ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true }))];
  const eventi = ((docs['shared/eventi']?.items ?? []) as Evento[]).filter((e) => !(e.squadre ?? []).length || e.squadre!.includes(id));
  const adb = etaSquadra(squadra) <= 13;
  const prossima = inOrdine(calendario.filter((m) => m.date && m.date >= oggi))[0] ?? null;
  const foglio = (docs['sheet/' + id] ?? {}) as { date?: string; opponent?: string };
  const foglioPronto = !!prossima && foglio.date === prossima.date && (foglio.opponent || '').trim().toLowerCase() === (prossima.opponent || '').trim().toLowerCase();

  /* impegni del weekend: della squadra, o per i preparatori le partite delle categorie dei loro portieri */
  const prep = chi.mister && squadra.vedeTutte ? await datiPreparatore(chi) : null;
  const impegni: Impegno[] = prep ? prep.partite : [...calendario.map((m) => ({ ...m, team: squadra })), ...eventi.map(eventoCome)];
  const avvisi = ((docs['shared/avvisi']?.items ?? []) as Avviso[])
    .filter((a) => (a.data || '') >= daQuando && (!(a.squadre ?? []).length || a.squadre.includes(id)))
    .sort((x, y) => (y.data || '').localeCompare(x.data || ''));

  return (
    <div className="space-y-4">
      {squadre.length > 0 && (
        <form method="GET" className="flex flex-wrap items-end gap-2">
          <a href="/inizio" className="rounded-lg border border-linea bg-white px-3 py-2 font-semibold hover:border-blu">‹ Tutta la società</a>
          <label className="min-w-56 flex-1 sm:max-w-xs">
            <span className="mb-1 block text-sm font-semibold text-grigio">Squadra</span>
            <select name="squadra" defaultValue={id} className="campo">
              {squadre.map((s) => <option key={s.id} value={s.id}>{s.category || s.name}</option>)}
            </select>
          </label>
          <button className="bottone">Apri</button>
        </form>
      )}
      <HomeSquadra
        squadra={{ id, name: squadra.name || '', category: squadra.category || '', mister: nomiMister(squadra) }}
        squadraQs={chi.mister ? '' : `squadra=${encodeURIComponent(id)}`}
        oggi={oggi} weekend={weekend} adb={adb}
        impegni={inOrdine(impegni.filter((m) => weekend.includes(m.date ?? '')))}
        portieri={prep?.portieri ?? null}
        prossima={prossima} foglioPronto={foglioPronto}
        allenamentoOggi={(reg.trainings ?? []).find((t) => t.date === oggi) ?? null}
        giocatori={giocatori.map((p) => p.id)}
        daFare={daFare(reg, calendario, oggi, adb, giocatori.length > 0)}
        calendario={calendario}
        riepilogo={riepilogo(reg, giocatori, calendario)}
        avvisi={avvisi.slice(0, 3)}
        soloLettura={chi.profilo?.ruolo === 'direttore'}
        saluto={saluto(ora)} nomi={Object.fromEntries(giocatori.map((g) => [g.id, g.name]))}
        prossimi={inOrdine(impegni.filter((x) => x.date && x.date >= oggi && x.date <= piu(21) && x.id !== prossima?.id)).slice(0, 4)}
        ultima={risultati(reg, calendario)[0] ?? null} andamento={presenzePerMeseSquadra(reg, giocatori)}
        risposte={prossima ? contaRisposte(await risposteFamiglie(chi, id).catch(() => ({})), giocatori, prossima) : null}
        linkCampo={prossima ? linkLuogo((reg as Registro & { venues?: Campi }).venues, prossima) : ''} traQuanto={traQuanto(oggi, prossima?.date)}
        kpi={(({ tar, tmr }) => ({ tar, tmr }))(dashboard(reg, giocatori, calendario, 'all'))}
      />
    </div>
  );
}
