// Dati comuni delle pagine Dati partita e Convocazioni: foglio, rosa, calendario (con le amichevoli del registro), campi, weekend
import { leggiDocs, type Chi } from '@/lib/portale-dati';
import { settimanaDi, type Partita } from '@/lib/programma';
import { oggiIso } from '@/lib/utili';
import { nomiMister } from '@/lib/distinta';
import type { Campi } from '@/lib/campi';
import type { FoglioPartita } from '@/lib/foglio';

export async function datiPartita(chi: Chi, squadra: { id: string; name?: string; category?: string; coaches?: { name?: string }[] }) {
  const id = squadra.id;
  const docs = await leggiDocs(chi, ['roster/' + id, 'registro/' + id, 'calendar/' + id, 'sheet/' + id]);
  const reg = (docs['registro/' + id] ?? {}) as { friendlies?: (Partita & { id: string })[]; venues?: Campi };
  const oggi = oggiIso(), { al } = settimanaDi(oggi);
  const sab = new Date(al + 'T12:00:00'); sab.setDate(sab.getDate() - 1);
  return {
    squadraId: id, nomeSquadra: squadra.name || 'Noi', categoria: squadra.category || '', mister: nomiMister(squadra),
    giocatori: ((docs['roster/' + id]?.players ?? []) as { id: string; name: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'it')),
    calendario: [...((docs['calendar/' + id]?.matches ?? []) as (Partita & { id: string })[]), ...(reg.friendlies ?? []).map((f) => ({ ...f, friendly: true }))],
    weekend: [sab.toISOString().slice(0, 10), al], oggi, campi: reg.venues ?? {},
    foglio: { home: true, convType: 'Campionato', callup: {}, ...((docs['sheet/' + id] ?? {}) as FoglioPartita) },
  };
}
