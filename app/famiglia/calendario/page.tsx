// Famiglia → Calendario: partite ed eventi della squadra da oggi a fine stagione (dati di famiglia_get)
import { getFamiglia } from '@/lib/famiglia';
import { eventoCome, type Impegno } from '@/lib/programma';
import { inOrdine } from '@/lib/calendario-portale';
import { oggiIso } from '@/lib/utili';
import { ElencoMesi, Legenda, RigaPartita } from '@/components/calendario/Righe';

export default async function CalendarioFamiglia() {
  const { f } = (await getFamiglia())!;
  const oggi = oggiIso(), squadra = f.squadra ? { ...f.squadra, matches: [] } : undefined;
  const ms: Impegno[] = inOrdine([...(f.calendario ?? []).map((m) => ({ ...m, team: squadra })), ...(f.eventi ?? []).map(eventoCome)]
    .filter((m) => !m.date || m.date >= oggi));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">Calendario · {f.squadra?.category || ''}</h1>
      <Legenda />
      {ms.length ? <ElencoMesi ms={ms} riga={(m) => <RigaPartita m={m} tutte={false} conData nomeSquadra={f.squadra?.category || 'Academy'} squadre={[]} />} />
        : <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna partita in programma.</p>}
    </div>
  );
}
