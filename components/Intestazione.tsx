import Image from 'next/image';
import { esci } from '@/app/auth/actions';
import { ETICHETTA_RUOLO, nomeCompleto, puoSegnalare, type Profilo } from '@/lib/ruoli';
import type { DoppioRuolo, Mister } from '@/lib/mister';
import { Striscia } from '@/components/Striscia';
import { Aree } from '@/components/Aree';
import { SchedeArea } from '@/components/SchedeArea';
import { NomeArea } from '@/components/NomeArea';

/** Intestazione di tutte le pagine dell'app, con la barra delle aree
 *  e le schede dell'area aperta. La usano i layout dello Scouting, app/(app), e delle altre aree, app/(aree).
 *  Chi è entrato: un account (profilo) o un mister col PIN (tessera, lib/mister.ts). */
export function Intestazione({ profilo, mister, doppio }: { profilo?: Profilo; mister?: Mister; doppio?: DoppioRuolo | null }) {
  const ruolo = profilo?.ruolo ?? 'mister';
  const nome = profilo ? nomeCompleto(profilo) : mister?.nome ?? 'Mister';
  const organizza = !!mister?.squadra.organizza;
  const casa = ruolo === 'admin' || ruolo === 'direttore' || ruolo === 'mister' ? '/inizio'
    : ruolo === 'segreteria' ? '/segreteria' : '/home';
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
              <small className="mt-1 block font-sans text-[13px] font-medium text-white/80"><NomeArea categoria={mister?.squadra.category} /></small>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-wider ${
                  ruolo === 'admin' ? 'bg-oro text-inchiostro' : 'bg-white text-blu'
                }`}
              >
                {organizza ? 'Organizzazione' : ETICHETTA_RUOLO[ruolo]}
              </span>
              <span className="font-display text-lg font-semibold">{nome}</span>
              {doppio && (
                /* doppio ruolo (stesso PIN, 0050): quale profilo usare adesso */
                <span className="flex overflow-hidden rounded-full border border-white/40 text-[12px] font-semibold" role="group" aria-label="Profilo in uso">
                  <a href="/api/profilo?usa=staff" aria-current={doppio.attivo === 'staff' ? 'true' : undefined}
                    className={`px-2.5 py-[3px] ${doppio.attivo === 'staff' ? 'bg-white text-blu' : 'text-white/85 hover:bg-white/10'}`}>{ETICHETTA_RUOLO[doppio.ruolo]}</a>
                  <a href="/api/profilo?usa=mister" aria-current={doppio.attivo === 'mister' ? 'true' : undefined}
                    className={`px-2.5 py-[3px] ${doppio.attivo === 'mister' ? 'bg-white text-blu' : 'text-white/85 hover:bg-white/10'}`}>Mister {doppio.squadre}</a>
                </span>
              )}
              <form action={esci}>
                <button className="rounded-md px-2 py-1 text-[13px] font-medium text-white/85 hover:bg-white/10">Esci</button>
              </form>
            </div>
          </div>
        </div>
        <Aree ruolo={ruolo} organizza={organizza} />
      </header>
      <Striscia />
      <SchedeArea ruolo={ruolo} segnala={puoSegnalare(ruolo)} organizza={organizza} />
    </div>
  );
}
