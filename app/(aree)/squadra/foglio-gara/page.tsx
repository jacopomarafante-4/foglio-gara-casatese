// Squadra → Partite → Foglio gara (nell'app dalla tappa 3; era la scheda "pdf" del Portale): anteprima e PDF con distinta,
// formazione e una pagina per ogni calcio piazzato scelto. Attività di base: niente foglio gara. Direttori in sola lettura.
import { redirect } from 'next/navigation';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { datiPartita } from '@/lib/pagina-partita';
import type { Schema } from '@/lib/piazzati';
import type { FoglioGara as Foglio } from '@/lib/pdf-foglio-gara';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { FoglioGara } from '@/components/squadra/FoglioGara';
import { AvvisoPartita } from '@/components/squadra/AvvisoPartita';

export default async function PaginaFoglioGara({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta <= 13) redirect(conSquadra('/squadra/convocazioni'));
  const id = squadra.id;
  const [d, docs] = await Promise.all([datiPartita(chi, squadra), leggiDocs(chi, ['registro/' + id, 'shared/schemes'])]);
  const schemi = [...(((docs['registro/' + id] as { schemi?: Schema[] } | null)?.schemi) ?? []), ...((docs['shared/schemes']?.items ?? []) as Schema[])];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Foglio gara</h1>
      <SchedePartite attiva="/squadra/foglio-gara" adb={false} squadraId={id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      <AvvisoPartita foglio={d.foglio} calendario={d.calendario} oggi={d.oggi} linkDati={conSquadra('/squadra/partita')} />
      <FoglioGara key={id} squadraId={id} foglio={d.foglio as Foglio} nomeSquadra={d.nomeSquadra} categoria={d.categoria} giocatori={d.giocatori}
        calendario={d.calendario} schemi={schemi} soloLettura={soloLettura}
        linkFormazione={conSquadra('/squadra/formazione')} linkPiazzati={conSquadra('/squadra/piazzati')} />
    </div>
  );
}
