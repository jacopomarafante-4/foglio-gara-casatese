// Calendario → Tutte le squadre (nell'app dalla tappa 3): partite da giocare di tutte le squadre ed eventi della società.
// Lo vedono admin, direttori e tutti i mister; admin, direttori e organizzativo cambiano amichevoli, tornei ed eventi.
import { redirect } from 'next/navigation';
import { vedeTutto } from '@/lib/ruoli';
import { oggiIso } from '@/lib/utili';
import { calendariTutti, chiEntra, organizza } from '@/lib/portale-dati';
import { configurato } from '@/lib/google-calendar';
import { CalendarioTutte } from '@/components/calendario/CalendarioTutte';

export default async function TutteLeSquadre() {
  const chi = await chiEntra();
  if (chi.profilo && !vedeTutto(chi.profilo.ruolo)) redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!chi.profilo && !chi.mister) redirect('/');
  const { squadre, eventi, errore } = await calendariTutti(chi);
  const puo = organizza(chi);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Calendario · tutte le squadre</h1>
        <p className="mt-1 max-w-prose text-grigio">Le partite da giocare di tutte le squadre, fino a fine stagione. La tua squadra è evidenziata.</p>
      </div>
      {errore && <p className="rounded-md bg-rosso/10 px-4 py-3 text-sm text-rosso">Calendari non disponibili: {errore}</p>}
      <CalendarioTutte squadre={squadre} eventi={eventi} mia={chi.mister?.squadra.id ?? null} oggi={oggiIso()}
        puoOrganizzare={puo} google={puo && configurato()} />
    </div>
  );
}
