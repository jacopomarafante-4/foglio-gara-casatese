// Squadra → Partite → Formazione (nell'app dalla tappa 3): titolari, panchina, modulo, capitani, note del foglio della partita
// (sheet/<squadra>); i piazzati scelti arrivano da shared/schemes e dagli schemi della squadra (registro.schemi).
// Attività di base: niente formazione (SOLO_AGONISTICA). Direttori in sola lettura.
import { redirect } from 'next/navigation';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import type { FoglioFormazione } from '@/lib/formazione';
import type { FoglioPartita } from '@/lib/foglio';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { Formazione } from '@/components/squadra/Formazione';

export default async function PaginaFormazione({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta <= 13) redirect(conSquadra('/squadra/convocazioni'));
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'sheet/' + id, 'registro/' + id, 'shared/schemes']);
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name || 'Senza nome' }));
  const foglio = (docs['sheet/' + id] ?? {}) as FoglioFormazione & FoglioPartita;
  const schemi = [...((docs['shared/schemes']?.items ?? []) as { id: string; name?: string }[]), ...(((docs['registro/' + id] as { schemi?: { id: string; name?: string }[] } | null)?.schemi) ?? [])];
  const piazzati = ((foglio.selected ?? []) as string[]).map((sid) => schemi.find((q) => q.id === sid)?.name).filter(Boolean) as string[];
  const linkPiazzati = `/portale/#/${chi.profilo ? 's:' + id + '/' : ''}piazzati`;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Formazione{foglio.opponent ? ` · ${foglio.opponent}` : ''}</h1>
      <SchedePartite attiva="/squadra/formazione" adb={false} squadraId={id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      <Formazione key={id} squadraId={id} giocatori={giocatori} iniziale={foglio} soloLettura={soloLettura} piazzati={piazzati} linkPiazzati={linkPiazzati} />
    </div>
  );
}
