import { dataBreve } from '@/lib/utili';

export type Presenza = {
  numero: number | null;
  titolare: boolean | null;
  capitano: boolean;
  /** Società di appartenenza, se diversa da quella della squadra (prestito, aggregato) */
  appartenenza: { nome: string } | null;
  squadra: { categoria: string; stagione: string; societa: { nome: string } | null } | null;
  distinta: {
    id: string;
    data: string;
    stagione: string;
    categoria: string;
    competizione: string | null;
    casa_nome: string;
    trasferta_nome: string;
    risultato: string | null;
  } | null;
};

const meseAnno = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });

/** Società per cui era tesserato quel giorno: quella indicata in distinta, altrimenti quella della squadra */
const appartenenzaDi = (p: Presenza) => p.appartenenza?.nome ?? p.squadra?.societa?.nome ?? '—';

/** Percorso tra le società nel tempo: tratti consecutivi con la stessa società di appartenenza */
function percorso(presenze: Presenza[]) {
  const ordinate = [...presenze].sort((a, b) => a.distinta!.data.localeCompare(b.distinta!.data));
  const tratti: { societa: string; dal: string; al: string }[] = [];
  for (const p of ordinate) {
    const soc = appartenenzaDi(p), d = p.distinta!.data;
    const ultimo = tratti[tratti.length - 1];
    if (ultimo && ultimo.societa === soc) ultimo.al = d;
    else tratti.push({ societa: soc, dal: d, al: d });
  }
  return tratti;
}

/** Storico dalle distinte: stagione per stagione, squadra, categoria e partite giocate.
 *  Non si sovrascrive mai: ogni distinta resta con la squadra e la società di quel giorno. */
export function StoricoGiocatore({ presenze }: { presenze: Presenza[] }) {
  const valide = presenze.filter((p) => p.distinta);
  // Un gruppo per stagione + squadra + società di appartenenza: se cambia società (anche a metà
  // stagione, o gioca in prestito) i periodi restano separati
  const gruppi = new Map<string, { stagione: string; societa: string; categoria: string; appartenenza: string; partite: Presenza[] }>();
  for (const p of valide) {
    const stagione = p.distinta!.stagione;
    const societa = p.squadra?.societa?.nome ?? '—';
    const categoria = p.squadra?.categoria ?? p.distinta!.categoria;
    const appartenenza = appartenenzaDi(p);
    const k = `${stagione}|${societa}|${categoria}|${appartenenza}`;
    if (!gruppi.has(k)) gruppi.set(k, { stagione, societa, categoria, appartenenza, partite: [] });
    gruppi.get(k)!.partite.push(p);
  }
  const elenco = [...gruppi.values()]
    .map((g) => ({ ...g, partite: g.partite.sort((a, b) => b.distinta!.data.localeCompare(a.distinta!.data)) }))
    .sort((a, b) => b.partite[0].distinta!.data.localeCompare(a.partite[0].distinta!.data));
  const tratti = percorso(valide);

  return (
    <section className="rounded-xl border border-linea bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-display text-2xl font-bold">Squadre e partite</h2>
        <span className="text-sm text-grigio">dalle distinte di gara</span>
      </div>
      {elenco.length === 0 ? (
        <p className="mt-3 text-grigio">Nessuna distinta con questo giocatore.</p>
      ) : (
        <>
        <p className="mt-2 text-sm">
          <span className="text-grigio">Percorso: </span>
          {tratti.map((t, i) => (
            <span key={`${t.societa}${t.dal}`}>
              {i > 0 && <span className="text-grigio"> → </span>}
              <strong>{t.societa}</strong>{' '}
              <span className="text-grigio">
                ({i === tratti.length - 1 ? `da ${meseAnno(t.dal)}` : meseAnno(t.dal) === meseAnno(t.al) ? meseAnno(t.dal) : `${meseAnno(t.dal)} – ${meseAnno(t.al)}`})
              </span>
            </span>
          ))}
        </p>
        <ul className="mt-3 divide-y divide-linea">
          {elenco.map((g, i) => {
            const numeri = [...new Set(g.partite.map((p) => p.numero).filter((n) => n !== null))];
            const titolare = g.partite.filter((p) => p.titolare).length;
            return (
              <li key={`${g.stagione}${g.societa}${g.categoria}`} className="py-3">
                <details open={i === 0}>
                  <summary className="cursor-pointer">
                    <span className="font-semibold">{g.stagione}</span>
                    <span className="text-grigio"> · </span>
                    <span className="font-semibold">{g.societa}</span>
                    <span className="text-grigio"> · {g.categoria}</span>
                    {g.appartenenza !== g.societa && <span className="text-grigio"> · tesserato con {g.appartenenza}</span>}
                    <span className="block text-sm text-grigio sm:ml-6 sm:inline">
                      {g.partite.length} {g.partite.length === 1 ? 'partita' : 'partite'}
                      {g.partite.length > 1 && ` dal ${dataBreve(g.partite[g.partite.length - 1].distinta!.data)} al ${dataBreve(g.partite[0].distinta!.data)}`}
                      {titolare > 0 && ` (${titolare} da titolare)`}
                      {numeri.length > 0 && ` · numero ${numeri.join(', ')}`}
                    </span>
                  </summary>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {g.partite.map((p) => {
                      const d = p.distinta!;
                      return (
                        <li key={d.id} className="flex flex-wrap gap-x-2">
                          <span className="w-20 shrink-0 text-grigio">{dataBreve(d.data)}</span>
                          <span className="min-w-0 flex-1">
                            {d.casa_nome} – {d.trasferta_nome}
                            {d.risultato && <strong> {d.risultato}</strong>}
                            {d.competizione && <span className="text-grigio"> · {d.competizione}</span>}
                          </span>
                          <span className="text-grigio">
                            {p.numero !== null && `n. ${p.numero}`}
                            {p.titolare === true && ' · titolare'}
                            {p.titolare === false && ' · panchina'}
                            {p.capitano && ' · capitano'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </section>
  );
}
