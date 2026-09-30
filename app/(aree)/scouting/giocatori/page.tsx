// Scouting → Giocatori per i mister (nell'app dalla tappa 3): gli osservati della sua annata (coach_giocatori);
// i preparatori dei portieri (vedeTutte) vedono i portieri di tutte le annate.
import { Avviso } from '@/components/Avviso';
import { GiocatoriMister } from '@/components/GiocatoriMister';
import { annataDelMister, apriScoutingMister, giocatoriDelMister } from '@/lib/scouting-mister';

export default async function GiocatoriDelMister({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const mister = await apriScoutingMister('giocatori');
  const { ok } = await searchParams;
  const portieri = !!mister.squadra.vedeTutte;
  const annata = annataDelMister(mister);
  const giocatori = annata || portieri ? await giocatoriDelMister(mister) : [];
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold">{portieri ? 'Portieri · tutte le annate' : `Giocatori${annata ? ' · annata ' + annata : ''}`}</h1>
        <p className="mt-1 text-grigio">
          {portieri ? 'I portieri osservati dallo scouting, di tutte le annate.' : 'I giocatori osservati dallo scouting della tua annata.'}{' '}
          Tocca un nome per valutazioni e segnalazioni.
        </p>
      </div>
      <Avviso ok={ok} />
      {!annata && !portieri ? (
        <p className="rounded-xl border border-linea bg-white p-4 text-grigio">Questa squadra non ha un’annata: l’elenco è per le squadre Under.</p>
      ) : giocatori === null ? (
        <p className="rounded-xl border border-linea bg-white p-4 text-grigio">Elenco non disponibile, riprova tra poco.</p>
      ) : (
        <GiocatoriMister giocatori={giocatori} portieri={portieri} />
      )}
    </div>
  );
}
