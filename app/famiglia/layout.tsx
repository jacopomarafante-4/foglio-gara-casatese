// Pagine delle famiglie (tappa 3; erano nel Portale): stessa intestazione dell'app, badge "Famiglia" e nome del ragazzo,
// quattro schede. Senza tessera valida si torna alla pagina del PIN.
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { esci } from '@/app/auth/actions';
import { getFamiglia } from '@/lib/famiglia';
import { Striscia } from '@/components/Striscia';
import { Scheda } from '@/components/Scheda';

export default async function LayoutFamiglia({ children }: { children: React.ReactNode }) {
  const fam = await getFamiglia();
  if (!fam) redirect('/?pin=1');
  const { ragazzo, squadra } = fam.f;
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-20 bg-carta">
        <header className="bg-blu text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="mx-auto flex max-w-[1000px] items-center gap-2.5 px-4 py-3">
            <a href="/famiglia" className="block shrink-0 rounded-[9px] bg-white p-[3px] leading-none shadow">
              <Image src="/portale/casatese-logo.png" alt="Casatese Merate" width={42} height={42} className="rounded-md" priority />
            </a>
            <div className="min-w-0">
              <div className="font-display text-2xl font-bold leading-none max-sm:text-xl">
                Portale Academy Casatese Merate
                <small className="mt-1 block font-sans text-[13px] font-medium text-white/80">{squadra?.category || ''}</small>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-wider text-blu">Famiglia</span>
                <span className="font-display text-lg font-semibold">{ragazzo?.nome || ''}</span>
                <form action={esci}><button className="rounded-md px-2 py-1 text-[13px] font-medium text-white/85 hover:bg-white/10">Esci</button></form>
              </div>
            </div>
          </div>
        </header>
        <Striscia />
        <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-3 pt-1.5 [scrollbar-width:none]" aria-label="Schede della famiglia">
          <Scheda href="/famiglia" esatta>Home</Scheda>
          <Scheda href="/famiglia/calendario">Calendario</Scheda>
          <Scheda href="/famiglia/anagrafica">Anagrafica</Scheda>
          <Scheda href="/famiglia/segreteria">Segreteria</Scheda>
        </nav>
      </div>
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}
