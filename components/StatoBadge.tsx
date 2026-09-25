import { STATI, type StatoGiocatore } from '@/lib/tipi';

const COLORI: Record<StatoGiocatore, string> = {
  segnalato: 'bg-linea text-inchiostro',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  contattato: 'bg-blu/10 text-blu',
  invitato: 'bg-blu/15 text-blu',
  in_prova: 'bg-blu text-white',
  inserito: 'bg-blu-scuro text-white',
};

export function StatoBadge({ stato }: { stato: StatoGiocatore }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORI[stato]}`}>
      {STATI[stato]}
    </span>
  );
}
