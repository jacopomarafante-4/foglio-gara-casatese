// Sotto ogni partita, per i preparatori: i portieri della squadra e la loro convocazione (chipsPortieri del Portale)
import type { Impegno } from '@/lib/programma';
import type { Portieri } from '@/lib/portale-dati';
import { ETICHETTE_CONVOCAZIONE, statoPortiere } from '@/lib/calendario-portale';

const COLORE_STATO: Record<string, string> = {
  CON: 'border-verde bg-verde text-white', NC: 'border-linea bg-white text-inchiostro', INF: 'border-rosso bg-rosso text-white',
  SQL: 'border-rosso bg-rosso text-white', ND: 'border-oro bg-oro text-inchiostro', '': 'border-linea bg-carta text-grigio',
};

export function ChipsPortieri({ m, portieri, solo = '' }: { m: Impegno; portieri: Portieri; solo?: string }) {
  const d = portieri[m.team?.id ?? '']; if (!d) return null;
  const gk = d.gk.filter((p) => !solo || p.id === solo);
  if (!gk.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {gk.map((p) => {
        const st = statoPortiere(d.foglio, m, p.id);
        return <span key={p.id} className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${COLORE_STATO[st] ?? COLORE_STATO['']}`}>🧤 {p.name} · {st ? ETICHETTE_CONVOCAZIONE[st].toLowerCase() : 'da convocare'}</span>;
      })}
    </div>
  );
}
