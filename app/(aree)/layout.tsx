// Aree del Portale portate nell'app (tappa 3): Società (archivio, storico) e Segreteria. Stessa intestazione dello Scouting,
// ma ci entra anche la segreteria (che non vede lo Scouting). Ogni pagina controlla da sé chi la può aprire;
// i permessi veri restano nel database (RLS e funzioni).
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { esci } from '@/app/auth/actions';
import { Intestazione } from '@/components/Intestazione';

export default async function LayoutAree({ children }: { children: React.ReactNode }) {
  const profilo = await getProfilo();
  if (!profilo) redirect('/');
  if (profilo.ruolo === 'scout' || profilo.ruolo === 'mister') redirect('/home');

  if (!profilo.attivo) {
    return (
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-3xl font-bold">Accesso sospeso</h1>
        <p className="mt-3 text-grigio">Il tuo account è stato disattivato. Per riattivarlo contatta l’admin.</p>
        <form action={esci} className="mt-6">
          <button className="bottone">Esci</button>
        </form>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Intestazione profilo={profilo} />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}
