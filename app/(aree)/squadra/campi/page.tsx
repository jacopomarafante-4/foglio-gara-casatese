// Squadra → Partite → Campi (nell'app dalla tappa 3): posizione esatta dei campi per il link di Google Maps (registro.venues)
import { redirect } from 'next/navigation';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import type { Partita } from '@/lib/programma';
import type { Campi } from '@/lib/campi';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { CampiSquadra } from '@/components/squadra/CampiSquadra';

export default async function PaginaCampi({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta <= 13) redirect(conSquadra('/squadra/tabellini'));
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['registro/' + id, 'calendar/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as { friendlies?: Partita[]; venues?: Campi };
  const partite = [...((docs['calendar/' + id]?.matches ?? []) as Partita[]), ...(reg.friendlies ?? [])];
  const campi = [...new Set(partite.map((m) => (m.venue || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Campi</h1>
      <SchedePartite attiva="/squadra/campi" adb={false} squadraId={id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      <CampiSquadra key={id} squadraId={id} campi={campi} posizioni={reg.venues ?? {}} soloLettura={soloLettura} />
    </div>
  );
}
