import { ESITI_EVENTO, TIPI_EVENTO, type EsitoEvento, type TipoEvento } from '@/lib/tipi';
import { dataBreve, oggiIso } from '@/lib/utili';
import { aggiungiEvento, eliminaEvento, modificaEvento } from '@/app/(app)/giocatori/actions';

export type Evento = {
  id: string;
  tipo: TipoEvento;
  data: string;
  presente: boolean | null;
  esito: EsitoEvento | null;
  note: string | null;
  autore_id: string | null;
  autore: { nome: string | null; cognome: string | null; email: string } | null;
};

const COLORE_ESITO: Record<EsitoEvento, string> = {
  positivo: 'bg-blu text-white',
  da_rivedere: 'bg-oro/25 text-inchiostro',
  negativo: 'bg-rosso/10 text-rosso',
};

const presenzaTesto = (p: boolean | null) => (p === true ? 'Presente' : p === false ? 'Assente' : 'Presenza da segnare');
const valorePresenza = (p: boolean | null) => (p === true ? 'si' : p === false ? 'no' : '');

function CampiEsito({ evento }: { evento?: Evento }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Presenza</span>
        <select name="presente" defaultValue={evento ? valorePresenza(evento.presente) : ''} className="campo">
          <option value="">Da segnare</option>
          <option value="si">Presente</option>
          <option value="no">Assente</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Esito</span>
        <select name="esito" defaultValue={evento?.esito ?? ''} className="campo">
          <option value="">Da decidere</option>
          {Object.entries(ESITI_EVENTO).map(([v, e]) => (
            <option key={v} value={v}>{e}</option>
          ))}
        </select>
      </label>
      <label className="col-span-2 block">
        <span className="mb-1 block text-sm font-medium">Note</span>
        <textarea name="note" rows={2} defaultValue={evento?.note ?? ''} className="campo" placeholder="Solo note tecniche" />
      </label>
    </div>
  );
}

/** Eventi del giocatore (open day, provini, allenamenti di prova) dentro la sua scheda */
export function EventiGiocatore({
  giocatoreId,
  eventi,
  mioId,
  scrive,
  gestore,
  chi,
}: {
  giocatoreId: string;
  eventi: Evento[];
  mioId: string;
  scrive: boolean;
  gestore: boolean;
  chi: (a: Evento['autore']) => string;
}) {
  return (
    <section className="rounded-xl border border-linea bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">Eventi</h2>
        <span className="text-sm text-grigio">open day, provini, allenamenti di prova</span>
      </div>

      {eventi.length === 0 ? (
        <p className="mt-3 text-grigio">Ancora nessun evento.</p>
      ) : (
        <ul className="mt-3 divide-y divide-linea">
          {eventi.map((ev) => {
            const puo = gestore || (scrive && ev.autore_id === mioId);
            return (
              <li key={ev.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{TIPI_EVENTO[ev.tipo]}</span>
                  <span className="text-sm text-grigio">{dataBreve(ev.data)}</span>
                  <span className={`text-sm ${ev.presente === false ? 'text-rosso' : ev.presente ? 'text-inchiostro' : 'text-grigio'}`}>
                    · {presenzaTesto(ev.presente)}
                  </span>
                  {ev.esito && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORE_ESITO[ev.esito]}`}>
                      {ESITI_EVENTO[ev.esito]}
                    </span>
                  )}
                </div>
                {ev.note && <p className="mt-1 whitespace-pre-line text-sm">{ev.note}</p>}
                <p className="mt-1 text-xs text-grigio">Inserito da {chi(ev.autore)}</p>
                {puo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-blu">Aggiorna presenza ed esito</summary>
                    <form action={modificaEvento} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={giocatoreId} />
                      <input type="hidden" name="evento_id" value={ev.id} />
                      <CampiEsito evento={ev} />
                      <div className="flex gap-2">
                        <button className="bottone flex-1">Salva</button>
                      </div>
                    </form>
                    <form action={eliminaEvento} className="mt-2">
                      <input type="hidden" name="id" value={giocatoreId} />
                      <input type="hidden" name="evento_id" value={ev.id} />
                      <button className="text-xs text-grigio hover:text-rosso">Elimina evento</button>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {scrive && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-blu">Aggiungi evento</summary>
          <form action={aggiungiEvento} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={giocatoreId} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Tipo</span>
                <select name="tipo" defaultValue="open_day" className="campo">
                  {Object.entries(TIPI_EVENTO).map(([v, e]) => (
                    <option key={v} value={v}>{e}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Data</span>
                <input type="date" name="data" defaultValue={oggiIso()} className="campo" />
              </label>
            </div>
            <CampiEsito />
            <button className="bottone w-full">Salva evento</button>
          </form>
        </details>
      )}
    </section>
  );
}
