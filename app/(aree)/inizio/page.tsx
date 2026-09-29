// Home del Portale (nell'app dalla tappa 3; /home resta la Home dello Scouting). Mister e preparatori: la loro squadra;
// admin e direttori: la squadra scelta (?squadra=); organizzativo: weekend di tutta la società, eventi e avvisi.
// Riquadri come nel Portale: avvisi della società (14 giorni), impegni del weekend, da fare, riepilogo della stagione.
import { redirect } from 'next/navigation';
import { oggiIso } from '@/lib/utili';
import { calendariTutti, chiEntra, datiPreparatore, leggiDocs, squadreDelPortale } from '@/lib/portale-dati';
import { eventoCome, etaSquadra, settimanaDi, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import { inOrdine } from '@/lib/calendario-portale';
import { daFare, riepilogo, type Registro } from '@/lib/registro';
import { nomiMister } from '@/lib/distinta';
import type { Avviso } from '@/components/calendario/Avvisi';
import { HomeOrganizzazione, HomeSquadra } from '@/components/HomePortale';

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
    const { squadra: scelta } = await searchParams;
    squadra = squadre.find((t) => t.id === scelta) ?? squadre[0];
  }
  if (!squadra) return <p className="text-grigio">Nessuna squadra. Creane una in Società → Squadre.</p>;
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
        portale={chi.mister ? '/portale/#/' : `/portale/#/s:${id}/`}
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
      />
    </div>
  );
}
