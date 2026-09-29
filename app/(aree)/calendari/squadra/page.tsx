// Calendario → La mia squadra (nell'app dalla tappa 3). Mister: la sua squadra (calendario ufficiale, amichevoli del
// registro, eventi della squadra); preparatori dei portieri: le partite delle categorie dei loro portieri (coaches[].eta)
// con i portieri e la convocazione; admin e direttori: la squadra scelta (?squadra=), i direttori in sola lettura.
// L'organizzativo non ha una squadra: va a Tutte le squadre.
import { redirect } from 'next/navigation';
import { vedeTutto } from '@/lib/ruoli';
import { oggiIso } from '@/lib/utili';
import { calendariTutti, chiEntra, leggiDocs, squadreDelPortale } from '@/lib/portale-dati';
import { etaSquadra, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import type { FoglioConvocazioni } from '@/lib/calendario-portale';
import { CalendarioSquadra, type Portieri } from '@/components/calendario/CalendarioSquadra';

type Id = Partita & { id: string };

export default async function LaMiaSquadra({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const chi = await chiEntra();
  if (chi.profilo && !vedeTutto(chi.profilo.ruolo)) redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!chi.profilo && !chi.mister) redirect('/');
  if (chi.mister?.squadra.organizza) redirect('/calendari/tutte');
  const oggi = oggiIso();

  let squadre: SquadraCal[] = [], squadra: SquadraCal | undefined;
  if (chi.mister) squadra = { ...chi.mister.squadra, matches: [] };
  else {
    squadre = (await squadreDelPortale(chi)).filter((t) => !t.organizza).map((t) => ({ ...t, matches: [] }));
    const { squadra: scelta } = await searchParams;
    squadra = squadre.find((t) => t.id === scelta) ?? squadre[0];
  }
  const intestazione = (
    <div>
      <h1 className="font-display text-4xl font-bold">Calendario · {squadra?.category || squadra?.name || 'squadra'}</h1>
    </div>
  );
  if (!squadra) return <div className="space-y-5">{intestazione}<p className="text-grigio">Nessuna squadra.</p></div>;

  /* preparatori dei portieri: partite di tutte le squadre delle loro categorie, con i portieri e la convocazione */
  if (chi.mister && squadra.vedeTutte) {
    const eta = (chi.mister.squadra.coaches ?? []).find((c) => c.name && c.name === chi.mister!.nome)?.eta;
    const etaOk = Array.isArray(eta) && eta.length ? eta : null;
    const { squadre: tutte } = await calendariTutti(chi);
    const scelte = tutte.filter((t) => t.id !== squadra!.id && !t.organizza && !t.vedeTutte && (!etaOk || etaOk.includes(etaSquadra(t))));
    const docs = await leggiDocs(chi, scelte.flatMap((t) => ['roster/' + t.id, 'registro/' + t.id, 'sheet/' + t.id]));
    const portieri: Portieri = {};
    for (const t of scelte) {
      const rosa = (docs['roster/' + t.id]?.players ?? []) as { id: string; name: string }[];
      const gk = ((docs['registro/' + t.id]?.gk ?? []) as string[]).map((id) => rosa.find((p) => p.id === id)).filter(Boolean) as { id: string; name: string }[];
      portieri[t.id] = { team: { ...t, matches: [] }, gk, foglio: (docs['sheet/' + t.id] ?? {}) as FoglioConvocazioni };
    }
    const partite: Impegno[] = scelte.flatMap((t) => t.matches.map((m) => ({ ...m, team: t })));
    return (
      <div className="space-y-5">
        <h1 className="font-display text-4xl font-bold">Calendario · i tuoi portieri{etaOk ? ' · ' + etaOk.map((e) => 'U' + e).join(', ') : ''}</h1>
        <CalendarioSquadra squadra={squadra} nomeSquadra="" ufficiali={[]} amichevoli={[]} giochiDi={{}} eventi={[]} oggi={oggi}
          puoAmichevoli={false} puoUfficiali={false} preparatore={{ partite, portieri, eta: etaOk }} />
      </div>
    );
  }

  const id = squadra.id;
  const docs = await leggiDocs(chi, ['calendar/' + id, 'registro/' + id, 'sheet/' + id, 'shared/eventi']);
  const ufficiali = ((docs['calendar/' + id]?.matches ?? []) as Id[]);
  const reg = docs['registro/' + id] as { friendlies?: Id[]; games?: { id: string; calId?: string }[] } | null;
  const amichevoli = reg?.friendlies ?? [];
  const giochiDi: Record<string, string[]> = {};
  (reg?.games ?? []).forEach((g) => { if (g.calId) (giochiDi[g.calId] ??= []).push(g.id); });
  const eventi = ((docs['shared/eventi']?.items ?? []) as Evento[]).filter((e) => !(e.squadre ?? []).length || e.squadre!.includes(id));
  const nomeSquadra = String((docs['sheet/' + id] as { team?: string } | null)?.team || squadra.name || 'Noi');
  const ruolo = chi.profilo?.ruolo;

  return (
    <div className="space-y-5">
      {intestazione}
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
      {ruolo === 'direttore' && <p className="rounded-md bg-blu/10 px-4 py-3 text-sm text-blu">Sola lettura.</p>}
      <CalendarioSquadra key={id} squadra={squadra} nomeSquadra={nomeSquadra} ufficiali={ufficiali} amichevoli={amichevoli} giochiDi={giochiDi}
        eventi={eventi} oggi={oggi} puoAmichevoli={!!chi.mister || ruolo === 'admin'} puoUfficiali={ruolo === 'admin'} />
    </div>
  );
}
