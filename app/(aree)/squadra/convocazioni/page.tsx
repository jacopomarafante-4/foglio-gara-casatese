// Squadra → Partite → Convocazioni (nell'app dalla tappa 3): agonistica (stato di ogni giocatore) o attività di base (da 1 a 4
// partite con i convocati), PDF della convocazione, risposte delle famiglie
import { apriSquadra } from '@/lib/pagina-squadra';
import { datiPartita } from '@/lib/pagina-partita';
import { risposteFamiglie } from '@/lib/portale-dati';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { Convocazioni, ConvocazioniAdb } from '@/components/squadra/Convocazioni';

export default async function PaginaConvocazioni({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  const adb = eta <= 13;
  const [d, risposte] = await Promise.all([datiPartita(chi, squadra), risposteFamiglie(chi, squadra.id)]);
  const props = { ...d, risposte, soloLettura, linkCampi: conSquadra('/squadra/campi') };
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Convocazioni · {squadra.category || squadra.name}</h1>
      <SchedePartite attiva="/squadra/convocazioni" adb={adb} squadraId={squadra.id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={squadra.id} />
      {d.giocatori.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima inserisci la rosa (Squadra → Rosa).</p>
        : adb ? <ConvocazioniAdb key={squadra.id} {...props} /> : <Convocazioni key={squadra.id} {...props} />}
    </div>
  );
}
