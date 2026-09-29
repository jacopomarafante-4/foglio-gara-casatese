import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta } from '@/lib/societa';
import { annateDisponibili, AREE, DETTAGLI_SEGNALAZIONE, IMPRESSIONI, LINEE, SCELTE_PIEDE, TIPI_GIOCATORE } from '@/lib/tipi';
import { oggiIso } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { SceltaRapida } from '@/components/SceltaRapida';
import { BarraSalva, RigaVoto, Sezione } from '@/components/Sezione';
import { GiaInLista } from '@/components/GiaInLista';
import { salvaSegnalazione } from './actions';

const TONI_IMPRESSIONE = { positiva: 'border-blu bg-blu text-white', da_rivedere: 'border-oro bg-oro text-inchiostro', negativa: 'border-rosso bg-rosso text-white' };

export default async function Segnala({
  searchParams,
}: {
  searchParams: Promise<{ giocatore?: string; errore?: string }>;
}) {
  const profilo = (await getProfilo())!;
  if (!puoSegnalare(profilo.ruolo)) redirect('/home');

  const { giocatore: giocatoreId, errore } = await searchParams;
  const supabase = await createClient();

  // Segnalazione su un giocatore già in archivio
  const { data: giocatore } = giocatoreId
    ? await supabase
        .from('giocatori')
        .select('id, cognome, nome, descrizione, annata, osservato')
        .eq('id', giocatoreId)
        .maybeSingle()
    : { data: null };
  // Già in lista (osservato): niente seconda segnalazione, si valuta subito (0032)
  if (giocatore?.osservato) redirect(`/giocatori/${giocatore.id}/valuta?gia=1`);

  const societa = giocatore ? [] : await elencoSocieta(supabase);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl font-bold">
        {giocatore ? 'Nuova segnalazione' : 'Segnala un giocatore'}
      </h1>
      {giocatore ? (
        <p className="mt-1 text-grigio">
          Per{' '}
          <Link href={`/giocatori/${giocatore.id}`} className="font-medium text-blu underline">
            {[giocatore.cognome, giocatore.nome].filter(Boolean).join(' ') || giocatore.descrizione}
          </Link>{' '}
          ({giocatore.annata})
        </p>
      ) : (
        <p className="mt-1 text-grigio">Dall’alto in basso: servono solo le voci con *, il resto se l’hai visto.</p>
      )}

      <form id="segnala" action={salvaSegnalazione} className="mt-6 space-y-4">
        <Avviso errore={errore} />

        {giocatore ? (
          <input type="hidden" name="giocatore_id" value={giocatore.id} />
        ) : (
          <Sezione n={1} titolo="Chi è" sotto="Se non sai il nome, descrivilo: si completa dopo.">
            <Etichetta testo="Annata *">
              <select name="annata" required className="campo" defaultValue="">
                <option value="" disabled>Scegli</option>
                {annateDisponibili().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Etichetta>
            {/* ruolo in due passi (0046): portiere o movimento, poi la linea solo per chi è di movimento */}
            <div className="group space-y-3">
              <fieldset>
                <legend className="mb-1 block text-sm font-medium">Portiere o giocatore di movimento? *</legend>
                <div className="grid grid-cols-2 gap-2">
                  {TIPI_GIOCATORE.map(([v, e]) => (
                    <label key={v}>
                      <input type="radio" name="tipo" value={v} required className="peer sr-only" />
                      <span className="block min-h-11 cursor-pointer rounded-lg border border-linea bg-white px-3 py-2.5 text-center font-display text-base font-bold hover:border-blu peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro">{e}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="hidden group-has-[[value=movimento]:checked]:block">
                <span className="mb-1 block text-sm font-medium">In che linea gioca? <span className="font-normal text-grigio">(facoltativo)</span></span>
                <SceltaRapida nome="linea" etichetta="Linea" voci={LINEE.map(([v, e, d]) => [v, `${e} · ${d}`])} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Etichetta testo="Cognome">
                <input name="cognome" className="campo" autoComplete="off" autoCapitalize="words" />
              </Etichetta>
              <Etichetta testo="Nome">
                <input name="nome" className="campo" autoComplete="off" autoCapitalize="words" />
              </Etichetta>
            </div>

            <GiaInLista formId="segnala" />

            <Etichetta testo="Come riconoscerlo" aiuto="Serve se manca il cognome.">
              <input name="descrizione" className="campo" autoComplete="off" placeholder="Es. N.8, biondo, mancino" />
            </Etichetta>
            <Etichetta testo="Società" aiuto="Scegli dall’elenco o scrivi il nome: se è nuova la aggiungo.">
              <input name="societa" list="elenco-societa" className="campo" autoComplete="off" />
              <datalist id="elenco-societa">
                {societa.map((s) => (
                  <option key={s.id} value={s.nome} />
                ))}
              </datalist>
            </Etichetta>
          </Sezione>
        )}

        <Sezione n={giocatore ? 1 : 2} titolo="Prima impressione" sotto="Due tocchi. Tocca di nuovo per togliere." facoltativo>
          <div>
            <span className="mb-1 block text-sm font-medium">Come ti è sembrato?</span>
            <SceltaRapida nome="impressione" etichetta="Prima impressione" voci={Object.entries(IMPRESSIONI)} toni={TONI_IMPRESSIONE} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Piede preferito</span>
            <SceltaRapida nome="piede" etichetta="Piede preferito" voci={SCELTE_PIEDE} />
          </div>
        </Sezione>

        <Sezione n={giocatore ? 2 : 3} titolo="Cosa hai visto *" sotto="La parte più importante: solo aspetti tecnici e sportivi.">
          <textarea name="testo" required rows={5} className="campo" aria-label="Cosa hai visto"
            placeholder="Es. Ala sinistra, salta l'uomo con facilità, cerca sempre la profondità…" />
        </Sezione>

        {/* le 4 aree (0043) e il fisico: una riga per voce, nota solo se serve */}
        <Sezione n={giocatore ? 3 : 4} titolo="Voti" sotto="Da 1 (debole) a 5 (ottimo). Vota solo quello che hai visto." facoltativo>
          {AREE.map((a) => <RigaVoto key={a.chiave} nome={a.chiave} titolo={a.nome} aiuto={a.aiuto} nota />)}
          {DETTAGLI_SEGNALAZIONE.map((d) => <RigaVoto key={d.chiave} nome={d.chiave} titolo={d.nome} />)}
        </Sezione>

        <Sezione n={giocatore ? 4 : 5} titolo="Dove e quando">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Etichetta testo="Partita o occasione">
              <input name="contesto" className="campo" placeholder="Es. Cambiaghese–Vibe, U12" />
            </Etichetta>
            <Etichetta testo="Data">
              <input type="date" name="data" defaultValue={oggiIso()} className="campo" />
            </Etichetta>
          </div>
        </Sezione>

        <BarraSalva testo="Salva segnalazione" nota="* obbligatori: annata, portiere o movimento, cosa hai visto e cognome (o come riconoscerlo)" />
      </form>
    </div>
  );
}
