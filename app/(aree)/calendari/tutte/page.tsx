// Calendario → Tutte le squadre (nell'app dalla tappa 3): partite da giocare di tutte le squadre ed eventi della società.
// Lo vedono admin, direttori e tutti i mister; admin, direttori e organizzativo cambiano amichevoli, tornei ed eventi.
// L'admin collega qui Google Calendar (PannelloGoogle); all'apertura si rilegge Google se sono passati 30 minuti.
import { redirect } from 'next/navigation';
import { vedeTutto } from '@/lib/ruoli';
import { oggiIso } from '@/lib/utili';
import { calendariTutti, chiEntra, organizza } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { statoGoogle } from '@/lib/google-collegato';
import { CalendarioTutte } from '@/components/calendario/CalendarioTutte';
import { PannelloGoogle } from '@/components/calendario/PannelloGoogle';

export default async function TutteLeSquadre({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const chi = await chiEntra();
  if (chi.profilo && !vedeTutto(chi.profilo.ruolo)) redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!chi.profilo && !chi.mister) redirect('/');
  const { squadre, eventi, errore } = await calendariTutti(chi);
  const puo = organizza(chi);
  // Google Calendar: collegamento dall'app (0049) o account di servizio; l'admin lo collega da qui
  const google = puo ? await statoGoogle(await createClient(), chi.mister?.pin) : null;
  const admin = chi.profilo?.ruolo === 'admin';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Calendario · tutte le squadre</h1>
        <p className="mt-1 max-w-prose text-grigio">Le partite da giocare di tutte le squadre, fino a fine stagione. La tua squadra è evidenziata.</p>
      </div>
      {admin && google && (
        <PannelloGoogle collegabile={google.collegabile} collegato={google.collegato} pronto={google.pronto}
          account={google.riga?.account ?? null} avviso={(await searchParams).google} />
      )}
      {errore && <p className="rounded-md bg-rosso/10 px-4 py-3 text-sm text-rosso">Calendari non disponibili: {errore}</p>}
      <CalendarioTutte squadre={squadre} eventi={eventi} mia={chi.mister?.squadra.id ?? null} oggi={oggiIso()}
        puoOrganizzare={puo} google={!!google?.pronto} />
    </div>
  );
}
