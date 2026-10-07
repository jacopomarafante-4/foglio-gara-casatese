// Squadra → Allenamento → Test atletici (nell'app dalla tappa 3): solo per l'Under 15, registro/<squadra>.tests
import { redirect } from 'next/navigation';
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { oggiIso } from '@/lib/utili';
import type { Registro, Test } from '@/lib/registro';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedeAllenamento } from '@/components/squadra/SottoSchede';
import { TestAtletici } from '@/components/squadra/TestAtletici';

export default async function PaginaTest({ searchParams }: { searchParams: Promise<{ squadra?: string; test?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, soloLettura, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  if (eta !== 15) redirect(conSquadra('/squadra/presenze'));
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as Registro & { tests?: Test[] };
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Test atletici</h1>
      <SchedeAllenamento attiva="/squadra/test" eta={eta} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {giocatori.length === 0
        ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima serve la rosa (Squadra → Rosa).</p>
        : <TestAtletici key={id} squadraId={id} giocatori={giocatori} test={reg.tests ?? []} aperto={q.test ?? null} oggi={oggiIso()} soloLettura={soloLettura} />}
    </div>
  );
}
