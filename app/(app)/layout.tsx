import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { esci } from '@/app/auth/actions';
import { nomeCompleto, puoAccedere, puoSegnalare } from '@/lib/ruoli';
import { Striscia } from '@/components/Striscia';
import { Aree } from '@/components/Aree';
import { Scheda } from '@/components/Scheda';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const profilo = await getProfilo();
  if (!profilo) redirect('/');

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

  const etichetta =
    profilo.ruolo === 'admin' ? 'Admin' : profilo.ruolo === 'direttore' ? 'Direttore · sola lettura' : 'Scout';

  // Stessa intestazione del Portale squadre (public/portale): lo Scouting è un'area come le altre
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-20 bg-carta">
        <header className="bg-blu text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="mx-auto flex max-w-[1000px] items-center gap-2.5 px-4 py-3">
            <a
              href={profilo.ruolo === 'admin' || profilo.ruolo === 'direttore' ? '/portale/#/home' : '/home'}
              className="block shrink-0 rounded-[9px] bg-white p-[3px] leading-none shadow"
            >
              <Image src="/portale/casatese-logo.png" alt="Casatese Merate" width={42} height={42} className="rounded-md" priority />
            </a>
            <div className="min-w-0">
              <div className="font-display text-2xl font-bold leading-none max-sm:text-xl">
                Portale Academy Casatese Merate
                <small className="mt-1 block font-sans text-[13px] font-medium text-white/80">Scouting</small>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-wider ${
                    profilo.ruolo === 'admin' ? 'bg-oro text-inchiostro' : 'bg-white text-blu'
                  }`}
                >
                  {etichetta}
                </span>
                <span className="font-display text-lg font-semibold">{nomeCompleto(profilo)}</span>
                <form action={esci}>
                  <button className="rounded-md px-2 py-1 text-[13px] font-medium text-white/85 hover:bg-white/10">Esci</button>
                </form>
              </div>
            </div>
          </div>
          <Aree ruolo={profilo.ruolo} />
        </header>
        <Striscia />
        <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede dello scouting">
          <Scheda href="/home">Home</Scheda>
          <Scheda href="/giocatori">Giocatori</Scheda>
          <Scheda href="/gare">Gare</Scheda>
          {puoSegnalare(profilo.ruolo) && <Scheda href="/segnala">Segnala</Scheda>}
          <Scheda href="/profilo">Profilo</Scheda>
        </nav>
      </div>

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}
