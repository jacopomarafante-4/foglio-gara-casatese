'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Scheda di un'area (pillola nella seconda riga dell'intestazione).
 *  Attiva sulla sua pagina (anche con ?squadra=…) o su una delle pagine in `attivaSu`; `esatta` = solo su quella pagina */
export function Scheda({ href, attivaSu, esatta = false, children }: { href: string; attivaSu?: string[]; esatta?: boolean; children: React.ReactNode }) {
  const percorso = usePathname();
  const attiva = esatta ? percorso === href.split('?')[0] : [href.split('?')[0], ...(attivaSu ?? [])].some((h) => percorso.startsWith(h));
  return (
    <Link
      href={href}
      aria-current={attiva ? 'page' : undefined}
      className={`whitespace-nowrap border-b-[3px] px-3 pb-2.5 pt-2 font-display text-lg font-semibold max-sm:px-2 max-sm:text-base ${
        attiva ? 'border-blu text-inchiostro' : 'border-transparent text-grigio hover:text-inchiostro'
      }`}
    >
      {children}
    </Link>
  );
}
