import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { getDoppioRuolo, getMister } from '@/lib/mister';
import { esci } from '@/app/auth/actions';
import { puoAccedere } from '@/lib/ruoli';
import { Intestazione } from '@/components/Intestazione';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const profilo = await getProfilo();
  // staff con doppio ruolo che sta usando l'app come mister: lo Scouting dei mister è /scouting (pagine delle aree)
  if (!profilo) redirect((await getMister()) ? '/scouting/segnala' : '/');

  if (!puoAccedere(profilo.ruolo)) {
    return (
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-3xl font-bold">Accesso non disponibile</h1>
        <p className="mt-3 text-grigio">
          Il tuo ruolo non ha accesso allo Scouting. Per qualsiasi dubbio contatta l’admin.
        </p>
        <form action={esci} className="mt-6">
          <button className="bottone">Esci</button>
        </form>
      </main>
    );
  }

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

  // Stessa intestazione del Portale squadre (public/portale): lo Scouting è un'area come le altre
  return (
    <div className="flex min-h-dvh flex-col">
      <Intestazione profilo={profilo} doppio={await getDoppioRuolo()} />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}
