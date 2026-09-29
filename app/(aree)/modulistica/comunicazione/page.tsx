// Modulistica → Comunicazione (nell'app dalla tappa 3): titolo e testo su carta intestata, in PDF. Non si salva e non si
// pubblica: per farla arrivare nell'app a mister e famiglie c'è Calendario → Avvisi (nel Portale).
// Mister: categoria della sua squadra; admin, direttori e organizzativo la scelgono.
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { vedeTutto } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { oggiIso } from '@/lib/utili';
import { ComunicazioneForm } from '@/components/ComunicazioneForm';

type Squadra = { category?: string; organizza?: boolean; vedeTutte?: boolean };

export default async function PaginaComunicazione() {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (profilo && !vedeTutto(profilo.ruolo)) redirect(profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!profilo && !mister) redirect('/');
  const supabase = await createClient();

  // il mister di una squadra usa la sua categoria; gli altri scelgono tra quelle delle squadre
  const sceglie = !mister || !!mister.squadra.organizza;
  let categorie: string[] = [];
  if (sceglie) {
    const { data } = mister
      ? await supabase.rpc('coach_get', { p_pin: mister.pin, p_path: 'shared/teams' })
      : await supabase.from('docs').select('data').eq('path', 'shared/teams').maybeSingle().then((r) => ({ data: r.data?.data }));
    categorie = [...new Set(((data?.items ?? []) as Squadra[]).filter((t) => !t.organizza && !t.vedeTutte).map((t) => t.category).filter(Boolean))] as string[];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Comunicazione</h1>
        <p className="mt-1 max-w-prose text-grigio">
          Un foglio su carta intestata della società, da stampare o allegare. Per farla arrivare nell’app a mister e famiglie usa
          Calendario → Avvisi.
        </p>
      </div>
      <ComunicazioneForm
        mia={sceglie ? '' : mister?.squadra.category ?? ''}
        categorie={categorie}
        firma={mister ? mister.nome : 'La società'}
        squadraId={mister?.squadra.id ?? null}
        oggi={oggiIso()}
      />
    </div>
  );
}
