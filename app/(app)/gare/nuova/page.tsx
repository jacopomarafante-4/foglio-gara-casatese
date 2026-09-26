import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { elencoSocieta } from '@/lib/societa';
import { oggiIso } from '@/lib/utili';
import { NuovaPartita } from './NuovaPartita';

/** Aggiungi partita: una gara vista (anche fuori calendario) con distinte e segnalazioni */
export default async function PaginaNuovaPartita() {
  const profilo = (await getProfilo())!;
  if (!puoSegnalare(profilo.ruolo)) redirect('/gare');
  const supabase = await createClient();
  const societa = await elencoSocieta(supabase);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/gare" className="text-sm text-grigio hover:text-blu">‹ Gare da vedere</Link>
        <h1 className="mt-2 font-display text-4xl font-bold">Aggiungi partita</h1>
        <p className="mt-1 max-w-2xl text-grigio">
          La partita, le foto delle distinte e i giocatori che hai visto: si salva tutto insieme.
        </p>
      </div>
      <NuovaPartita societa={societa.map((s) => s.nome)} oggi={oggiIso()} />
    </div>
  );
}
