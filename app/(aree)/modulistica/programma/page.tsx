// Modulistica → Programma gare (nell'app dalla tappa 3): partite di tutte le squadre ed eventi della società in un periodo,
// da consultare o stampare in PDF. Mister (tessera del PIN): calendari da coach_calendari, eventi e amichevoli della sua
// squadra da coach_get. Admin e direttori: i documenti del Portale (docs, in lettura).
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { vedeTutto } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { oggiIso } from '@/lib/utili';
import { settimanaDi, type Evento, type Partita, type SquadraCal } from '@/lib/programma';
import { ProgrammaGare } from '@/components/ProgrammaGare';

export default async function Programma() {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (profilo && !vedeTutto(profilo.ruolo)) redirect(profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!profilo && !mister) redirect('/');
  const supabase = await createClient();

  let squadre: SquadraCal[] = [], eventi: Evento[] = [], errore = '';
  if (mister) {
    const [cal, ev, reg] = await Promise.all([
      supabase.rpc('coach_calendari', { p_pin: mister.pin }),
      supabase.rpc('coach_get', { p_pin: mister.pin, p_path: 'shared/eventi' }),
      supabase.rpc('coach_get', { p_pin: mister.pin, p_path: 'registro/' + mister.squadra.id }),
    ]);
    if (cal.error) errore = cal.error.message;
    // amichevoli segnate dal mister nel suo registro (come allCalendar() del Portale)
    const amichevoli = ((reg.data?.friendlies ?? []) as Partita[]).map((m) => ({ ...m, friendly: true }));
    squadre = ((cal.data ?? []) as SquadraCal[]).map((t) => ({
      ...t, matches: [...(t.matches ?? []), ...(t.id === mister.squadra.id ? amichevoli : [])],
    }));
    eventi = (ev.data?.items ?? []) as Evento[];
  } else {
    const { data, error } = await supabase.from('docs').select('path, data')
      .or('path.eq.shared/teams,path.eq.shared/eventi,path.like.calendar/%');
    if (error) errore = error.message;
    const doc = (p: string) => data?.find((d) => d.path === p)?.data;
    squadre = ((doc('shared/teams')?.items ?? []) as SquadraCal[]).map((t) => ({ ...t, matches: (doc('calendar/' + t.id)?.matches ?? []) as Partita[] }));
    eventi = (doc('shared/eventi')?.items ?? []) as Evento[];
  }
  const { dal, al } = settimanaDi(oggiIso());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Programma gare</h1>
        <p className="mt-1 max-w-prose text-grigio">
          Partite ed eventi di un periodo, per tutta la società o per le squadre che scegli. Da consultare qui o da stampare in PDF.
        </p>
      </div>
      {errore && <p className="rounded-md bg-rosso/10 px-4 py-3 text-sm text-rosso">Calendari non disponibili: {errore}</p>}
      <ProgrammaGare squadre={squadre} eventi={eventi} mia={mister?.squadra.id ?? null} dalIniziale={dal} alIniziale={al} />
    </div>
  );
}
