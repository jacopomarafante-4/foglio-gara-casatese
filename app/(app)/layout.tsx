import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { esci } from '@/app/auth/actions';
import { puoAccedere } from '@/lib/ruoli';
import { Striscia } from '@/components/Striscia';
import { NavLink } from '@/components/NavLink';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const profilo = await getProfilo();
  if (!profilo) redirect('/');

  if (!puoAccedere(profilo.ruolo)) {
    return (
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-3xl font-bold">Accesso non disponibile</h1>
        <p className="mt-3 text-grigio">
          Il tuo ruolo non ha accesso a Scouting Hub. Per qualsiasi dubbio contatta l’admin.
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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-blu text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/home" className="font-display text-2xl font-bold">
            Scouting Hub
          </Link>
          <nav className="hidden gap-1 sm:flex">
            <NavLink href="/home">Home</NavLink>
            <NavLink href="/giocatori">Giocatori</NavLink>
            <NavLink href="/gare">Gare</NavLink>
            <NavLink href="/profilo">Profilo</NavLink>
          </nav>
          <div className="flex items-center gap-1">
            {profilo.ruolo === 'admin' && (
              <a href="/portale/" className="rounded-md px-3 py-1.5 text-sm text-white/85 hover:bg-white/10">
                Portale squadre
              </a>
            )}
            <form action={esci}>
              <button className="rounded-md px-3 py-1.5 text-sm text-white/85 hover:bg-white/10">Esci</button>
            </form>
          </div>
        </div>
        <Striscia />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:pb-10">{children}</main>

      {/* Barra in basso su telefono */}
      <nav
        className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-linea bg-white sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <NavLink href="/home" mobile>Home</NavLink>
        <NavLink href="/giocatori" mobile>Giocatori</NavLink>
        <NavLink href="/gare" mobile>Gare</NavLink>
        <NavLink href="/profilo" mobile>Profilo</NavLink>
      </nav>
    </div>
  );
}
