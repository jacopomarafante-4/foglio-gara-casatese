import Image from 'next/image';
import { esci } from '@/app/auth/actions';
import { ETICHETTA_RUOLO, nomeCompleto, puoSegnalare, type Profilo } from '@/lib/ruoli';
import { Striscia } from '@/components/Striscia';
import { Aree } from '@/components/Aree';
import { SchedeArea } from '@/components/SchedeArea';
import { NomeArea } from '@/components/NomeArea';

/** Intestazione di tutte le pagine dell'app: la stessa del Portale squadre (public/portale), con la barra delle aree
 *  e le schede dell'area aperta. La usano i layout dello Scouting, app/(app), e delle aree portate dal Portale, app/(aree). */
export function Intestazione({ profilo }: { profilo: Profilo }) {
  const casa = profilo.ruolo === 'admin' || profilo.ruolo === 'direttore' ? '/portale/#/home'
    : profilo.ruolo === 'segreteria' ? '/segreteria' : '/home';
  return (
    <div className="sticky top-0 z-20 bg-carta">
      <header className="bg-blu text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-[1000px] items-center gap-2.5 px-4 py-3">
          <a href={casa} className="block shrink-0 rounded-[9px] bg-white p-[3px] leading-none shadow">
            <Image src="/portale/casatese-logo.png" alt="Casatese Merate" width={42} height={42} className="rounded-md" priority />
          </a>
          <div className="min-w-0">
            <div className="font-display text-2xl font-bold leading-none max-sm:text-xl">
              Portale Academy Casatese Merate
              <small className="mt-1 block font-sans text-[13px] font-medium text-white/80"><NomeArea /></small>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-wider ${
                  profilo.ruolo === 'admin' ? 'bg-oro text-inchiostro' : 'bg-white text-blu'
                }`}
              >
                {ETICHETTA_RUOLO[profilo.ruolo]}
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
      <SchedeArea ruolo={profilo.ruolo} segnala={puoSegnalare(profilo.ruolo)} />
    </div>
  );
}
