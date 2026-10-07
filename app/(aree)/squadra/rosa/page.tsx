// Squadra → Rosa (nell'app dalla tappa 3): nomi dei giocatori (roster/<squadra>, li cambia solo l'admin), numero di maglia
// della partita (dal foglio: titolari 1-11, panchina 12+, si decide in Formazione) e ruolo (registro.ruoli, anche il mister).
// Direttori in sola lettura (tranne nelle squadre di cui sono anche mister); i preparatori dei portieri, nelle rose delle altre
// squadre, segnano solo chi è portiere. L'organizzativo non ha la Squadra.
import { leggiDocs } from '@/lib/portale-dati';
import { apriSquadra } from '@/lib/pagina-squadra';
import { numeroPartita, type Foglio } from '@/lib/distinta';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { Rosa } from '@/components/squadra/Rosa';
import { ScaricaExcel } from '@/components/ScaricaExcel';
import { fogliRosa, nomeFile } from '@/lib/esporta';
import { oggiIso } from '@/lib/utili';

export default async function PaginaRosa({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { chi, squadre, squadra, eta, admin, soloLettura, soloPortieri } = await apriSquadra((await searchParams).squadra);
  if (!squadra) return <p className="text-grigio">Nessuna squadra da mostrare.</p>;
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'sheet/' + id]);
  const giocatori = (docs['roster/' + id]?.players ?? []) as ({ id: string; name: string } & Record<string, unknown>)[];
  const reg = (docs['registro/' + id] ?? {}) as { ruoli?: Record<string, string>; gk?: string[] };
  const foglio = (docs['sheet/' + id] ?? {}) as Foglio;
  const righe = giocatori.map((p) => ({ id: p.id, name: p.name, dati: p, numero: numeroPartita(foglio, p.id),
    ruolo: reg.ruoli?.[p.id] || ((reg.gk ?? []).includes(p.id) ? 'portiere' : '') }));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-bold">Rosa</h1>
      <SceltaSquadra squadre={squadre} scelta={id} />
      {righe.length > 0 && <ScaricaExcel nome={nomeFile('Rosa', squadra.category || squadra.name || '', oggiIso())} fogli={fogliRosa(righe)} />}
      <Rosa key={id} squadraId={id}
        giocatori={righe}
        ruoliBase={eta < 13} admin={admin} soloLettura={soloLettura} soloPortieri={soloPortieri} />
    </div>
  );
}
