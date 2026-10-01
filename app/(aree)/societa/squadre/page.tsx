// Società → Squadre (nell'app dalla tappa 3; era la scheda "squadre" del Portale): squadre con i mister e i loro PIN, poi
// Scouting, Direttori e Segreteria (account e PIN via /api/staff), backup. Admin e direttori (0020); il database ricontrolla.
import { redirect } from 'next/navigation';
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { conMister, type SquadraSocieta } from '@/lib/squadre-societa';
import { SquadreSocieta, type PersonaStaff } from '@/components/SquadreSocieta';

export default async function PaginaSquadre() {
  const chi = await chiEntra();
  if (!chi.profilo) redirect(chi.mister ? '/inizio' : '/');
  if (chi.profilo.ruolo !== 'admin' && chi.profilo.ruolo !== 'direttore') redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');

  const supabase = await createClient();
  const [{ data: doc }, { data: persone }, { data: codici }] = await Promise.all([
    supabase.from('docs').select('data').eq('path', 'shared/teams').maybeSingle(),
    supabase.from('profiles').select('id, nome, cognome, ruolo, attivo').in('ruolo', ['scout', 'direttore', 'segreteria']).order('cognome'),
    supabase.from('codici_accesso').select('profilo_id, pin'),
  ]);
  const squadre = ((doc?.data?.items ?? []) as Record<string, unknown>[]).map(conMister) as SquadraSocieta[];
  const pin = new Map((codici ?? []).map((c) => [c.profilo_id, c.pin as string]));
  const staff: PersonaStaff[] = (persone ?? []).map((p) => ({ ...p, pin: pin.get(p.id) ?? '' }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold">Squadre, scouting e direttori</h1>
        <p className="mt-1 text-grigio">
          La vedete solo tu e i direttori. Ognuno entra dalla pagina d’ingresso con il suo PIN personale: i mister trovano solo la loro
          squadra, gli scout lo Scouting.
        </p>
      </div>
      <SquadreSocieta squadre={squadre} staff={staff} io={chi.profilo.id} admin={chi.profilo.ruolo === 'admin'} />
    </div>
  );
}
