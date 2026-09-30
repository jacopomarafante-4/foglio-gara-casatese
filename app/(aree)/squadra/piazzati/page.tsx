// Squadra → Partite → Piazzati (nell'app dalla tappa 3): i miei schemi (registro/<squadra>.schemi), i modelli della società
// (shared/schemes, li cura l'admin) e la scelta per la partita (foglio sheet/<squadra>). ?schema=<id> apre uno schema.
// Attività di base: niente piazzati. Direttori in sola lettura.
import { redirect } from 'next/navigation';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { oggiIso } from '@/lib/utili';
import type { Schema } from '@/lib/piazzati';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedePartite } from '@/components/squadra/SottoSchede';
import { Piazzati } from '@/components/piazzati/Piazzati';

export default async function PaginaPiazzati({ searchParams }: { searchParams: Promise<{ squadra?: string; schema?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, soloLettura, admin, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta <= 13) redirect(conSquadra('/squadra/convocazioni'));
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'sheet/' + id, 'registro/' + id, 'shared/schemes']);
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name || 'Senza nome' }));
  const foglio = (docs['sheet/' + id] ?? {}) as Record<string, unknown>;
  const miei = (((docs['registro/' + id] as { schemi?: Schema[] } | null)?.schemi) ?? []);
  const modelli = ((docs['shared/schemes']?.items ?? []) as Schema[]);
  const autore = chi.mister?.nome ?? [chi.profilo?.nome, chi.profilo?.cognome].filter(Boolean).join(' ');
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Calci piazzati</h1>
      <SchedePartite attiva="/squadra/piazzati" adb={false} squadraId={id} staff={!!chi.profilo} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      <Piazzati key={id} squadraId={id} giocatori={giocatori} iniziale={foglio} miei={miei} modelli={modelli} puoSquadra={!soloLettura}
        admin={admin} autore={autore} oggi={oggiIso()} squadraNome={(foglio.team as string) || squadra.name || 'Academy'} apri={q.schema} />
    </div>
  );
}
