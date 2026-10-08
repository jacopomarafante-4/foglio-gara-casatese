// Squadra → Calendario (prima "Calendario → La mia squadra", spostata qui perché l'area Calendario a sé restava
// doppia con le pagine della Squadra). Mister: la sua squadra (calendario ufficiale, amichevoli del registro, eventi della
// squadra); preparatori dei portieri: le partite delle categorie dei loro portieri (coaches[].eta) con i portieri e la
// convocazione; admin e direttori: la squadra scelta (?squadra=), i direttori in sola lettura.
import { apriSquadra } from '@/lib/pagina-squadra';
import { oggiIso } from '@/lib/utili';
import { datiPreparatore, leggiDocs } from '@/lib/portale-dati';
import type { Evento, Partita } from '@/lib/programma';
import { ScaricaExcel } from '@/components/ScaricaExcel';
import { fogliCalendario, nomeFile } from '@/lib/esporta';
import { CalendarioSquadra } from '@/components/calendario/CalendarioSquadra';
import { SceltaSquadra } from '@/components/SceltaSquadra';
import { SchedeCalendario } from '@/components/squadra/SottoSchede';

type Id = Partita & { id: string };

export default async function CalendarioDellaSquadra({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const q = await searchParams;
  const { chi, squadre, squadra, soloLettura, conSquadra } = await apriSquadra(q.squadra);
  const oggi = oggiIso();
  if (!squadra) return <p className="text-grigio">Nessuna squadra.</p>;

  /* preparatori dei portieri: partite di tutte le squadre delle loro categorie, con i portieri e la convocazione */
  if (chi.mister && squadra.vedeTutte) {
    const { partite, portieri, eta: etaOk } = await datiPreparatore(chi);
    return (
      <div className="space-y-5">
        <h1 className="font-display text-4xl font-bold">Calendario · i tuoi portieri{etaOk ? ' · ' + etaOk.map((e) => 'U' + e).join(', ') : ''}</h1>
        <CalendarioSquadra squadra={squadra} nomeSquadra="" ufficiali={[]} amichevoli={[]} giochiDi={{}} eventi={[]} oggi={oggi}
          puoAmichevoli={false} puoUfficiali={false} preparatore={{ partite, portieri, eta: etaOk }} />
      </div>
    );
  }

  const id = squadra.id;
  const docs = await leggiDocs(chi, ['calendar/' + id, 'registro/' + id, 'sheet/' + id, 'shared/eventi']);
  const ufficiali = ((docs['calendar/' + id]?.matches ?? []) as Id[]);
  const reg = docs['registro/' + id] as { friendlies?: Id[]; games?: { id: string; calId?: string }[] } | null;
  const amichevoli = reg?.friendlies ?? [];
  const giochiDi: Record<string, string[]> = {};
  (reg?.games ?? []).forEach((g) => { if (g.calId) (giochiDi[g.calId] ??= []).push(g.id); });
  const eventi = ((docs['shared/eventi']?.items ?? []) as Evento[]).filter((e) => !(e.squadre ?? []).length || e.squadre!.includes(id));
  const nomeSquadra = String((docs['sheet/' + id] as { team?: string } | null)?.team || squadra.name || 'Noi');
  const ruolo = chi.profilo?.ruolo;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-bold">Calendario</h1>
      <SchedeCalendario attiva="/squadra/calendario" conSquadra={conSquadra} />
      <SceltaSquadra squadre={squadre} scelta={id} />
      {soloLettura && <p className="rounded-md bg-blu/10 px-4 py-3 text-sm text-blu">Sola lettura.</p>}
      {(ufficiali.length > 0 || amichevoli.length > 0) && <ScaricaExcel nome={nomeFile('Calendario', squadra.category || squadra.name || '', oggi)}
        fogli={fogliCalendario([...ufficiali, ...amichevoli.map((f) => ({ ...f, friendly: true }))] as Parameters<typeof fogliCalendario>[0])} />}
      <CalendarioSquadra key={id} squadra={squadra} nomeSquadra={nomeSquadra} ufficiali={ufficiali} amichevoli={amichevoli} giochiDi={giochiDi}
        eventi={eventi} oggi={oggi} puoAmichevoli={!soloLettura} puoUfficiali={ruolo === 'admin'} />
    </div>
  );
}
