// Squadra → Allenamento → Presenze (nell'app dalla tappa 3): tabella degli allenamenti (registro/<squadra>.trainings) e, con
// ?allenamento=<id>, la scheda per segnare presenti e assenti col motivo. Si salva da sola; direttori in sola lettura.
// Squadra dei preparatori dei portieri: portieri divisi per preparatore secondo le categorie assegnate (lib/portieri.ts).
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { oggiIso } from '@/lib/utili';
import type { Registro } from '@/lib/registro';
import { categorieDeiPortieri, gruppiPortieri, type GruppoPortieri, type RosaSquadra } from '@/lib/portieri';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedeAllenamento } from '@/components/squadra/SottoSchede';
import { Presenze } from '@/components/squadra/Presenze';

export default async function PaginaPresenze({ searchParams }: { searchParams: Promise<{ squadra?: string; allenamento?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, eta, soloLettura, soloPortieriScrivibile, conSquadra } = await apriSquadra(q.squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as Registro;
  const giocatori = ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[])
    .map((p) => ({ id: p.id, name: p.name, gk: (reg.gk ?? []).includes(p.id) })).sort((a, b) => a.name.localeCompare(b.name, 'it'));

  // preparatori dei portieri: categoria di ogni portiere dalle rose delle squadre, gruppi secondo le categorie dei preparatori
  let gruppi: GruppoPortieri[] | undefined, etaDi: Record<string, number> | undefined, gruppoIniziale: string | undefined;
  if (squadra.vedeTutte && giocatori.length) {
    const altre = squadre.filter((t) => t.id !== id && !t.organizza && !t.vedeTutte);
    const rose = await leggiDocs(chi, altre.map((t) => 'roster/' + t.id));
    etaDi = categorieDeiPortieri(giocatori, altre.map((t): RosaSquadra => ({ ...t, players: (rose['roster/' + t.id]?.players ?? []) as { name: string }[] })));
    const preparatori = squadra.coaches ?? (chi.mister?.squadra.id === id ? chi.mister.squadra.coaches : undefined) ?? [];
    gruppi = gruppiPortieri(giocatori, etaDi, preparatori);
    // il preparatore entrato parte dai suoi portieri
    const mio = preparatori.findIndex((c) => !!c.name && c.name === chi.mister?.nome);
    gruppoIniziale = gruppi.find((g) => g.chiave === 'p' + mio)?.chiave;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Presenze allenamenti · {squadra.name || squadra.category}</h1>
      <SchedeAllenamento attiva="/squadra/presenze" eta={eta} conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {giocatori.length === 0
        ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Prima serve la rosa (Squadra → Rosa).</p>
        : <Presenze key={id} squadraId={id} giocatori={giocatori} allenamenti={reg.trainings ?? []} aperto={q.allenamento ?? null}
            oggi={oggiIso()} soloLettura={soloLettura} soloPortieriScrivibile={soloPortieriScrivibile}
            gruppi={gruppi} etaDi={etaDi} gruppoIniziale={gruppoIniziale} />}
    </div>
  );
}
