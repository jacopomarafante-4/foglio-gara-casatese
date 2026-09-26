import { STATI, type StatoGiocatore } from '@/lib/tipi';

const COLORI: Record<StatoGiocatore, string> = {
  in_lista: 'bg-linea text-inchiostro',
  in_osservazione: 'bg-blu/10 text-blu',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  inserito: 'bg-blu-scuro text-white',
  da_non_inserire: 'bg-rosso/10 text-rosso',
};

export function StatoBadge({ stato }: { stato: StatoGiocatore }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORI[stato]}`}>
      {STATI[stato]}
    </span>
  );
}
