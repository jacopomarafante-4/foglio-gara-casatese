// Modulo di valutazione, uguale per lo Scouting (/giocatori/[id]/valuta) e per i mister (/scouting/valuta/[id]):
// Partita e ruolo · le 5 aree del dettaglio · Giudizio. Cambia solo dove si salva (`action`) e i campi nascosti.
import { DETTAGLI_VALUTAZIONE, GIUDIZI, GRUPPI_VALUTAZIONE, RUOLI_PRECISI } from '@/lib/tipi';
import { oggiIso } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { BarraSalva, RigaVoto, Sezione } from '@/components/Sezione';

const TONI_GIUDIZIO: Record<string, string> = {
  da_prendere: 'peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white',
  da_rivedere: 'peer-checked:border-oro peer-checked:bg-oro peer-checked:text-inchiostro',
  non_a_livello: 'peer-checked:border-rosso peer-checked:bg-rosso peer-checked:text-white',
};

export function ModuloValutazione({
  action, nascosti, titolo, gia, errore, ruoloPreciso, contesto, data, nota,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** campi nascosti (id del giocatore e, per i mister, nome e annata da rimostrare se c'è un errore) */
  nascosti: Record<string, string>;
  titolo: string;
  /** arriva da una segnalazione di un giocatore già in lista: quello che si era scritto è nel commento */
  gia?: boolean;
  errore?: string;
  ruoloPreciso?: string | null;
  contesto?: string;
  data?: string;
  nota?: string;
}) {
  return (
    <form action={action} className="mt-6 space-y-4">
      <Avviso errore={errore} />
      {gia && (
        <p className="rounded-xl border-l-4 border-oro bg-carta p-4 text-sm">
          <b>{titolo} è già in lista.</b> Invece di una nuova segnalazione, compila la valutazione: quello che avevi scritto è già
          nel commento.
        </p>
      )}
      {Object.entries(nascosti).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      <Sezione n={1} titolo="Partita e ruolo">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Etichetta testo="Partita o occasione">
            <input name="contesto" className="campo" placeholder="Es. Open day, amichevole…" defaultValue={contesto ?? ''} />
          </Etichetta>
          <Etichetta testo="Data">
            <input type="date" name="data" defaultValue={data || oggiIso()} className="campo" />
          </Etichetta>
        </div>
        <Etichetta testo="Ruolo preciso" aiuto="Aggiorna anche il ruolo nella scheda del giocatore.">
          <select name="ruolo_preciso" className="campo" defaultValue={ruoloPreciso ?? ''}>
            <option value="">Non so / non l’ho capito</option>
            {Object.entries(RUOLI_PRECISI).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
          </select>
        </Etichetta>
      </Sezione>

      <p className="px-1 text-sm text-grigio">
        Voti da 1 (debole) a 5 (ottimo), tutti facoltativi: vota solo quello che hai visto. Una scelta si toglie toccandola di nuovo.
      </p>
      {/* le 5 aree del dettaglio, ognuna col suo blocco */}
      {GRUPPI_VALUTAZIONE.map((gr, i) => (
        <Sezione key={gr.nome} n={i + 2} titolo={gr.nome} sotto={gr.aiuto} facoltativo>
          {DETTAGLI_VALUTAZIONE.filter((d) => d.gruppo === gr.nome).map((d) => <RigaVoto key={d.chiave} nome={d.chiave} titolo={d.nome} aiuto={d.aiuto} />)}
        </Sezione>
      ))}

      <Sezione n={GRUPPI_VALUTAZIONE.length + 2} titolo="Giudizio *" sotto="La tua conclusione su questo ragazzo.">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Giudizio">
          {Object.entries(GIUDIZI).map(([v, e]) => (
            <label key={v}>
              <input type="radio" name="giudizio" value={v} required className="peer sr-only" />
              <span className={`block min-h-11 cursor-pointer rounded-lg border border-linea bg-white px-3 py-3 text-center font-semibold hover:border-blu peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro ${TONI_GIUDIZIO[v]}`}>
                {e}
              </span>
            </label>
          ))}
        </div>
        <Etichetta testo="Il tuo giudizio">
          <textarea name="commento" rows={5} className="campo" defaultValue={nota ?? ''} placeholder="Scrivi con parole tue: punti di forza, cosa deve migliorare, perché lo prenderesti o no…" />
        </Etichetta>
      </Sezione>

      <BarraSalva testo="Salva valutazione" nota="* obbligatorio: il giudizio" />
    </form>
  );
}
