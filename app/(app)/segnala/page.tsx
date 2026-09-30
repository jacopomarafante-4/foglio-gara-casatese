import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { elencoSocieta } from '@/lib/societa';
import { GiaInLista } from '@/components/GiaInLista';
import { ModuloSegnalazione } from '@/components/ModuloSegnalazione';
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

      <ModuloSegnalazione action={salvaSegnalazione} formId="segnala" societa={societa.map((s) => s.nome)}
        giocatoreId={giocatore?.id} giaInLista={<GiaInLista formId="segnala" />} errore={errore} />
    </div>
  );
}
