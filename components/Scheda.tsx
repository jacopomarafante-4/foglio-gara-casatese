'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Scheda dello Scouting, disegnata come le schede del Portale (.tab in public/portale/css/portale.css).
 *  Attiva sulla sua pagina (anche con ?squadra=…) o su una delle pagine in `attivaSu` */
export function Scheda({ href, attivaSu, children }: { href: string; attivaSu?: string[]; children: React.ReactNode }) {
  const percorso = usePathname();
  const attiva = [href.split('?')[0], ...(attivaSu ?? [])].some((h) => percorso.startsWith(h));
  return (
    <Link
      href={href}
      aria-current={attiva ? 'page' : undefined}
      className={`whitespace-nowrap border-b-[3px] px-3 pb-2.5 pt-2 font-display text-lg font-semibold ${
        attiva ? 'border-blu text-inchiostro' : 'border-transparent text-grigio hover:text-inchiostro'
      }`}
    >
      {children}
    </Link>
  );
}
