// Scheda del giocatore: storico delle valutazioni sotto le medie. Una riga per valutazione (dalla più recente):
// data, chi, i 4 voti (solo nelle valutazioni fino alla 0043; dopo, il dettaglio), media e giudizio, con la freccia rispetto alla precedente.
// Toccando la riga: note delle aree e commento.
import { AREE, DETTAGLI_VALUTAZIONE, GIUDIZI, RUOLI_PRECISI, type ChiaveDettaglio, type Giudizio, type RuoloPreciso } from '@/lib/tipi';
import { dataBreve } from '@/lib/utili';
import { Autore, type FirmaValutazione } from '@/components/Autore';
import { mediaVoti } from '@/lib/valutazioni';
import { eliminaValutazione } from '@/app/(app)/giocatori/actions';

export type ValutazioneStorico = {
  id: string; data: string; contesto: string | null; giudizio: Giudizio; commento: string | null; firma: string;
  f: FirmaValutazione; puoEliminare: boolean; ruolo_preciso?: RuoloPreciso | null;
  tecnica: number | null; motoria: number | null; tattica: number | null; mentale: number | null;
  tecnica_note: string | null; motoria_note: string | null; tattica_note: string | null; mentale_note: string | null;
} & Partial<Record<ChiaveDettaglio, number | null>>;   // voti del dettaglio (0041, 0044, 0045), facoltativi

/* media: delle 4 aree se ci sono (valutazioni vecchie), se no del dettaglio */
const media = (v: ValutazioneStorico) => mediaVoti(v) ?? (() => {
  const d = DETTAGLI_VALUTAZIONE.map((x) => v[x.chiave]).filter((x): x is number => typeof x === 'number');
  return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
})();
const COLORE_GIUDIZIO: Record<Giudizio, string> = {
  da_prendere: 'bg-blu text-white',
  da_rivedere: 'bg-oro/30 text-inchiostro',
  non_a_livello: 'bg-rosso/15 text-rosso',
};
/** Voto con la freccia rispetto a prima (↑ meglio, ↓ peggio) */
function Voto({ ora, prima }: { ora: number | null; prima?: number | null }) {
  if (ora == null) return <span className="font-display text-lg font-bold text-grigio">–</span>;
  const d = prima == null ? 0 : ora - prima;
  return (
    <span className="font-display text-lg font-bold">
      {ora}
      {d !== 0 && <span className={`ml-0.5 text-xs ${d > 0 ? 'text-blu' : 'text-rosso'}`} aria-label={d > 0 ? 'meglio di prima' : 'peggio di prima'}>{d > 0 ? '↑' : '↓'}</span>}
    </span>
  );
}

export function StoricoValutazioni({ valutazioni, giocatoreId }: { valutazioni: ValutazioneStorico[]; giocatoreId: string }) {
  if (!valutazioni.length) return null;
  // in ordine dalla più recente; "prima" = quella subito più vecchia
  const ordinate = [...valutazioni].sort((a, b) => b.data.localeCompare(a.data));
  return (
    <div className="mt-6">
      <h3 className="font-display text-xl font-bold">Storico valutazioni</h3>
      <ol className="mt-2 divide-y divide-linea rounded-lg border border-linea">
        {ordinate.map((v, i) => {
          const p = ordinate[i + 1];
          const note = AREE.filter((a) => v[`${a.chiave}_note`]);
          return (
            <li key={v.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-3 hover:bg-carta">
                  <Autore f={v.f} />
                  <span className="min-w-32 flex-1">
                    <span className="block font-semibold">{dataBreve(v.data)}</span>
                    <span className="block text-xs text-grigio">{[v.firma, v.contesto, v.ruolo_preciso && RUOLI_PRECISI[v.ruolo_preciso]].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="grid grid-cols-5 gap-3 text-center">
                    {mediaVoti(v) === null ? (
                      <span className="col-span-4 self-center text-left text-xs text-grigio">
                        {DETTAGLI_VALUTAZIONE.filter((d) => v[d.chiave]).map((d) => `${d.nome} ${v[d.chiave]}`).join(' · ') || 'Senza voti'}
                      </span>
                    ) : AREE.map((a) => (
                      <span key={a.chiave}>
                        <small className="block text-[11px] font-semibold uppercase text-grigio">{a.nome.slice(0, 3)}</small>
                        <Voto ora={v[a.chiave]} prima={p?.[a.chiave]} />
                      </span>
                    ))}
                    <span>
                      <small className="block text-[11px] font-semibold uppercase text-grigio">Media</small>
                      <span className="font-display text-lg font-bold">{media(v)?.toFixed(1) ?? '–'}</span>
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORE_GIUDIZIO[v.giudizio]}`}>{GIUDIZI[v.giudizio]}</span>
                  <span className="text-grigio transition group-open:rotate-90" aria-hidden="true">›</span>
                </summary>
                <div className="space-y-1 px-3 pb-3 text-sm">
                  {DETTAGLI_VALUTAZIONE.some((d) => v[d.chiave]) && (
                    <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                      {DETTAGLI_VALUTAZIONE.filter((d) => v[d.chiave]).map((d) => (
                        <span key={d.chiave} className="flex items-center justify-between gap-2 rounded-md bg-carta px-2 py-1">
                          <span className="text-xs text-grigio">{d.nome}</span><b className="font-display text-base">{v[d.chiave]}</b>
                        </span>
                      ))}
                    </div>
                  )}
                  {note.map((a) => (
                    <p key={a.chiave}><span className="font-semibold">{a.nome}:</span> {v[`${a.chiave}_note`]}</p>
                  ))}
                  {v.commento && <p className="whitespace-pre-line">{v.commento}</p>}
                  {!note.length && !v.commento && !DETTAGLI_VALUTAZIONE.some((d) => v[d.chiave]) && <p className="text-grigio">Nessuna nota.</p>}
                  {v.puoEliminare && (
                    <form action={eliminaValutazione} className="pt-1 text-right">
                      <input type="hidden" name="id" value={giocatoreId} />
                      <input type="hidden" name="valutazione" value={v.id} />
                      <button className="text-xs font-semibold text-grigio hover:text-rosso">Elimina questa valutazione</button>
                    </form>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {ordinate.length > 1 && (
        <p className="mt-1 text-xs text-grigio">↑ e ↓: meglio o peggio della valutazione precedente. Tocca una riga per note e commento.</p>
      )}
    </div>
  );
}
