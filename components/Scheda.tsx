'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Scheda dello Scouting, disegnata come le schede del Portale (.tab in public/portale/css/portale.css) */
export function Scheda({ href, children }: { href: string; children: React.ReactNode }) {
  const attiva = usePathname().startsWith(href);
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
