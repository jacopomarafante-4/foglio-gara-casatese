import { nomeCompleto } from '@/lib/ruoli';
import { dataBreve } from '@/lib/utili';
import { Etichetta } from '@/components/Etichetta';
import { chiudiIncarico, creaIncarico, eliminaIncarico, lasciaIncarico, prendiIncarico } from '@/app/(app)/home/actions';

type Persona = { id: string; nome: string | null; cognome: string | null; email: string } | null;
export type Incarico = {
  id: string; titolo: string; tipo: 'squadra' | 'torneo' | 'partita' | 'altro'; categoria: string | null; quando: string | null;
  dettagli: string | null; fatto: boolean; fatto_il: string | null; esito: string | null; created_at: string;
  societa: { nome: string } | null; creato: Persona; assegnato: Persona;
};

export const SELECT_INCARICO =
  'id, titolo, tipo, categoria, quando, dettagli, fatto, fatto_il, esito, created_at, societa(nome), ' +
  'creato:profiles!incarichi_creato_da_fkey(id, nome, cognome, email), assegnato:profiles!incarichi_assegnato_a_fkey(id, nome, cognome, email)';

const TIPI: Record<Incarico['tipo'], string> = { squadra: 'Squadra da vedere', torneo: 'Torneo', partita: 'Partita', altro: 'Altro' };
const chi = (p: Persona) => (p ? nomeCompleto({ ...p, email: p.nome || p.cognome ? p.email : 'Utente' }) : '—');

/** Incarichi in Home: li creano admin e direttori (gestore), li prendono direttori e scout */
export function Incarichi({ aperti, fatti, mioId, gestore, societa }: {
  aperti: Incarico[]; fatti: Incarico[]; mioId: string; gestore: boolean; societa: string[];
}) {
  return (
    <section id="incarichi" className="space-y-3">
      <h2 className="font-display text-2xl font-bold">Incarichi</h2>
      {aperti.length === 0 ? (
        <p className="text-grigio">Nessun incarico aperto.{gestore ? ' Aggiungine uno qui sotto.' : ''}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {aperti.map((x) => {
            const mio = x.assegnato?.id === mioId;
            return (
              <li key={x.id} className={`rounded-xl border bg-white p-4 ${x.assegnato ? 'border-linea' : 'border-oro'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-full bg-carta px-2 py-0.5 text-xs font-semibold text-grigio">{TIPI[x.tipo]}</span>
                    <p className="mt-1 font-semibold">{x.titolo}</p>
                    <p className="text-sm text-grigio">
                      {[x.societa?.nome, x.categoria, x.quando ? dataBreve(x.quando) : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {gestore && (
                    <form action={eliminaIncarico}>
                      <input type="hidden" name="id" value={x.id} />
                      <button className="text-sm text-grigio hover:text-rosso" aria-label={`Elimina ${x.titolo}`}>Elimina</button>
                    </form>
                  )}
                </div>
                {x.dettagli && <p className="mt-2 whitespace-pre-line text-sm">{x.dettagli}</p>}
                <p className="mt-2 text-xs text-grigio">Da {chi(x.creato)} · {dataBreve(x.created_at)}</p>

                <div className="mt-3 border-t border-linea pt-3">
                  {!x.assegnato ? (
                    <form action={prendiIncarico}>
                      <input type="hidden" name="id" value={x.id} />
                      <button className="bottone w-full sm:w-auto">Me ne occupo io</button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm">Se ne occupa: <strong>{mio ? 'tu' : chi(x.assegnato)}</strong></p>
                      {(mio || gestore) && (
                        <div className="flex flex-wrap items-start gap-2">
                          <details className="min-w-0 flex-1">
                            <summary className="cursor-pointer text-sm font-semibold text-blu">Segna come fatto</summary>
                            <form action={chiudiIncarico} className="mt-2 space-y-2">
                              <input type="hidden" name="id" value={x.id} />
                              <textarea name="esito" rows={2} placeholder="Com'è andata (facoltativo)" className="campo" />
                              <button className="bottone">Fatto</button>
                            </form>
                          </details>
                          <form action={lasciaIncarico}>
                            <input type="hidden" name="id" value={x.id} />
                            <button className="text-sm text-grigio hover:text-rosso">{mio ? 'Lascio' : 'Libera'}</button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {gestore && (
        <details className="rounded-xl border border-linea bg-white p-4">
          <summary className="cursor-pointer font-semibold text-blu">+ Nuovo incarico</summary>
          <form action={creaIncarico} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Etichetta testo="Cosa c'è da fare *">
                <input name="titolo" required className="campo" placeholder="Es. Vedere la Cisanese Under 15" />
              </Etichetta>
            </div>
            <Etichetta testo="Tipo">
              <select name="tipo" className="campo" defaultValue="squadra">
                {Object.entries(TIPI).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
              </select>
            </Etichetta>
            <Etichetta testo="Quando">
              <input type="date" name="quando" className="campo" />
            </Etichetta>
            <Etichetta testo="Società">
              <input name="societa" list="incarichi-societa" className="campo" autoComplete="off" />
              <datalist id="incarichi-societa">{societa.map((s) => <option key={s} value={s} />)}</datalist>
            </Etichetta>
            <Etichetta testo="Categoria">
              <input name="categoria" className="campo" placeholder="Es. Under 15" />
            </Etichetta>
            <div className="sm:col-span-2">
              <Etichetta testo="Dettagli">
                <textarea name="dettagli" rows={2} className="campo" placeholder="Es. Guardare il 9 e il portiere, gioca in casa la domenica" />
              </Etichetta>
            </div>
            <div className="sm:col-span-2"><button className="bottone">Aggiungi incarico</button></div>
          </form>
        </details>
      )}

      {fatti.length > 0 && (
        <details className="rounded-xl border border-linea bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-grigio">Fatti di recente ({fatti.length})</summary>
          <ul className="mt-2 divide-y divide-linea text-sm">
            {fatti.map((x) => (
              <li key={x.id} className="py-2">
                <p><span className="font-semibold">{x.titolo}</span> <span className="text-grigio">· {chi(x.assegnato)}{x.fatto_il ? ` · ${dataBreve(x.fatto_il)}` : ''}</span></p>
                {x.esito && <p className="whitespace-pre-line text-grigio">{x.esito}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
