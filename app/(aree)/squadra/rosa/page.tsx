// Squadra → Rosa (nell'app dalla tappa 3): nomi dei giocatori (roster/<squadra>, li cambia solo l'admin), numero di maglia
// della partita (dal foglio: titolari 1-11, panchina 12+, si decide in Formazione) e ruolo (registro.ruoli, anche il mister).
// Direttori in sola lettura; l'organizzativo non ha la Squadra.
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { numeroPartita, type Foglio } from '@/lib/distinta';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { Rosa } from '@/components/squadra/Rosa';

export default async function PaginaRosa({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, admin, soloLettura } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra. Creane una in Società → Squadre.</p>;
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'sheet/' + id]);
  const giocatori = (docs['roster/' + id]?.players ?? []) as ({ id: string; name: string } & Record<string, unknown>)[];
  const reg = (docs['registro/' + id] ?? {}) as { ruoli?: Record<string, string>; gk?: string[] };
  const foglio = (docs['sheet/' + id] ?? {}) as Foglio;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-bold">Rosa · {squadra.name || squadra.category}</h1>
      <SceltaSquadra squadre={squadre} scelta={id} />
      <Rosa key={id} squadraId={id}
        giocatori={giocatori.map((p) => ({ id: p.id, name: p.name, dati: p, numero: numeroPartita(foglio, p.id),
          ruolo: reg.ruoli?.[p.id] || ((reg.gk ?? []).includes(p.id) ? 'portiere' : '') }))}
        ruoliBase={eta < 13} admin={admin} soloLettura={soloLettura} />
    </div>
  );
}
