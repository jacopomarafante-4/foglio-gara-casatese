// Squadra → Allenamento → I miei allenamenti: in programma (lavori in corso), come nel Portale
import Link from 'next/link';
import { apriSquadra } from '@/lib/pagina-squadra';
import { SchedeAllenamento } from '@/components/squadra/SottoSchede';

export default async function MieiAllenamenti({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { eta, conSquadra } = await apriSquadra((await searchParams).squadra);
  return (
    <div className="space-y-4">
      <SchedeAllenamento attiva="/squadra/miei-allenamenti" eta={eta} conSquadra={conSquadra} />
      <section className="mx-auto max-w-lg rounded-xl border border-linea bg-white p-6 text-center">
        <div className="text-5xl" aria-hidden>🚧</div>
        <h1 className="mt-2 font-display text-3xl font-bold">I miei allenamenti</h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-wider text-oro">Lavori in corso</p>
        <p className="mt-3 text-grigio">Qui potrai preparare e ritrovare le tue sedute: esercizi, obiettivi, durata, materiale, e riusarle durante la
          stagione. La funzione è in programma e arriverà nei prossimi aggiornamenti.</p>
        <p className="mt-3 text-sm text-grigio">Nel frattempo le presenze si segnano in <Link className="font-semibold text-blu" href={conSquadra('/squadra/presenze')}>Presenze</Link>.</p>
      </section>
    </div>
  );
}
