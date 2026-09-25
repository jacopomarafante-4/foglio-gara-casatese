import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta } from '@/lib/societa';
import { annateDisponibili, RUOLI_CAMPO } from '@/lib/tipi';
import { oggiIso } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { Voto } from '@/components/Voto';
import { salvaSegnalazione } from './actions';

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
        .select('id, cognome, nome, descrizione, annata')
        .eq('id', giocatoreId)
        .maybeSingle()
    : { data: null };

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
        <p className="mt-1 text-grigio">Se non sai ancora il nome, descrivilo: lo completerete dopo.</p>
      )}

      <form action={salvaSegnalazione} className="mt-6 space-y-5">
        <Avviso errore={errore} />

        {giocatore ? (
          <input type="hidden" name="giocatore_id" value={giocatore.id} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Etichetta testo="Annata *">
                <select name="annata" required className="campo" defaultValue="">
                  <option value="" disabled>Scegli</option>
                  {annateDisponibili().map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </Etichetta>
              <Etichetta testo="Ruolo">
                <select name="ruolo" className="campo" defaultValue="">
                  <option value="">Non so</option>
                  {Object.entries(RUOLI_CAMPO).map(([v, e]) => (
                    <option key={v} value={v}>{e}</option>
                  ))}
                </select>
              </Etichetta>
            </div>

            <Etichetta testo="Società" aiuto="Scegli dall’elenco o scrivi il nome: se è nuova la aggiungo.">
              <input name="societa" list="elenco-societa" className="campo" autoComplete="off" />
              <datalist id="elenco-societa">
                {societa.map((s) => (
                  <option key={s.id} value={s.nome} />
                ))}
              </datalist>
            </Etichetta>

            <div className="grid grid-cols-2 gap-3">
              <Etichetta testo="Cognome">
                <input name="cognome" className="campo" autoComplete="off" autoCapitalize="words" />
              </Etichetta>
              <Etichetta testo="Nome">
                <input name="nome" className="campo" autoComplete="off" autoCapitalize="words" />
              </Etichetta>
            </div>

            <Etichetta testo="Come riconoscerlo" aiuto="Obbligatorio se manca il cognome. Es. “N.8, biondo, mancino”.">
              <input name="descrizione" className="campo" autoComplete="off" />
            </Etichetta>
          </>
        )}

        <Etichetta testo="Cosa hai visto *">
          <textarea name="testo" required rows={5} className="campo" />
        </Etichetta>

        <div>
          <span className="mb-1 block text-sm font-medium">Prima impressione (facoltativa)</span>
          <Voto nome="voto" />
          <span className="mt-1 block text-xs text-grigio">1 = non a livello · 5 = da prendere subito</span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Etichetta testo="Partita o occasione">
            <input name="contesto" className="campo" placeholder="Es. Cambiaghese–Vibe, U12" />
          </Etichetta>
          <Etichetta testo="Data">
            <input type="date" name="data" defaultValue={oggiIso()} className="campo" />
          </Etichetta>
        </div>

        <button type="submit" className="bottone w-full">Salva segnalazione</button>
      </form>
    </div>
  );
}
