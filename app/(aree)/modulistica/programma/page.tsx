// Modulistica → Programma gare (nell'app dalla tappa 3): partite di tutte le squadre ed eventi della società in un periodo,
// da consultare o stampare in PDF. Dati da calendariTutti() (lib/portale-dati.ts), con i permessi di chi è entrato.
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { filtraSquadreDirettore, vedeTutto } from '@/lib/ruoli';
import { oggiIso } from '@/lib/utili';
import { settimanaDi } from '@/lib/programma';
import { calendariTutti } from '@/lib/portale-dati';
import { ProgrammaGare } from '@/components/ProgrammaGare';

export default async function Programma() {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (profilo && !vedeTutto(profilo.ruolo)) redirect(profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!profilo && !mister) redirect('/');

  const { squadre: tutte, eventi, errore } = await calendariTutti({ profilo, mister });
  const squadre = filtraSquadreDirettore(profilo, tutte);
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
