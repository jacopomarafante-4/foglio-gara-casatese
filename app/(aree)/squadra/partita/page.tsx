// Squadra → Partite → Dati partita (nell'app dalla tappa 3): la partita del foglio gara (non per l'attività di base)
import { redirect } from 'next/navigation';
import { apriSquadra } from '@/lib/pagina-squadra';
import { datiPartita } from '@/lib/pagina-partita';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { DatiPartita } from '@/components/squadra/Convocazioni';

export default async function PaginaDatiPartita({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta <= 13) redirect(conSquadra('/squadra/convocazioni'));
  const d = await datiPartita(chi, squadra);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Partita · {squadra.category || squadra.name}</h1>
      <SchedePartite attiva="/squadra/partita" adb={false} squadraId={squadra.id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={squadra.id} />
      <DatiPartita key={squadra.id} {...d} soloLettura={soloLettura} linkCampi={conSquadra('/squadra/campi')} />
    </div>
  );
}
