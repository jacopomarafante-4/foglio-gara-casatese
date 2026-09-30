// Squadra → Partite → Tabellini (nell'app dalla tappa 3): partite del calendario e amichevoli del registro, ?partita=<id> aperta.
// Attività di base (fino all'Under 13): presenti e risultato a tempi, con le statistiche in cima.
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { oggiIso } from '@/lib/utili';
import type { Partita } from '@/lib/programma';
import { garaGiocata, haGiocato, type Registro } from '@/lib/registro';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { Tabellini } from '@/components/squadra/Tabellini';

export default async function PaginaTabellini({ searchParams }: { searchParams: Promise<{ squadra?: string; partita?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  const id = squadra.id, adb = eta <= 13;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'calendar/' + id, 'sheet/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as Registro;
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const calendario = [...((docs['calendar/' + id]?.matches ?? []) as (Partita & { id: string })[]),
    ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true, daRegistro: true }))];
  const foglio = (docs['sheet/' + id] ?? {}) as { date?: string; opponent?: string; team?: string; lineup?: Record<string, string>; bench?: string[] };
  /* attività di base: statistiche in cima (partite giocate, presenti a partita, mai presenti) */
  const giocate = (reg.games ?? []).filter(garaGiocata);
  const presenze = giocate.reduce((a, g) => a + Object.values(g.pl ?? {}).filter(haGiocato).length, 0);
  const mai = giocatori.filter((p) => !giocate.some((g) => haGiocato((g.pl ?? {})[p.id] ?? {}))).length;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">{adb ? 'Tabellini e statistiche' : 'Tabellini'} · {squadra.category || squadra.name}</h1>
      <SchedePartite attiva="/squadra/tabellini" adb={adb} squadraId={id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {giocatori.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima serve la rosa (Squadra → Rosa).</p> : (
        <>
          {adb && !q.partita && (
            <div className="grid grid-cols-3 gap-2">
              {([[giocate.length, 'Partite giocate', ''], [giocate.length ? (presenze / giocate.length).toFixed(1) : '—', 'Presenti a partita', ''],
                [giocate.length ? mai : '—', 'Mai presenti', 'in nessuna partita']] as [string | number, string, string][]).map(([v, l, s]) => (
                <div key={l} className="rounded-xl border border-linea bg-white p-3"><b className="block font-display text-3xl">{v}</b>
                  <span className="text-sm font-semibold">{l}</span>{s && <small className="block text-grigio">{s}</small>}</div>
              ))}
            </div>
          )}
          <p className="text-grigio">{adb ? 'Per ogni partita chi era presente. Tocca una partita per segnarlo.' : 'Minuti, gol e gol subiti di ogni partita. Tocca una partita per compilarla.'}</p>
          <Tabellini key={id} squadraId={id} nomeSquadra={foglio.team || squadra.name || 'Noi'} giocatori={giocatori} portieri={reg.gk ?? []}
            calendario={calendario} gare={reg.games ?? []} foglio={foglio} adb={adb} oggi={oggiIso()} aperto={q.partita ?? null} soloLettura={soloLettura} />
        </>
      )}
    </div>
  );
}
